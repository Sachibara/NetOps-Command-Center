# NetOps Command Center

A portfolio-grade network operations dashboard for infrastructure monitoring, troubleshooting, and device inventory.

This project is designed for IT Service Desk, IT Help Desk, Network Engineering, NOC, System Administration, and IT Infrastructure roles.

## Architecture

NetOps Command Center has two modes:

- **Portfolio Demo Mode** — the public deployment uses realistic sample telemetry so recruiters can explore the full interface without access to a private LAN.
- **Live Agent Mode** — a Python agent runs on a Windows/Linux machine inside the network and provides real device discovery, latency, availability, port checks, alerts, and inventory data.

The public dashboard never pretends it can scan a private LAN from the cloud.

## Planned / Included Capabilities

- Network health overview
- Device discovery
- Availability and uptime tracking
- Ping latency and packet-loss monitoring
- Common service/port checks
- Device inventory
- Offline / high-latency alerts
- Search and filtering
- DNS lookup
- Ping troubleshooting
- TCP port test
- IPv4 subnet calculator
- Historical monitoring samples
- Responsive browser UI
- Local agent API
- SQLite telemetry store

## Public Deployment

The root of the repository is a static web application and can be deployed directly to Vercel.

## Local Live Mode

Install the agent dependencies:

```powershell
python -m pip install -r agent/requirements.txt
```

Run:

```powershell
python agent/netops_agent.py
```

Then open:

```text
http://127.0.0.1:8787
```

The agent serves the same dashboard locally, but with real network data.

## Developer

**Jim Rodmark Camus**  
BSIT — Network Technology  
GitHub: [@Sachibara](https://github.com/Sachibara)
