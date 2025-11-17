const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, '.next/static')));
app.use(express.static(path.join(__dirname, 'public')));

const activeTransfers = new Map();
const clients = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  clients.set(socket.id, { lastSeen: Date.now(), isOnline: true });

  socket.on('register', (clientInfo) => {
    clients.set(socket.id, {
      ...clientInfo,
      lastSeen: Date.now(),
      isOnline: true
    });
    io.emit('clients-updated', Array.from(clients.entries()).map(([id, data]) => ({ id, ...data })));
  });

  socket.on('start-transfer', (transferData) => {
    const transferId = transferData.transferId;
    activeTransfers.set(transferId, {
      ...transferData,
      status: 'in-progress',
      progress: 0,
      startTime: Date.now(),
      bytesTransferred: 0
    });
    io.emit('transfer-update', activeTransfers.get(transferId));
  });

  socket.on('chunk-upload', (chunkData) => {
    const transfer = activeTransfers.get(chunkData.transferId);
    if (transfer) {
      const now = Date.now();
      const timeElapsed = (now - transfer.startTime) / 1000; // in seconds
      const bytesPerSecond = chunkData.bytesTransferred / timeElapsed;
      
      const updatedTransfer = {
        ...transfer,
        progress: chunkData.progress,
        status: chunkData.progress === 100 ? 'completed' : 'in-progress',
        speed: bytesPerSecond,
        bytesTransferred: chunkData.bytesTransferred,
        timeRemaining: chunkData.progress === 100 
          ? 0 
          : (transfer.size - chunkData.bytesTransferred) / bytesPerSecond
      };
      
      activeTransfers.set(chunkData.transferId, updatedTransfer);
      io.emit('transfer-update', updatedTransfer);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const client = clients.get(socket.id);
    if (client) {
      client.isOnline = false;
      client.lastSeen = Date.now();
      io.emit('clients-updated', Array.from(clients.entries()).map(([id, data]) => ({ id, ...data })));
    }
  });
});

// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// Test connection endpoint
app.get('/api/test-connection', (req, res) => {
  const { host, port = 8888 } = req.query;
  
  if (!host) {
    return res.status(400).json({ error: 'Host parameter is required' });
  }
  
  const startTime = Date.now();
  let testResult = {
    host: host,
    port: port,
    status: 'testing',
    latency: null,
    reachable: false
  };
  
  const testSocket = require('net').Socket();
  
  testSocket.connect(port, host, () => {
    const endTime = Date.now();
    testResult.status = 'success';
    testResult.latency = endTime - startTime;
    testResult.reachable = true;
    testSocket.destroy();
    
    res.json(testResult);
  });
  
  testSocket.on('error', (err) => {
    testResult.status = 'error';
    testResult.error = err.message;
    testResult.reachable = false;
    
    res.json(testResult);
  });
  
  testSocket.setTimeout(5000, () => {
    testResult.status = 'timeout';
    testResult.error = 'Connection timeout';
    testResult.reachable = false;
    
    res.json(testResult);
  });
});

// Ping test endpoint
app.get('/api/ping', (req, res) => {
  const { host } = req.query;
  
  if (!host) {
    return res.status(400).json({ error: 'Host parameter is required' });
  }
  
  const { exec } = require('child_process');
  
  exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Ping command failed' });
    }
    
    // Parse ping output
    const lines = stdout.split('\n');
    const pingStats = lines[lines.length - 2]; // Last line contains stats
    
    const statsMatch = pingStats.match(/(\d+) packets transmitted, (\d+) received, (\d+)% packet loss/);
    const rttMatch = pingStats.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
    
    const result = {
      host: host,
      transmitted: statsMatch ? parseInt(statsMatch[1]) : 0,
      received: statsMatch ? parseInt(statsMatch[2]) : 0,
      packetLoss: statsMatch ? parseInt(statsMatch[3]) : 100,
      minRtt: rttMatch ? parseFloat(rttMatch[1]) : 0,
      avgRtt: rttMatch ? parseFloat(rttMatch[2]) : 0,
      maxRtt: rttMatch ? parseFloat(rttMatch[3]) : 0,
      status: 'completed'
    };
    
    res.json(result);
  });
});

