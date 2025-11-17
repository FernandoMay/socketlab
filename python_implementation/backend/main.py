from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Dict, List
import socketio
import uvicorn
from datetime import datetime
import os
import asyncio
from pathlib import Path

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio)
app.mount('/socket.io', socket_app)

# Store active transfers and clients
active_transfers: Dict[str, dict] = {}
clients: Dict[str, dict] = {}
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

manager = ConnectionManager()

@app.get("/")
async def read_root():
    return {"status": "Python File Transfer Server"}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    clients[sid] = {
        "id": sid,
        "connected_at": datetime.now().isoformat(),
        "ip": environ.get("REMOTE_ADDR", "unknown")
    }
    await sio.emit("clients_updated", list(clients.values()))

@sio.event
async def disconnect(sid):
    if sid in clients:
        del clients[sid]
        await sio.emit("clients_updated", list(clients.values()))
    print(f"Client disconnected: {sid}")

@sio.event
async def start_transfer(sid, data):
    transfer_id = data.get("transfer_id")
    active_transfers[transfer_id] = {
        **data,
        "status": "in-progress",
        "progress": 0,
        "start_time": datetime.now().isoformat(),
        "bytes_transferred": 0,
        "chunks_received": 0
    }
    await sio.emit("transfer_update", active_transfers[transfer_id])

@sio.event
async def chunk_upload(sid, data):
    transfer_id = data.get("transfer_id")
    if transfer_id in active_transfers:
        transfer = active_transfers[transfer_id]
        now = datetime.now()
        time_elapsed = (now - datetime.fromisoformat(transfer["start_time"])).total_seconds()
        bytes_per_second = data.get("bytes_transferred", 0) / max(time_elapsed, 1)
        
        active_transfers[transfer_id].update({
            "progress": data.get("progress", 0),
            "status": "completed" if data.get("progress", 0) == 100 else "in-progress",
            "speed": bytes_per_second,
            "bytes_transferred": data.get("bytes_transferred", 0),
            "chunks_received": transfer.get("chunks_received", 0) + 1,
            "time_remaining": 0 if data.get("progress", 0) == 100 else 
                           (transfer["size"] - data.get("bytes_transferred", 0)) / max(bytes_per_second, 1)
        })
        await sio.emit("transfer_update", active_transfers[transfer_id])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)