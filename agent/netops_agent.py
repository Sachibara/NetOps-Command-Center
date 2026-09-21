from __future__ import annotations

import concurrent.futures
import ipaddress
import json
import os
import platform
import re
import socket
import sqlite3
import subprocess
import threading
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
AGENT_DIR = Path(__file__).resolve().parent
DATA_DIR = AGENT_DIR / "data"
DB_PATH = DATA_DIR / "netops.db"
CONFIG_PATH = AGENT_DIR / "agent_config.json"
EXAMPLE_CONFIG_PATH = AGENT_DIR / "agent_config.example.json"

DEFAULT_CONFIG = {
    "subnet": "auto",
    "monitor_interval_seconds": 30,
    "warning_latency_ms": 100,
    "warning_packet_loss_percent": 20,
    "scan_timeout_ms": 550,
    "max_scan_hosts": 256,
    "service_ports": [22, 53, 80, 443, 445, 3389, 9100],
}

DB_LOCK = threading.RLock()
STOP_EVENT = threading.Event()
MONITOR_THREAD: threading.Thread | None = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_config() -> dict[str, Any]:
    config = DEFAULT_CONFIG.copy()
    source = CONFIG_PATH if CONFIG_PATH.exists() else EXAMPLE_CONFIG_PATH
    if source.exists():
        try:
            loaded = json.loads(source.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                config.update({k: loaded[k] for k in DEFAULT_CONFIG if k in loaded})
        except Exception:
            pass

    if os.environ.get("NETOPS_SUBNET"):
        config["subnet"] = os.environ["NETOPS_SUBNET"].strip()
    if os.environ.get("NETOPS_MONITOR_INTERVAL"):
        try:
            config["monitor_interval_seconds"] = max(5, int(os.environ["NETOPS_MONITOR_INTERVAL"]))
        except ValueError:
            pass
    return config


def local_ipv4() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return "127.0.0.1"
    finally:
        sock.close()


def monitored_subnet(config: dict[str, Any] | None = None) -> str:
    cfg = config or load_config()
    configured = str(cfg.get("subnet") or "auto").strip()
    if configured.lower() != "auto":
        try:
            network = ipaddress.ip_network(configured, strict=False)
            if network.version != 4:
                raise ValueError("Only IPv4 discovery is currently supported.")
            return str(network)
        except ValueError as exc:
            raise RuntimeError(f"Invalid configured subnet: {configured}") from exc

    ip = ipaddress.ip_address(local_ipv4())
    if ip.is_loopback:
        return "127.0.0.0/30"
    return str(ipaddress.ip_network(f"{ip}/24", strict=False))


def db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with DB_LOCK, db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS devices (
                ip TEXT PRIMARY KEY,
                hostname TEXT,
                mac TEXT,
                vendor TEXT,
                role TEXT,
                platform TEXT,
                status TEXT NOT NULL DEFAULT 'unknown',
                latency_ms REAL,
                packet_loss REAL,
                services_json TEXT NOT NULL DEFAULT '[]',
                first_seen TEXT,
                last_seen TEXT,
                updated_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_ip TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT NOT NULL,
                latency_ms REAL,
                packet_loss REAL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_key TEXT NOT NULL,
                severity TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT 'active',
                device_ip TEXT,
                device_name TEXT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                resolved_at TEXT
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_samples_time ON samples(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_key ON alerts(alert_key)")
        conn.commit()


def normalize_hostname(value: str) -> str:
    value = (value or "").strip()
    if not value:
        raise ValueError("Host is required.")
    try:
        ipaddress.ip_address(value)
        return value
    except ValueError:
        pass
    if len(value) > 253 or not re.fullmatch(r"[A-Za-z0-9._-]+", value):
        raise ValueError("Invalid host name.")
    return value


def ping_host(host: str, count: int = 2, timeout_ms: int = 800) -> dict[str, Any]:
    host = normalize_hostname(host)
    count = max(1, min(int(count), 4))
    timeout_ms = max(150, min(int(timeout_ms), 5000))

    if os.name == "nt":
        cmd = ["ping", "-n", str(count), "-w", str(timeout_ms), host]
    else:
        timeout_seconds = max(1, round(timeout_ms / 1000))
        cmd = ["ping", "-c", str(count), "-W", str(timeout_seconds), host]

    started = time.perf_counter()
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=max(3, count * timeout_ms / 1000 + 3))
    except (subprocess.TimeoutExpired, OSError) as exc:
        return {
            "host": host,
            "reachable": False,
            "latency_ms": None,
            "packet_loss": 100.0,
            "output": f"Ping failed: {exc}",
        }

    elapsed = (time.perf_counter() - started) * 1000
    output = (proc.stdout or "") + (proc.stderr or "")
    loss = 100.0
    latency = None

    loss_match = re.search(r"(\d+(?:\.\d+)?)%\s*(?:loss|packet loss)", output, re.IGNORECASE)
    if loss_match:
        loss = float(loss_match.group(1))
    else:
        win_loss = re.search(r"Lost\s*=\s*(\d+).*?\((\d+)%\s*loss\)", output, re.IGNORECASE | re.DOTALL)
        if win_loss:
            loss = float(win_loss.group(2))
        elif proc.returncode == 0:
            loss = 0.0

    avg_patterns = [
        r"Average\s*=\s*(\d+(?:\.\d+)?)ms",
        r"=\s*[\d.]+/(\d+(?:\.\d+)?)/[\d.]+/[\d.]+\s*ms",
        r"avg[^=]*=\s*(\d+(?:\.\d+)?)",
    ]
    for pattern in avg_patterns:
        match = re.search(pattern, output, re.IGNORECASE)
        if match:
            latency = float(match.group(1))
            break

    if latency is None and proc.returncode == 0:
        times = [float(x) for x in re.findall(r"time[=<]\s*(\d+(?:\.\d+)?)\s*ms", output, re.IGNORECASE)]
        if times:
            latency = sum(times) / len(times)
        else:
            latency = elapsed / max(1, count)

    return {
        "host": host,
        "reachable": proc.returncode == 0 and loss < 100,
        "latency_ms": round(latency, 2) if latency is not None else None,
        "packet_loss": round(loss, 2),
        "output": output.strip() or ("Reachable" if proc.returncode == 0 else "Unreachable"),
    }


def parse_arp_table() -> dict[str, str]:
    entries: dict[str, str] = {}
    try:
        proc = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5)
        text = proc.stdout or ""
    except (OSError, subprocess.TimeoutExpired):
        return entries

    pattern = re.compile(
        r"(\d{1,3}(?:\.\d{1,3}){3})\s+"
        r"([0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5})"
    )
    for ip, mac in pattern.findall(text):
        try:
            ipaddress.ip_address(ip)
        except ValueError:
            continue
        entries[ip] = mac.replace("-", ":").upper()
    return entries


def reverse_hostname(ip: str) -> str:
    try:
        old_timeout = socket.getdefaulttimeout()
        socket.setdefaulttimeout(0.45)
        try:
            return socket.gethostbyaddr(ip)[0]
        finally:
            socket.setdefaulttimeout(old_timeout)
    except OSError:
        return ""


def tcp_port_open(host: str, port: int, timeout: float = 0.25) -> tuple[bool, float | None]:
    host = normalize_hostname(host)
    port = int(port)
    if not 1 <= port <= 65535:
        raise ValueError("Port must be between 1 and 65535.")

    started = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            latency = (time.perf_counter() - started) * 1000
            return True, round(latency, 2)
    except OSError:
        return False, None


def detect_role(ip: str, services: list[int], hostname: str) -> str:
    host = (hostname or "").lower()
    if ip.endswith(".1"):
        return "Router"
    if 9100 in services or "print" in host or host.startswith("prn"):
        return "Printer"
    if 3389 in services or 445 in services:
        if any(token in host for token in ("srv", "server", "dc", "ad")):
            return "Server"
        return "Windows Host"
    if 22 in services and 443 in services and not (80 in services):
        return "Network Device"
    return "Device"


def detect_platform(services: list[int], role: str) -> str:
    if role in {"Windows Host", "Server"} and (445 in services or 3389 in services):
        return "Windows"
    if role in {"Router", "Network Device"}:
        return "Network OS"
    if role == "Printer":
        return "Embedded"
    return "Unknown"


def service_scan(ip: str, ports: list[int]) -> list[int]:
    open_ports: list[int] = []
    for port in ports[:16]:
        try:
            is_open, _ = tcp_port_open(ip, int(port), timeout=0.18)
            if is_open:
                open_ports.append(int(port))
        except (ValueError, OSError):
            continue
    return open_ports


def upsert_device(
    ip: str,
    status: str,
    latency_ms: float | None,
    packet_loss: float | None,
    *,
    mac: str | None = None,
    hostname: str | None = None,
    services: list[int] | None = None,
) -> None:
    now = utc_now()
    services = services if services is not None else []
    role = detect_role(ip, services, hostname or "")
    platform_name = detect_platform(services, role)

    with DB_LOCK, db() as conn:
        row = conn.execute("SELECT * FROM devices WHERE ip=?", (ip,)).fetchone()
        if row:
            conn.execute(
                """
                UPDATE devices SET
                    hostname=CASE WHEN ?<>'' THEN ? ELSE hostname END,
                    mac=CASE WHEN ?<>'' THEN ? ELSE mac END,
                    role=CASE WHEN role IS NULL OR role='' OR role='Device' THEN ? ELSE role END,
                    platform=CASE WHEN platform IS NULL OR platform='' OR platform='Unknown' THEN ? ELSE platform END,
                    status=?,
                    latency_ms=?,
                    packet_loss=?,
                    services_json=CASE WHEN ?<>'[]' THEN ? ELSE services_json END,
                    last_seen=CASE WHEN ?='online' THEN ? ELSE last_seen END,
                    updated_at=?
                WHERE ip=?
                """,
                (
                    hostname or "", hostname or "",
                    mac or "", mac or "",
                    role, platform_name,
                    status, latency_ms, packet_loss,
                    json.dumps(services), json.dumps(services),
                    status, now, now, ip,
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO devices(
                    ip,hostname,mac,vendor,role,platform,status,latency_ms,
                    packet_loss,services_json,first_seen,last_seen,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    ip, hostname or "", mac or "", "Unknown", role, platform_name,
                    status, latency_ms, packet_loss, json.dumps(services), now,
                    now if status == "online" else None, now,
                ),
            )
        conn.execute(
            "INSERT INTO samples(device_ip,timestamp,status,latency_ms,packet_loss) VALUES(?,?,?,?,?)",
            (ip, now, status, latency_ms, packet_loss),
        )
        conn.commit()


def active_alert(alert_key: str) -> sqlite3.Row | None:
    with DB_LOCK, db() as conn:
        return conn.execute(
            "SELECT * FROM alerts WHERE alert_key=? AND state='active' ORDER BY id DESC LIMIT 1",
            (alert_key,),
        ).fetchone()


def open_alert(
    alert_key: str,
    severity: str,
    device_ip: str,
    device_name: str,
    title: str,
    message: str,
) -> None:
    if active_alert(alert_key):
        return
    with DB_LOCK, db() as conn:
        conn.execute(
            """
            INSERT INTO alerts(alert_key,severity,state,device_ip,device_name,title,message,created_at)
            VALUES(?,?, 'active', ?,?,?,?,?)
            """,
            (alert_key, severity, device_ip, device_name, title, message, utc_now()),
        )
        conn.commit()


def resolve_alert(alert_key: str) -> None:
    with DB_LOCK, db() as conn:
        conn.execute(
            "UPDATE alerts SET state='resolved',resolved_at=? WHERE alert_key=? AND state='active'",
            (utc_now(), alert_key),
        )
        conn.commit()


def evaluate_alerts(ip: str, hostname: str, result: dict[str, Any], config: dict[str, Any]) -> None:
    name = hostname or ip
    offline_key = f"offline:{ip}"
    latency_key = f"latency:{ip}"
    loss_key = f"loss:{ip}"

    if not result["reachable"]:
        open_alert(
            offline_key, "critical", ip, name, "Device unreachable",
            "The monitoring agent did not receive an ICMP response from the device.",
        )
    else:
        resolve_alert(offline_key)

    latency = result.get("latency_ms")
    threshold = float(config.get("warning_latency_ms", 100))
    if result["reachable"] and latency is not None and latency > threshold:
        open_alert(
            latency_key, "warning", ip, name, "High latency detected",
            f"Round-trip latency exceeded the configured {threshold:g} ms warning threshold.",
        )
    else:
        resolve_alert(latency_key)

    loss = float(result.get("packet_loss") or 0)
    loss_threshold = float(config.get("warning_packet_loss_percent", 20))
    if result["reachable"] and loss >= loss_threshold:
        open_alert(
            loss_key, "warning", ip, name, "Packet loss detected",
            f"Packet loss reached {loss:g}% during the latest monitoring check.",
        )
    else:
        resolve_alert(loss_key)


def known_devices() -> list[sqlite3.Row]:
    with DB_LOCK, db() as conn:
        return conn.execute("SELECT * FROM devices ORDER BY ip").fetchall()


def scan_one(ip: str, arp: dict[str, str], config: dict[str, Any], with_services: bool = True) -> dict[str, Any]:
    result = ping_host(ip, count=1, timeout_ms=int(config.get("scan_timeout_ms", 550)))
    hostname = reverse_hostname(ip) if result["reachable"] else ""
    ports = [int(p) for p in config.get("service_ports", [])]
    services = service_scan(ip, ports) if result["reachable"] and with_services else []
    upsert_device(
        ip,
        "online" if result["reachable"] else "offline",
        result.get("latency_ms"),
        result.get("packet_loss"),
        mac=arp.get(ip, ""),
        hostname=hostname,
        services=services,
    )
    evaluate_alerts(ip, hostname, result, config)
    return {"ip": ip, **result, "hostname": hostname, "mac": arp.get(ip, ""), "services": services}


def discover_network(subnet: str | None = None) -> dict[str, Any]:
    config = load_config()
    target = subnet or monitored_subnet(config)
    try:
        network = ipaddress.ip_network(target, strict=False)
    except ValueError as exc:
        raise ValueError("Invalid IPv4 subnet.") from exc
    if network.version != 4:
        raise ValueError("Only IPv4 network discovery is supported.")

    hosts = list(network.hosts())
    max_hosts = max(1, int(config.get("max_scan_hosts", 256)))
    if len(hosts) > max_hosts:
        raise ValueError(
            f"Discovery is limited to {max_hosts} hosts per scan. "
            f"Use a smaller subnet such as /24."
        )

    arp = parse_arp_table()
    discovered: list[dict[str, Any]] = []
    workers = min(48, max(4, len(hosts)))

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(scan_one, str(ip), arp, config, True): str(ip)
            for ip in hosts
        }
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                if result["reachable"]:
                    discovered.append(result)
            except Exception:
                continue

    return {
        "subnet": str(network),
        "scanned": len(hosts),
        "discovered": len(discovered),
        "devices": discovered,
    }


def bootstrap_from_arp() -> None:
    config = load_config()
    arp = parse_arp_table()
    if not arp:
        return

    subnet = ipaddress.ip_network(monitored_subnet(config), strict=False)
    candidates = [ip for ip in arp if ipaddress.ip_address(ip) in subnet][:64]
    if not candidates:
        return

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(24, len(candidates))) as executor:
        futures = [executor.submit(scan_one, ip, arp, config, False) for ip in candidates]
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception:
                pass