// Port scan endpoint
app.get('/api/scan-ports', (req, res) => {
  const { host, ports = '22,80,443,8080,8888' } = req.query;
  
  if (!host) {
    return res.status(400).json({ error: 'Host parameter is required' });
  }
  
  const portArray = ports.split(',').map(p => parseInt(p.trim()));
  const net = require('net');
  const results = [];
  let completed = 0;
  
  portArray.forEach(port => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.connect(port, host, () => {
      results.push({
        port: port,
        status: 'open',
        service: getServiceName(port)
      });
      socket.destroy();
      completed++;
    });
    
    socket.on('error', () => {
      results.push({
        port: port,
        status: 'closed',
        service: getServiceName(port)
      });
      socket.destroy();
      completed++;
    });
    
    socket.on('timeout', () => {
      results.push({
        port: port,
        status: 'filtered',
        service: getServiceName(port)
      });
      socket.destroy();
      completed++;
    });
  });
  
  // Wait for all scans to complete
  const checkInterval = setInterval(() => {
    if (completed === portArray.length) {
      clearInterval(checkInterval);
      
      res.json({
        host: host,
        scannedPorts: portArray,
        results: results.sort((a, b) => a.port - b.port),
        openPorts: results.filter(r => r.status === 'open'),
        closedPorts: results.filter(r => r.status === 'closed'),
        filteredPorts: results.filter(r => r.status === 'filtered'),
        totalScanned: portArray.length,
        scanTime: new Date().toISOString()
      });
    }
  }, 100);
});

function getServiceName(port) {
  const services = {
    20: 'FTP',
    21: 'FTP',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    993: 'IMAPS',
    995: 'POP3S',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    8080: 'HTTP-Alt',
    8888: 'Custom App',
    3000: 'Node.js',
    5000: 'Flask',
    8000: 'Django'
  };
  
  return services[port] || 'Unknown';
}

// Bandwidth test endpoint
app.get('/api/bandwidth-test', (req, res) => {
  const { duration = 10 } = req.query;
  
  const testData = Buffer.alloc(1024 * 1024); // 1MB test data
  const startTime = Date.now();
  
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment; filename="bandwidth-test.dat"',
    'Content-Length': testData.length
  });
  
  res.end(testData);
  
  const endTime = Date.now();
  const testDuration = (endTime - startTime) / 1000;
  
  // Store test result (in a real implementation, this would be saved to database)
  const result = {
    testDuration: testDuration,
    dataSize: testData.length,
    estimatedBandwidth: (testData.length * 8) / testDuration, // bits per second
    testTime: new Date().toISOString()
  };
  
  console.log('Bandwidth test completed:', result);
});

// Get bandwidth test results
app.get('/api/bandwidth-results', (req, res) => {
  // In a real implementation, this would fetch from database
  // For now, return simulated results
  res.json({
    lastTest: {
      testDuration: 8.5,
      dataSize: 1048576,
      estimatedBandwidth: 9876543, // ~9.4 Mbps
      testTime: new Date().toISOString()
    },
    history: [
      {
        testDuration: 7.2,
        estimatedBandwidth: 12345678, // ~11.8 Mbps
        testTime: new Date(Date.now() - 3600000).toISOString()
      },
      {
        testDuration: 9.1,
        estimatedBandwidth: 8765432, // ~8.4 Mbps
        testTime: new Date(Date.now() - 7200000).toISOString()
      }
    ]
  });
});

// Network performance monitoring
app.get('/api/network-performance', (req, res) => {
  const os = require('os');
  const process = require('process');
  
  const cpus = os.cpus();
  const memory = process.memoryUsage();
  const networkInterfaces = os.networkInterfaces();
  
  let totalNetworkBytes = { rx: 0, tx: 0 };
  
  // Get network stats (Linux specific, would need platform detection)
  try {
    const stats = require('fs').statSync('/proc/net/dev');
    // Parse network stats (simplified)
  } catch (error) {
    // Fallback for other platforms
    console.log('Network stats not available on this platform');
  }
  
  const performance = {
    timestamp: new Date().toISOString(),
    cpu: {
      usage: process.cpuUsage(),
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed || 0
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external
    },
    network: {
      interfaces: Object.keys(networkInterfaces),
      stats: totalNetworkBytes,
      uptime: os.uptime()
    }
  };
  
  res.json(performance);
});

