import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import socketio
import os
import asyncio
import threading
import uuid
import json
from datetime import datetime
from pathlib import Path

class FileTransferApp:
    def __init__(self, root):
        self.root = root
        self.root.title("File Transfer App")
        self.root.geometry("1000x700")
        self.setup_theme()
        
        # Socket.IO client
        self.sio = socketio.AsyncClient()
        self.client_id = str(uuid.uuid4())
        self.connected = False
        
        # Transfer data
        self.active_transfers = {}
        self.setup_ui()
        self.setup_socket_events()
        
        # Start the Socket.IO client in a separate thread
        self.loop = asyncio.new_event_loop()
        threading.Thread(target=self.start_client, daemon=True).start()
    
    def setup_theme(self):
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Configure colors
        self.bg_color = "#f0f2f5"
        self.card_bg = "#ffffff"
        self.primary_color = "#4361ee"
        self.success_color = "#4bb543"
        self.danger_color = "#ff3333"
        self.text_color = "#2d3436"
        
        # Configure styles
        self.style.configure('.', background=self.bg_color, foreground=self.text_color)
        self.style.configure('TFrame', background=self.bg_color)
        self.style.configure('TLabel', background=self.bg_color, foreground=self.text_color)
        self.style.configure('TButton', padding=6)
        self.style.configure('Primary.TButton', background=self.primary_color, foreground='white')
        self.style.map('Primary.TButton',
                      background=[('active', '#3a56d4'), ('!disabled', self.primary_color)],
                      foreground=[('!disabled', 'white')])
    
    def setup_ui(self):
        # Main container
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.status_label = ttk.Label(
            header_frame, 
            text="● Disconnected", 
            foreground="red",
            font=('Helvetica', 10, 'bold')
        )
        self.status_label.pack(side=tk.RIGHT)
        
        title_label = ttk.Label(
            header_frame,
            text="File Transfer",
            font=('Helvetica', 24, 'bold')
        )
        title_label.pack(side=tk.LEFT)
        
        # Main content
        content_frame = ttk.Frame(main_frame)
        content_frame.pack(fill=tk.BOTH, expand=True)
        
        # Left panel - File transfer
        left_panel = ttk.LabelFrame(content_frame, text="File Transfer", padding=10)
        left_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))
        
        # File selection
        file_frame = ttk.Frame(left_panel)
        file_frame.pack(fill=tk.X, pady=(0, 15))
        
        self.file_path = tk.StringVar()
        file_entry = ttk.Entry(file_frame, textvariable=self.file_path, width=50)
        file_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        
        browse_btn = ttk.Button(
            file_frame, 
            text="Browse...", 
            command=self.browse_file,
            style='Primary.TButton'
        )
        browse_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        self.upload_btn = ttk.Button(
            file_frame,
            text="Upload",
            command=self.upload_file,
            style='Primary.TButton'
        )
        self.upload_btn.pack(side=tk.LEFT)
        
        # Transfers list
        transfers_frame = ttk.LabelFrame(left_panel, text="Active Transfers", padding=10)
        transfers_frame.pack(fill=tk.BOTH, expand=True)
        
        self.transfers_tree = ttk.Treeview(
            transfers_frame,
            columns=('status', 'progress', 'speed'),
            show='headings',
            selectmode='browse'
        )
        
        self.transfers_tree.heading('status', text='Status')
        self.transfers_tree.heading('progress', text='Progress')
        self.transfers_tree.heading('speed', text='Speed')
        
        self.transfers_tree.column('status', width=100)
        self.transfers_tree.column('progress', width=150)
        self.transfers_tree.column('speed', width=100)
        
        scrollbar = ttk.Scrollbar(transfers_frame, orient=tk.VERTICAL, command=self.transfers_tree.yview)
        self.transfers_tree.configure(yscroll=scrollbar.set)
        
        self.transfers_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Right panel - Connected clients
        right_panel = ttk.LabelFrame(content_frame, text="Connected Clients", width=250, padding=10)
        right_panel.pack(side=tk.RIGHT, fill=tk.Y)
        right_panel.pack_propagate(False)
        
        self.clients_listbox = tk.Listbox(
            right_panel,
            font=('Helvetica', 10),
            borderwidth=0,
            highlightthickness=0
        )
        self.clients_listbox.pack(fill=tk.BOTH, expand=True)
        
        # Status bar
        status_frame = ttk.Frame(main_frame, height=25)
        status_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.status_var = tk.StringVar(value="Ready")
        status_label = ttk.Label(
            status_frame,
            textvariable=self.status_var,
            relief=tk.SUNKEN,
            anchor=tk.W,
            padding=(10, 0)
        )
        status_label.pack(fill=tk.X)
        
        # Configure grid weights
        content_frame.columnconfigure(0, weight=3)
        content_frame.columnconfigure(1, weight=1)
        
    def setup_socket_events(self):
        @self.sio.event
        async def connect():
            self.connected = True
            self.root.after(0, self.update_ui_connection_status, True)
            await self.sio.emit('register', {
                'name': f'Client-{self.client_id[:8]}',
                'ip': '127.0.0.1'  # This would be the actual IP in a real app
            })
        
        @self.sio.event
        async def disconnect():
            self.connected = False
            self.root.after(0, self.update_ui_connection_status, False)
        
        @self.sio.on('transfer_update')
        async def on_transfer_update(data):
            self.root.after(0, self.update_transfer, data)
        
        @self.sio.on('clients_updated')
        async def on_clients_updated(clients):
            self.root.after(0, self.update_clients_list, clients)
    
    async def start_client(self):
        try:
            await self.sio.connect('http://localhost:8000')
            await self.sio.wait()
        except Exception as e:
            print(f"Connection error: {e}")
            self.root.after(0, lambda: messagebox.showerror(
                "Connection Error",
                f"Failed to connect to server: {str(e)}"
            ))
    
    def update_ui_connection_status(self, connected):
        if connected:
            self.status_label.config(text="● Connected", foreground="green")
            self.status_var.set("Connected to server")
        else:
            self.status_label.config(text="● Disconnected", foreground="red")
            self.status_var.set("Disconnected from server")
    
    def browse_file(self):
        filename = filedialog.askopenfilename()
        if filename:
            self.file_path.set(filename)
    
    async def upload_file_async(self, file_path):
        if not os.path.exists(file_path):
            messagebox.showerror("Error", "File does not exist!")
            return
        
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        transfer_id = str(uuid.uuid4())
        
        # Add to active transfers
        self.active_transfers[transfer_id] = {
            'file_name': file_name,
            'size': file_size,
            'progress': 0,
            'status': 'pending',
            'start_time': datetime.now(),
            'bytes_transferred': 0,
            'speed': 0,
            'time_remaining': 0
        }
        
        # Update UI
        self.update_transfer_ui(transfer_id)
        
        try:
            # Read file in chunks
            chunk_size = 1024 * 1024  # 1MB chunks
            total_chunks = (file_size + chunk_size - 1) // chunk_size
            bytes_sent = 0
            
            with open(file_path, 'rb') as f:
                for chunk_num in range(total_chunks):
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    
                    bytes_sent += len(chunk)
                    progress = min(100, (bytes_sent / file_size) * 100)
                    
                    # Update transfer status
                    self.active_transfers[transfer_id].update({
                        'progress': progress,
                        'status': 'in-progress',
                        'bytes_transferred': bytes_sent,
                        'speed': bytes_sent / (datetime.now() - 
                                self.active_transfers[transfer_id]['start_time']).total_seconds(),
                        'time_remaining': (file_size - bytes_sent) / max(
                            self.active_transfers[transfer_id]['speed'], 1
                        ) if progress < 100 else 0
                    })
                    
                    # Send chunk to server
                    await self.sio.emit('chunk_upload', {
                        'transfer_id': transfer_id,
                        'chunk_number': chunk_num + 1,
                        'total_chunks': total_chunks,
                        'progress': progress,
                        'bytes_transferred': bytes_sent
                    })
                    
                    # Small delay to prevent overwhelming the server
                    await asyncio.sleep(0.1)
            
            # Mark as completed
            self.active_transfers[transfer_id].update({
                'status': 'completed',
                'progress': 100
            })
            
        except Exception as e:
            print(f"Error uploading file: {e}")
            self.active_transfers[transfer_id].update({
                'status': 'error',
                'error': str(e)
            })
        
        # Final UI update
        self.update_transfer_ui(transfer_id)
    
    def upload_file(self):
        file_path = self.file_path.get()
        if not file_path:
            messagebox.showwarning("Warning", "Please select a file first!")
            return
        
        asyncio.run_coroutine_threadsafe(self.upload_file_async(file_path), self.loop)
    
    def update_transfer_ui(self, transfer_id):
        if transfer_id not in self.active_transfers:
            return
            
        transfer = self.active_transfers[transfer_id]
        item_id = None
        
        # Find the item in the treeview
        for item in self.transfers_tree.get_children():
            if self.transfers_tree.item(item, 'values')[0] == transfer_id:
                item_id = item
                break
        
        # Format values for display
        status_text = transfer['status'].capitalize()
        progress_text = f"{transfer['progress']:.1f}%"
        speed_text = f"{transfer['speed'] / (1024 * 1024):.2f} MB/s" if transfer['speed'] > 0 else "0 B/s"
        
        if item_id:
            # Update existing item
            self.transfers_tree.item(item_id, values=(
                transfer_id, status_text, progress_text, speed_text
            ))
        else:
            # Add new item
            self.transfers_tree.insert('', 'end', values=(
                transfer_id, status_text, progress_text, speed_text
            ))
    
    def update_transfer(self, data):
        transfer_id = data.get('transfer_id')
        if transfer_id in self.active_transfers:
            self.active_transfers[transfer_id].update(data)
            self.update_transfer_ui(transfer_id)
    
    def update_clients_list(self, clients):
        self.clients_listbox.delete(0, tk.END)
        for client in clients:
            status = "🟢" if client.get('is_online', False) else "🔴"
            self.clients_listbox.insert(tk.END, 
                f"{status} {client.get('name', 'Unknown')} ({client.get('ip', '0.0.0.0')})"
            )

if __name__ == "__main__":
    root = tk.Tk()
    app = FileTransferApp(root)
    root.mainloop()