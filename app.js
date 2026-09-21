(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const pageMeta = {
    overview: ["Network health", "Overview"],
    devices: ["Discovery & monitoring", "Devices"],
    topology: ["Network visualization", "Topology"],
    alerts: ["Operations awareness", "Alerts"],
    tools: ["Troubleshooting toolkit", "Troubleshooting"],
    inventory: ["Asset visibility", "Inventory"],
    settings: ["Monitoring policy", "Settings"],
    about: ["Project architecture", "About"]
  };

  const serviceNames = {
    22: "SSH", 53: "DNS", 80: "HTTP", 88: "Kerberos", 135: "RPC",
    389: "LDAP", 443: "HTTPS", 445: "SMB", 554: "RTSP", 3389: "RDP",
    8080: "HTTP-ALT", 9100: "RAW"
  };

  const state = {
    mode: localStorage.getItem("netops_mode") || (location.port === "8787" ? "live" : "demo"),
    agentUrl: localStorage.getItem("netops_agent_url") || (location.port === "8787" ? location.origin : "http://127.0.0.1:8787"),
    activePage: "overview",
    data: null,
    lastRefresh: null
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(title, message = "", type = "info") {
    const node = document.createElement("div");
    node.className = "toast" + (type === "error" ? " error" : "");
    const strong = document.createElement("strong");
    strong.textContent = title;
    const span = document.createElement("span");
    span.textContent = message;
    node.append(strong, span);
    $("toastRegion").appendChild(node);
    setTimeout(() => node.remove(), 4400);
  }

  function formatTime(iso) {
    if (!iso) return "Never";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso);
    const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return seconds + "s ago";
    if (seconds < 3600) return Math.round(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.round(seconds / 3600) + "h ago";
    return Math.round(seconds / 86400) + "d ago";
  }


  function formatBytes(value, perSecond = false) {
    let n = Number(value) || 0;
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
    return n.toFixed(digits) + " " + units[i] + (perSecond ? "/s" : "");
  }

  function formatDuration(seconds) {
    let s = Math.max(0, Number(seconds) || 0);
    const days = Math.floor(s / 86400); s %= 86400;
    const hours = Math.floor(s / 3600); s %= 3600;
    const minutes = Math.floor(s / 60);
    if (days) return days + "d " + hours + "h";
    if (hours) return hours + "h " + minutes + "m";
    return minutes + "m";
  }

  function formatClock(date = new Date()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || 8000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Request failed (" + response.status + ")");
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function agentApi(path) {
    return state.agentUrl.replace(/\/$/, "") + path;
  }

  function setAgentStatus(kind, title, detail) {
    $("agentDot").className = "status-dot" + (kind ? " " + kind : "");
    $("agentStatus").textContent = title;
    $("agentDetail").textContent = detail;
  }

  async function loadData(showToast = false) {
    if (state.mode === "demo") {
      state.data = JSON.parse(JSON.stringify(window.NETOPS_DEMO));
      // Keep relative-time labels fresh while preserving the representative values.
      state.data.generated_at = new Date().toISOString();
      state.lastRefresh = new Date();
      setAgentStatus("", "Demo mode", "Portfolio telemetry");
      renderAll();
      if (showToast) toast("Dashboard refreshed", "Representative demo telemetry loaded.");
      return;
    }

    setAgentStatus("", "Connecting…", state.agentUrl);
    try {
      const data = await fetchJson(agentApi("/api/dashboard"), { timeout: 10000 });
      state.data = data;
      state.lastRefresh = new Date();
      setAgentStatus("live", "Live agent connected", state.agentUrl.replace(/^https?:\/\//, ""));
      renderAll();
      if (showToast) toast("Live data refreshed", "Latest network telemetry received from the NetOps Agent.");
    } catch (error) {
      setAgentStatus("error", "Agent unavailable", state.agentUrl.replace(/^https?:\/\//, ""));
      toast("Could not reach NetOps Agent", error.message, "error");
      if (!state.data) {
        state.data = JSON.parse(JSON.stringify(window.NETOPS_DEMO));
        renderAll();
      }
    }
  }

  function openPage(page) {
    state.activePage = page;
    qsa("[data-page-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.pagePanel === page));
    qsa("[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
    $("pageEyebrow").textContent = pageMeta[page][0];
    $("pageTitle").textContent = pageMeta[page][1];
    $("sidebar").classList.remove("open");
    if (page === "devices") renderDevices();
    if (page === "topology") renderTopology();
    if (page === "alerts") renderAlerts();
    if (page === "inventory") renderInventory();
    if (page === "settings") renderSettings();
  }

  qsa("[data-page]").forEach((button) => button.addEventListener("click", () => openPage(button.dataset.page)));
  qsa("[data-go]").forEach((button) => button.addEventListener("click", () => openPage(button.dataset.go)));
  $("menuButton").addEventListener("click", () => $("sidebar").classList.toggle("open"));

  function deriveStats() {
    const devices = state.data?.devices || [];
    const activeAlerts = (state.data?.alerts || []).filter((a) => a.state !== "resolved");
    const online = devices.filter((d) => d.status === "online");
    const offline = devices.filter((d) => d.status === "offline");
    const unknown = devices.filter((d) => !["online", "offline"].includes(d.status));
    const latencies = online.map((d) => Number(d.latency_ms)).filter(Number.isFinite);
    const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const availability = devices.length ? (online.length / devices.length) * 100 : 0;
    return { devices, activeAlerts, online, offline, unknown, avgLatency, availability };
  }

  function renderOverview() {
    if (!state.data) return;
    const s = deriveStats();

    $("statDevices").textContent = s.devices.length;
    $("sidebarMonitorCount").textContent = s.devices.length + " device" + (s.devices.length === 1 ? "" : "s");
    $("statAvailability").textContent = s.availability.toFixed(1) + "%";
    $("statLatency").textContent = s.avgLatency.toFixed(1) + " ms";
    $("statAlerts").textContent = s.activeAlerts.length;
    $("statAlertsNote").textContent = s.activeAlerts.some((a) => a.severity === "critical") ? "Critical attention required" : "Requires attention";

    $("onlineCount").textContent = s.online.length;
    $("offlineCount").textContent = s.offline.length;
    $("alertCount").textContent = s.activeAlerts.length;

    const healthTitle = $("healthTitle");
    const healthBadge = $("healthBadge");
    const healthCopy = $("healthCopy");
    healthBadge.className = "pill";
    if (s.offline.length || s.activeAlerts.some((a) => a.severity === "critical")) {
      healthTitle.textContent = "Degraded";
      healthBadge.textContent = "Attention required";
      healthBadge.classList.add("negative");
      healthCopy.textContent = "One or more monitored devices are unreachable or have a critical operational alert.";
    } else if (s.activeAlerts.some((a) => a.severity === "warning")) {
      healthTitle.textContent = "Operational";
      healthBadge.textContent = "Warnings present";
      healthBadge.classList.add("warning");
      healthCopy.textContent = "Core monitoring is operational, with warning conditions that should be reviewed.";
    } else {
      healthTitle.textContent = "Healthy";
      healthBadge.textContent = "Operational";
      healthBadge.classList.add("positive");
      healthCopy.textContent = "All monitored infrastructure is responding within configured operational thresholds.";
    }

    $("healthOrb").classList.toggle("active", s.online.length > 0);

    $("donutOnline").textContent = s.online.length;
    $("donutOffline").textContent = s.offline.length;
    $("donutUnknown").textContent = s.unknown.length;
    $("donutPercent").textContent = s.availability.toFixed(0) + "%";
    const total = Math.max(1, s.devices.length);
    const onlineDeg = (s.online.length / total) * 360;
    const offlineDeg = onlineDeg + (s.offline.length / total) * 360;
    $("statusDonut").style.setProperty("--online", onlineDeg + "deg");
    $("statusDonut").style.setProperty("--offline", offlineDeg + "deg");

    const overviewAlerts = $("overviewAlertList");
    const recent = [...s.activeAlerts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
    overviewAlerts.innerHTML = recent.length ? recent.map((alert) => `
      <div class="alert-row">
        <span class="alert-severity ${escapeHtml(alert.severity)}"></span>
        <div><strong>${escapeHtml(alert.title)}</strong><small>${escapeHtml(alert.device_name || alert.device_ip || "Network")}</small></div>
        <time>${escapeHtml(formatTime(alert.created_at))}</time>
      </div>
    `).join("") : '<div class="empty-state">No active alerts.</div>';

    const top = s.devices.filter((d) => d.status === "online" && Number.isFinite(Number(d.latency_ms)))
      .sort((a, b) => Number(b.latency_ms) - Number(a.latency_ms)).slice(0, 5);
    $("topLatencyList").innerHTML = top.map((device) => `
      <div class="rank-item">
        <div><strong>${escapeHtml(device.hostname || device.ip)}</strong><span>${escapeHtml(device.ip)} · ${escapeHtml(device.role || "Device")}</span></div>
        <span class="latency-value">${Number(device.latency_ms).toFixed(1)} ms</span>
      </div>
    `).join("") || '<div class="empty-state">No latency data.</div>';

    drawLatencyChart();
  }


  function renderSystemHealth() {
    const system = state.data?.system || {};
    $("systemHostLabel").textContent = system.hostname || "Monitoring node";
    $("systemCpu").textContent = Number.isFinite(Number(system.cpu_percent)) ? Number(system.cpu_percent).toFixed(1) + "%" : "—";
    $("systemMemory").textContent = Number.isFinite(Number(system.memory_percent)) ? Number(system.memory_percent).toFixed(1) + "%" : "—";
    $("systemDisk").textContent = Number.isFinite(Number(system.disk_percent)) ? Number(system.disk_percent).toFixed(1) + "%" : "—";
    $("systemCpuMeter").value = Number(system.cpu_percent) || 0;
    $("systemMemoryMeter").value = Number(system.memory_percent) || 0;
    $("systemDiskMeter").value = Number(system.disk_percent) || 0;
    $("systemDownload").textContent = system.download_bps != null ? formatBytes(system.download_bps, true) : "—";
    $("systemUpload").textContent = system.upload_bps != null ? formatBytes(system.upload_bps, true) : "—";
    $("systemDownloadTotal").textContent = "Total " + (system.bytes_recv != null ? formatBytes(system.bytes_recv) : "—");
    $("systemUploadTotal").textContent = "Total " + (system.bytes_sent != null ? formatBytes(system.bytes_sent) : "—");
    $("systemUptime").textContent = system.uptime_seconds != null ? formatDuration(system.uptime_seconds) : "—";
    $("systemPlatform").textContent = system.platform || "—";
  }

  function drawLatencyChart() {
    const canvas = $("latencyChart");
    if (!canvas || !state.data) return;
    const samples = state.data.latency_samples || [];
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(360, rect.width);
    const height = 255;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);

    const css = getComputedStyle(document.documentElement);
    const border = css.getPropertyValue("--border").trim();
    const green = css.getPropertyValue("--green").trim();
    const amber = css.getPropertyValue("--amber").trim();
    const muted = css.getPropertyValue("--muted").trim();

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = border;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const threshold = Number(state.data.overview?.warning_latency_ms || 100);
    const values = samples.map((s) => Number(s.avg_latency_ms)).filter(Number.isFinite);
    const max = Math.max(threshold * 1.2, ...values, 10);

    const thresholdY = height - (threshold / max) * (height - 26) - 13;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = amber;
    ctx.beginPath(); ctx.moveTo(0, thresholdY); ctx.lineTo(width, thresholdY); ctx.stroke();
    ctx.setLineDash([]);

    if (values.length) {
      ctx.strokeStyle = green;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      values.forEach((value, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const y = height - (value / max) * (height - 26) - 13;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = muted;
    ctx.font = "11px system-ui";
    ctx.fillText("0 ms", 5, height - 6);
    ctx.fillText(Math.round(max) + " ms", 5, 14);
    $("latencyRangeLabel").textContent = samples.length ? samples.length + " recent samples" : "No samples";
  }

  function serviceTag(port) {
    const name = serviceNames[port] || port;
    return '<span title="TCP/' + escapeHtml(port) + '">' + escapeHtml(name) + '</span>';
  }

  function deviceMatches(device) {
    const query = $("deviceSearch").value.trim().toLowerCase();
    const status = $("deviceStatusFilter").value;
    const role = $("deviceRoleFilter").value;
    const haystack = [device.ip, device.hostname, device.mac, device.vendor, device.role, device.platform].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (status === "all" || device.status === status)
      && (role === "all" || device.role === role);
  }

  function updateRoleFilter() {
    const select = $("deviceRoleFilter");
    const current = select.value;
    const roles = [...new Set((state.data?.devices || []).map((d) => d.role).filter(Boolean))].sort();
    select.innerHTML = '<option value="all">All roles</option>' + roles.map((r) => '<option value="' + escapeHtml(r) + '">' + escapeHtml(r) + "</option>").join("");
    if (roles.includes(current)) select.value = current;
  }

  function renderDevices() {
    if (!state.data) return;
    updateRoleFilter();
    const tbody = $("deviceTableBody");
    const devices = (state.data.devices || []).filter(deviceMatches);
    if (!devices.length) {
      tbody.innerHTML = '<tr><td class="empty-state" colspan="8">No devices match the current filters.</td></tr>';
      return;
    }
    tbody.innerHTML = devices.map((d) => `
      <tr class="device-row" data-ip="${escapeHtml(d.ip)}">
        <td><span class="status-badge ${escapeHtml(d.status || "unknown")}">${escapeHtml(d.status || "unknown")}</span></td>
        <td class="device-cell"><strong>${escapeHtml(d.hostname || "Unidentified")}</strong><span>${escapeHtml(d.vendor || "Unknown vendor")}</span></td>
        <td><code>${escapeHtml(d.ip)}</code></td>
        <td><code>${escapeHtml(d.mac || "Unknown")}</code></td>
        <td>${escapeHtml(d.role || "Device")}</td>
        <td>${Number.isFinite(Number(d.latency_ms)) ? Number(d.latency_ms).toFixed(1) + " ms" : "—"}</td>
        <td><div class="service-tags">${(d.services || []).slice(0, 6).map(serviceTag).join("") || "<span>None</span>"}</div></td>
        <td>${escapeHtml(formatTime(d.last_seen))}</td>
      </tr>
    `).join("");
    qsa("tr.device-row", tbody).forEach((row) => row.addEventListener("click", () => openDeviceDetail(row.dataset.ip)));
  }


  function deviceCategory(device) {
    const role = String(device.role || "").toLowerCase();
    if (role.includes("router") || device.ip?.endsWith(".1")) return "gateway";
    if (role.includes("switch")) return "switch";
    if (role.includes("server")) return "server";
    if (role.includes("access") || role.includes("wireless")) return "wireless";
    return "endpoint";
  }

  function renderTopology() {
    if (!state.data) return;
    const devices = state.data.devices || [];
    const canvas = $("topologyCanvas");
    $("topologySubnet").textContent = state.data.overview?.monitored_subnet || "Monitored network";
    if (!devices.length) {
      canvas.innerHTML = '<div class="empty-state">No discovered devices to map.</div>';
      $("topologySummary").innerHTML = "";
      return;
    }

    const width = Math.max(760, canvas.clientWidth || 760);
    const height = 540;
    const gateway = devices.find((d) => deviceCategory(d) === "gateway") || devices[0];
    const others = devices.filter((d) => d !== gateway);
    const centerX = width / 2 - 75;
    const centerY = height / 2 - 37;
    const positions = new Map();
    positions.set(gateway.ip, {x:centerX,y:centerY});

    others.forEach((device, index) => {
      const angle = (Math.PI * 2 * index / Math.max(1, others.length)) - Math.PI / 2;
      const radiusX = Math.min(width * .36, 300);
      const radiusY = 190;
      positions.set(device.ip, {
        x: Math.max(18, Math.min(width - 168, width / 2 - 75 + Math.cos(angle) * radiusX)),
        y: Math.max(18, Math.min(height - 92, height / 2 - 37 + Math.sin(angle) * radiusY))
      });
    });

    const links = others.map((device) => {
      const a = positions.get(gateway.ip), b = positions.get(device.ip);
      const x1 = a.x + 75, y1 = a.y + 37, x2 = b.x + 75, y2 = b.y + 37;
      const dx = x2 - x1, dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return '<span class="topology-link" style="left:'+x1+'px;top:'+y1+'px;width:'+length+'px;transform:rotate('+angle+'deg)"></span>';
    }).join("");

    const nodes = devices.map((device) => {
      const p = positions.get(device.ip);
      const category = deviceCategory(device);
      return '<button type="button" class="topology-node '+category+' '+escapeHtml(device.status || "unknown")+'" data-device-ip="'+escapeHtml(device.ip)+'" style="left:'+p.x+'px;top:'+p.y+'px">'
        +'<strong>'+escapeHtml(device.hostname || device.ip)+'</strong>'
        +'<span>'+escapeHtml(device.ip)+' · '+escapeHtml(device.role || "Device")+'</span>'
        +'<span class="status-badge node-status '+escapeHtml(device.status || "unknown")+'">'+escapeHtml(device.status || "unknown")+'</span>'
        +'</button>';
    }).join("");

    canvas.innerHTML = '<div class="topology-network" style="width:'+width+'px;height:'+height+'px">'+links+nodes+'</div>';
    qsa("[data-device-ip]", canvas).forEach((node) => node.addEventListener("click", () => openDeviceDetail(node.dataset.deviceIp)));

    const roles = {};
    devices.forEach((d) => { roles[d.role || "Other"] = (roles[d.role || "Other"] || 0) + 1; });
    const topRoles = Object.entries(roles).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const online = devices.filter((d)=>d.status==="online").length;
    $("topologySummary").innerHTML =
      '<div class="topology-insight"><span>Gateway / root</span><strong>'+escapeHtml(gateway.hostname || gateway.ip)+'</strong></div>'
      +'<div class="topology-insight"><span>Discovered nodes</span><strong>'+devices.length+'</strong></div>'
      +'<div class="topology-insight"><span>Reachable now</span><strong>'+online+' / '+devices.length+'</strong></div>'
      +topRoles.map(([role,count])=>'<div class="topology-insight"><span>'+escapeHtml(role)+'</span><strong>'+count+'</strong></div>').join("");
  }

  function demoDeviceDetail(ip) {
    const device = (state.data?.devices || []).find((d) => d.ip === ip);
    if (!device) return null;
    const samples = Array.from({length: 32}, (_, index) => {
      const online = device.status !== "offline" || index < 24;
      const base = Number(device.latency_ms) || 12;
      return {
        timestamp: new Date(Date.now() - (31-index)*15*60000).toISOString(),
        status: online ? "online" : "offline",
        latency_ms: online ? Math.max(1, base + Math.sin(index/3)*3 + (index%4)) : null,
        packet_loss: online ? (device.packet_loss || 0) : 100
      };
    });
    return {device, samples};
  }

  async function openDeviceDetail(ip) {
    let detail;
    if (state.mode === "demo") {
      detail = demoDeviceDetail(ip);
    } else {
      try {
        detail = await fetchJson(agentApi("/api/devices/" + encodeURIComponent(ip)));
      } catch (error) {
        toast("Could not load device details", error.message, "error");
        return;
      }
    }
    if (!detail) return;
    const d = detail.device;
    $("deviceDialogTitle").textContent = d.hostname || d.ip;
    $("detailStatus").textContent = d.status || "unknown";
    $("detailIp").textContent = d.ip;
    $("detailLatency").textContent = Number.isFinite(Number(d.latency_ms)) ? Number(d.latency_ms).toFixed(1) + " ms" : "—";
    $("detailAvailability").textContent = d.availability_24h != null ? Number(d.availability_24h).toFixed(2) + "%" : "Insufficient history";
    $("detailFirstSeen").textContent = d.first_seen ? new Date(d.first_seen).toLocaleString() : "—";
    $("detailLastSeen").textContent = d.last_seen ? new Date(d.last_seen).toLocaleString() : "—";
    $("detailHostname").value = d.hostname || "";
    $("detailVendor").value = d.vendor || "";
    $("detailRole").value = d.role || "";
    $("detailPlatform").value = d.platform || "";
    $("detailServices").textContent = "Services: " + ((d.services || []).map((p)=>serviceNames[p] ? serviceNames[p]+" ("+p+")" : p).join(", ") || "None detected");
    $("deviceDialog").dataset.deviceIp = d.ip;
    $("deviceDialog").showModal();
    requestAnimationFrame(() => drawDeviceHistory(detail.samples || []));
  }

  function drawDeviceHistory(samples) {
    const canvas = $("deviceHistoryChart");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(420, rect.width || 700), height = 220;
    canvas.width = width * ratio; canvas.height = height * ratio;
    const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
    const css = getComputedStyle(document.documentElement);
    const border = css.getPropertyValue("--border").trim();
    const cyan = css.getPropertyValue("--cyan").trim();
    ctx.clearRect(0,0,width,height); ctx.strokeStyle=border; ctx.lineWidth=1;
    for(let i=1;i<5;i++){const y=height*i/5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    const values=samples.map(s=>Number(s.latency_ms)).filter(Number.isFinite);
    const max=Math.max(10,...values)*1.15;
    ctx.strokeStyle=cyan;ctx.lineWidth=2.2;ctx.beginPath();
    let started=false;
    samples.forEach((s,i)=>{
      const v=Number(s.latency_ms); if(!Number.isFinite(v)){started=false;return;}
      const x=samples.length===1?width/2:i/(samples.length-1)*width;
      const y=height-(v/max)*(height-24)-12;
      if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }

  function renderAlerts() {
    if (!state.data) return;
    const alerts = state.data.alerts || [];
    const counts = {
      critical: alerts.filter((a) => a.state !== "resolved" && a.severity === "critical").length,
      warning: alerts.filter((a) => a.state !== "resolved" && a.severity === "warning").length,
      info: alerts.filter((a) => a.state !== "resolved" && a.severity === "info").length,
      resolved: alerts.filter((a) => a.state === "resolved").length
    };
    $("criticalAlertCount").textContent = counts.critical;
    $("warningAlertCount").textContent = counts.warning;
    $("infoAlertCount").textContent = counts.info;
    $("resolvedAlertCount").textContent = counts.resolved;

    const query = $("alertSearch").value.trim().toLowerCase();
    const severity = $("alertSeverityFilter").value;
    const status = $("alertStateFilter").value;
    const filtered = alerts.filter((a) => {
      const haystack = [a.title, a.message, a.device_name, a.device_ip].join(" ").toLowerCase();
      return (!query || haystack.includes(query))
        && (severity === "all" || a.severity === severity)
        && (status === "all" || (status === "resolved" ? a.state === "resolved" : a.state !== "resolved"));
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    $("alertFeed").innerHTML = filtered.length ? filtered.map((a) => `
      <article class="alert-card ${escapeHtml(a.severity)}">
        <div class="alert-icon">${a.severity === "critical" ? "!" : a.severity === "warning" ? "△" : "i"}</div>
        <div>
          <h4>${escapeHtml(a.title)} ${a.state === "resolved" ? '<span class="pill positive">Resolved</span>' : ""}</h4>
          <p>${escapeHtml(a.message)}</p>
          <div class="alert-meta">${escapeHtml(a.device_name || "Network")} · ${escapeHtml(a.device_ip || "—")}</div>
        </div>
        <time>${escapeHtml(formatTime(a.created_at))}</time>
      </article>
    `).join("") : '<div class="empty-state">No alerts match the current filters.</div>';
  }

  function renderInventory() {
    if (!state.data) return;
    const devices = state.data.devices || [];
    const groups = {};
    devices.forEach((d) => { groups[d.role || "Other"] = (groups[d.role || "Other"] || 0) + 1; });
    const summary = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $("inventorySummary").innerHTML = summary.map(([role, count]) => `
      <div class="inventory-chip"><span>${escapeHtml(role)}</span><strong>${count}</strong></div>
    `).join("");

    $("inventoryTableBody").innerHTML = devices.map((d) => `
      <tr>
        <td>${escapeHtml(d.hostname || "Unidentified")}</td>
        <td><code>${escapeHtml(d.ip)}</code></td>
        <td><code>${escapeHtml(d.mac || "Unknown")}</code></td>
        <td>${escapeHtml(d.vendor || "Unknown")}</td>
        <td>${escapeHtml(d.role || "Device")}</td>
        <td>${escapeHtml(d.platform || "Unknown")}</td>
        <td><div class="service-tags">${(d.services || []).map(serviceTag).join("") || "<span>None</span>"}</div></td>
        <td><span class="status-badge ${escapeHtml(d.status || "unknown")}">${escapeHtml(d.status || "unknown")}</span></td>
      </tr>
    `).join("") || '<tr><td class="empty-state" colspan="8">No inventory data.</td></tr>';
  }


  function currentConfig() {
    const overview = state.data?.overview || {};
    return {
      subnet: overview.monitored_subnet || "auto",
      monitor_interval_seconds: overview.scan_interval_seconds || 30,
      warning_latency_ms: overview.warning_latency_ms || 100,
      warning_packet_loss_percent: overview.warning_packet_loss_percent ?? 20,
      scan_timeout_ms: overview.scan_timeout_ms || 550,
      max_scan_hosts: overview.max_scan_hosts || 256,
      service_ports: overview.service_ports || [22,53,80,443,445,3389,9100]
    };
  }

  async function renderSettings() {
    let config = currentConfig();
    if (state.mode === "live") {
      try {
        config = await fetchJson(agentApi("/api/config"));
      } catch (error) {
        toast("Could not load agent settings", error.message, "error");
      }
    }

    $("configSubnet").value = config.subnet || "auto";
    $("configInterval").value = config.monitor_interval_seconds ?? 30;
    $("configTimeout").value = config.scan_timeout_ms ?? 550;
    $("configMaxHosts").value = config.max_scan_hosts ?? 256;
    $("configLatency").value = config.warning_latency_ms ?? 100;
    $("configLoss").value = config.warning_packet_loss_percent ?? 20;
    $("configPorts").value = (config.service_ports || []).join(", ");
    $("settingsModeNote").textContent = state.mode === "live"
      ? "Saving updates the local NetOps Agent configuration."
      : "Demo mode previews settings only; use Live Agent Mode to persist them.";
  }

  $("saveSettingsButton").addEventListener("click", async () => {
    const ports = $("configPorts").value.split(",").map((v)=>Number(v.trim())).filter((v)=>Number.isInteger(v) && v>=1 && v<=65535);
    const body = {
      subnet: $("configSubnet").value.trim() || "auto",
      monitor_interval_seconds: Number($("configInterval").value),
      scan_timeout_ms: Number($("configTimeout").value),
      max_scan_hosts: Number($("configMaxHosts").value),
      warning_latency_ms: Number($("configLatency").value),
      warning_packet_loss_percent: Number($("configLoss").value),
      service_ports: ports
    };

    if (state.mode === "demo") {
      state.data.overview = {
        ...(state.data.overview || {}),
        monitored_subnet: body.subnet,
        scan_interval_seconds: body.monitor_interval_seconds,
        warning_latency_ms: body.warning_latency_ms,
        warning_packet_loss_percent: body.warning_packet_loss_percent,
        scan_timeout_ms: body.scan_timeout_ms,
        max_scan_hosts: body.max_scan_hosts,
        service_ports: body.service_ports
      };
      toast("Demo settings updated", "These changes last only until the page is reloaded.");
      renderAll();
      return;
    }

    try {
      const saved = await fetchJson(agentApi("/api/config"), {method:"PUT", body:JSON.stringify(body)});
      toast("Agent settings saved", "Monitoring policy updated successfully.");
      await loadData(false);
      Object.assign(state.data.overview, {
        monitored_subnet: saved.subnet,
        scan_interval_seconds: saved.monitor_interval_seconds,
        warning_latency_ms: saved.warning_latency_ms,
        warning_packet_loss_percent: saved.warning_packet_loss_percent,
        scan_timeout_ms: saved.scan_timeout_ms,
        max_scan_hosts: saved.max_scan_hosts,
        service_ports: saved.service_ports
      });
      renderSettings();
    } catch (error) {
      toast("Could not save settings", error.message, "error");
    }
  });

  function renderAll() {
    if (!state.data) return;
    $("lastRefresh").textContent = state.lastRefresh ? formatClock(state.lastRefresh) : "—";
    renderOverview();
    renderSystemHealth();
    renderDevices();
    renderTopology();
    renderAlerts();
    renderInventory();
    if (state.activePage === "settings") renderSettings();
  }

  async function scanNetwork() {
    if (state.mode === "demo") {
      toast("Demo scan complete", "Representative devices and telemetry are already loaded.");
      return;
    }
    $("scanButton").disabled = true;
    $("deviceScanButton").disabled = true;
    try {
      const result = await fetchJson(agentApi("/api/scan"), { method: "POST", body: "{}" });
      toast("Discovery complete", (result.discovered ?? 0) + " device(s) detected.");
      await loadData();
    } catch (error) {
      toast("Discovery failed", error.message, "error");
    } finally {
      $("scanButton").disabled = false;
      $("deviceScanButton").disabled = false;
    }
  }

  async function runLiveTool(path, body) {
    return fetchJson(agentApi(path), { method: "POST", body: JSON.stringify(body), timeout: 15000 });
  }

  $("pingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const host = $("pingHost").value.trim();
    $("pingOutput").textContent = "Running ping…";
    if (state.mode === "demo") {
      await new Promise((r) => setTimeout(r, 450));
      $("pingOutput").textContent = `PING ${host}\nReply received\nPackets: Sent = 4, Received = 4, Lost = 0 (0% loss)\nAverage round-trip = 12.4 ms\n\nDemo mode: start the local agent for a real ICMP test.`;
      return;
    }
    try {
      const r = await runLiveTool("/api/tools/ping", { host });
      $("pingOutput").textContent = r.output || JSON.stringify(r, null, 2);
    } catch (error) { $("pingOutput").textContent = "Error: " + error.message; }
  });

  $("dnsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const host = $("dnsHost").value.trim();
    $("dnsOutput").textContent = "Resolving…";
    if (state.mode === "demo") {
      await new Promise((r) => setTimeout(r, 300));
      $("dnsOutput").textContent = `Host: ${host}\nA: 93.184.216.34\n\nDemo mode: start the local agent for a real resolver lookup.`;
      return;
    }
    try {
      const r = await runLiveTool("/api/tools/dns", { host });
      $("dnsOutput").textContent = r.output || JSON.stringify(r, null, 2);
    } catch (error) { $("dnsOutput").textContent = "Error: " + error.message; }
  });

  $("portForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const host = $("portHost").value.trim();
    const port = Number($("portNumber").value);
    $("portOutput").textContent = "Testing TCP connection…";
    if (state.mode === "demo") {
      await new Promise((r) => setTimeout(r, 300));
      $("portOutput").textContent = `${host}:${port} — OPEN\nTCP handshake completed in 18 ms\n\nDemo mode: start the local agent for a real service check.`;
      return;
    }
    try {
      const r = await runLiveTool("/api/tools/port", { host, port });
      $("portOutput").textContent = r.output || JSON.stringify(r, null, 2);
    } catch (error) { $("portOutput").textContent = "Error: " + error.message; }
  });


  $("tracerouteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const host = $("tracerouteHost").value.trim();
    $("tracerouteOutput").textContent = "Tracing route…";
    if (state.mode === "demo") {
      await new Promise((r) => setTimeout(r, 350));
      $("tracerouteOutput").textContent =
        "Tracing route to " + host + "\n"
        + "1   192.168.10.1      2 ms\n"
        + "2   10.20.0.1         8 ms\n"
        + "3   203.0.113.1      14 ms\n"
        + "4   " + host + "      21 ms\n\n"
        + "Demo mode: run the local agent for a real routed path.";
      return;
    }
    try {
      const r = await runLiveTool("/api/tools/traceroute", {host});
      $("tracerouteOutput").textContent = r.output || JSON.stringify(r, null, 2);
    } catch (error) {
      $("tracerouteOutput").textContent = "Error: " + error.message;
    }
  });

  $("routeTableButton").addEventListener("click", async () => {
    $("routeTableOutput").textContent = "Loading interfaces and routes…";
    if (state.mode === "demo") {
      $("routeTableOutput").textContent =
        "Interfaces\nEthernet  — 192.168.10.15/24 — 1 Gbps — UP\n"
        + "Wi-Fi     — disconnected\n\n"
        + "Routes\n0.0.0.0/0 via 192.168.10.1\n192.168.10.0/24 on-link";
      return;
    }
    try {
      const r = await fetchJson(agentApi("/api/network"));
      const interfaces = (r.interfaces || []).map((i) => {
        const addresses = (i.addresses || []).map((a) => a.address).filter(Boolean).join(", ");
        return i.name + " — " + (i.is_up ? "UP" : "DOWN") + (i.speed_mbps ? " — " + i.speed_mbps + " Mbps" : "") + "\n  " + addresses;
      }).join("\n");
      $("routeTableOutput").textContent = "Interfaces\n" + interfaces + "\n\nRoutes\n" + (r.routes || "No route data.");
    } catch (error) {
      $("routeTableOutput").textContent = "Error: " + error.message;
    }
  });

  function ipToInt(ip) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) throw new Error("Invalid IPv4 address");
    return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
  }

  function intToIp(n) {
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }

  function calculateSubnet(cidr) {
    const [ip, prefixRaw] = cidr.trim().split("/");
    const prefix = Number(prefixRaw);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("Prefix must be between /0 and /32");
    const value = ipToInt(ip);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = (value & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const total = 2 ** (32 - prefix);
    const usable = prefix >= 31 ? total : Math.max(0, total - 2);
    const first = prefix === 32 ? network : prefix === 31 ? network : network + 1;
    const last = prefix === 32 ? broadcast : prefix === 31 ? broadcast : broadcast - 1;
    return {
      network: intToIp(network),
      broadcast: intToIp(broadcast),
      netmask: intToIp(mask),
      first: intToIp(first >>> 0),
      last: intToIp(last >>> 0),
      total,
      usable
    };
  }

  $("subnetForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const r = calculateSubnet($("subnetInput").value);
      $("subnetOutput").textContent = [
        "Network:    " + r.network,
        "Netmask:    " + r.netmask,
        "Broadcast:  " + r.broadcast,
        "First host: " + r.first,
        "Last host:  " + r.last,
        "Addresses:  " + r.total.toLocaleString(),
        "Usable:     " + r.usable.toLocaleString()
      ].join("\n");
    } catch (error) {
      $("subnetOutput").textContent = "Error: " + error.message;
    }
  });

  function exportInventory() {
    const devices = state.data?.devices || [];
    const rows = [["Hostname","IP","MAC","Vendor","Role","Platform","Status","Latency ms","Services","Last seen"]];
    devices.forEach((d) => rows.push([
      d.hostname || "", d.ip || "", d.mac || "", d.vendor || "", d.role || "", d.platform || "",
      d.status || "", d.latency_ms ?? "", (d.services || []).join("|"), d.last_seen || ""
    ]));
    const csv = rows.map((row) => row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "netops-inventory.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $("refreshButton").addEventListener("click", () => loadData(true));
  $("deviceRefreshButton").addEventListener("click", () => loadData(true));
  $("alertsRefreshButton").addEventListener("click", () => loadData(true));
  $("topologyRefreshButton").addEventListener("click", () => loadData(true));
  $("scanButton").addEventListener("click", scanNetwork);
  $("deviceScanButton").addEventListener("click", scanNetwork);
  $("exportInventoryButton").addEventListener("click", exportInventory);

  ["deviceSearch","deviceStatusFilter","deviceRoleFilter"].forEach((id) => $(id).addEventListener(id === "deviceSearch" ? "input" : "change", renderDevices));
  ["alertSearch","alertSeverityFilter","alertStateFilter"].forEach((id) => $(id).addEventListener(id === "alertSearch" ? "input" : "change", renderAlerts));


  $("saveDeviceButton").addEventListener("click", async (event) => {
    event.preventDefault();
    const ip = $("deviceDialog").dataset.deviceIp;
    if (!ip) return;
    const body = {
      hostname: $("detailHostname").value.trim(),
      vendor: $("detailVendor").value.trim(),
      role: $("detailRole").value.trim(),
      platform: $("detailPlatform").value.trim()
    };

    if (state.mode === "demo") {
      const device = (state.data.devices || []).find((d) => d.ip === ip);
      if (device) Object.assign(device, body);
      $("deviceDialog").close();
      renderAll();
      toast("Demo metadata updated", "Changes are kept only for the current demo session.");
      return;
    }

    try {
      await fetchJson(agentApi("/api/devices/" + encodeURIComponent(ip)), {
        method: "PUT",
        body: JSON.stringify(body)
      });
      $("deviceDialog").close();
      await loadData(false);
      toast("Device metadata saved", ip);
    } catch (error) {
      toast("Could not save device", error.message, "error");
    }
  });

  const dialog = $("connectionDialog");
  $("connectionButton").addEventListener("click", () => {
    qsa('input[name="mode"]').forEach((radio) => { radio.checked = radio.value === state.mode; });
    $("agentUrlInput").value = state.agentUrl;
    dialog.showModal();
  });

  $("saveConnectionButton").addEventListener("click", (event) => {
    event.preventDefault();
    const selected = qsa('input[name="mode"]').find((r) => r.checked)?.value || "demo";
    const url = $("agentUrlInput").value.trim().replace(/\/$/, "");
    if (selected === "live" && !/^https?:\/\//i.test(url)) {
      toast("Invalid agent URL", "Use a URL such as http://127.0.0.1:8787", "error");
      return;
    }
    state.mode = selected;
    state.agentUrl = url || "http://127.0.0.1:8787";
    localStorage.setItem("netops_mode", state.mode);
    localStorage.setItem("netops_agent_url", state.agentUrl);
    dialog.close();
    loadData(true);
  });

  window.addEventListener("resize", () => { drawLatencyChart(); if (state.activePage === "topology") renderTopology(); });

  setInterval(() => {
    if (state.mode === "live" && document.visibilityState === "visible") loadData(false);
  }, 30000);

  loadData(false);
})();