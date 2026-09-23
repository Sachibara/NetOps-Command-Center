# NetOps Command Center

A portfolio-grade **Network Operations & Infrastructure Monitoring platform** built for IT Service Desk, IT Help Desk, NOC, Network Engineering, System Administration, and IT Infrastructure roles.

NetOps Command Center deliberately separates the public portfolio experience from private-network access:

- **Browser Workspace Mode** — the deployed dashboard is directly usable and stores workspace changes in the browser while using safe seeded telemetry.
- **Live Agent Mode** — a Python monitoring agent runs inside an authorized LAN and provides real discovery, availability, latency, service, alert, and troubleshooting data.

The cloud-hosted dashboard does **not** pretend it can scan a private network.


## Public App

**Live app:** https://sachibara.github.io/NetOps-Command-Center/

## Highlights

- Network-health dashboard
- Agent host CPU, memory, disk, uptime, and bandwidth telemetry
- Device discovery across a configured IPv4 subnet
- ICMP reachability monitoring
- Round-trip latency and packet-loss tracking
- Lightweight TCP service discovery
- Device inventory and CSV export
- Device-detail view with 24-hour availability and latency history
- Editable device hostname/vendor/role/platform metadata
- Inferred network topology visualization
- Offline-device alerts
- High-latency alerts
- Packet-loss alerts
- Historical SQLite monitoring samples
- Search and filtering
- Ping diagnostic tool
- DNS lookup tool
- TCP port connectivity test
- Traceroute
- Route-table and interface inspection
- IPv4 subnet calculator
- In-dashboard monitoring settings
- Responsive browser interface
- REST API through FastAPI
- Background monitoring worker
- Browser-workspace/live-agent data-source switching
- GitHub Actions syntax validation
- Automated static deployment workflow

## Architecture

```text
Public Portfolio
┌─────────────────────────────────┐
│ Browser Dashboard               │
│ GitHub Pages / static hosting   │
│ Persistent browser workspace   │
└─────────────────────────────────┘


Authorized LAN / Lab
┌─────────────────────────────────┐
│ Browser Dashboard               │
│ http://127.0.0.1:8787           │
└───────────────┬─────────────────┘
                │ REST API
                ▼
┌─────────────────────────────────┐
│ NetOps Agent                    │
│ Python + FastAPI                │
│ SQLite monitoring history       │
└───────────────┬─────────────────┘
                │
        ICMP / DNS / TCP / ARP
                │
                ▼
┌─────────────────────────────────┐
│ Routers · Switches · Servers    │
│ APs · Workstations · Printers   │
└─────────────────────────────────┘
```

## Repository Structure

```text
NetOps-Command-Center/
├── index.html
├── styles.css
├── app.js
├── demo-data.js
├── vercel.json
├── agent/
│   ├── netops_agent.py
│   ├── requirements.txt
│   ├── run_agent.bat
│   ├── agent_config.example.json
│   └── data/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── pages.yml
└── README.md
```

## Public Browser Workspace

The root application is a static site. Browser Workspace Mode is selected automatically on public hosting and persists editable workspace state in local browser storage.

The initial workspace represents a small business network containing routers, switches, servers, wireless access points, endpoints, printers, an NVR, and a managed UPS. Device metadata and workspace settings can then be edited and retained in the browser.

No private network data is uploaded by the repository.

## Live Agent Setup

### 1. Clone the repository

```powershell
git clone https://github.com/Sachibara/NetOps-Command-Center.git
cd NetOps-Command-Center
```

### 2. Install dependencies

```powershell
python -m pip install -r agent/requirements.txt
```

Or on Windows, run:

```text
agent\run_agent.bat
```

### 3. Open the live dashboard

```text
http://127.0.0.1:8787
```

When opened from port `8787`, the dashboard automatically selects Live Agent Mode.

## Agent Configuration

Copy:

```text
agent/agent_config.example.json
```

to:

```text
agent/agent_config.json
```

Example:

```json
{
  "subnet": "192.168.1.0/24",
  "monitor_interval_seconds": 30,
  "warning_latency_ms": 100,
  "warning_packet_loss_percent": 20,
  "scan_timeout_ms": 550,
  "max_scan_hosts": 256,
  "service_ports": [22, 53, 80, 443, 445, 3389, 9100]
}
```

When `subnet` is set to `"auto"`, the agent derives a /24 network from the host's active IPv4 address.

For safety, discovery is limited to the configured subnet and to a maximum number of hosts per scan.

## Environment Variables

Optional runtime overrides:

```text
NETOPS_BIND=127.0.0.1
NETOPS_PORT=8787
NETOPS_SUBNET=192.168.1.0/24
NETOPS_MONITOR_INTERVAL=30
NETOPS_ALLOWED_ORIGINS=https://your-dashboard.example
```

The agent binds to `127.0.0.1` by default.

## API

Selected endpoints:

```text
GET  /api/health
GET  /api/dashboard
GET  /api/system
GET  /api/network
GET  /api/config
PUT  /api/config
GET  /api/devices/{ip}
PUT  /api/devices/{ip}
POST /api/scan
POST /api/tools/ping
POST /api/tools/dns
POST /api/tools/port
POST /api/tools/traceroute
```

Example health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/health
```

## Data Storage

Live monitoring information is kept locally in:

```text
agent/data/netops.db
```

The runtime database is excluded from Git through `.gitignore`.

Stored data includes:

- device inventory and editable metadata
- monitoring samples and 24-hour availability
- agent host resource/network samples
- active/resolved alerts
- timestamps and availability state

Historical samples are automatically bounded to prevent unlimited database growth.

## Security & Scope

NetOps Command Center is intended for **networks you own or are explicitly authorized to administer**.

The local agent:

- binds to localhost by default
- validates diagnostic host input
- limits discovery to IPv4
- limits the maximum number of scanned hosts
- avoids shell-based command construction
- keeps operational telemetry local
- requires explicit configuration before broader network access

## Technology Stack

**Frontend**

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas telemetry visualization

**Agent / Backend**

- Python
- FastAPI
- Uvicorn
- SQLite
- ICMP/ping
- ARP table discovery
- TCP sockets
- DNS resolution
- background worker threads

**DevOps**

- GitHub
- GitHub Actions
- GitHub Pages workflow
- Vercel-compatible static configuration

## Portfolio Value

This project demonstrates practical skills relevant to:

- IT Service Desk
- IT Help Desk
- Network Operations Center
- Network Engineer
- IT Infrastructure Engineer
- Junior System Administrator
- Technical Support Engineer
- Full-Stack / Backend Development
- Infrastructure Automation

It combines networking fundamentals with application development rather than presenting networking as a collection of isolated scripts.

## Developer

**Jim Rodmark Camus**  
BSIT — Network Technology  
GitHub: [@Sachibara](https://github.com/Sachibara)
