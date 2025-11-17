export type TransferStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface FileTransfer {
  id: string;
  fileName: string;
  size: number;
  progress: number;
  status: TransferStatus;
  timestamp: Date;
  error?: string;
  speed?: number;
  timeRemaining?: number;
}

export interface TransferChunk {
  transferId: string;
  chunkNumber: number;
  totalChunks: number;
  data: ArrayBuffer;
  progress: number;
}

export interface ClientInfo {
  id: string;
  name: string;
  ip: string;
  lastSeen: Date;
  isOnline: boolean;
}

export interface ServerStats {
  totalTransfers: number;
  activeTransfers: number;
  totalClients: number;
  uptime: number;
  totalDataTransferred: number;
}