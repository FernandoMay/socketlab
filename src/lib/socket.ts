import { Server, Socket } from 'socket.io';
import { getMessages, addMessage, ChatMessage } from './store';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Send message history on connection
    socket.emit('messages', getMessages());

    // Listen for new messages
    socket.on('message', (data: { from: string; text: string }) => {
      if (!data?.from || !data?.text) return;
      const msg = addMessage(data.from, data.text);
      // Broadcast to ALL connected clients including sender
      io.emit('message', msg);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};
