# NetOps Enterprise — Unified Network Operations Platform

**Canonical network-operations flagship for the Sachibara portfolio.**

**Live demo:** https://netops-enterprise.vercel.app/

**Portfolio:** https://jimcamus.vercel.app/

NetOps Enterprise consolidates the strongest network/infrastructure work from:

- NetOps Command Center
- Network Troubleshooting Toolkit
- IPAM + Subnet Manager
- Network Config Backup Manager
- Network Documentation Generator
- Infrastructure Health Monitor

## Unified model

`Site → Device → IP/VLAN/Subnet → Telemetry/Services → Configuration → Troubleshooting → Documentation → Alerts/Audit`

The browser product uses one shared device/network model across all modules instead of duplicating records per tool.

## Modules

- Command Center
- Topology
- Device inventory
- Infrastructure Health
- IPAM & Subnet Manager
- Config Backup Manager
- Troubleshooting
- Network Documentation
- Alerts & Incidents
- Unified Audit

## Modes

### Portfolio Demo
Safe browser-local workspace for recruiter evaluation. It does not scan arbitrary networks, connect to production equipment, or store real network credentials.

### Cloud Workspace
Supabase Auth + RLS-protected workspace persistence. The frontend uses a Supabase publishable key only; no service-role/secret key is shipped to the browser.

### Local Agent
The repository retains the original `agent/` implementation from NetOps Command Center for authorized LAN monitoring and diagnostics. It binds locally by default and is intended only for networks you own or are authorized to administer.

## Security principles

- localhost-first operational agent
- explicit/authorized network scope
- no arbitrary remote command execution
- publishable Supabase key only in the browser
- RLS-backed cloud workspace
- no production credentials in the public demo
- CSP and browser security headers in deployment config
- pinned Supabase JS client version

## Interface design

The UI shares one design language with the [portfolio](https://jimcamus.vercel.app/) and [CamusOS](https://github.com/Sachibara/CamusOS): charcoal surfaces, a single amber accent, Barlow Condensed display type, DM Sans for reading and DM Mono for labels.

- **Tokens first.** Every colour, radius and shadow is a CSS custom property at the top of the stylesheet; the light theme only swaps tokens.
- **Dark by default, light on request.** The toggle in the top bar stores the choice in `localStorage` (`camus-theme`); `ui.js` applies it before first paint and also drives the mobile navigation drawer.
- **Self-hosted fonts.** Font files live in `assets/fonts/` (SIL Open Font License, see `assets/fonts/FONTS.md`), so there are no third-party font requests.
- **Responsive.** The sidebar becomes a drawer below 900px, tables scroll inside their panels, and motion respects `prefers-reduced-motion`.

## Stack

HTML5 · CSS3 · JavaScript · Python · FastAPI · SQLite · Supabase · ICMP/DNS/TCP/ARP diagnostics

## Developer

**Jim Rodmark Camus**  
BSIT — Network Technology  
GitHub: [@Sachibara](https://github.com/Sachibara)
