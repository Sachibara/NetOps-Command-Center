# NetOps Enterprise — Unified Network Operations Platform

This branch is the active unification workbench for the next flagship network product.

## Systems unified

NetOps Enterprise combines the strongest workflows from:

1. NetOps Command Center
2. Network Troubleshooting Toolkit
3. IPAM + Subnet Manager
4. Network Config Backup Manager
5. Network Documentation Generator
6. Infrastructure Health Monitor

The standalone portfolio projects remain unchanged.

## Shared network model

The unified relationship is:

Site → Device → IP / VLAN / Subnet → Telemetry / Services → Configuration → Troubleshooting → Documentation → Alerts / Audit

A single device record is reused across all modules rather than duplicated per tool.

## Current modules

### Command Center
- fleet health score
- operational radar
- device / alert / subnet / config / service KPIs
- latency telemetry chart
- subnet-capacity pressure
- site distribution
- backup posture
- attention queue
- unified activity feed

### Topology
- generated logical topology
- site filtering
- role filtering
- online / warning / offline / maintenance states
- direct device drill-down
- shared topology links

### Devices
- hostname / IP / MAC / vendor / role / platform
- site and status
- latency / loss / availability
- resource telemetry
- configuration-management state
- cross-module navigation

### Infrastructure Health
- CPU / memory / disk health
- host monitoring
- service health
- response time
- uptime context
- telemetry collection simulation

### IPAM & Subnet Manager
- subnet utilization
- VLAN plan
- address records
- conflict detection
- capacity alerts
- CIDR planner
- shared inventory correlation

### Config Backup Manager
- managed network devices
- versioned backups
- change detection
- latest backup posture
- version comparison / diff
- simulated backup cycle
- retention / schedule metadata

### Troubleshooting
- reachability
- path / gateway
- DNS
- TCP service checks
- configuration posture
- full guided diagnostic
- interpreted findings
- related-alert context
- CIDR calculator

### Documentation
- site/device living documentation
- port mappings
- network structure
- change notes
- printable documentation

### Alerts & Incidents
- health alerts
- service degradation
- config-backup failures
- IP conflicts
- subnet-capacity pressure
- acknowledgement workflow

### Unified Audit
- monitoring events
- IPAM actions
- configuration actions
- troubleshooting results
- documentation changes
- system import/export activity

## Persistence

Current unification build uses browser `localStorage` under:

`netops_enterprise_v1`

This is intentional for the first integration phase. The next phase will replace browser-only persistence with a backend/database adapter while retaining the shared model.

## Safety boundary

The portfolio build does not:

- scan arbitrary external networks
- execute arbitrary remote commands
- access production network devices
- store real network credentials
- restore configuration directly to real equipment

Discovery, probes, backups, and restore workflows remain safely simulated until an authorized agent/backend is connected.

## Branch strategy

- `main` — public portfolio and existing standalone systems
- `netops-enterprise-unification` — active unified network platform development


## Cloud workspace

NetOps Enterprise supports two operating modes:

- **Cloud Workspace** — Supabase Auth, persistent workspace state, RLS-protected data, server-side audit history, and role-based access.
- **Portfolio Demo** — no account required; all data remains browser-local and no external network infrastructure is contacted.

Cloud tables:

- `netops_profiles`
- `netops_workspaces`
- `netops_memberships`
- `netops_audit_events`

Roles:

- `admin`
- `engineer`
- `viewer`

The public frontend uses only the Supabase publishable key. No service-role or secret key is exposed.
