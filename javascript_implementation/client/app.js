// Socket File Transfer Web Application
class FileTransferApp {
    constructor() {
        this.socket = null;
        this.connectedClients = [];
        this.stats = {
            totalTransfers: 0,
            totalBytes: 0,
            activeConnections: 0,
            startTime: new Date(),
            transfers: []
        };
        this.selectedFile = null;
        this.transferChart = null;
        this.fileTypeChart = null;
        this.receivedFiles = [];
        this.incomingTransfers = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadLocalSettings();
        this.detectLocalIP();
        this.switchTab('config');
    }
    
    setupEventListeners() {
        // File input drag and drop
        const fileInput = document.getElementById('fileInput');
        const dropZone = fileInput.parentElement;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-white', 'bg-white/10');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-white', 'bg-white/10');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-white', 'bg-white/10');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect({ target: { files: files } });
            }
        });
    }
    
    loadLocalSettings() {
        const savedSettings = localStorage.getItem('fileTransferSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            document.getElementById('studentId').value = settings.studentId || 'LS2025001';
            document.getElementById('displayName').value = settings.displayName || 'Student A';
            document.getElementById('serverAddress').value = settings.serverAddress || 'localhost:3000';
        }
    }
    
    saveLocalSettings() {
        const settings = {
            studentId: document.getElementById('studentId').value,
            displayName: document.getElementById('displayName').value,
            serverAddress: document.getElementById('serverAddress').value
        };
        localStorage.setItem('fileTransferSettings', JSON.stringify(settings));
    }
    
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Remove active state from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('bg-white/20');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('bg-white/20');
        
        // Initialize tab-specific content
        if (tabName === 'stats') {
            this.initCharts();
        }
    }
    
    registerClient() {
        const serverAddress = document.getElementById('serverAddress').value;
        const studentId = document.getElementById('studentId').value;
        const displayName = document.getElementById('displayName').value;
        
        if (!serverAddress || !studentId) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        this.saveLocalSettings();
        
        // Connect to server
        this.socket = io(serverAddress);
        
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            this.showNotification('Connected to server successfully!', 'success');
            
            // Register with server
            this.socket.emit('register', {
                studentId: studentId,
                displayName: displayName
            });
        });
        
        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            this.showNotification('Disconnected from server', 'error');
        });
        
        this.socket.on('clients-update', (clients) => {
            this.updateClientsList(clients);
        });
        
        this.socket.on('stats-update', (stats) => {
            this.updateStats(stats);
        });
        
        this.socket.on('transfer-request', (data) => {
            this.handleTransferRequest(data);
        });
        
        this.socket.on('transfer-response', (data) => {
            this.handleTransferResponse(data);
        });
        
        this.socket.on('file-chunk', (data) => {
            this.handleFileChunk(data);
        });
        
        this.socket.on('transfer-progress', (data) => {
            this.updateTransferProgress(data.progress);
        });
        
        this.socket.on('transfer-complete', (data) => {
            this.handleTransferComplete(data);
        });
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const textElement = document.getElementById('connectionText');
        const serverElement = document.getElementById('serverInfo');
        
        if (connected) {
            statusElement.classList.remove('bg-red-500');
            statusElement.classList.add('bg-green-500', 'status-online');
            textElement.textContent = 'Connected';
            serverElement.textContent = `Server: ${document.getElementById('serverAddress').value}`;
        } else {
            statusElement.classList.remove('bg-green-500', 'status-online');
            statusElement.classList.add('bg-red-500', 'status-offline');
            textElement.textContent = 'Disconnected';
            serverElement.textContent = 'Server: --';
        }
    }
    
    updateClientsList(clients) {
        this.connectedClients = clients;
        document.getElementById('clientCount').textContent = `Clients: ${clients.length}`;
        
        // Update clients list in tab
        const clientsList = document.getElementById('clientsList');
        clientsList.innerHTML = '';
        
        clients.forEach(client => {
            const clientCard = document.createElement('div');
            clientCard.className = 'bg-white/10 rounded-lg p-4 hover-scale';
            clientCard.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                        <h4 class="font-semibold">${client.studentId}</h4>
                        <p class="text-sm opacity-75">${client.ip}</p>
                        <p class="text-xs opacity-50">Connected: ${new Date(client.connectedAt).toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
            clientsList.appendChild(clientCard);
        });
        
        // Update target client dropdown
        const targetSelect = document.getElementById('targetClient');
        targetSelect.innerHTML = '<option value="">Select a client...</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.studentId} (${client.ip})`;
            targetSelect.appendChild(option);
        });
        
        // Enable/disable send button
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = clients.length === 0 || !this.selectedFile;
    }
    
    updateStats(stats) {
        this.stats = stats;
        
        document.getElementById('totalTransfers').textContent = stats.totalTransfers;
        document.getElementById('totalBytes').textContent = this.formatBytes(stats.totalBytes);
        document.getElementById('activeConnections').textContent = stats.activeConnections;
        
        // Update uptime
        const uptime = Math.floor((Date.now() - new Date(stats.startTime).getTime()) / 1000);
        document.getElementById('uptime').textContent = this.formatUptime(uptime);
        
        // Update recent transfers
        this.updateRecentTransfers(stats.transfers);
        
        // Update charts
        if (this.transferChart) {
            this.updateCharts();
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.selectedFile = file;
        
        // Show file info
        document.getElementById('fileInfo').classList.remove('hidden');
        document.getElementById('fileName').textContent = `Name: ${file.name}`;
        document.getElementById('fileSize').textContent = `Size: ${this.formatBytes(file.size)}`;
        document.getElementById('fileType').textContent = `Type: ${file.type || 'Unknown'}`;
        
        // Enable send button if there are clients
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = this.connectedClients.length === 0;
    }
    
    async sendFile() {
        if (!this.selectedFile || !this.socket) {
            this.showNotification('Please select a file and connect to server', 'error');
            return;
        }
        
        const targetClient = document.getElementById('targetClient').value;
        if (!targetClient) {
            this.showNotification('Please select a target client', 'error');
            return;
        }
        
        const fileId = Date.now().toString();
        const fileInfo = {
            id: fileId,
            name: this.selectedFile.name,
            size: this.selectedFile.size,
            type: this.selectedFile.type,
            lastModified: this.selectedFile.lastModified
        };
        
        // Send transfer request
        this.socket.emit('transfer-request', {
            targetId: targetClient,
            fileInfo: fileInfo
        });
        
        this.showNotification('Transfer request sent...', 'info');
    }
    
    handleTransferRequest(data) {
        const { fromId, fromStudentId, fileInfo } = data;
        
        // Show transfer request dialog
        const acceptTransfer = confirm(`Transfer request from ${fromStudentId}:\n\nFile: ${fileInfo.name}\nSize: ${this.formatBytes(fileInfo.size)}\n\nAccept this transfer?`);
        
        this.socket.emit('transfer-response', {
            requestId: fromId,
            accepted: acceptTransfer
        });
        
        if (acceptTransfer) {
            this.incomingTransfers.push({
                fromId: fromId,
                fromStudentId: fromStudentId,
                fileInfo: fileInfo,
                status: 'accepted'
            });
            
            this.updateIncomingTransfers();
            this.showNotification('Transfer accepted! Receiving file...', 'success');
        } else {
            this.showNotification('Transfer rejected', 'warning');
        }
    }
    
    handleTransferResponse(data) {
        const { fromId, accepted } = data;
        
        if (accepted) {
            this.showNotification('Transfer accepted! Starting file transfer...', 'success');
            this.startFileUpload();
        } else {
            this.showNotification('Transfer was rejected by the recipient', 'warning');
        }
    }
    
    async startFileUpload() {
        if (!this.selectedFile) return;
        
        const targetClient = document.getElementById('targetClient').value;
        const fileId = Date.now().toString();
        
        // Show progress
        document.getElementById('sendProgress').classList.remove('hidden');
        
        // Read file and send in chunks
        const fileBuffer = await this.fileToArrayBuffer(this.selectedFile);
        const chunkSize = 64 * 1024; // 64KB chunks
        const totalChunks = Math.ceil(fileBuffer.byteLength / chunkSize);
        
        // Calculate checksum
        const checksum = await this.calculateChecksum(fileBuffer);
        
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, fileBuffer.byteLength);
            const chunk = fileBuffer.slice(start, end);
            
            // Convert to base64 for transmission
            const chunkBase64 = btoa(String.fromCharCode(...new Uint8Array(chunk)));
            
            this.socket.emit('file-chunk', {
                targetId: targetClient,
                chunk: chunkBase64,
                chunkIndex: i,
                totalChunks: totalChunks,
                fileId: fileId,
                checksum: checksum
            });
            
            // Small delay to prevent overwhelming the socket
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Send completion signal
        this.socket.emit('transfer-complete', {
            targetId: targetClient,
            fileId: fileId,
            fileName: this.selectedFile.name,
            fileSize: this.selectedFile.size,
            checksum: checksum
        });
        
        this.showNotification('File transfer completed!', 'success');
    }
    
    handleFileChunk(data) {
        const { fromId, chunk, chunkIndex, totalChunks, fileId, checksum } = data;
        
        // Find the incoming transfer
        const transfer = this.incomingTransfers.find(t => t.fromId === fromId);
        if (!transfer) return;
        
        // Initialize file data if not exists
        if (!transfer.fileData) {
            transfer.fileData = [];
            transfer.receivedChunks = 0;
        }
        
        // Convert base64 back to array buffer
        const chunkArray = new Uint8Array(atob(chunk).split('').map(c => c.charCodeAt(0)));
        transfer.fileData[chunkIndex] = chunkArray;
        transfer.receivedChunks++;
        
        // Update progress
        const progress = (transfer.receivedChunks / totalChunks) * 100;
        this.updateReceiveProgress(progress);
    }
    
    handleTransferComplete(data) {
        const { fromId, fileId, fileName, fileSize, checksum } = data;
        
        // Find the incoming transfer
        const transferIndex = this.incomingTransfers.findIndex(t => t.fromId === fromId);
        if (transferIndex === -1) return;
        
        const transfer = this.incomingTransfers[transferIndex];
        
        // Combine chunks
        const fileData = new Uint8Array(fileSize);
        let offset = 0;
        
        for (const chunk of transfer.fileData) {
            fileData.set(chunk, offset);
            offset += chunk.length;
        }
        
        // Verify checksum
        const receivedChecksum = this.arrayBufferToHex(fileData.buffer);
        
        if (receivedChecksum === checksum) {
            // Create download link
            const blob = new Blob([fileData], { type: transfer.fileInfo.type });
            const url = URL.createObjectURL(blob);
            
            this.receivedFiles.push({
                name: fileName,
                size: fileSize,
                url: url,
                from: transfer.fromStudentId,
                timestamp: new Date()
            });
            
            this.updateReceivedFiles();
            this.showNotification(`File "${fileName}" received successfully!`, 'success');
        } else {
            this.showNotification('File integrity check failed!', 'error');
        }
        
        // Remove from incoming transfers
        this.incomingTransfers.splice(transferIndex, 1);
        this.updateIncomingTransfers();
        
        // Hide progress
        document.getElementById('receiveProgress').classList.add('hidden');
    }
    
    updateTransferProgress(progress) {
        const progressBar = document.getElementById('sendProgressBar');
        const progressText = document.getElementById('sendProgressText');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }
    
    updateReceiveProgress(progress) {
        const progressBar = document.getElementById('receiveProgressBar');
        const progressText = document.getElementById('receiveProgressText');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }
    
    updateIncomingTransfers() {
        const container = document.getElementById('incomingTransfers');
        
        if (this.incomingTransfers.length === 0) {
            container.innerHTML = '<p class="text-sm opacity-75">No incoming transfers...</p>';
            return;
        }
        
        container.innerHTML = '';
        this.incomingTransfers.forEach(transfer => {
            const transferDiv = document.createElement('div');
            transferDiv.className = 'p-3 bg-white/5 rounded-lg';
            transferDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${transfer.fileInfo.name}</p>
                        <p class="text-sm opacity-75">From: ${transfer.fromStudentId}</p>
                        <p class="text-xs opacity-50">${this.formatBytes(transfer.fileInfo.size)}</p>
                    </div>
                    <div class="text-sm">
                        ${transfer.status === 'accepted' ? '📥 Receiving...' : '⏳ Pending'}
                    </div>
                </div>
            `;
            container.appendChild(transferDiv);
        });
    }
    
    updateReceivedFiles() {
        const container = document.getElementById('receivedFiles');
        
        if (this.receivedFiles.length === 0) {
            container.innerHTML = '<p class="text-sm opacity-75">No files received yet...</p>';
            return;
        }
        
        container.innerHTML = '';
        this.receivedFiles.forEach((file, index) => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'p-3 bg-white/5 rounded-lg hover-scale cursor-pointer';
            fileDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${file.name}</p>
                        <p class="text-sm opacity-75">From: ${file.from}</p>
                        <p class="text-xs opacity-50">${file.timestamp.toLocaleString()}</p>
                    </div>
                    <button onclick="app.downloadFile(${index})" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                        📥 Download
                    </button>
                </div>
            `;
            container.appendChild(fileDiv);
        });
    }
    
    downloadFile(index) {
        const file = this.receivedFiles[index];
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    initCharts() {
        // Transfer Activity Chart
        const transferCtx = document.getElementById('transferChart').getContext('2d');
        this.transferChart = new Chart(transferCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Transfers Over Time',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
        
        // File Types Chart
        const fileTypeCtx = document.getElementById('fileTypeChart').getContext('2d');
        this.fileTypeChart = new Chart(fileTypeCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
        
        this.updateCharts();
    }
    
    updateCharts() {
        if (!this.transferChart || !this.fileTypeChart) return;
        
        // Update transfer activity chart
        const transfersByTime = {};
        this.stats.transfers.forEach(transfer => {
            const hour = new Date(transfer.timestamp).getHours();
            transfersByTime[hour] = (transfersByTime[hour] || 0) + 1;
        });
        
        const hours = Array.from({length: 24}, (_, i) => i);
        const transferCounts = hours.map(hour => transfersByTime[hour] || 0);
        
        this.transferChart.data.labels = hours.map(h => `${h}:00`);
        this.transferChart.data.datasets[0].data = transferCounts;
        this.transferChart.update();
        
        // Update file types chart
        const fileTypes = {};
        this.stats.transfers.forEach(transfer => {
            const ext = transfer.fileName.split('.').pop().toLowerCase() || 'unknown';
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        });
        
        this.fileTypeChart.data.labels = Object.keys(fileTypes);
        this.fileTypeChart.data.datasets[0].data = Object.values(fileTypes);
        this.fileTypeChart.update();
    }
    
    updateRecentTransfers(transfers) {
        const container = document.getElementById('recentTransfers');
        
        if (transfers.length === 0) {
            container.innerHTML = '<p class="text-sm opacity-75">No transfers yet...</p>';
            return;
        }
        
        container.innerHTML = '';
        transfers.slice(-10).reverse().forEach(transfer => {
            const transferDiv = document.createElement('div');
            transferDiv.className = 'p-3 bg-white/5 rounded-lg';
            transferDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${transfer.fileName}</p>
                        <p class="text-sm opacity-75">${this.formatBytes(transfer.fileSize)}</p>
                    </div>
                    <div class="text-xs opacity-50">
                        ${new Date(transfer.timestamp).toLocaleString()}
                    </div>
                </div>
            `;
            container.appendChild(transferDiv);
        });
    }
    
    // Utility functions
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    async calculateChecksum(arrayBuffer) {
        const buffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        return this.arrayBufferToHex(buffer);
    }
    
    arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-600' :
            type === 'error' ? 'bg-red-600' :
            type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
        }`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white/80 hover:text-white">✕</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    async detectLocalIP() {
        try {
            // Use a simple WebRTC method to get local IP
            const pc = new RTCPeerConnection({iceServers: []});
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            pc.onicecandidate = (ice) => {
                if (ice.candidate && ice.candidate.candidate) {
                    const match = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                    if (match) {
                        document.getElementById('localIp').textContent = match[1];
                        pc.close();
                    }
                }
            };
        } catch (error) {
            document.getElementById('localIp').textContent = 'Detection failed';
        }
    }
    
    async loadNetworkInfo() {
        try {
            const response = await fetch('/api/network-info');
            const networkInfo = await response.json();
            
            const infoDiv = document.getElementById('networkInfo');
            infoDiv.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Hostname:</strong> ${networkInfo.hostname}</p>
                    <p><strong>Platform:</strong> ${networkInfo.platform}</p>
                    <p><strong>Architecture:</strong> ${networkInfo.arch}</p>
                    <p><strong>Uptime:</strong> ${this.formatUptime(networkInfo.uptime)}</p>
                    <div class="mt-4">
                        <strong>Network Interfaces:</strong>
                        ${Object.entries(networkInfo.interfaces).map(([name, addresses]) => `
                            <div class="ml-4 mt-2">
                                <p class="font-semibold">${name}:</p>
                                ${addresses.map(addr => `<p class="ml-4 text-sm">${addr.address} (${addr.family})</p>`).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            document.getElementById('networkInfo').innerHTML = '<p class="text-red-400">Failed to load network information</p>';
        }
    }
    
    async pingServer() {
        const startTime = Date.now();
        this.addDiagnosticResult('Pinging server...');
        
        try {
            const response = await fetch('/api/stats');
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            this.addDiagnosticResult(`✅ Ping successful! Latency: ${latency}ms`, 'success');
        } catch (error) {
            this.addDiagnosticResult(`❌ Ping failed: ${error.message}`, 'error');
        }
    }
    
    async testLatency() {
        this.addDiagnosticResult('Testing latency...');
        const latencies = [];
        
        for (let i = 0; i < 10; i++) {
            const startTime = Date.now();
            try {
                await fetch('/api/stats');
                const latency = Date.now() - startTime;
                latencies.push(latency);
                this.addDiagnosticResult(`Ping ${i + 1}: ${latency}ms`);
            } catch (error) {
                this.addDiagnosticResult(`Ping ${i + 1}: Failed`);
            }
        }
        
        if (latencies.length > 0) {
            const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            const minLatency = Math.min(...latencies);
            const maxLatency = Math.max(...latencies);
            
            this.addDiagnosticResult(`\n📊 Latency Statistics:`, 'info');
            this.addDiagnosticResult(`Average: ${avgLatency.toFixed(2)}ms`, 'success');
            this.addDiagnosticResult(`Min: ${minLatency}ms, Max: ${maxLatency}ms`, 'info');
        }
    }
    
    async scanPorts() {
        this.addDiagnosticResult('Scanning common ports...');
        const commonPorts = [80, 443, 3000, 8080, 8888, 22, 21, 25];
        
        for (const port of commonPorts) {
            try {
                const response = await fetch(`http://localhost:${port}/api/stats`, { 
                    signal: AbortSignal.timeout(1000) 
                });
                this.addDiagnosticResult(`✅ Port ${port}: Open`, 'success');
            } catch (error) {
                this.addDiagnosticResult(`❌ Port ${port}: Closed or filtered`);
            }
        }
    }
    
    async checkBandwidth() {
        this.addDiagnosticResult('Testing bandwidth...');
        const testData = new Array(1024 * 100).fill(0).map(() => Math.random().toString(36)).join('');
        const testDataSize = new Blob([testData]).size;
        
        const startTime = Date.now();
        try {
            await fetch('/api/bandwidth-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: testData })
            });
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000; // seconds
            const speedBps = testDataSize / duration;
            const speedMbps = (speedBps * 8) / (1024 * 1024);
            
            this.addDiagnosticResult(`✅ Bandwidth test completed!`, 'success');
            this.addDiagnosticResult(`Upload speed: ${speedMbps.toFixed(2)} Mbps`, 'info');
        } catch (error) {
            this.addDiagnosticResult(`❌ Bandwidth test failed: ${error.message}`, 'error');
        }
    }
    
    addDiagnosticResult(message, type = 'info') {
        const resultsDiv = document.getElementById('diagnosticResults');
        const timestamp = new Date().toLocaleTimeString();
        const colorClass = type === 'success' ? 'text-green-400' : 
                          type === 'error' ? 'text-red-400' : 
                          type === 'warning' ? 'text-yellow-400' : 'text-gray-400';
        
        resultsDiv.innerHTML += `<div class="${colorClass}">[${timestamp}] ${message}</div>`;
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    }
    
    createTestFile() {
        const studentId = document.getElementById('studentId').value;
        const content = `Cross-Computer File Transfer Test File
Student ID: ${studentId}
Created: ${new Date().toISOString()}
File Size: Test File for Socket Programming Lab 1

This is a test file created for the Socket Programming Lab 1.
It demonstrates cross-computer file transfer using sockets.

Content lines for testing:
1. First line of test content
2. Second line with some numbers: 12345
3. Third line with special characters: !@#$%^&*()
4. Fourth line with unicode: ñáéíóú
5. Fifth line: End of test file

File integrity checksum will be calculated upon transfer.
`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${studentId}_A.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(`Test file "${studentId}_A.txt" created!`, 'success');
    }
    
    openFileManager() {
        // This would open a file manager in a real implementation
        this.showNotification('File manager feature coming soon!', 'info');
    }
    
    testConnection() {
        if (!this.socket) {
            this.showNotification('Please connect to server first', 'warning');
            return;
        }
        
        this.pingServer();
    }
    
    exportLogs() {
        const logs = {
            stats: this.stats,
            receivedFiles: this.receivedFiles.map(f => ({ ...f, url: undefined })),
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `file-transfer-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Logs exported successfully!', 'success');
    }
}

// Global functions for HTML onclick handlers
let app;

function switchTab(tabName) {
    app.switchTab(tabName);
}

function registerClient() {
    app.registerClient();
}

function handleFileSelect(event) {
    app.handleFileSelect(event);
}

function sendFile() {
    app.sendFile();
}

function detectLocalIP() {
    app.detectLocalIP();
}

function createTestFile() {
    app.createTestFile();
}

function openFileManager() {
    app.openFileManager();
}

function testConnection() {
    app.testConnection();
}

function exportLogs() {
    app.exportLogs();
}

function loadNetworkInfo() {
    app.loadNetworkInfo();
}

function pingServer() {
    app.pingServer();
}

function testLatency() {
    app.testLatency();
}

function scanPorts() {
    app.scanPorts();
}

function checkBandwidth() {
    app.checkBandwidth();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new FileTransferApp();
});