def monitor_cycle() -> None:
    config = load_config()
    arp = parse_arp_table()
    rows = known_devices()
    if not rows:
        bootstrap_from_arp()
        rows = known_devices()

    def check(row: sqlite3.Row) -> None:
        ip = row["ip"]
        result = ping_host(ip, count=1, timeout_ms=int(config.get("scan_timeout_ms", 550)))
        hostname = row["hostname"] or ""
        upsert_device(
            ip,
            "online" if result["reachable"] else "offline",
            result.get("latency_ms"),
            result.get("packet_loss"),
            mac=arp.get(ip, row["mac"] or ""),
            hostname=hostname,
            services=json.loads(row["services_json"] or "[]"),
        )
        evaluate_alerts(ip, hostname, result, config)

    if rows:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(32, len(rows))) as executor:
            futures = [executor.submit(check, row) for row in rows]
            for future in concurrent.futures.as_completed(futures):
                try:
                    future.result()
                except Exception:
                    pass

    # Keep the local history bounded.
    cutoff = datetime.fromtimestamp(time.time() - 7 * 86400, tz=timezone.utc).isoformat()
    with DB_LOCK, db() as conn:
        conn.execute("DELETE FROM samples WHERE timestamp<?", (cutoff,))
        conn.commit()


def monitor_loop() -> None:
    while not STOP_EVENT.is_set():
        try:
            monitor_cycle()
        except Exception as exc:
            print(f"[NetOps] Monitor cycle error: {exc}")
        interval = max(5, int(load_config().get("monitor_interval_seconds", 30)))
        STOP_EVENT.wait(interval)


