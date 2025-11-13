const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client'));

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'client/uploads';
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Ensure directories exist
fs.ensureDirSync('client/downloads');
fs.ensureDirSync('client/uploads');

// Statistics tracking
let stats = {
    totalTransfers: 0,
    totalBytes: 0,
    activeConnections: 0,
    startTime: new Date(),
    transfers: []
};

// Connected clients
let connectedClients = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔗 Client connected: ${socket.id}`);
    stats.activeConnections++;
    
    // Register client
    socket.on('register', (data) => {
        connectedClients.set(socket.id, {
            id: socket.id,
            studentId: data.studentId || 'Unknown',
            ip: socket.handshake.address,
            connectedAt: new Date()
        });
        
        // Send updated client list
        io.emit('clients-update', Array.from(connectedClients.values()));
        
        // Send current stats
        socket.emit('stats-update', stats);
        
        console.log(`👤 Registered client: ${data.studentId} (${socket.id})`);
    });
    
    // Handle file transfer request
    socket.on('transfer-request', (data) => {
        const { targetId, fileInfo } = data;
        
        // Forward transfer request to target client
        io.to(targetId).emit('transfer-request', {
            fromId: socket.id,
            fromStudentId: connectedClients.get(socket.id)?.studentId,
            fileInfo: fileInfo
        });
        
        console.log(`📤 Transfer request from ${socket.id} to ${targetId}`);
    });
    
    // Handle transfer response
    socket.on('transfer-response', (data) => {
        const { requestId, accepted } = data;
        
        // Forward response to requester
        io.to(requestId).emit('transfer-response', {
            fromId: socket.id,
            accepted: accepted
        });
        
        if (accepted) {
            console.log(`✅ Transfer accepted between ${requestId} and ${socket.id}`);
        } else {
            console.log(`❌ Transfer rejected between ${requestId} and ${socket.id}`);
        }
    });
    
    // Handle file chunk transfer
    socket.on('file-chunk', (data) => {
        const { targetId, chunk, chunkIndex, totalChunks, fileId, checksum } = data;
        
        // Forward chunk to target client
        io.to(targetId).emit('file-chunk', {
            fromId: socket.id,
            chunk: chunk,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
            fileId: fileId,
            checksum: checksum
        });
        
        // Update transfer progress
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        socket.emit('transfer-progress', { progress: progress });
        io.to(targetId).emit('transfer-progress', { progress: progress });
    });
    
    // Handle file transfer completion
    socket.on('transfer-complete', (data) => {
        const { targetId, fileId, fileName, fileSize, checksum } = data;
        
        // Update statistics
        stats.totalTransfers++;
        stats.totalBytes += fileSize;
        stats.transfers.push({
            id: fileId,
            from: socket.id,
            to: targetId,
            fileName: fileName,
            fileSize: fileSize,
            timestamp: new Date(),
            checksum: checksum
        });
        
        // Notify completion
        io.to(targetId).emit('transfer-complete', {
            fromId: socket.id,
            fileId: fileId,
            fileName: fileName,
            fileSize: fileSize,
            checksum: checksum
        });
        
        // Broadcast updated stats
        io.emit('stats-update', stats);
        
        console.log(`✅ Transfer complete: ${fileName} (${fileSize} bytes)`);
    });
    
    // Handle client disconnection
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        stats.activeConnections--;
        connectedClients.delete(socket.id);
        
        // Broadcast updated client list
        io.emit('clients-update', Array.from(connectedClients.values()));
        io.emit('stats-update', stats);
    });
});

// REST API Routes

// Get server statistics
app.get('/api/stats', (req, res) => {
    res.json(stats);
});

// Get connected clients
app.get('/api/clients', (req, res) => {
    res.json(Array.from(connectedClients.values()));
});

// Upload file endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileHash = crypto.createHash('md5');
    const fileBuffer = fs.readFileSync(req.file.path);
    fileHash.update(fileBuffer);
    const checksum = fileHash.digest('hex');
    
    const fileInfo = {
        id: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        checksum: checksum,
        uploadTime: new Date()
    };
    
    res.json({
        success: true,
        file: fileInfo
    });
});

// Get uploaded files
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync('client/uploads').map(filename => {
            const filePath = path.join('client/uploads', filename);
            const stats = fs.statSync(filePath);
            return {
                name: filename,
                size: stats.size,
                uploadTime: stats.mtime,
                url: `/uploads/${filename}`
            };
        });
        
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Error reading files' });
    }
});

// Download file endpoint
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('client/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath);
});

// Delete file endpoint
app.delete('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('client/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true });
});

// Network utilities
app.get('/api/network-info', (req, res) => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    const interfaces = {};
    for (const [name, addresses] of Object.entries(networkInterfaces)) {
        interfaces[name] = addresses.filter(addr => addr.family === 'IPv4' && !addr.internal);
    }
    
    res.json({
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        interfaces: interfaces
    });
});

// Serve uploaded files
app.use('/uploads', express.static('client/uploads'));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Socket File Transfer Server running on port ${PORT}`);
    console.log(`📱 Web interface: http://localhost:${PORT}`);
    console.log(`🔗 Socket.IO server ready for connections`);
    console.log(`📊 Statistics tracking enabled`);
});