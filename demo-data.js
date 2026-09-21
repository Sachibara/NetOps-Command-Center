window.NETOPS_DEMO = (() => {
  const now = Date.now();
  const ago = (minutes) => new Date(now - minutes * 60000).toISOString();

  const devices = [
    {
      ip: "192.168.10.1", hostname: "CORE-RTR-01", mac: "00:1B:54:9A:11:01",
      vendor: "Cisco Systems", role: "Router", platform: "Cisco IOS",
      status: "online", latency_ms: 3.8, packet_loss: 0, availability_24h: 99.9,
      services: [22, 53, 80, 443], last_seen: ago(0.2)
    },
    {
      ip: "192.168.10.2", hostname: "DIST-SW-01", mac: "00:24:97:AF:20:02",
      vendor: "Cisco Systems", role: "Switch", platform: "Cisco IOS",
      status: "online", latency_ms: 2.6, packet_loss: 0, availability_24h: 99.9,
      services: [22, 80, 443], last_seen: ago(0.4)
    },
    {
      ip: "192.168.10.3", hostname: "DIST-SW-02", mac: "00:24:97:AF:20:03",
      vendor: "Cisco Systems", role: "Switch", platform: "Cisco IOS",
      status: "online", latency_ms: 4.2, packet_loss: 0, availability_24h: 99.9,
      services: [22, 443], last_seen: ago(0.3)
    },
    {
      ip: "192.168.10.10", hostname: "SRV-AD01", mac: "3C:52:82:11:70:10",
      vendor: "Dell", role: "Server", platform: "Windows Server 2022",
      status: "online", latency_ms: 5.1, packet_loss: 0, availability_24h: 99.9,
      services: [53, 88, 135, 389, 445, 3389], last_seen: ago(0.5)
    },
    {
      ip: "192.168.10.11", hostname: "SRV-FILE01", mac: "3C:52:82:11:70:11",
      vendor: "Dell", role: "Server", platform: "Windows Server 2022",
      status: "online", latency_ms: 6.9, packet_loss: 0, availability_24h: 99.9,
      services: [135, 445, 3389], last_seen: ago(0.7)
    },
    {
      ip: "192.168.10.20", hostname: "AP-OFFICE-01", mac: "D8:B3:70:40:20:01",
      vendor: "Ubiquiti", role: "Access Point", platform: "UniFi",
      status: "online", latency_ms: 8.4, packet_loss: 0, availability_24h: 99.9,
      services: [22, 443, 8080], last_seen: ago(0.6)
    },
    {
      ip: "192.168.10.21", hostname: "AP-OFFICE-02", mac: "D8:B3:70:40:20:02",
      vendor: "Ubiquiti", role: "Access Point", platform: "UniFi",
      status: "online", latency_ms: 11.7, packet_loss: 1, availability_24h: 99.4,
      services: [22, 443, 8080], last_seen: ago(0.8)
    },
    {
      ip: "192.168.10.40", hostname: "PRN-FINANCE-01", mac: "9C:93:4E:30:40:01",
      vendor: "HP", role: "Printer", platform: "Embedded",
      status: "online", latency_ms: 18.5, packet_loss: 0, availability_24h: 99.9,
      services: [80, 443, 9100], last_seen: ago(1.1)
    },
    {
      ip: "192.168.10.51", hostname: "WS-SUPPORT-07", mac: "A4:BB:6D:20:51:07",
      vendor: "Lenovo", role: "Workstation", platform: "Windows 11",
      status: "online", latency_ms: 7.2, packet_loss: 0, availability_24h: 99.9,
      services: [135, 445, 3389], last_seen: ago(0.9)
    },
    {
      ip: "192.168.10.55", hostname: "WS-OPS-12", mac: "A4:BB:6D:20:55:12",
      vendor: "Lenovo", role: "Workstation", platform: "Windows 11",
      status: "offline", latency_ms: null, packet_loss: 100, availability_24h: 93.1,
      services: [], last_seen: ago(24)
    },
    {
      ip: "192.168.10.70", hostname: "CCTV-NVR-01", mac: "BC:AD:28:10:70:01",
      vendor: "Hikvision", role: "NVR", platform: "Embedded Linux",
      status: "online", latency_ms: 42.3, packet_loss: 2, availability_24h: 97.8,
      services: [80, 443, 554], last_seen: ago(1.4)
    },
    {
      ip: "192.168.10.90", hostname: "UPS-NET-01", mac: "28:29:86:10:90:01",
      vendor: "APC", role: "UPS", platform: "Network Management Card",
      status: "unknown", latency_ms: null, packet_loss: null, availability_24h: 96.5,
      services: [80, 443], last_seen: ago(67)
    }
  ];

  const alerts = [
    {
      id: 1001, severity: "critical", state: "active", device_ip: "192.168.10.55",
      device_name: "WS-OPS-12", title: "Device unreachable",
      message: "No ICMP response was received during consecutive health checks.",
      created_at: ago(18)
    },
    {
      id: 1002, severity: "warning", state: "active", device_ip: "192.168.10.70",
      device_name: "CCTV-NVR-01", title: "High latency detected",
      message: "Average round-trip latency exceeded the 35 ms warning threshold.",
      created_at: ago(8)
    },
    {
      id: 1003, severity: "warning", state: "active", device_ip: "192.168.10.21",
      device_name: "AP-OFFICE-02", title: "Packet loss observed",
      message: "Intermittent packet loss was detected during the latest monitoring cycle.",
      created_at: ago(6)
    },
    {
      id: 1004, severity: "info", state: "active", device_ip: "192.168.10.90",
      device_name: "UPS-NET-01", title: "Monitoring state unknown",
      message: "The device has not returned a monitoring sample within the expected interval.",
      created_at: ago(52)
    },
    {
      id: 1005, severity: "warning", state: "resolved", device_ip: "192.168.10.40",
      device_name: "PRN-FINANCE-01", title: "Latency recovered",
      message: "Latency returned below the configured warning threshold.",
      created_at: ago(180)
    }
  ];

  const latency = [6.2, 6.7, 5.9, 7.4, 8.0, 7.1, 9.4, 8.8, 10.2, 11.5, 8.1, 7.8, 9.3, 10.1, 12.2, 11.8, 10.9, 9.6, 8.4, 9.1, 10.4, 11.1, 10.2, 9.7];

  return {
    generated_at: new Date(now).toISOString(),
    overview: {
      monitored_subnet: "192.168.10.0/24",
      warning_latency_ms: 35,
      scan_interval_seconds: 30
    },
    devices,
    alerts,
    system: {
      hostname: "NETOPS-MON-01",
      platform: "Windows 11 Pro",
      cpu_percent: 18.4,
      memory_percent: 46.8,
      disk_percent: 38.2,
      upload_bps: 182400,
      download_bps: 624800,
      bytes_sent: 18456322800,
      bytes_recv: 74211852000,
      uptime_seconds: 318240
    },
    latency_samples: latency.map((value, index) => ({
      timestamp: new Date(now - (latency.length - 1 - index) * 5 * 60000).toISOString(),
      avg_latency_ms: value
    }))
  };
})();