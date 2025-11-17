import { useState, useEffect } from 'react';
import Head from 'next/head';
import FileUpload from '../components/file-transfer/FileUpload';
import TransferList from '../components/file-transfer/TransferList';
import NetworkStatus from '../components/network/NetworkStatus';
import StatsPanel from '../components/network/StatsPanel';
import { useSocket } from '../hooks/useSocket';
import { FileTransfer, TransferStatus } from '../types';

export default function Home() {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const { isConnected, socket } = useSocket('http://localhost:3001');

  useEffect(() => {
    if (!socket) return;

    const onTransferUpdate = (transfer: FileTransfer) => {
      setTransfers(prev => {
        const existing = prev.find(t => t.id === transfer.id);
        return existing
          ? prev.map(t => t.id === transfer.id ? { ...t, ...transfer } : t)
          : [...prev, transfer];
      });
    };

    socket.on('transfer-update', onTransferUpdate);
    return () => {
      socket.off('transfer-update', onTransferUpdate);
    };
  }, [socket]);

  const handleFileSelect = async (files: File[]) => {
    if (!socket) return;
    
    files.forEach(file => {
      const transfer: FileTransfer = {
        id: Date.now().toString(),
        fileName: file.name,
        size: file.size,
        progress: 0,
        status: 'pending' as TransferStatus,
        timestamp: new Date()
      };
      
      setTransfers(prev => [...prev, transfer]);
      
      // Simulate file transfer (replace with actual socket.emit)
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const chunk = file.slice(start, start + chunkSize);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const progress = Math.min(100, ((i + 1) / totalChunks) * 100);
        socket.emit('chunk-upload', {
          transferId: transfer.id,
          chunkNumber: i + 1,
          totalChunks,
          progress
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>File Transfer App</title>
        <meta name="description" content="Cross-computer file transfer application" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">File Transfer Application</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <FileUpload onFileSelect={handleFileSelect} isConnected={isConnected} />
            <TransferList transfers={transfers} />
          </div>
          
          <div className="space-y-6">
            <NetworkStatus isConnected={isConnected} />
            <StatsPanel transfers={transfers} />
          </div>
        </div>
      </main>
    </div>
  );
}