def row_to_device(row: sqlite3.Row) -> dict[str, Any]:
    try:
        services = json.loads(row["services_json"] or "[]")
    except json.JSONDecodeError:
        services = []
    return {
        "ip": row["ip"],
        "hostname": row["hostname"] or "",
        "mac": row["mac"] or "",
        "vendor": row["vendor"] or "Unknown",
        "role": row["role"] or "Device",
        "platform": row["platform"] or "Unknown",
        "status": row["status"] or "unknown",
        "latency_ms": row["latency_ms"],
        "packet_loss": row["packet_loss"],
        "services": services,
        "first_seen": row["first_seen"],
        "last_seen": row["last_seen"],
        "updated_at": row["updated_at"],
    }


def dashboard_payload() -> dict[str, Any]:
    config = load_config()
    with DB_LOCK, db() as conn:
        devices = [row_to_device(row) for row in conn.execute("SELECT * FROM devices ORDER BY ip").fetchall()]
        alerts = [
            dict(row)
            for row in conn.execute(
                """
                SELECT id,severity,state,device_ip,device_name,title,message,created_at,resolved_at
                FROM alerts ORDER BY id DESC LIMIT 250
                """
            ).fetchall()
        ]

        samples = conn.execute(
            """
            SELECT timestamp, AVG(latency_ms) AS avg_latency_ms
            FROM samples
            WHERE status='online' AND latency_ms IS NOT NULL
            GROUP BY strftime('%Y-%m-%dT%H:%M', timestamp)
            ORDER BY timestamp DESC
            LIMIT 48
            """
        ).fetchall()

    return {
        "generated_at": utc_now(),
        "overview": {
            "monitored_subnet": monitored_subnet(config),
            "warning_latency_ms": config.get("warning_latency_ms", 100),
            "scan_interval_seconds": config.get("monitor_interval_seconds", 30),
            "agent_host": socket.gethostname(),
            "agent_platform": platform.platform(),
        },
        "devices": devices,
        "alerts": alerts,
        "latency_samples": [
            {"timestamp": row["timestamp"], "avg_latency_ms": round(float(row["avg_latency_ms"]), 2)}
            for row in reversed(samples)
            if row["avg_latency_ms"] is not None
        ],
    }


