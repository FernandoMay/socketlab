import socket
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os
import time
import hashlib
from datetime import datetime
import json
import platform
import subprocess
import ipaddress
from pathlib import Path
import queue

class FileTransferGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 Cross-Computer File Transfer - Socket Programming Lab 1")
        self.root.geometry("1200x800")
        self.root.configure(bg='#1a1a2e')
        
        # Modern color scheme
        self.colors = {
            'bg': '#1a1a2e',
            'secondary': '#16213e',
            'accent': '#0f3460',
            'primary': '#e94560',
            'text': '#f5f5f5',
            'success': '#4caf50',
            'warning': '#ff9800',
            'error': '#f44336'
        }
        
        # Network configuration
        self.server_socket = None
        self.client_socket = None
        self.is_server_running = False
        self.is_client_connected = False
        self.transfer_queue = queue.Queue()
        
        # Student information
        self.student_id = tk.StringVar(value="LS2025001")
        self.partner_ip = tk.StringVar(value="192.168.1.100")
        self.port = tk.IntVar(value=8888)
        
        # Transfer statistics
        self.transfer_stats = {
            'files_sent': 0,
            'files_received': 0,
            'bytes_transferred': 0,
            'transfer_time': 0,
            'transfer_speed': 0
        }
        
        self.setup_ui()
        self.get_local_ip()
        
    def setup_ui(self):
        # Main container
        main_frame = tk.Frame(self.root, bg=self.colors['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Title
        title_label = tk.Label(main_frame, text="🌐 Cross-Computer File Transfer", 
                              font=('Arial', 24, 'bold'), bg=self.colors['bg'], fg=self.colors['text'])
        title_label.pack(pady=(0, 20))
        
        # Create notebook for tabs
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill=tk.BOTH, expand=True)
        
        # Configuration Tab
        config_frame = tk.Frame(notebook, bg=self.colors['bg'])
        notebook.add(config_frame, text="⚙️ Configuration")
        self.setup_config_tab(config_frame)
        
        # Server Tab
        server_frame = tk.Frame(notebook, bg=self.colors['bg'])
        notebook.add(server_frame, text="📡 Server (Receiver)")
        self.setup_server_tab(server_frame)
        
        # Client Tab
        client_frame = tk.Frame(notebook, bg=self.colors['bg'])
        notebook.add(client_frame, text="📤 Client (Sender)")
        self.setup_client_tab(client_frame)
        
        # Statistics Tab
        stats_frame = tk.Frame(notebook, bg=self.colors['bg'])
        notebook.add(stats_frame, text="📊 Statistics")
        self.setup_stats_tab(stats_frame)
        
        # Network Tools Tab
        tools_frame = tk.Frame(notebook, bg=self.colors['bg'])
        notebook.add(tools_frame, text="🔧 Network Tools")
        self.setup_tools_tab(tools_frame)
        
    def setup_config_tab(self, parent):
        # Configuration container
        config_container = tk.Frame(parent, bg=self.colors['secondary'])
        config_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Student Information
        info_frame = tk.LabelFrame(config_container, text="👤 Student Information", 
                                  font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                  fg=self.colors['text'])
        info_frame.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(info_frame, text="Student ID:", bg=self.colors['secondary'], 
                fg=self.colors['text']).grid(row=0, column=0, padx=10, pady=10, sticky='w')
        tk.Entry(info_frame, textvariable=self.student_id, width=20, 
                bg=self.colors['accent'], fg=self.colors['text']).grid(row=0, column=1, padx=10, pady=10)
        
        # Network Configuration
        network_frame = tk.LabelFrame(config_container, text="🌍 Network Configuration", 
                                     font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                     fg=self.colors['text'])
        network_frame.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(network_frame, text="Partner IP:", bg=self.colors['secondary'], 
                fg=self.colors['text']).grid(row=0, column=0, padx=10, pady=10, sticky='w')
        tk.Entry(network_frame, textvariable=self.partner_ip, width=20, 
                bg=self.colors['accent'], fg=self.colors['text']).grid(row=0, column=1, padx=10, pady=10)
        
        tk.Label(network_frame, text="Port:", bg=self.colors['secondary'], 
                fg=self.colors['text']).grid(row=1, column=0, padx=10, pady=10, sticky='w')
        tk.Entry(network_frame, textvariable=self.port, width=20, 
                bg=self.colors['accent'], fg=self.colors['text']).grid(row=1, column=1, padx=10, pady=10)
        
        self.local_ip_label = tk.Label(network_frame, text="Local IP: Detecting...", 
                                       bg=self.colors['secondary'], fg=self.colors['success'])
        self.local_ip_label.grid(row=2, column=0, columnspan=2, padx=10, pady=10)
        
        # Action buttons
        button_frame = tk.Frame(config_container, bg=self.colors['secondary'])
        button_frame.pack(fill=tk.X, pady=20)
        
        tk.Button(button_frame, text="🔄 Refresh IP", command=self.get_local_ip,
                 bg=self.colors['primary'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        tk.Button(button_frame, text="📁 Create Test File", command=self.create_test_file,
                 bg=self.colors['success'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        tk.Button(button_frame, text="📂 Open Received Files", command=self.open_received_folder,
                 bg=self.colors['warning'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
    def setup_server_tab(self, parent):
        # Server container
        server_container = tk.Frame(parent, bg=self.colors['secondary'])
        server_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Server controls
        control_frame = tk.Frame(server_container, bg=self.colors['secondary'])
        control_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.server_button = tk.Button(control_frame, text="🚀 Start Server", 
                                       command=self.toggle_server,
                                       bg=self.colors['success'], fg=self.colors['text'], 
                                       font=('Arial', 12, 'bold'), width=20)
        self.server_button.pack(side=tk.LEFT, padx=5)
        
        self.server_status = tk.Label(control_frame, text="⚪ Server Stopped", 
                                     bg=self.colors['secondary'], fg=self.colors['warning'],
                                     font=('Arial', 10, 'bold'))
        self.server_status.pack(side=tk.LEFT, padx=20)
        
        # Progress bar
        self.server_progress = ttk.Progressbar(control_frame, mode='indeterminate')
        self.server_progress.pack(side=tk.LEFT, padx=10, fill=tk.X, expand=True)
        
        # Server log
        log_frame = tk.LabelFrame(server_container, text="📋 Server Log", 
                                 font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                 fg=self.colors['text'])
        log_frame.pack(fill=tk.BOTH, expand=True)
        
        self.server_log = scrolledtext.ScrolledText(log_frame, height=20, 
                                                    bg=self.colors['accent'], fg=self.colors['text'],
                                                    font=('Consolas', 10))
        self.server_log.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
    def setup_client_tab(self, parent):
        # Client container
        client_container = tk.Frame(parent, bg=self.colors['secondary'])
        client_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # File selection
        file_frame = tk.LabelFrame(client_container, text="📁 File Selection", 
                                  font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                  fg=self.colors['text'])
        file_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.selected_file_label = tk.Label(file_frame, text="No file selected", 
                                            bg=self.colors['secondary'], fg=self.colors['text'])
        self.selected_file_label.pack(pady=10)
        
        tk.Button(file_frame, text="📂 Choose File", command=self.choose_file,
                 bg=self.colors['primary'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(pady=5)
        
        # Send controls
        send_frame = tk.Frame(client_container, bg=self.colors['secondary'])
        send_frame.pack(fill=tk.X, pady=(0, 20))
        
        tk.Button(send_frame, text="📤 Send File", command=self.send_file,
                 bg=self.colors['success'], fg=self.colors['text'], 
                 font=('Arial', 12, 'bold'), width=20).pack(side=tk.LEFT, padx=5)
        
        self.client_status = tk.Label(send_frame, text="⚪ Ready to send", 
                                      bg=self.colors['secondary'], fg=self.colors['warning'],
                                      font=('Arial', 10, 'bold'))
        self.client_status.pack(side=tk.LEFT, padx=20)
        
        # Progress bar
        self.client_progress = ttk.Progressbar(send_frame, mode='determinate')
        self.client_progress.pack(side=tk.LEFT, padx=10, fill=tk.X, expand=True)
        
        # Client log
        log_frame = tk.LabelFrame(client_container, text="📋 Client Log", 
                                 font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                 fg=self.colors['text'])
        log_frame.pack(fill=tk.BOTH, expand=True)
        
        self.client_log = scrolledtext.ScrolledText(log_frame, height=15, 
                                                   bg=self.colors['accent'], fg=self.colors['text'],
                                                   font=('Consolas', 10))
        self.client_log.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
    def setup_stats_tab(self, parent):
        # Statistics container
        stats_container = tk.Frame(parent, bg=self.colors['secondary'])
        stats_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Stats display
        stats_frame = tk.LabelFrame(stats_container, text="📊 Transfer Statistics", 
                                   font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                   fg=self.colors['text'])
        stats_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.stats_text = tk.Text(stats_frame, height=10, bg=self.colors['accent'], 
                                  fg=self.colors['text'], font=('Consolas', 10))
        self.stats_text.pack(fill=tk.X, padx=10, pady=10)
        
        # Action buttons
        button_frame = tk.Frame(stats_container, bg=self.colors['secondary'])
        button_frame.pack(fill=tk.X)
        
        tk.Button(button_frame, text="🔄 Refresh Stats", command=self.update_stats,
                 bg=self.colors['primary'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        tk.Button(button_frame, text="📈 Export Stats", command=self.export_stats,
                 bg=self.colors['success'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        tk.Button(button_frame, text="🗑️ Reset Stats", command=self.reset_stats,
                 bg=self.colors['error'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
    def setup_tools_tab(self, parent):
        # Tools container
        tools_container = tk.Frame(parent, bg=self.colors['secondary'])
        tools_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Network tools
        tools_frame = tk.LabelFrame(tools_container, text="🔧 Network Tools", 
                                   font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                   fg=self.colors['text'])
        tools_frame.pack(fill=tk.X, pady=(0, 20))
        
        # IP tools
        ip_frame = tk.Frame(tools_frame, bg=self.colors['secondary'])
        ip_frame.pack(fill=tk.X, padx=10, pady=10)
        
        tk.Button(ip_frame, text="🌐 Get Local IP", command=self.get_local_ip,
                 bg=self.colors['primary'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        tk.Button(ip_frame, text="🔍 Test Connection", command=self.test_connection,
                 bg=self.colors['success'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        tk.Button(ip_frame, text="📡 Scan Network", command=self.scan_network,
                 bg=self.colors['warning'], fg=self.colors['text'], 
                 font=('Arial', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        # Tools output
        output_frame = tk.LabelFrame(tools_container, text="📋 Tools Output", 
                                    font=('Arial', 12, 'bold'), bg=self.colors['secondary'], 
                                    fg=self.colors['text'])
        output_frame.pack(fill=tk.BOTH, expand=True)
        
        self.tools_output = scrolledtext.ScrolledText(output_frame, height=15, 
                                                     bg=self.colors['accent'], fg=self.colors['text'],
                                                     font=('Consolas', 10))
        self.tools_output.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
    def get_local_ip(self):
        try:
            # Connect to an external host to get local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            
            self.local_ip_label.config(text=f"Local IP: {local_ip}")
            self.log_to_tools(f"✅ Local IP detected: {local_ip}")
            return local_ip
        except Exception as e:
            self.log_to_tools(f"❌ Error getting local IP: {e}")
            return "127.0.0.1"
            
    def create_test_file(self):
        try:
            student_id = self.student_id.get()
            filename = f"{student_id}_A.txt"
            
            # Create test content
            content = f"""Cross-Computer File Transfer Test File
Student ID: {student_id}
Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
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
"""
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
                
            file_size = os.path.getsize(filename)
            self.log_to_tools(f"✅ Test file created: {filename}")
            self.log_to_tools(f"📄 File size: {file_size} bytes")
            
            messagebox.showinfo("Success", f"Test file '{filename}' created successfully!\nSize: {file_size} bytes")
            
        except Exception as e:
            self.log_to_tools(f"❌ Error creating test file: {e}")
            messagebox.showerror("Error", f"Failed to create test file: {e}")
            
    def choose_file(self):
        filename = filedialog.askopenfilename(
            title="Choose file to send",
            filetypes=[("All files", "*.*"), ("Text files", "*.txt"), ("Images", "*.png *.jpg *.jpeg")]
        )
        
        if filename:
            self.selected_file = filename
            file_size = os.path.getsize(filename)
            self.selected_file_label.config(text=f"📄 {os.path.basename(filename)} ({file_size} bytes)")
            self.log_to_client(f"📁 File selected: {filename}")
            
    def toggle_server(self):
        if not self.is_server_running:
            self.start_server()
        else:
            self.stop_server()
            
    def start_server(self):
        try:
            port = self.port.get()
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind(('', port))
            self.server_socket.listen(1)
            
            self.is_server_running = True
            self.server_button.config(text="⏹️ Stop Server", bg=self.colors['error'])
            self.server_status.config(text="🟢 Server Running", fg=self.colors['success'])
            self.server_progress.start(10)
            
            self.log_to_server(f"🚀 File receiver server started, port: {port}")
            self.log_to_server(f"⏳ Waiting for partner to send file...")
            
            # Start server thread
            server_thread = threading.Thread(target=self.server_accept_loop, daemon=True)
            server_thread.start()
            
        except Exception as e:
            self.log_to_server(f"❌ Error starting server: {e}")
            messagebox.showerror("Error", f"Failed to start server: {e}")
            
    def stop_server(self):
        try:
            self.is_server_running = False
            if self.server_socket:
                self.server_socket.close()
            if self.client_socket:
                self.client_socket.close()
                
            self.server_button.config(text="🚀 Start Server", bg=self.colors['success'])
            self.server_status.config(text="⚪ Server Stopped", fg=self.colors['warning'])
            self.server_progress.stop()
            
            self.log_to_server("⏹️ Server stopped")
            
        except Exception as e:
            self.log_to_server(f"❌ Error stopping server: {e}")
            
    def server_accept_loop(self):
        while self.is_server_running:
            try:
                self.server_socket.settimeout(1.0)
                client_socket, address = self.server_socket.accept()
                
                self.client_socket = client_socket
                self.is_client_connected = True
                
                self.log_to_server(f"📡 Connection received from {address}")
                
                # Handle file reception in separate thread
                receive_thread = threading.Thread(target=self.receive_file, args=(client_socket, address), daemon=True)
                receive_thread.start()
                
            except socket.timeout:
                continue
            except Exception as e:
                if self.is_server_running:
                    self.log_to_server(f"❌ Server error: {e}")
                break
                
    def receive_file(self, client_socket, address):
        try:
            # Receive file metadata
            metadata = client_socket.recv(1024).decode('utf-8')
            metadata_dict = json.loads(metadata)
            
            filename = metadata_dict['filename']
            filesize = metadata_dict['filesize']
            checksum = metadata_dict['checksum']
            
            self.log_to_server(f"📄 Starting to receive file: {filename}")
            self.log_to_server(f"📏 File size: {filesize} bytes")
            
            # Create received_files directory
            os.makedirs('received_files', exist_ok=True)
            
            # Receive file data
            received_data = b''
            bytes_received = 0
            
            start_time = time.time()
            
            while bytes_received < filesize:
                chunk = client_socket.recv(4096)
                if not chunk:
                    break
                received_data += chunk
                bytes_received += len(chunk)
                
                # Update progress (calculate percentage)
                progress = (bytes_received / filesize) * 100
                self.root.after(0, lambda p=progress: self.update_server_progress(p))
                
            end_time = time.time()
            transfer_time = end_time - start_time
            
            # Save file
            filepath = os.path.join('received_files', filename)
            with open(filepath, 'wb') as f:
                f.write(received_data)
                
            # Verify checksum
            received_checksum = hashlib.md5(received_data).hexdigest()
            
            self.log_to_server(f"✅ Reception completed! Time: {datetime.now().strftime('%H:%M, %m/%d/%Y')}")
            self.log_to_server(f"💾 File saved: received_files/{filename}")
            
            if received_checksum == checksum:
                self.log_to_server(f"✅ File integrity verified! Checksum: {checksum[:8]}...")
                self.log_to_server(f"🎉 File received successfully!")
            else:
                self.log_to_server(f"⚠️ Checksum mismatch! Expected: {checksum[:8]}..., Got: {received_checksum[:8]}...")
                
            # Update statistics
            self.transfer_stats['files_received'] += 1
            self.transfer_stats['bytes_transferred'] += filesize
            self.transfer_stats['transfer_time'] += transfer_time
            if transfer_time > 0:
                self.transfer_stats['transfer_speed'] = filesize / transfer_time / 1024  # KB/s
                
            self.update_stats()
            
            # Send acknowledgment
            ack = f"FILE_RECEIVED:{len(received_data)}".encode('utf-8')
            client_socket.send(ack)
            
        except Exception as e:
            self.log_to_server(f"❌ Error receiving file: {e}")
        finally:
            client_socket.close()
            self.is_client_connected = False
            self.root.after(0, lambda: self.update_server_progress(0))
            
    def send_file(self):
        if not hasattr(self, 'selected_file'):
            messagebox.showwarning("Warning", "Please select a file first!")
            return
            
        try:
            partner_ip = self.partner_ip.get()
            port = self.port.get()
            
            self.client_status.config(text="🟡 Connecting...", fg=self.colors['warning'])
            self.log_to_client(f"🔗 Connecting to partner computer {partner_ip}:{port}...")
            
            # Create client socket
            self.client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.client_socket.connect((partner_ip, port))
            
            self.client_status.config(text="🟢 Connected", fg=self.colors['success'])
            self.log_to_client(f"✅ Connection successful!")
            
            # Get file info
            filename = os.path.basename(self.selected_file)
            filesize = os.path.getsize(self.selected_file)
            
            # Calculate checksum
            with open(self.selected_file, 'rb') as f:
                file_data = f.read()
            checksum = hashlib.md5(file_data).hexdigest()
            
            # Send metadata
            metadata = {
                'filename': filename,
                'filesize': filesize,
                'checksum': checksum,
                'timestamp': datetime.now().isoformat()
            }
            
            self.client_socket.send(json.dumps(metadata).encode('utf-8'))
            
            self.log_to_client(f"📤 Starting to send file data...")
            self.log_to_client(f"📏 File size: {filesize} bytes")
            
            # Send file data
            start_time = time.time()
            bytes_sent = 0
            
            chunk_size = 4096
            with open(self.selected_file, 'rb') as f:
                while bytes_sent < filesize:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    self.client_socket.send(chunk)
                    bytes_sent += len(chunk)
                    
                    # Update progress
                    progress = (bytes_sent / filesize) * 100
                    self.client_progress['value'] = progress
                    self.root.update_idletasks()
                    
            end_time = time.time()
            transfer_time = end_time - start_time
            
            self.log_to_client(f"✅ Data sending completed! Time: {datetime.now().strftime('%H:%M, %m/%d/%Y')}")
            self.log_to_client(f"🎉 File transfer successful!")
            
            # Wait for acknowledgment
            try:
                ack = self.client_socket.recv(1024).decode('utf-8')
                if ack.startswith("FILE_RECEIVED"):
                    self.log_to_client(f"✅ Partner confirmed file receipt: {ack}")
            except:
                pass
                
            # Update statistics
            self.transfer_stats['files_sent'] += 1
            self.transfer_stats['bytes_transferred'] += filesize
            self.transfer_stats['transfer_time'] += transfer_time
            if transfer_time > 0:
                self.transfer_stats['transfer_speed'] = filesize / transfer_time / 1024  # KB/s
                
            self.update_stats()
            
            self.client_status.config(text="✅ Transfer completed", fg=self.colors['success'])
            
        except Exception as e:
            self.log_to_client(f"❌ Error sending file: {e}")
            self.client_status.config(text="❌ Transfer failed", fg=self.colors['error'])
            messagebox.showerror("Error", f"Failed to send file: {e}")
        finally:
            if self.client_socket:
                self.client_socket.close()
            self.client_progress['value'] = 0
            
    def update_server_progress(self, value):
        # This would update a progress bar if we had one for server
        pass
        
    def test_connection(self):
        try:
            partner_ip = self.partner_ip.get()
            port = self.port.get()
            
            self.log_to_tools(f"🔍 Testing connection to {partner_ip}:{port}...")
            
            # Test ping
            result = subprocess.run(['ping', '-c', '1', partner_ip], 
                                  capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                self.log_to_tools(f"✅ Ping successful to {partner_ip}")
                
                # Test port connectivity
                test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                test_socket.settimeout(3)
                result = test_socket.connect_ex((partner_ip, port))
                test_socket.close()
                
                if result == 0:
                    self.log_to_tools(f"✅ Port {port} is open on {partner_ip}")
                else:
                    self.log_to_tools(f"❌ Port {port} is closed on {partner_ip}")
            else:
                self.log_to_tools(f"❌ Ping failed to {partner_ip}")
                
        except Exception as e:
            self.log_to_tools(f"❌ Connection test error: {e}")
            
    def scan_network(self):
        try:
            local_ip = self.get_local_ip()
            network = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
            
            self.log_to_tools(f"🔍 Scanning network {network}...")
            
            active_hosts = []
            for ip in network.hosts():
                ip_str = str(ip)
                if ip_str == local_ip:
                    continue
                    
                # Simple ping test
                try:
                    result = subprocess.run(['ping', '-c', '1', '-W', '1', ip_str], 
                                          capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        active_hosts.append(ip_str)
                        self.log_to_tools(f"✅ Host found: {ip_str}")
                except:
                    pass
                    
            self.log_to_tools(f"📊 Scan complete. Found {len(active_hosts)} active hosts:")
            for host in active_hosts:
                self.log_to_tools(f"   📍 {host}")
                
        except Exception as e:
            self.log_to_tools(f"❌ Network scan error: {e}")
            
    def update_stats(self):
        stats_text = f"""📊 Transfer Statistics
{'='*40}

📤 Files Sent: {self.transfer_stats['files_sent']}
📥 Files Received: {self.transfer_stats['files_received']}
📁 Total Files: {self.transfer_stats['files_sent'] + self.transfer_stats['files_received']}

💾 Bytes Transferred: {self.transfer_stats['bytes_transferred']:,} bytes
📏 MB Transferred: {self.transfer_stats['bytes_transferred'] / 1024 / 1024:.2f} MB

⏱️ Total Transfer Time: {self.transfer_stats['transfer_time']:.2f} seconds
🚀 Average Speed: {self.transfer_stats['transfer_speed']:.2f} KB/s

📅 Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        self.stats_text.delete(1.0, tk.END)
        self.stats_text.insert(1.0, stats_text)
        
    def export_stats(self):
        try:
            filename = f"transfer_stats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            with open(filename, 'w') as f:
                f.write(self.stats_text.get(1.0, tk.END))
            self.log_to_tools(f"✅ Statistics exported to {filename}")
            messagebox.showinfo("Success", f"Statistics exported to {filename}")
        except Exception as e:
            self.log_to_tools(f"❌ Error exporting statistics: {e}")
            
    def reset_stats(self):
        self.transfer_stats = {
            'files_sent': 0,
            'files_received': 0,
            'bytes_transferred': 0,
            'transfer_time': 0,
            'transfer_speed': 0
        }
        self.update_stats()
        self.log_to_tools("🗑️ Statistics reset")
        
    def open_received_folder(self):
        try:
            if not os.path.exists('received_files'):
                os.makedirs('received_files')
            
            if platform.system() == "Windows":
                os.startfile('received_files')
            elif platform.system() == "Darwin":  # macOS
                subprocess.run(['open', 'received_files'])
            else:  # Linux
                subprocess.run(['xdg-open', 'received_files'])
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open folder: {e}")
            
    def log_to_server(self, message):
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.server_log.insert(tk.END, f"[{timestamp}] {message}\n")
        self.server_log.see(tk.END)
        
    def log_to_client(self, message):
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.client_log.insert(tk.END, f"[{timestamp}] {message}\n")
        self.client_log.see(tk.END)
        
    def log_to_tools(self, message):
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.tools_output.insert(tk.END, f"[{timestamp}] {message}\n")
        self.tools_output.see(tk.END)

def main():
    root = tk.Tk()
    app = FileTransferGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()