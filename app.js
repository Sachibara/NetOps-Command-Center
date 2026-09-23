(() => {
  "use strict";

  const STORAGE_KEY = "netops_enterprise_v1";
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const now = () => new Date().toISOString();
  const uid = (prefix) => prefix + "-" + Math.random().toString(36).slice(2, 9).toUpperCase();

  const pageMeta = {
    overview:["NOC / 01","Unified network operations","Command Center"],
    topology:["MAP / 02","Logical network map","Topology"],
    devices:["INV / 03","Shared source of truth","Devices"],
    health:["MON / 04","Infrastructure telemetry","Health Monitor"],
    ipam:["IPM / 05","Address intelligence","IPAM & Subnet Manager"],
    configs:["CFG / 06","Configuration governance","Config Backup Manager"],
    troubleshoot:["DIA / 07","Guided diagnostics","Network Diagnostic Workbench"],
    docs:["DOC / 08","Living network records","Documentation Studio"],
    alerts:["ALT / 09","Event response","Alerts & Incidents"],
    audit:["AUD / 10","Operational governance","Unified Audit"]
  };

  function seedState(){
    const t=Date.now();
    const agoMin=(m)=>new Date(t-m*60000).toISOString();
    const agoHr=(h)=>new Date(t-h*3600000).toISOString();
    const devices=[
      {id:"DEV-001",hostname:"CORE-RTR-01",ip:"10.20.50.3",mac:"00:1C:73:50:00:03",vendor:"Cisco",role:"Router",site:"HQ",platform:"Cisco IOS XE",status:"online",latency:3.8,loss:0,availability:99.99,cpu:18,memory:42,disk:34,services:[22,53,80,443],lastSeen:agoMin(.2),configManaged:true,configDeviceId:1},
      {id:"DEV-002",hostname:"CORE-SW-01",ip:"10.20.50.2",mac:"00:1C:73:50:00:02",vendor:"Cisco",role:"Switch",site:"HQ",platform:"Cisco IOS XE",status:"online",latency:2.6,loss:0,availability:99.99,cpu:14,memory:39,disk:31,services:[22,80,443],lastSeen:agoMin(.4),configManaged:true,configDeviceId:2},
      {id:"DEV-003",hostname:"DIST-SW-F2",ip:"10.20.50.12",mac:"00:24:97:AF:20:02",vendor:"Cisco",role:"Switch",site:"HQ",platform:"Cisco IOS XE",status:"online",latency:4.7,loss:0,availability:99.96,cpu:23,memory:46,disk:29,services:[22,443],lastSeen:agoMin(.5),configManaged:true,configDeviceId:3},
      {id:"DEV-004",hostname:"SRV-AD01",ip:"10.20.30.10",mac:"3C:52:82:11:70:10",vendor:"Dell",role:"Server",site:"HQ",platform:"Windows Server 2022",status:"online",latency:8,loss:0,availability:99.99,cpu:28,memory:49,disk:46,services:[53,88,389,445],lastSeen:agoMin(.4),configManaged:false},
      {id:"DEV-005",hostname:"SRV-FILE01",ip:"10.20.30.15",mac:"3C:52:82:11:70:11",vendor:"Dell",role:"Server",site:"HQ",platform:"Windows Server 2022",status:"warning",latency:12,loss:0,availability:99.94,cpu:58,memory:73,disk:94,services:[445],lastSeen:agoMin(.7),configManaged:false},
      {id:"DEV-006",hostname:"AP-OFFICE-01",ip:"10.20.40.21",mac:"D8:B3:70:40:20:01",vendor:"Ubiquiti",role:"Access Point",site:"HQ",platform:"UniFi",status:"online",latency:8.4,loss:0,availability:99.91,cpu:21,memory:45,disk:18,services:[22,443,8080],lastSeen:agoMin(.6),configManaged:false},
      {id:"DEV-007",hostname:"AP-OFFICE-02",ip:"10.20.40.22",mac:"D8:B3:70:40:20:02",vendor:"Ubiquiti",role:"Access Point",site:"HQ",platform:"UniFi",status:"warning",latency:34,loss:2,availability:98.7,cpu:32,memory:51,disk:19,services:[22,443,8080],lastSeen:agoMin(.8),configManaged:false},
      {id:"DEV-008",hostname:"EDGE-RTR-01",ip:"10.21.10.1",mac:"00:1B:54:BB:10:01",vendor:"Cisco",role:"Router",site:"Branch",platform:"Cisco IOS",status:"online",latency:18,loss:0,availability:99.84,cpu:24,memory:38,disk:30,services:[22,443],lastSeen:agoMin(.8),configManaged:true,configDeviceId:4},
      {id:"DEV-009",hostname:"BR-SW-01",ip:"10.21.10.2",mac:"00:1C:73:BB:10:02",vendor:"Cisco",role:"Switch",site:"Branch",platform:"Cisco IOS",status:"warning",latency:21,loss:1,availability:98.9,cpu:27,memory:44,disk:33,services:[22,443],lastSeen:agoMin(2),configManaged:true,configDeviceId:5},
      {id:"DEV-010",hostname:"BR-APP-01",ip:"10.21.10.20",mac:"00:50:56:21:10:20",vendor:"VMware",role:"Server",site:"Branch",platform:"Ubuntu Server 24.04",status:"maintenance",latency:34,loss:0,availability:99.7,cpu:16,memory:33,disk:41,services:[22,443],lastSeen:agoMin(1),configManaged:false},
      {id:"DEV-011",hostname:"DC-NX-01",ip:"10.22.10.2",mac:"00:23:04:22:10:02",vendor:"Cisco",role:"Switch",site:"Datacenter",platform:"Cisco NX-OS",status:"online",latency:11,loss:0,availability:99.99,cpu:19,memory:48,disk:28,services:[22,443],lastSeen:agoMin(.6),configManaged:true,configDeviceId:6},
      {id:"DEV-012",hostname:"APP-SRV-01",ip:"10.22.10.20",mac:"00:50:56:22:10:20",vendor:"Dell",role:"Server",site:"Datacenter",platform:"Windows Server 2022",status:"online",latency:18,loss:0,availability:99.98,cpu:42,memory:61,disk:55,services:[80,443],lastSeen:agoMin(1),configManaged:false},
      {id:"DEV-013",hostname:"DB-SRV-01",ip:"10.22.10.21",mac:"00:50:56:22:10:21",vendor:"Dell",role:"Server",site:"Datacenter",platform:"Windows Server 2022",status:"warning",latency:21,loss:0,availability:99.91,cpu:76,memory:82,disk:69,services:[1433],lastSeen:agoMin(1),configManaged:false}
    ];

    const subnets=[
      {id:"SUB-001",name:"HQ Users",cidr:"10.20.10.0/24",site:"HQ",department:"Corporate",vlan:10,gateway:"10.20.10.1",dns1:"10.20.30.10",dns2:"10.20.30.11",used:198,total:254},
      {id:"SUB-002",name:"HQ Voice",cidr:"10.20.20.0/25",site:"HQ",department:"Unified Comms",vlan:20,gateway:"10.20.20.1",dns1:"10.20.30.10",dns2:"10.20.30.11",used:74,total:126},
      {id:"SUB-003",name:"HQ Servers",cidr:"10.20.30.0/26",site:"HQ",department:"IT",vlan:30,gateway:"10.20.30.1",dns1:"10.20.30.10",dns2:"10.20.30.11",used:49,total:62},
      {id:"SUB-004",name:"HQ Corporate Wi-Fi",cidr:"10.20.40.0/23",site:"HQ",department:"Corporate",vlan:40,gateway:"10.20.40.1",dns1:"10.20.30.10",dns2:"10.20.30.11",used:402,total:510},
      {id:"SUB-005",name:"HQ Infrastructure Mgmt",cidr:"10.20.50.0/27",site:"HQ",department:"IT",vlan:50,gateway:"10.20.50.1",dns1:"10.20.30.10",dns2:"10.20.30.11",used:27,total:30},
      {id:"SUB-006",name:"Branch Users",cidr:"10.21.10.0/25",site:"Branch",department:"Operations",vlan:110,gateway:"10.21.10.1",dns1:"10.20.30.10",dns2:"10.20.30.11",used:62,total:126},
      {id:"SUB-007",name:"Branch Voice",cidr:"10.21.20.0/27",site:"Branch",department:"Unified Comms",vlan:120,gateway:"10.21.20.1",dns1:"10.20.30.10",dns2:"10.20.30.11",used:18,total:30},
      {id:"SUB-008",name:"Datacenter Servers",cidr:"10.22.10.0/25",site:"Datacenter",department:"Infrastructure",vlan:210,gateway:"10.22.10.1",dns1:"10.22.10.10",dns2:"10.22.10.11",used:111,total:126}
    ];
    const vlans=[
      {id:"VLAN-010",vlan:10,name:"HQ-USERS",site:"HQ",department:"Corporate",subnetId:"SUB-001"},
      {id:"VLAN-020",vlan:20,name:"HQ-VOICE",site:"HQ",department:"Unified Comms",subnetId:"SUB-002"},
      {id:"VLAN-030",vlan:30,name:"HQ-SERVERS",site:"HQ",department:"IT",subnetId:"SUB-003"},
      {id:"VLAN-040",vlan:40,name:"HQ-WIFI",site:"HQ",department:"Corporate",subnetId:"SUB-004"},
      {id:"VLAN-050",vlan:50,name:"HQ-MGMT",site:"HQ",department:"IT",subnetId:"SUB-005"},
      {id:"VLAN-110",vlan:110,name:"BR-USERS",site:"Branch",department:"Operations",subnetId:"SUB-006"},
      {id:"VLAN-120",vlan:120,name:"BR-VOICE",site:"Branch",department:"Unified Comms",subnetId:"SUB-007"},
      {id:"VLAN-210",vlan:210,name:"DC-SERVERS",site:"Datacenter",department:"Infrastructure",subnetId:"SUB-008"}
    ];
    const addresses=[
      {id:"IP-001",subnetId:"SUB-001",ip:"10.20.10.1",state:"Static",hostname:"HQ-GW-V10",mac:"00:1B:54:AA:10:01",owner:"Network Infrastructure"},
      {id:"IP-002",subnetId:"SUB-001",ip:"10.20.10.25",state:"Reserved",hostname:"FIN-PRN-01",mac:"3C:52:82:10:A2:11",owner:"Finance"},
      {id:"IP-003",subnetId:"SUB-003",ip:"10.20.30.10",state:"Static",hostname:"SRV-AD01",mac:"3C:52:82:11:70:10",owner:"Infrastructure"},
      {id:"IP-004",subnetId:"SUB-003",ip:"10.20.30.15",state:"Static",hostname:"SRV-FILE01",mac:"3C:52:82:11:70:11",owner:"Infrastructure"},
      {id:"IP-005",subnetId:"SUB-005",ip:"10.20.50.2",state:"Static",hostname:"CORE-SW-01",mac:"00:1C:73:50:00:02",owner:"Network Infrastructure"},
      {id:"IP-006",subnetId:"SUB-005",ip:"10.20.50.3",state:"Static",hostname:"CORE-RTR-01",mac:"00:1C:73:50:00:03",owner:"Network Infrastructure"},
      {id:"IP-007",subnetId:"SUB-005",ip:"10.20.50.19",state:"Conflict",hostname:"UNKNOWN",mac:"00:11:22:33:44:55",owner:"Unassigned"},
      {id:"IP-008",subnetId:"SUB-006",ip:"10.21.10.1",state:"Static",hostname:"EDGE-RTR-01",mac:"00:1B:54:BB:10:01",owner:"Network Infrastructure"},
      {id:"IP-009",subnetId:"SUB-006",ip:"10.21.10.2",state:"Static",hostname:"BR-SW-01",mac:"00:1C:73:BB:10:02",owner:"Network Infrastructure"},
      {id:"IP-010",subnetId:"SUB-006",ip:"10.21.10.20",state:"Static",hostname:"BR-APP-01",mac:"00:50:56:21:10:20",owner:"Branch IT"},
      {id:"IP-011",subnetId:"SUB-008",ip:"10.22.10.2",state:"Static",hostname:"DC-NX-01",mac:"00:23:04:22:10:02",owner:"Network Infrastructure"},
      {id:"IP-012",subnetId:"SUB-008",ip:"10.22.10.20",state:"Static",hostname:"APP-SRV-01",mac:"00:50:56:22:10:20",owner:"Application Team"},
      {id:"IP-013",subnetId:"SUB-008",ip:"10.22.10.21",state:"Static",hostname:"DB-SRV-01",mac:"00:50:56:22:10:21",owner:"Database Team"}
    ];

    const configText={
      coreRouter1:"version 17.9\nhostname CORE-RTR-01\ninterface GigabitEthernet0/0\n description WAN-UPLINK\n ip address 203.0.113.2 255.255.255.252\n no shutdown\ninterface GigabitEthernet0/1\n description LAN-CORE\n ip address 10.20.50.3 255.255.255.224\n no shutdown\nrouter ospf 10\n network 10.20.0.0 0.0.255.255 area 0\nip route 0.0.0.0 0.0.0.0 203.0.113.1\n",
      coreRouter2:"version 17.9\nhostname CORE-RTR-01\ninterface GigabitEthernet0/0\n description WAN-UPLINK\n ip address 203.0.113.2 255.255.255.252\n no shutdown\ninterface GigabitEthernet0/1\n description LAN-CORE\n ip address 10.20.50.3 255.255.255.224\n no shutdown\ninterface GigabitEthernet0/2\n description MONITORING-NET\n ip address 10.20.60.1 255.255.255.0\n no shutdown\nrouter ospf 10\n network 10.20.0.0 0.0.255.255 area 0\n network 10.20.60.0 0.0.0.255 area 0\nip route 0.0.0.0 0.0.0.0 203.0.113.1\n",
      coreSwitch1:"version 17.6\nhostname CORE-SW-01\nvlan 10\n name USERS\nvlan 20\n name VOICE\nvlan 30\n name SERVERS\ninterface GigabitEthernet1/0/1\n description UPLINK-CORE-RTR\n switchport mode trunk\ninterface Vlan50\n ip address 10.20.50.2 255.255.255.224\n",
      coreSwitch2:"version 17.6\nhostname CORE-SW-01\nvlan 10\n name USERS\nvlan 20\n name VOICE\nvlan 30\n name SERVERS\nvlan 40\n name WIFI-CORP\ninterface GigabitEthernet1/0/1\n description UPLINK-CORE-RTR\n switchport mode trunk\n switchport trunk allowed vlan 10,20,30,40,50\ninterface Vlan50\n ip address 10.20.50.2 255.255.255.224\n",
      distSwitch:"version 16.12\nhostname DIST-SW-F2\nvlan 10\n name USERS\nvlan 40\n name WIFI-CORP\ninterface GigabitEthernet1/0/48\n description UPLINK-CORE\n switchport mode trunk\n",
      edgeRouter:"version 15.7\nhostname EDGE-RTR-01\ninterface GigabitEthernet0/0\n description BRANCH-WAN\n ip address 198.51.100.10 255.255.255.252\ninterface GigabitEthernet0/1\n description BRANCH-LAN\n ip address 10.21.10.1 255.255.255.128\nip route 0.0.0.0 0.0.0.0 198.51.100.9\n",
      branchSwitch:"version 15.2\nhostname BR-SW-01\nvlan 110\n name BRANCH-USERS\ninterface GigabitEthernet0/1\n description UPLINK-EDGE\n switchport mode trunk\n",
      dcSwitch:"version 9.3(10)\nhostname DC-NX-01\nfeature interface-vlan\nfeature lacp\nvlan 210\n name DC-SERVERS\ninterface Ethernet1/1\n description UPLINK-CORE\n switchport mode trunk\n"
    };
    const configDevices=[
      {id:1,deviceId:"DEV-001",interval:360,retention:20,lastBackupAt:agoHr(.4),lastStatus:"success"},
      {id:2,deviceId:"DEV-002",interval:360,retention:20,lastBackupAt:agoHr(.8),lastStatus:"success"},
      {id:3,deviceId:"DEV-003",interval:720,retention:15,lastBackupAt:agoHr(2.1),lastStatus:"success"},
      {id:4,deviceId:"DEV-008",interval:720,retention:15,lastBackupAt:agoHr(5.4),lastStatus:"success"},
      {id:5,deviceId:"DEV-009",interval:1440,retention:10,lastBackupAt:agoHr(25),lastStatus:"failed"},
      {id:6,deviceId:"DEV-011",interval:360,retention:30,lastBackupAt:agoHr(1.2),lastStatus:"success"}
    ];
    const backups=[
      {id:"BKP-101",configDeviceId:1,version:3,status:"success",changed:true,hash:"9f2b1a4e8d1c",createdAt:agoHr(.4),config:configText.coreRouter2},
      {id:"BKP-100",configDeviceId:1,version:2,status:"success",changed:false,hash:"5d17e3c98ab0",createdAt:agoHr(6.5),config:configText.coreRouter1},
      {id:"BKP-201",configDeviceId:2,version:4,status:"success",changed:true,hash:"3e71a9f4c120",createdAt:agoHr(.8),config:configText.coreSwitch2},
      {id:"BKP-200",configDeviceId:2,version:3,status:"success",changed:false,hash:"0a34b92d711f",createdAt:agoHr(7),config:configText.coreSwitch1},
      {id:"BKP-301",configDeviceId:3,version:3,status:"success",changed:false,hash:"11ac9d3f660a",createdAt:agoHr(2.1),config:configText.distSwitch},
      {id:"BKP-401",configDeviceId:4,version:2,status:"success",changed:false,hash:"6cb713d0a1b8",createdAt:agoHr(5.4),config:configText.edgeRouter},
      {id:"BKP-501",configDeviceId:5,version:2,status:"failed",changed:false,hash:"—",createdAt:agoHr(25),config:"",error:"SSH timeout"},
      {id:"BKP-500",configDeviceId:5,version:1,status:"success",changed:false,hash:"8c447ab913c1",createdAt:agoHr(49),config:configText.branchSwitch},
      {id:"BKP-601",configDeviceId:6,version:5,status:"success",changed:false,hash:"7a90d4ef0021",createdAt:agoHr(1.2),config:configText.dcSwitch}
    ];

    const services=[
      {id:"SVC-001",deviceId:"DEV-012",name:"HTTPS",port:443,state:"Up",response:24,uptime:99.98,owner:"Application Team",dependency:"DB-SRV-01"},
      {id:"SVC-002",deviceId:"DEV-012",name:"HTTP",port:80,state:"Up",response:20,uptime:99.99,owner:"Application Team",dependency:"HTTPS redirect"},
      {id:"SVC-003",deviceId:"DEV-013",name:"SQL Server",port:1433,state:"Degraded",response:86,uptime:99.91,owner:"Database Team",dependency:"Storage"},
      {id:"SVC-004",deviceId:"DEV-004",name:"DNS",port:53,state:"Up",response:9,uptime:100,owner:"Infrastructure",dependency:"Network"},
      {id:"SVC-005",deviceId:"DEV-004",name:"LDAP",port:389,state:"Up",response:11,uptime:99.99,owner:"Infrastructure",dependency:"DNS"},
      {id:"SVC-006",deviceId:"DEV-005",name:"SMB",port:445,state:"Up",response:15,uptime:99.94,owner:"Infrastructure",dependency:"Storage"},
      {id:"SVC-007",deviceId:"DEV-010",name:"HTTPS",port:443,state:"Up",response:39,uptime:99.7,owner:"Branch IT",dependency:"WAN"}
    ];
    const alerts=[
      {id:"ALT-001",deviceId:"DEV-005",severity:"Critical",status:"Open",title:"File server storage pressure",message:"Disk utilization reached 94%, above critical threshold 90%.",source:"Health",createdAt:agoMin(18)},
      {id:"ALT-002",deviceId:"DEV-013",severity:"Warning",status:"Open",title:"Database memory pressure",message:"Memory utilization is 82%, above warning threshold 75%.",source:"Health",createdAt:agoMin(34)},
      {id:"ALT-003",deviceId:"DEV-013",severity:"Warning",status:"Acknowledged",title:"SQL response degradation",message:"SQL Server response time increased to 86 ms.",source:"Service",createdAt:agoMin(46)},
      {id:"ALT-004",deviceId:"DEV-007",severity:"Warning",status:"Open",title:"Packet loss observed",message:"Intermittent packet loss detected on AP-OFFICE-02.",source:"Monitoring",createdAt:agoMin(6)},
      {id:"ALT-005",deviceId:"DEV-009",severity:"Warning",status:"Open",title:"Config backup failure",message:"BR-SW-01 configuration backup failed due to SSH timeout.",source:"Config",createdAt:agoHr(25)}
    ];
    const latency=[6.2,6.7,5.9,7.4,8.0,7.1,9.4,8.8,10.2,11.5,8.1,7.8,9.3,10.1,12.2,11.8,10.9,9.6,8.4,9.1,10.4,11.1,10.2,9.7];
    const topologyLinks=[
      ["DEV-001","DEV-002"],["DEV-002","DEV-003"],["DEV-002","DEV-004"],["DEV-002","DEV-005"],["DEV-003","DEV-006"],["DEV-003","DEV-007"],
      ["DEV-001","DEV-008"],["DEV-008","DEV-009"],["DEV-009","DEV-010"],["DEV-001","DEV-011"],["DEV-011","DEV-012"],["DEV-011","DEV-013"]
    ];
    const portMappings=[
      {id:"PORT-001",switchId:"DEV-002",port:"Gi1/0/1",targetId:"DEV-001",mode:"Trunk",vlan:"10,20,30,40,50"},
      {id:"PORT-002",switchId:"DEV-002",port:"Gi1/0/10",targetId:"DEV-004",mode:"Access",vlan:"30"},
      {id:"PORT-003",switchId:"DEV-002",port:"Gi1/0/11",targetId:"DEV-005",mode:"Access",vlan:"30"},
      {id:"PORT-004",switchId:"DEV-003",port:"Gi1/0/48",targetId:"DEV-002",mode:"Trunk",vlan:"10,40"},
      {id:"PORT-005",switchId:"DEV-003",port:"Gi1/0/20",targetId:"DEV-006",mode:"Access",vlan:"40"},
      {id:"PORT-006",switchId:"DEV-003",port:"Gi1/0/21",targetId:"DEV-007",mode:"Access",vlan:"40"},
      {id:"PORT-007",switchId:"DEV-009",port:"Gi0/1",targetId:"DEV-008",mode:"Trunk",vlan:"110,120"},
      {id:"PORT-008",switchId:"DEV-011",port:"Eth1/1",targetId:"DEV-001",mode:"Trunk",vlan:"210"}
    ];
    const audit=[
      {id:"AUD-001",at:agoMin(2),module:"Monitoring",action:"Telemetry collected",detail:"Latest network health sample stored."},
      {id:"AUD-002",at:agoMin(6),module:"Monitoring",action:"Alert opened",detail:"AP-OFFICE-02 packet loss crossed warning threshold."},
      {id:"AUD-003",at:agoMin(18),module:"Health",action:"Critical alert opened",detail:"SRV-FILE01 disk utilization exceeded 90%."},
      {id:"AUD-004",at:agoHr(.4),module:"Config",action:"Backup completed",detail:"CORE-RTR-01 version 3 stored; configuration change detected."},
      {id:"AUD-005",at:agoHr(.8),module:"Config",action:"Backup completed",detail:"CORE-SW-01 version 4 stored; VLAN configuration changed."},
      {id:"AUD-006",at:agoHr(1),module:"IPAM",action:"Utilization recalculated",detail:"HQ Infrastructure Mgmt is now 90% utilized."},
      {id:"AUD-007",at:agoHr(2),module:"Documentation",action:"Inventory synchronized",detail:"Shared device inventory synchronized into documentation."}
    ];
    const docChanges=[
      {id:"DOC-001",at:agoHr(2),detail:"Unified network documentation baseline generated from shared inventory."},
      {id:"DOC-002",at:agoHr(6),detail:"HQ Wi-Fi VLAN and access-point mappings reviewed."}
    ];
    return {version:1,createdAt:now(),updatedAt:now(),devices,subnets,vlans,addresses,configDevices,backups,services,alerts,latency,topologyLinks,portMappings,audit,docChanges,diagnostics:[]};
  }

  function loadState(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return seedState();
      const parsed=JSON.parse(raw);
      if(!parsed||!Array.isArray(parsed.devices))return seedState();
      return {...seedState(),...parsed};
    }catch(e){console.warn(e);return seedState();}
  }
  let state=loadState();
  let selectedDeviceId=state.devices[0]?.id||null;
  let lastDiagnostic=null;
  let cloudRole="demo";
  let cloudSaveTimer=null;

  function save(){
    state.updatedAt=now();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    if(window.NetOpsCloud?.isCloudActive?.()&&cloudRole!=="viewer"){
      clearTimeout(cloudSaveTimer);
      cloudSaveTimer=setTimeout(()=>{
        window.NetOpsCloud.saveWorkspace(state).catch(error=>{
          console.error("NetOps cloud save failed:",error);
          toast("Cloud save failed",error.message||"Workspace remains saved locally.");
        });
      },350);
    }
  }
  function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
  function fmt(v){const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString();}
  function device(id){return state.devices.find(d=>d.id===id)||null;}
  function subnet(id){return state.subnets.find(s=>s.id===id)||null;}
  function configDeviceById(id){return state.configDevices.find(d=>d.id===Number(id))||null;}
  function configDeviceForDevice(id){return state.configDevices.find(d=>d.deviceId===id)||null;}
  function backupsForConfigDevice(id){return state.backups.filter(b=>b.configDeviceId===Number(id)).sort((a,b)=>b.version-a.version);}
  function toast(title,message){
    const el=document.createElement("div");el.className="toast";el.innerHTML="<b>"+esc(title)+"</b><span>"+esc(message||"")+"</span>";
    $("toastRegion").appendChild(el);setTimeout(()=>el.remove(),3400);
  }
  function audit(module,action,detail){
    const event={id:uid("AUD"),at:now(),module,action,detail};
    state.audit.unshift(event);
    state.audit=state.audit.slice(0,400);
    if(window.NetOpsCloud?.isCloudActive?.()&&cloudRole!=="viewer"){
      window.NetOpsCloud.pushAudit(event).catch(error=>console.error("NetOps audit sync failed:",error));
    }
    save();
  }
  function badge(text,tone){return '<span class="badge '+esc(tone||"")+'">'+esc(text)+'</span>';}
  function toneForStatus(status){
    const s=String(status||"").toLowerCase();
    if(["online","healthy","up","success","resolved"].includes(s))return"green";
    if(["warning","degraded","acknowledged"].includes(s))return"amber";
    if(["offline","critical","failed","open"].includes(s))return"red";
    if(["maintenance","reserved"].includes(s))return"purple";
    return"blue";
  }
  function sites(){return [...new Set(state.devices.map(d=>d.site))].sort();}
  function roles(){return [...new Set(state.devices.map(d=>d.role))].sort();}
  function utilization(s){return Math.round((s.used/s.total)*100);}
  function openAlerts(){return buildAlerts().filter(a=>!["Resolved","Closed"].includes(a.status));}
  function healthScore(){
    const eligible=state.devices.filter(d=>d.status!=="maintenance");
    const online=eligible.filter(d=>d.status==="online").length;
    const availability=eligible.length?eligible.reduce((sum,d)=>sum+(d.availability||0),0)/eligible.length:100;
    const stateScore=eligible.length?(online/eligible.length)*100:100;
    const alertPenalty=Math.min(35,openAlerts().filter(a=>a.severity==="Critical").length*10+openAlerts().filter(a=>a.severity==="Warning").length*3);
    return Math.max(0,Math.round(availability*.45+stateScore*.4+(100-alertPenalty)*.15));
  }
  function avgIpamUtil(){
    const total=state.subnets.reduce((s,x)=>s+x.total,0),used=state.subnets.reduce((s,x)=>s+x.used,0);
    return total?Math.round(used/total*100):0;
  }
  function backupSuccess(){
    const recent=state.configDevices.map(cd=>backupsForConfigDevice(cd.id)[0]).filter(Boolean);
    return recent.length?Math.round(recent.filter(b=>b.status==="success").length/recent.length*100):100;
  }
  function buildAlerts(){
    const list=[...state.alerts];
    state.addresses.filter(a=>a.state==="Conflict").forEach(a=>{
      list.push({id:"IP-"+a.id,deviceId:null,severity:"Critical",status:"Open",title:"IP address conflict",message:a.ip+" has a conflicting assignment in "+(subnet(a.subnetId)?.name||a.subnetId)+".",source:"IPAM",createdAt:state.updatedAt});
    });
    state.subnets.filter(s=>utilization(s)>=88).forEach(s=>{
      list.push({id:"CAP-"+s.id,deviceId:null,severity:utilization(s)>=92?"Critical":"Warning",status:"Open",title:"Subnet capacity pressure",message:s.name+" is "+utilization(s)+"% utilized.",source:"IPAM",createdAt:state.updatedAt});
    });
    return list;
  }

  function openPage(page){
    qsa("[data-panel]").forEach(p=>p.classList.toggle("active",p.dataset.panel===page));
    qsa("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    if(pageMeta[page]){
      $("pageCode").textContent=pageMeta[page][0];$("pageEyebrow").textContent=pageMeta[page][1];$("pageTitle").textContent=pageMeta[page][2];
    }
    renderPage(page);window.scrollTo({top:0,behavior:"smooth"});
  }
  qsa("[data-page]").forEach(b=>b.addEventListener("click",()=>openPage(b.dataset.page)));
  qsa("[data-go]").forEach(b=>b.addEventListener("click",()=>openPage(b.dataset.go)));

  function renderPage(page){
    if(page==="overview")renderOverview();
    if(page==="topology")renderTopology();
    if(page==="devices")renderDevices();
    if(page==="health")renderHealth();
    if(page==="ipam")renderIpam();
    if(page==="configs")renderConfigs();
    if(page==="troubleshoot")renderTroubleshoot();
    if(page==="docs")renderDocs();
    if(page==="alerts")renderAlerts();
    if(page==="audit")renderAudit();
  }

  function renderOverview(){
    const health=healthScore(),alerts=openAlerts(),critical=alerts.filter(a=>a.severity==="Critical").length;
    const online=state.devices.filter(d=>d.status==="online").length;
    const changed=state.backups.filter(b=>b.changed&&b.status==="success").length;
    const degraded=state.services.filter(s=>s.state!=="Up").length;
    $("kpiDevices").textContent=state.devices.length;$("kpiDevicesSub").textContent=online+" online";
    $("kpiAlerts").textContent=alerts.length;$("kpiCriticalSub").textContent=critical+" critical";
    $("kpiSubnets").textContent=state.subnets.length;$("kpiSubnetsSub").textContent=sites().length+" sites";
    $("kpiBackups").textContent=state.backups.length;$("kpiBackupsSub").textContent=changed+" changed";
    $("kpiServices").textContent=state.services.length;$("kpiServicesSub").textContent=degraded+" degraded";
    $("overviewHealthScore").textContent=health+"%";$("radarLabel").textContent=health>=90?"STABLE":health>=75?"WATCH":"AT RISK";
    $("ribbonDevices").textContent=state.devices.length;$("ribbonHealth").textContent=health+"%";$("ribbonIpam").textContent=avgIpamUtil()+"%";$("ribbonBackup").textContent=backupSuccess()+"%";$("ribbonAlerts").textContent=alerts.length;

    renderRadar(health);
    renderLatency();
    renderCapacity();
    renderSiteFabric();
    renderBackupPosture();

    const attention=buildAlerts().filter(a=>!["Resolved","Closed"].includes(a.status)).slice(0,7);
    $("attentionList").innerHTML=attention.length?attention.map(a=>{
      const d=device(a.deviceId);
      return '<div class="stack-row"><div><b>'+esc(a.title)+'</b><small>'+esc((d?d.hostname+" · ":"")+a.message)+'</small></div>'+badge(a.severity,a.severity==="Critical"?"red":a.severity==="Warning"?"amber":"blue")+'</div>';
    }).join(""):'<div class="empty">No active network issues.</div>';
    $("overviewAudit").innerHTML=renderTimeline(state.audit.slice(0,8));
  }

  function renderRadar(health){
    const avgLatency=state.devices.filter(d=>d.latency!=null).reduce((s,d)=>s+d.latency,0)/state.devices.filter(d=>d.latency!=null).length;
    const latencyScore=Math.max(20,100-Math.min(80,avgLatency*2));
    const capacityScore=Math.max(10,100-Math.max(...state.subnets.map(utilization)));
    const configScore=backupSuccess();
    const ipamScore=Math.max(15,100-Math.max(...state.subnets.map(utilization))+20);
    const alertScore=Math.max(10,100-openAlerts().length*8);
    const values=[health,latencyScore,capacityScore,configScore,ipamScore,alertScore];
    const center={x:160,y:164},r=130;
    const pts=values.map((v,i)=>{
      const angle=(-90+i*60)*Math.PI/180;const rr=r*(Math.max(0,Math.min(100,v))/100);
      return [center.x+Math.cos(angle)*rr,center.y+Math.sin(angle)*rr];
    });
    $("radarShape").setAttribute("points",pts.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" "));
  }

  function renderLatency(){
    const vals=state.latency.slice(-24),max=Math.max(40,...vals),x0=48,x1=738,y0=28,y1=232;
    const pts=vals.map((v,i)=>({x:x0+(x1-x0)*i/(vals.length-1),y:y1-(v/max)*(y1-y0),v}));
    $("latencyLine").setAttribute("points",pts.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" "));
    $("latencyArea").setAttribute("d","M "+pts[0].x+" "+y1+" L "+pts.map(p=>p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" L ")+" L "+pts[pts.length-1].x+" "+y1+" Z");
    $("latencyPoints").innerHTML=pts.map(p=>'<circle class="chart-point" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3"><title>'+p.v+' ms</title></circle>').join("");
    $("latencyLabels").innerHTML=[0,6,12,18,23].map(i=>'<text x="'+pts[i].x.toFixed(1)+'" y="247" text-anchor="middle">'+(i===23?"Now":"-"+(23-i)*5+"m")+'</text>').join("");
  }

  function renderCapacity(){
    const rows=state.subnets.slice().sort((a,b)=>utilization(b)-utilization(a)).slice(0,6);
    $("capacityBars").innerHTML=rows.map(s=>{
      const u=utilization(s),cls=u>=90?"critical":u>=80?"warn":"";
      return '<div class="capacity-row"><div class="capacity-head"><span>'+esc(s.name)+'</span><b>'+u+'%</b></div><div class="capacity-track"><div class="capacity-fill '+cls+'" style="width:'+u+'%"></div></div></div>';
    }).join("");
  }
  function renderSiteFabric(){
    $("siteFabric").innerHTML=sites().map(site=>{
      const list=state.devices.filter(d=>d.site===site),online=list.filter(d=>d.status==="online").length,issues=list.length-online-list.filter(d=>d.status==="maintenance").length;
      return '<div class="site-card"><b>'+esc(site)+'</b><span>'+online+'/'+list.length+'</span><small>'+issues+' attention · '+state.subnets.filter(s=>s.site===site).length+' subnets</small></div>';
    }).join("");
  }
  function renderBackupPosture(){
    const success=state.configDevices.filter(cd=>backupsForConfigDevice(cd.id)[0]?.status==="success").length;
    const failed=state.configDevices.length-success,changed=state.configDevices.filter(cd=>backupsForConfigDevice(cd.id)[0]?.changed).length,total=Math.max(1,state.configDevices.length);
    const pct=Math.round(success/total*100);
    const bg='conic-gradient(var(--lime) 0 '+pct+'%, var(--red) '+pct+'% 100%)';
    $("backupPosture").innerHTML='<div class="donut" style="background:'+bg+'"><div><strong>'+pct+'%</strong><span>healthy</span></div></div><div class="donut-key">'+
      '<div class="donut-key-row"><i style="background:var(--lime)"></i><span>Latest success</span><b>'+success+'</b></div>'+
      '<div class="donut-key-row"><i style="background:var(--red)"></i><span>Latest failed</span><b>'+failed+'</b></div>'+
      '<div class="donut-key-row"><i style="background:var(--orange)"></i><span>Change detected</span><b>'+changed+'</b></div></div>';
  }

  function renderTopology(){
    const sf=$("topologySiteFilter"),rf=$("topologyRoleFilter"),ps=sf.value,pr=rf.value;
    sf.innerHTML='<option value="">All sites</option>'+sites().map(s=>'<option>'+esc(s)+'</option>').join("");
    rf.innerHTML='<option value="">All roles</option>'+roles().map(r=>'<option>'+esc(r)+'</option>').join("");
    if(sites().includes(ps))sf.value=ps;if(roles().includes(pr))rf.value=pr;
    const filtered=state.devices.filter(d=>(!sf.value||d.site===sf.value)&&(!rf.value||d.role===rf.value));
    const ids=new Set(filtered.map(d=>d.id));
    const canvas=$("topologyCanvas");canvas.innerHTML="";
    const siteList=[...new Set(filtered.map(d=>d.site))];
    const positions={};
    siteList.forEach((site,siteIndex)=>{
      const list=filtered.filter(d=>d.site===site);
      const xBase=siteList.length===1?50:(12+siteIndex*(76/Math.max(1,siteList.length-1)));
      list.forEach((d,i)=>{
        const y=12+(i+1)*(76/(list.length+1));positions[d.id]={x:xBase,y};
      });
    });
    state.topologyLinks.filter(([a,b])=>ids.has(a)&&ids.has(b)).forEach(([a,b])=>{
      const p1=positions[a],p2=positions[b];if(!p1||!p2)return;
      const w=canvas.clientWidth||1000,h=canvas.clientHeight||620;
      const x1=p1.x/100*w,y1=p1.y/100*h,x2=p2.x/100*w,y2=p2.y/100*h;
      const len=Math.hypot(x2-x1,y2-y1),ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
      const line=document.createElement("div");line.className="topology-link";line.style.left=x1+"px";line.style.top=y1+"px";line.style.width=len+"px";line.style.transform="rotate("+ang+"deg)";canvas.appendChild(line);
    });
    filtered.forEach(d=>{
      const p=positions[d.id];const el=document.createElement("button");el.className="topology-node "+d.status;el.dataset.deviceId=d.id;
      el.style.left='calc('+p.x+'% - 64px)';el.style.top='calc('+p.y+'% - 32px)';
      el.innerHTML='<b>'+esc(d.hostname)+'</b><span>'+esc(d.role+' · '+d.site)+'</span><small>'+esc(d.ip)+( $("topologyLabelsToggle").checked?' · '+esc(d.platform):'')+'</small>';
      el.onclick=()=>openDeviceModal(d.id);canvas.appendChild(el);
    });
  }
  $("topologySiteFilter").addEventListener("change",renderTopology);$("topologyRoleFilter").addEventListener("change",renderTopology);$("topologyLabelsToggle").addEventListener("change",renderTopology);$("fitTopologyBtn").addEventListener("click",renderTopology);

  function renderDevices(){
    const sf=$("deviceSiteFilter"),prev=sf.value;sf.innerHTML='<option value="">All sites</option>'+sites().map(s=>'<option>'+esc(s)+'</option>').join("");if(sites().includes(prev))sf.value=prev;
    const q=$("deviceSearch").value.toLowerCase().trim(),status=$("deviceStatusFilter").value;
    const rows=state.devices.filter(d=>{
      const hay=[d.hostname,d.ip,d.vendor,d.role,d.site,d.platform,d.mac].join(" ").toLowerCase();
      return(!q||hay.includes(q))&&(!sf.value||d.site===sf.value)&&(!status||d.status===status);
    });
    $("deviceRows").innerHTML=rows.length?rows.map(d=>{
      const cd=configDeviceForDevice(d.id),latest=cd?backupsForConfigDevice(cd.id)[0]:null;
      return '<tr><td><span class="cell-title">'+esc(d.hostname)+'</span><span class="cell-sub">'+esc(d.vendor+' · '+d.platform)+'</span></td>'+
        '<td>'+esc(d.ip)+'</td><td>'+esc(d.role)+'</td><td>'+esc(d.site)+'</td><td>'+badge(d.status,toneForStatus(d.status))+'</td>'+
        '<td>'+(d.latency==null?'—':esc(d.latency+' ms'))+'</td><td>'+esc(d.availability+'%')+'</td><td>'+(latest?badge(latest.status,toneForStatus(latest.status)):badge("N/A","blue"))+'</td>'+
        '<td><button class="btn ghost" data-device-open="'+esc(d.id)+'">Open</button></td></tr>';
    }).join(""):'<tr><td colspan="9" class="empty">No devices match current filters.</td></tr>';
    qsa("[data-device-open]").forEach(b=>b.onclick=()=>openDeviceModal(b.dataset.deviceOpen));
  }
  $("deviceSearch").addEventListener("input",renderDevices);$("deviceSiteFilter").addEventListener("change",renderDevices);$("deviceStatusFilter").addEventListener("change",renderDevices);

  function showModal(title,html,setup){
    $("modalTitle").textContent=title;$("modalBody").innerHTML=html;$("modalBackdrop").hidden=false;if(setup)setup($("modalBody"));
  }
  function closeModal(){$("modalBackdrop").hidden=true;$("modalBody").innerHTML="";}
  $("modalCloseBtn").onclick=closeModal;$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal();});
  function openDeviceModal(id){
    const d=device(id);if(!d)return;selectedDeviceId=id;const cd=configDeviceForDevice(id),latest=cd?backupsForConfigDevice(cd.id)[0]:null;
    const iprec=state.addresses.find(a=>a.hostname===d.hostname||a.ip===d.ip);const svc=state.services.filter(s=>s.deviceId===id);
    showModal(d.hostname,
      '<div class="grid two"><div class="panel"><div class="stack">'+
      [
        ["IP",d.ip],["MAC",d.mac],["Site",d.site],["Role",d.role],["Platform",d.platform],["Status",d.status],
        ["Latency",d.latency==null?"—":d.latency+" ms"],["Availability",d.availability+"%"],["IPAM",iprec?iprec.state:"Not documented"],["Config",latest?latest.status+" v"+latest.version:"Not managed"]
      ].map(x=>'<div class="stack-row"><div><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></div></div>').join("")+
      '</div></div><div class="panel"><div class="panel-head"><div><span class="kicker">RESOURCE HEALTH</span><h3>Telemetry</h3></div></div>'+
      '<div class="meters">'+meter("CPU",d.cpu)+meter("Memory",d.memory)+meter("Disk",d.disk)+'</div><div class="panel-head" style="margin-top:14px"><div><span class="kicker">SERVICES</span><h3>Observed ports</h3></div></div>'+
      '<div class="stack">'+(svc.length?svc.map(s=>'<div class="stack-row"><div><b>'+esc(s.name+' :'+s.port)+'</b><small>'+esc(s.owner+' · '+s.response+' ms')+'</small></div>'+badge(s.state,toneForStatus(s.state))+'</div>').join(""):'<div class="empty">No monitored services.</div>')+'</div></div></div>'+
      '<div class="hero-actions"><button class="btn primary" data-modal-go="troubleshoot">Troubleshoot</button><button class="btn ghost" data-modal-go="ipam">IPAM</button><button class="btn ghost" data-modal-go="configs">Config Vault</button><button class="btn ghost" data-modal-go="docs">Documentation</button></div>',
      root=>qsa("[data-modal-go]",root).forEach(b=>b.onclick=()=>{closeModal();openPage(b.dataset.modalGo);if(b.dataset.modalGo==="troubleshoot"){$("diagTarget").value=id;}}));
  }
  function meter(label,val){
    const cls=val>=90?"critical":val>=75?"warn":"";
    return '<div class="meter-row"><span>'+label+'</span><div class="meter"><i class="'+cls+'" style="width:'+Math.min(100,val)+'%"></i></div><b>'+val+'%</b></div>';
  }

  $("scanNetworkBtn").addEventListener("click",()=>{
    state.devices.forEach(d=>d.lastSeen=now());
    audit("Discovery","Network scan completed","Simulated discovery refreshed "+state.devices.length+" shared device records.");
    save();renderAll();toast("Discovery completed",state.devices.length+" devices refreshed.");
  });

  function renderHealth(){
    const score=healthScore();$("healthScore").textContent=score+"%";
    const critical=state.devices.filter(d=>d.status==="warning"&&(d.disk>=90||d.cpu>=90||d.memory>=90)).length;
    const warning=state.devices.filter(d=>d.status==="warning").length;
    const maint=state.devices.filter(d=>d.status==="maintenance").length;
    const degraded=state.services.filter(s=>s.state!=="Up").length;
    $("healthSummaryCards").innerHTML=[
      ["Warning hosts",warning],["Critical metrics",critical],["Maintenance",maint],["Degraded services",degraded]
    ].map(x=>'<article><span>'+x[0]+'</span><strong>'+x[1]+'</strong></article>').join("");
    $("hostCards").innerHTML=state.devices.filter(d=>["Server","Router","Switch","Access Point"].includes(d.role)).map(d=>
      '<div class="host-card"><h4>'+esc(d.hostname)+' '+badge(d.status,toneForStatus(d.status))+'</h4><p>'+esc(d.role+' · '+d.site+' · '+d.ip)+'</p><div class="meters">'+meter("CPU",d.cpu)+meter("Memory",d.memory)+meter("Disk",d.disk)+'</div></div>'
    ).join("");
    $("serviceRows").innerHTML=state.services.map(s=>{
      const d=device(s.deviceId);
      return '<div class="stack-row"><div><b>'+esc(s.name+' :'+s.port+' · '+(d?d.hostname:s.deviceId))+'</b><small>'+esc(s.owner+' · '+s.response+' ms · dependency: '+s.dependency)+'</small></div>'+badge(s.state,toneForStatus(s.state))+'</div>';
    }).join("");
  }
  $("collectTelemetryBtn").addEventListener("click",()=>{
    state.devices.forEach((d,i)=>{
      if(d.status!=="offline"&&d.status!=="maintenance"){
        const delta=((i*7+state.audit.length)%7)-3;
        d.cpu=Math.max(3,Math.min(99,d.cpu+delta));d.memory=Math.max(8,Math.min(99,d.memory+Math.round(delta/2)));d.latency=Math.max(1,Math.round((d.latency||8)+delta*.6));
      }
    });
    const avg=Math.round(state.devices.filter(d=>d.latency!=null).reduce((s,d)=>s+d.latency,0)/state.devices.filter(d=>d.latency!=null).length*10)/10;
    state.latency.push(avg);state.latency=state.latency.slice(-48);audit("Monitoring","Telemetry collected","Fleet metrics refreshed; average latency "+avg+" ms.");
    save();renderAll();toast("Telemetry collected","Fleet health recalculated.");
  });

  function renderIpam(){
    const used=state.subnets.reduce((s,x)=>s+x.used,0),total=state.subnets.reduce((s,x)=>s+x.total,0),conflicts=state.addresses.filter(a=>a.state==="Conflict").length,high=state.subnets.filter(s=>utilization(s)>=85).length;
    $("ipamSummary").innerHTML=[["Total addresses",total,used+" used"],["Overall utilization",Math.round(used/total*100)+"%",(total-used)+" available"],["Conflicts",conflicts,"require review"],["Capacity alerts",high,"subnets ≥85%"]].map(x=>'<article class="summary-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></article>').join("");
    $("subnetCards").innerHTML=state.subnets.map(s=>{
      const u=utilization(s),cls=u>=90?"critical":u>=80?"warn":"";
      return '<button class="subnet-card" data-subnet="'+s.id+'"><h4>'+esc(s.name)+'</h4><p>'+esc(s.cidr+' · VLAN '+s.vlan+' · '+s.site)+'</p><div class="util-track"><div class="util-fill '+cls+'" style="width:'+u+'%"></div></div><p>'+s.used+' / '+s.total+' · '+u+'%</p></button>';
    }).join("");
    $("vlanRows").innerHTML=state.vlans.map(v=>{const s=subnet(v.subnetId);return '<div class="stack-row"><div><b>VLAN '+v.vlan+' · '+esc(v.name)+'</b><small>'+esc(v.site+' · '+v.department+' · '+(s?s.cidr:""))+'</small></div></div>';}).join("");
    $("addressRows").innerHTML=state.addresses.map(a=>{const s=subnet(a.subnetId);return '<tr><td>'+esc(a.ip)+'</td><td>'+esc(a.hostname)+'</td><td>'+esc(s?s.name:a.subnetId)+'</td><td>'+esc(s?s.site:"")+'</td><td>'+badge(a.state,a.state==="Conflict"?"red":a.state==="Static"?"green":a.state==="Reserved"?"purple":"blue")+'</td><td>'+esc(a.owner)+'</td><td>'+esc(a.mac)+'</td></tr>';}).join("");
    qsa("[data-subnet]").forEach(b=>b.onclick=()=>openSubnetModal(b.dataset.subnet));
  }
  function openSubnetModal(id){
    const s=subnet(id);if(!s)return;const u=utilization(s),addrs=state.addresses.filter(a=>a.subnetId===id);
    showModal(s.name,'<div class="grid two"><div class="panel"><div class="stack">'+[["CIDR",s.cidr],["VLAN",s.vlan],["Site",s.site],["Gateway",s.gateway],["DNS",s.dns1+" / "+s.dns2],["Utilization",u+"%"]].map(x=>'<div class="stack-row"><div><b>'+x[0]+'</b><small>'+esc(x[1])+'</small></div></div>').join("")+'</div></div><div class="panel"><div class="panel-head"><div><span class="kicker">DOCUMENTED ADDRESSES</span><h3>'+addrs.length+' records</h3></div></div><div class="stack">'+addrs.map(a=>'<div class="stack-row"><div><b>'+esc(a.ip+' · '+a.hostname)+'</b><small>'+esc(a.owner)+'</small></div>'+badge(a.state,a.state==="Conflict"?"red":"blue")+'</div>').join("")+'</div></div></div>');
  }

  $("openPlannerBtn").addEventListener("click",()=>{
    showModal("Subnet Planner",'<label class="field"><span>Parent CIDR</span><input id="mParentCidr" value="10.23.0.0/16"></label><label class="field"><span>New prefix</span><input id="mChildPrefix" type="number" value="24" min="1" max="32"></label><button class="btn primary wide" id="mPlan">Calculate</button><div id="mPlanOut" class="cidr-output"></div>',()=>{
      $("mPlan").onclick=()=>{try{const parent=cidrInfo($("mParentCidr").value.trim()),p=Number($("mChildPrefix").value);if(p<parent.prefix||p>32)throw new Error("New prefix must be equal or larger than parent prefix.");const count=Math.min(16,Math.pow(2,p-parent.prefix)),size=Math.pow(2,32-p),start=ipToInt(parent.network.split("/")[0]);$("mPlanOut").innerHTML=Array.from({length:count},(_,i)=>'<div><span>Child '+(i+1)+'</span><b>'+intToIp((start+i*size)>>>0)+'/'+p+'</b></div>').join("");}catch(e){$("mPlanOut").innerHTML='<div><span>Error</span><b>'+esc(e.message)+'</b></div>';}};});
  });

  function renderConfigs(){
    const latest=state.configDevices.map(cd=>({cd,b:backupsForConfigDevice(cd.id)[0]})),success=latest.filter(x=>x.b?.status==="success").length,failed=latest.filter(x=>x.b?.status==="failed").length,changed=latest.filter(x=>x.b?.changed).length;
    $("configSummary").innerHTML=[["Managed devices",state.configDevices.length,"configuration targets"],["Latest success",success,Math.round(success/state.configDevices.length*100)+"%"],["Latest failed",failed,"requires review"],["Changes detected",changed,"latest versions"]].map(x=>'<article class="summary-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></article>').join("");
    $("configDeviceRows").innerHTML=latest.map(({cd,b})=>{const d=device(cd.deviceId);return '<div class="stack-row"><div><b>'+esc((d?d.hostname:cd.deviceId)+' · every '+Math.round(cd.interval/60)+'h')+'</b><small>'+esc((b?fmt(b.createdAt):"No backup")+' · retain '+cd.retention+' versions'+(b?.changed?" · change detected":""))+'</small></div><div><span>'+badge(b?b.status:"none",toneForStatus(b?.status))+'</span> <button class="btn ghost" data-backup-one="'+cd.id+'">Backup</button></div></div>';}).join("");
    fillCompareDevice();qsa("[data-backup-one]").forEach(b=>b.onclick=()=>backupOne(Number(b.dataset.backupOne)));
  }
  function fillCompareDevice(){
    const sel=$("compareDevice"),current=sel.value;sel.innerHTML=state.configDevices.map(cd=>{const d=device(cd.deviceId);return '<option value="'+cd.id+'">'+esc(d?d.hostname:cd.deviceId)+'</option>';}).join("");if(state.configDevices.some(cd=>String(cd.id)===current))sel.value=current;updateCompareVersions();
  }
  function updateCompareVersions(){
    const id=Number($("compareDevice").value),rows=backupsForConfigDevice(id).filter(b=>b.status==="success");
    $("compareLeft").innerHTML=rows.map(b=>'<option value="'+b.id+'">v'+b.version+' · '+fmt(b.createdAt)+'</option>').join("");
    $("compareRight").innerHTML=rows.map(b=>'<option value="'+b.id+'">v'+b.version+' · '+fmt(b.createdAt)+'</option>').join("");
    if(rows.length>1){$("compareLeft").value=rows[1].id;$("compareRight").value=rows[0].id;}
  }
  $("compareDevice").addEventListener("change",updateCompareVersions);
  $("runCompareBtn").addEventListener("click",()=>{
    const a=state.backups.find(b=>b.id===$("compareLeft").value),b=state.backups.find(b=>b.id===$("compareRight").value);
    $("configDiff").innerHTML=a&&b?simpleDiff(a.config,b.config):"Select two successful versions.";
  });
  function simpleDiff(a,b){
    const A=String(a||"").split("\n"),B=String(b||"").split("\n"),max=Math.max(A.length,B.length),out=[];
    for(let i=0;i<max;i++){const x=A[i],y=B[i];if(x===y&&x!==undefined)out.push('<span class="diff-same">  '+esc(x)+'</span>');else{if(x!==undefined)out.push('<span class="diff-del">- '+esc(x)+'</span>');if(y!==undefined)out.push('<span class="diff-add">+ '+esc(y)+'</span>');}}
    return out.join("\n");
  }
  function backupOne(id){
    const cd=configDeviceById(id),d=cd?device(cd.deviceId):null;if(!cd||!d)return;
    const previous=backupsForConfigDevice(id).find(b=>b.status==="success");
    const fail=d.status==="offline"||(d.hostname==="BR-SW-01"&&cd.lastStatus==="failed"&&state.backups.filter(b=>b.configDeviceId===id).length<3);
    const config=previous?.config||"hostname "+d.hostname+"\n!\n";
    const version=Math.max(0,...backupsForConfigDevice(id).map(b=>b.version))+1;
    const rec={id:uid("BKP"),configDeviceId:id,version,status:fail?"failed":"success",changed:false,hash:fail?"—":Math.random().toString(16).slice(2,14),createdAt:now(),config:fail?"":config,error:fail?"SSH timeout":""};
    state.backups.unshift(rec);cd.lastBackupAt=rec.createdAt;cd.lastStatus=rec.status;audit("Config",fail?"Backup failed":"Backup completed",d.hostname+" version "+version+(fail?" failed: SSH timeout.":" stored successfully."));save();renderConfigs();renderOverview();renderAlerts();toast(fail?"Backup failed":"Backup completed",d.hostname+" · v"+version);
  }
  $("backupAllBtn").addEventListener("click",()=>{state.configDevices.forEach(cd=>backupOne(cd.id));toast("Backup cycle complete","All managed devices processed.");});

  function renderTroubleshoot(){
    const sel=$("diagTarget"),current=selectedDeviceId||sel.value;sel.innerHTML=state.devices.map(d=>'<option value="'+d.id+'">'+esc(d.hostname+' · '+d.ip)+'</option>').join("");if(state.devices.some(d=>d.id===current))sel.value=current;selectedDeviceId=sel.value;
    renderDiagnosticFinding();
  }
  $("diagTarget").addEventListener("change",()=>selectedDeviceId=$("diagTarget").value);
  function diagSteps(d,mode,port){
    const results=[];
    const ping={name:"Reachability",pass:d.status!=="offline",detail:d.status==="offline"?"No response from target.":"Reply received; average "+(d.latency??"—")+" ms."};
    const gateway={name:"Path / gateway",pass:d.status!=="offline"&&d.loss<50,detail:d.loss>=50?"Path shows severe loss.":"Gateway and routed path appear reachable."};
    const dns={name:"DNS",pass:d.status!=="offline",detail:d.role==="Server"&&d.services.includes(53)?"Target provides DNS service.":"Forward resolution simulated successfully."};
    const tcp={name:"TCP "+port,pass:d.status!=="offline"&&d.services.includes(Number(port)),detail:d.services.includes(Number(port))?"Observed service port is available.":"Port is not present in the discovered service profile."};
    const cd=configDeviceForDevice(d.id),latest=cd?backupsForConfigDevice(cd.id)[0]:null;
    const config={name:"Configuration",pass:!cd||latest?.status==="success",detail:!cd?"Device is not config-managed.":latest?.status==="success"?"Latest configuration backup is healthy.":"Latest configuration backup failed."};
    if(mode==="ping")results.push(ping);else if(mode==="dns")results.push(dns);else if(mode==="gateway")results.push(gateway);else if(mode==="port")results.push(tcp);else if(mode==="config")results.push(config);else results.push(ping,gateway,dns,tcp,config);
    return results;
  }
  $("runDiagBtn").addEventListener("click",runDiagnostic);
  function runDiagnostic(){
    const d=device($("diagTarget").value);if(!d)return;selectedDeviceId=d.id;const mode=$("diagMode").value,port=Math.max(1,Math.min(65535,Number($("diagPort").value)||443)),results=diagSteps(d,mode,port),pass=results.every(r=>r.pass);
    const related=buildAlerts().filter(a=>a.deviceId===d.id&&!["Resolved","Closed"].includes(a.status));
    const summary=pass?"No blocking fault found in the selected scope.":results.some(r=>!r.pass&&r.name==="Reachability")?"Target is unreachable. Verify power, interface, VLAN, path, and monitoring state.":results.some(r=>!r.pass&&r.name==="Configuration")?"Configuration management is unhealthy. Review credentials, SSH reachability, and backup schedule.":results.some(r=>!r.pass&&r.name.startsWith("TCP"))?"The selected service port is not observed. Validate the application, ACL/firewall, and service state.":"Network path or service health requires investigation.";
    lastDiagnostic={id:uid("DIA"),deviceId:d.id,mode,port,results,pass,summary,relatedAlerts:related.length,createdAt:now()};state.diagnostics.unshift(lastDiagnostic);state.diagnostics=state.diagnostics.slice(0,100);audit("Troubleshooting","Diagnostic completed",d.hostname+" · "+(pass?"PASS":"FAIL")+" · "+summary);save();
    $("diagTerminal").textContent=["NETOPS ENTERPRISE DIAGNOSTIC","Target: "+d.hostname+" ("+d.ip+")","Site: "+d.site+" · "+d.role,"Started: "+fmt(lastDiagnostic.createdAt),"",...results.flatMap(r=>["["+(r.pass?"PASS":"FAIL")+"] "+r.name,"  "+r.detail]),"", "Related active alerts: "+related.length,"Interpretation: "+summary,"Mode: portfolio-safe simulation"].join("\n");
    renderDiagnosticFinding();toast("Diagnostic completed",d.hostname+" · "+(pass?"PASS":"FAIL"));
  }
  function renderDiagnosticFinding(){
    if(!lastDiagnostic&&state.diagnostics.length)lastDiagnostic=state.diagnostics[0];
    if(!lastDiagnostic){$("diagFinding").className="finding-empty";$("diagFinding").textContent="No diagnostic has been run.";return;}
    const d=device(lastDiagnostic.deviceId);$("diagFinding").className="finding-card";$("diagFinding").innerHTML='<h4>'+esc((d?d.hostname:lastDiagnostic.deviceId)+' · '+(lastDiagnostic.pass?"PASS":"FAIL"))+'</h4><p>'+esc(lastDiagnostic.summary)+'</p><div class="finding-lines">'+lastDiagnostic.results.map(r=>'<div class="finding-line"><span>'+esc(r.name)+'</span>'+badge(r.pass?"Pass":"Fail",r.pass?"green":"red")+'</div>').join("")+'</div>';
  }
  qsa("[data-quick]").forEach(b=>b.addEventListener("click",()=>{const mode=b.dataset.quick;if(mode==="trace")$("diagMode").value="gateway";else if(mode==="arp")$("diagMode").value="ping";else $("diagMode").value=mode;runDiagnostic();}));
  function ipToInt(ip){return ip.split(".").reduce((acc,o)=>((acc<<8)+Number(o))>>>0,0)>>>0;}
  function intToIp(v){return[24,16,8,0].map(s=>(v>>>s)&255).join(".");}
  function validIp(ip){const p=ip.split(".");return p.length===4&&p.every(x=>/^\d{1,3}$/.test(x)&&Number(x)>=0&&Number(x)<=255);}
  function cidrInfo(value){
    const [ip,ps]=value.split("/"),prefix=Number(ps);if(!validIp(ip)||!Number.isInteger(prefix)||prefix<0||prefix>32)throw new Error("Enter a valid IPv4 CIDR.");
    const n=ipToInt(ip),mask=prefix===0?0:(0xffffffff<<(32-prefix))>>>0,network=(n&mask)>>>0,broadcast=(network|(~mask>>>0))>>>0,total=Math.pow(2,32-prefix),usable=prefix>=31?total:Math.max(0,total-2);
    return{network:intToIp(network)+"/"+prefix,prefix,mask:intToIp(mask),broadcast:intToIp(broadcast),usable,first:intToIp((prefix>=31?network:network+1)>>>0),last:intToIp((prefix>=31?broadcast:broadcast-1)>>>0)};
  }
  $("cidrCalcBtn").addEventListener("click",()=>{try{const r=cidrInfo($("cidrInput").value.trim());$("cidrOutput").innerHTML=[["Network",r.network],["Mask",r.mask],["Broadcast",r.broadcast],["Usable",r.usable],["Range",r.first+" – "+r.last]].map(x=>'<div><span>'+x[0]+'</span><b>'+esc(x[1])+'</b></div>').join("");}catch(e){$("cidrOutput").innerHTML='<div><span>Error</span><b>'+esc(e.message)+'</b></div>';}});

  function renderDocs(){
    $("docSummary").innerHTML=[["Devices",state.devices.length,"shared inventory"],["Sites",sites().length,"documented"],["VLANs",state.vlans.length,"segmentation records"],["Port mappings",state.portMappings.length,"switch links"]].map(x=>'<article class="summary-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></article>').join("");
    $("docTopology").innerHTML=sites().map(site=>'<div class="doc-site"><b>'+esc(site)+'</b><div class="doc-nodes">'+state.devices.filter(d=>d.site===site).map(d=>'<span>'+esc(d.hostname+' · '+d.ip)+'</span>').join("")+'</div></div>').join("");
    $("portMappings").innerHTML=state.portMappings.map(p=>{const sw=device(p.switchId),tg=device(p.targetId);return '<div class="stack-row"><div><b>'+esc((sw?sw.hostname:p.switchId)+' · '+p.port)+'</b><small>'+esc((tg?tg.hostname:p.targetId)+' · '+p.mode+' · VLAN '+p.vlan)+'</small></div></div>';}).join("");
    $("docChanges").innerHTML=renderTimeline(state.docChanges.map(c=>({at:c.at,module:"Docs",action:"Change note",detail:c.detail})));
  }
  $("printDocsBtn").addEventListener("click",()=>{audit("Documentation","Documentation printed","Generated printable living network documentation.");save();window.print();});
  $("addDocChangeBtn").addEventListener("click",()=>{const v=$("docChangeInput").value.trim();if(!v)return;state.docChanges.unshift({id:uid("DOC"),at:now(),detail:v});$("docChangeInput").value="";audit("Documentation","Change note added",v);save();renderDocs();renderOverview();toast("Documentation updated",v);});

  function renderAlerts(){
    const rows=buildAlerts().slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const active=rows.filter(a=>!["Resolved","Closed"].includes(a.status)),critical=active.filter(a=>a.severity==="Critical").length,warning=active.filter(a=>a.severity==="Warning").length;
    $("alertSummary").innerHTML=[["Active",active.length,"all sources"],["Critical",critical,"immediate"],["Warning",warning,"attention"],["Sources",[...new Set(active.map(a=>a.source))].length,"integrated modules"]].map(x=>'<article class="summary-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></article>').join("");
    $("alertRows").innerHTML=rows.map(a=>{const d=device(a.deviceId),cls=a.severity.toLowerCase();return '<div class="alert-card '+cls+'"><div><b>'+esc(a.severity)+'</b><time>'+esc(fmt(a.createdAt))+'</time></div><div><h4>'+esc(a.title)+'</h4><p>'+esc((d?d.hostname+" · ":"")+a.message+' · '+a.source)+'</p></div><div>'+badge(a.status,toneForStatus(a.status))+(a.id.startsWith("ALT-")&&!["Resolved","Closed"].includes(a.status)?' <button class="btn ghost" data-ack="'+a.id+'">Acknowledge</button>':'')+'</div></div>';}).join("");
    qsa("[data-ack]").forEach(b=>b.onclick=()=>{const a=state.alerts.find(x=>x.id===b.dataset.ack);if(a){a.status="Acknowledged";audit("Alerts","Alert acknowledged",a.title);save();renderAlerts();renderOverview();}});
  }

  function renderTimeline(rows){return rows.length?rows.map(r=>'<div class="timeline-entry"><time>'+esc(fmt(r.at))+'</time><span class="mod">'+esc(r.module||"System")+'</span><div><b>'+esc(r.action||"Event")+'</b><small>'+esc(r.detail||"")+'</small></div></div>').join(""):'<div class="empty">No activity.</div>';}
  function renderAudit(){
    const mods=[...new Set(state.audit.map(a=>a.module))].sort(),sel=$("auditModuleFilter"),prev=sel.value;sel.innerHTML='<option value="">All modules</option>'+mods.map(m=>'<option>'+esc(m)+'</option>').join("");if(mods.includes(prev))sel.value=prev;
    const q=$("auditSearch").value.toLowerCase().trim();const rows=state.audit.filter(a=>(!q||[a.module,a.action,a.detail].join(" ").toLowerCase().includes(q))&&(!sel.value||a.module===sel.value));
    $("auditRows").innerHTML=renderTimeline(rows);
  }
  $("auditSearch").addEventListener("input",renderAudit);$("auditModuleFilter").addEventListener("change",renderAudit);

  function renderGlobalSearch(q){
    const box=$("searchResults"),v=q.trim().toLowerCase();if(v.length<2){box.hidden=true;box.innerHTML="";return;}
    const hits=[];
    state.devices.forEach(d=>{if([d.hostname,d.ip,d.role,d.site,d.vendor].join(" ").toLowerCase().includes(v))hits.push({type:"device",id:d.id,title:d.hostname,detail:d.ip+" · "+d.role+" · "+d.site});});
    state.subnets.forEach(s=>{if([s.name,s.cidr,s.site,s.vlan].join(" ").toLowerCase().includes(v))hits.push({type:"subnet",id:s.id,title:s.name,detail:s.cidr+" · VLAN "+s.vlan});});
    state.vlans.forEach(x=>{if([x.name,x.vlan,x.site].join(" ").toLowerCase().includes(v))hits.push({type:"vlan",id:x.id,title:"VLAN "+x.vlan+" · "+x.name,detail:x.site});});
    buildAlerts().forEach(a=>{if([a.title,a.message,a.source].join(" ").toLowerCase().includes(v))hits.push({type:"alert",id:a.id,title:a.title,detail:a.source+" · "+a.severity});});
    box.innerHTML=hits.slice(0,10).map((h,i)=>'<button class="search-hit" data-hit="'+i+'"><b>'+esc(h.title)+'</b><small>'+esc(h.type+' · '+h.detail)+'</small></button>').join("")||'<div class="empty">No matches.</div>';box.hidden=false;
    qsa("[data-hit]",box).forEach(b=>b.onclick=()=>{const h=hits[Number(b.dataset.hit)];box.hidden=true;$("globalSearch").value="";if(h.type==="device")openDeviceModal(h.id);else if(h.type==="subnet"){openPage("ipam");setTimeout(()=>openSubnetModal(h.id),0);}else if(h.type==="vlan")openPage("ipam");else openPage("alerts");});
  }
  $("globalSearch").addEventListener("input",e=>renderGlobalSearch(e.target.value));document.addEventListener("click",e=>{if(!e.target.closest(".search-wrap"))$("searchResults").hidden=true;});

  $("exportBtn").addEventListener("click",()=>{
    audit("System","Workspace exported","NetOps Enterprise JSON workspace exported.");save();
    const blob=new Blob([JSON.stringify({schema:"netops-enterprise",version:1,exportedAt:now(),workspace:state},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="netops-enterprise-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $("importInput").addEventListener("change",async()=>{const file=$("importInput").files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),w=parsed.workspace||parsed;if(!w||!Array.isArray(w.devices)||!Array.isArray(w.subnets))throw new Error("Invalid NetOps Enterprise workspace.");state={...seedState(),...w};audit("System","Workspace imported",file.name);save();renderAll();openPage("overview");toast("Workspace imported",file.name);}catch(e){toast("Import failed",e.message);}finally{$("importInput").value="";}});
  

  function setAuthMessage(message,tone=""){
    const box=$("authMessage");if(!box)return;
    box.textContent=message;box.className="auth-message"+(tone?" "+tone:"");
  }

  function applyRoleAccess(){
    document.body.dataset.role=cloudRole;
    const viewer=cloudRole==="viewer";
    [
      "scanNetworkBtn","collectTelemetryBtn","openPlannerBtn","backupAllBtn",
      "runCompareBtn","runDiagBtn","addDocChangeBtn"
    ].forEach(id=>{if($(id))$(id).disabled=viewer;});
    qsa("[data-backup-one],[data-ack],[data-quick]").forEach(el=>{if(viewer)el.disabled=true;});
  }

  function showCloudIdentity(user,role){
    cloudRole=role||"viewer";
    $("cloudUser").hidden=false;
    $("cloudUserLabel").textContent=user?.email||"Cloud user";
    $("cloudRoleLabel").textContent=cloudRole;
    applyRoleAccess();
  }

  async function bootstrapCloud(displayName=""){
    if(!window.NetOpsCloud?.available)throw new Error("Supabase client unavailable.");
    const result=await window.NetOpsCloud.bootstrap(state,displayName);
    if(result.state)state={...seedState(),...result.state};
    if(result.audit?.length)state.audit=result.audit;
    selectedDeviceId=state.devices[0]?.id||null;
    lastDiagnostic=state.diagnostics?.[0]||null;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    $("authGate").hidden=true;
    showCloudIdentity(result.user,result.role);
    renderAll();
    toast("Cloud workspace connected",result.name+" · "+result.role);
  }

  async function initCloudAuth(){
    if(!window.NetOpsCloud?.available){
      setAuthMessage("Cloud client could not load. Portfolio Demo is still available.","error");
      return;
    }
    try{
      const session=await window.NetOpsCloud.init();
      if(session){
        setAuthMessage("Restoring NetOps Enterprise cloud workspace...");
        await bootstrapCloud();
      }
    }catch(error){
      console.error(error);
      setAuthMessage(error.message||"Unable to restore cloud session.","error");
    }
  }

  qsa("[data-auth-tab]").forEach(button=>button.addEventListener("click",()=>{
    qsa("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b===button));
    const signup=button.dataset.authTab==="signup";
    $("signInForm").hidden=signup;$("signUpForm").hidden=!signup;
    setAuthMessage(signup?"Create a cloud network workspace.":"Sign in to load persistent network operations data.");
  }));

  $("signInForm").addEventListener("submit",async event=>{
    event.preventDefault();setAuthMessage("Signing in...");
    try{
      await window.NetOpsCloud.signIn($("authEmail").value.trim(),$("authPassword").value);
      await bootstrapCloud();
    }catch(error){setAuthMessage(error.message||"Sign-in failed.","error");}
  });

  $("signUpForm").addEventListener("submit",async event=>{
    event.preventDefault();const name=$("authDisplayName").value.trim();
    setAuthMessage("Creating account...");
    try{
      const result=await window.NetOpsCloud.signUp($("authSignupEmail").value.trim(),$("authSignupPassword").value,name);
      if(result.session)await bootstrapCloud(name);
      else setAuthMessage("Account created. Confirm your email, then return and sign in.","success");
    }catch(error){setAuthMessage(error.message||"Account creation failed.","error");}
  });

  $("continueDemoBtn").addEventListener("click",()=>{
    cloudRole="demo";$("authGate").hidden=true;$("cloudUser").hidden=true;applyRoleAccess();
    toast("Portfolio Demo","Using browser-local network data. No external infrastructure is contacted.");
  });

  $("cloudSignOutBtn").addEventListener("click",async()=>{
    try{await window.NetOpsCloud.signOut();}catch(error){console.error(error);}
    cloudRole="demo";$("cloudUser").hidden=true;$("authGate").hidden=false;applyRoleAccess();
    setAuthMessage("Signed out. Sign in again or launch Portfolio Demo.");
  });

  function renderAll(){renderOverview();renderTopology();renderDevices();renderHealth();renderIpam();renderConfigs();renderTroubleshoot();renderDocs();renderAlerts();renderAudit();}
  renderAll();
  applyRoleAccess();
  initCloudAuth();
  try{$("cidrCalcBtn").click();}catch(_){}
})();