class PingRequest(BaseModel):
    host: str = Field(min_length=1, max_length=253)


class DnsRequest(BaseModel):
    host: str = Field(min_length=1, max_length=253)


class PortRequest(BaseModel):
    host: str = Field(min_length=1, max_length=253)
    port: int = Field(ge=1, le=65535)


class ScanRequest(BaseModel):
    subnet: str | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global MONITOR_THREAD
    init_db()
    STOP_EVENT.clear()
    MONITOR_THREAD = threading.Thread(target=monitor_loop, daemon=True, name="netops-monitor")
    MONITOR_THREAD.start()
    yield
    STOP_EVENT.set()
    if MONITOR_THREAD and MONITOR_THREAD.is_alive():
        MONITOR_THREAD.join(timeout=2)


app = FastAPI(
    title="NetOps Command Center Agent",
    version="1.0.0",
    description="Local network monitoring and troubleshooting agent.",
    lifespan=lifespan,
)

allowed_origins = [
    "http://127.0.0.1:8787",
    "http://localhost:8787",
]
for origin in os.environ.get("NETOPS_ALLOWED_ORIGINS", "").split(","):
    origin = origin.strip()
    if origin:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def api_health():
    return {
        "ok": True,
        "agent": "NetOps Command Center",
        "hostname": socket.gethostname(),
        "subnet": monitored_subnet(),
        "database": str(DB_PATH),
    }