// Traceroute endpoint
app.get('/api/traceroute', (req, res) => {
  const { host } = req.query;
  
  if (!host) {
    return res.status(400).json({ error: 'Host parameter is required' });
  }
  
  const { exec } = require('child_process');
  
  exec(`traceroute ${host}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Traceroute command failed' });
    }
    
    const lines = stdout.split('\n');
    const hops = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^\s*(\d+)\s+([\w.-]+)\s+([\w.-]+)\s+([\w.-]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
      
      if (match) {
        hops.push({
          hop: parseInt(match[1]),
          host: match[2],
          ip1: match[3],
          ip2: match[4],
          rtt1: parseFloat(match[5]),
          rtt2: parseFloat(match[6]),
          rtt3: parseFloat(match[7]),
          avgRtt: (parseFloat(match[5]) + parseFloat(match[6]) + parseFloat(match[7])) / 3
        });
      }
    });
    
    res.json({
      target: host,
      hops: hops,
      totalHops: hops.length,
      finalHop: hops[hops.length - 1],
      avgLatency: hops.length > 0 ? hops.reduce((sum, hop) => sum + hop.avgRtt, 0) / hops.length : 0,
      timestamp: new Date().toISOString()
    });
  });
});

// DNS lookup endpoint
app.get('/api/dns-lookup', (req, res) => {
  const { hostname } = req.query;
  
  if (!hostname) {
    return res.status(400).json({ error: 'Hostname parameter is required' });
  }
  
  const dns = require('dns');
  
  dns.resolve4(hostname, (error, addresses) => {
    if (error) {
      return res.status(500).json({ error: 'DNS lookup failed' });
    }
    
    dns.reverse(addresses[0], (error, hostnames) => {
      if (error) {
        return res.status(500).json({ error: 'Reverse DNS lookup failed' });
      }
      
      res.json({
        hostname: hostname,
        addresses: addresses,
        reverseHostnames: hostnames,
        primaryAddress: addresses[0],
        timestamp: new Date().toISOString()
      });
    });
  });
});

// Network configuration endpoint
app.get('/api/network-config', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  const config = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    loadavg: os.loadavg(),
    cpus: os.cpus(),
    networkInterfaces: {},
    defaultGateway: null,
    dnsServers: []
  };
  
  // Process network interfaces
  Object.keys(networkInterfaces).forEach(name => {
    const interfaces = networkInterfaces[name];
    const ipv4Interfaces = interfaces.filter(iface => iface.family === 'IPv4' && !iface.internal);
    
    if (ipv4Interfaces.length > 0) {
      config.networkInterfaces[name] = {
        ipv4: ipv4Interfaces.map(iface => ({
          address: iface.address,
          netmask: iface.netmask,
          broadcast: iface.broadcast,
          mac: iface.mac
        })),
        ipv6: interfaces.filter(iface => iface.family === 'IPv6' && !iface.internal).map(iface => ({
          address: iface.address,
          netmask: iface.netmask,
          scope: iface.scope
        }))
      };
    }
  });
  
  // Try to get default gateway (platform specific)
  try {
    const { exec } = require('child_process');
    
    if (os.platform() === 'linux') {
      exec('ip route | grep default', (error, stdout) => {
        if (!error && stdout) {
          const match = stdout.match(/default via ([\d.]+)/);
          if (match) {
            config.defaultGateway = match[1];
          }
        }
      });
    } else if (os.platform() === 'win32') {
      exec('ipconfig', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.split('\n');
          for (const line of lines) {
            if (line.includes('Default Gateway')) {
              const match = line.match(/: ([\d.]+)/);
              if (match) {
                config.defaultGateway = match[1];
                break;
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.log('Could not determine default gateway');
  }
  
  res.json(config);
});

// Port monitoring endpoint
app.get('/api/port-monitor', (req, res) => {
  const { port = 8888 } = req.query;
  
  const net = require('net');
  const server = net.createServer();
  
  server.on('connection', (socket) => {
    const clientAddress = socket.remoteAddress;
    const clientPort = socket.remotePort;
    
    console.log(`Connection from ${clientAddress}:${clientPort}`);
    
    socket.on('data', (data) => {
      console.log(`Received from ${clientAddress}: ${data}`);
      socket.write(`Echo: ${data}`);
    });
    
    socket.on('end', () => {
      console.log(`Client ${clientAddress}:${clientPort} disconnected`);
    });
    
    socket.on('error', (err) => {
      console.error(`Socket error from ${clientAddress}: ${err.message}`);
    });
  });
  
  server.listen(port, () => {
    console.log(`Port monitor listening on port ${port}`);
  });
  
  res.json({
    status: 'monitoring',
    port: port,
    message: `Port monitor started on port ${port}`,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Socket Programming Lab 1 - Network Tools Server running on port ${PORT}`);
  console.log(`📊 Network monitoring and testing tools available`);
  console.log(`🔍 API endpoints ready for network diagnostics`);
});