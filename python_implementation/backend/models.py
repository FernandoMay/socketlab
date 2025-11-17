from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TransferStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    FAILED = "failed"

class FileTransfer(BaseModel):
    transfer_id: str
    file_name: str
    size: int
    progress: float = 0
    status: TransferStatus = TransferStatus.PENDING
    start_time: datetime
    end_time: Optional[datetime] = None
    bytes_transferred: int = 0
    speed: float = 0
    time_remaining: float = 0
    error: Optional[str] = None

class ClientInfo(BaseModel):
    client_id: str
    name: str
    ip: str
    connected_at: datetime
    last_seen: datetime
    is_online: bool = True

class TransferUpdate(BaseModel):
    transfer_id: str
    progress: float
    status: TransferStatus
    bytes_transferred: int
    speed: float
    time_remaining: float