@app.get("/api/dashboard")
def api_dashboard():
    return dashboard_payload()


@app.post("/api/scan")
def api_scan(request: ScanRequest | None = None):
    try:
        result = discover_network(request.subnet if request else None)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/tools/ping")
def api_ping(request: PingRequest):
    try:
        result = ping_host(request.host, count=4, timeout_ms=1000)
        output = [
            f"Host: {request.host}",
            f"Reachable: {'Yes' if result['reachable'] else 'No'}",
            f"Average latency: {result['latency_ms'] if result['latency_ms'] is not None else 'N/A'} ms",
            f"Packet loss: {result['packet_loss']}%",
            "",
            result["output"],
        ]
        return {**result, "output": "\n".join(output)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/tools/dns")
def api_dns(request: DnsRequest):
    try:
        host = normalize_hostname(request.host)
        infos = socket.getaddrinfo(host, None)
        addresses = sorted({item[4][0] for item in infos})
        output = [f"Host: {host}"] + [f"Address: {address}" for address in addresses]
        return {"host": host, "addresses": addresses, "output": "\n".join(output)}
    except (ValueError, socket.gaierror) as exc:
        raise HTTPException(status_code=400, detail=f"DNS lookup failed: {exc}") from exc


@app.post("/api/tools/port")
def api_port(request: PortRequest):
    try:
        is_open, elapsed = tcp_port_open(request.host, request.port, timeout=1.5)
        status = "OPEN" if is_open else "CLOSED / FILTERED"
        output = f"{request.host}:{request.port} — {status}"
        if elapsed is not None:
            output += f"\nTCP handshake completed in {elapsed:.1f} ms"
        return {
            "host": request.host,
            "port": request.port,
            "open": is_open,
            "latency_ms": elapsed,
            "output": output,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/")
def dashboard():
    return FileResponse(ROOT / "index.html")


@app.get("/styles.css")
def styles():
    return FileResponse(ROOT / "styles.css", media_type="text/css")


@app.get("/app.js")
def app_js():
    return FileResponse(ROOT / "app.js", media_type="application/javascript")


@app.get("/demo-data.js")
def demo_js():
    return FileResponse(ROOT / "demo-data.js", media_type="application/javascript")


def main() -> None:
    import uvicorn

    bind = os.environ.get("NETOPS_BIND", "127.0.0.1")
    port = int(os.environ.get("NETOPS_PORT", "8787"))
    print(f"[NetOps] Monitoring subnet: {monitored_subnet()}")
    print(f"[NetOps] Dashboard: http://{bind}:{port}")
    print("[NetOps] Network discovery is limited to the configured authorized subnet.")
    uvicorn.run(app, host=bind, port=port, log_level="info")


if __name__ == "__main__":
    main()
