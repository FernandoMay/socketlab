import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(url: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketIo = io(url, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketIo.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketIo.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketIo.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [url]);

  return { socket, isConnected };
}