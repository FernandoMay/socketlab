'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ id: string; from: string; text: string; ts: number }[]>([]);
  const [from, setFrom] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ path: '/api/socketio', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('messages', (msgs: typeof messages) => {
      setMessages(msgs);
      setLoading(false);
    });

    socket.on('message', (msg: (typeof messages)[0]) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Fallback: if socket doesn't connect within 3s, load via REST
    const fallbackTimer = setTimeout(() => {
      if (!socket.connected) {
        fetch('/api/messages').then(r => r.json()).then(d => { setMessages(d.messages || []); setLoading(false); }).catch(() => setLoading(false));
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      socket.disconnect();
    };
  }, []);

  // Polling fallback when disconnected
  useEffect(() => {
    if (connected) return;
    const iv = setInterval(async () => {
      if (socketRef.current?.connected) return;
      try {
        const res = await fetch('/api/messages');
        const d = await res.json();
        setMessages(d.messages || []);
      } catch { /* ignore */ }
    }, 5000);
    setLoading(false);
    return () => clearInterval(iv);
  }, [connected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!from || !text) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', { from, text });
    } else {
      // Fallback to REST
      fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, text }) });
    }
    setText('');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">SocketLab Chat</h1>
          <span className={`text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-600' : 'bg-yellow-600'}`}>
            {connected ? 'WebSocket' : 'REST fallback'}
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-6">Real-time messaging via WebSocket</p>

        <div className="flex gap-2 mb-4">
          <input value={from} onChange={e => setFrom(e.target.value)} placeholder="Your name" className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm" />
        </div>

        <div className="h-[400px] overflow-y-auto mb-4 space-y-2 rounded-xl border border-gray-800 p-4 bg-gray-900/50">
          {loading ? <p className="text-gray-500">Loading messages...</p> : messages.length === 0 ? <p className="text-gray-500 text-center py-10">No messages yet. Start chatting!</p> : messages.map(m => (
            <div key={m.id} className="p-3 rounded-xl bg-gray-800/50">
              <p className="text-xs text-gray-400 mb-1">{m.from} <span className="text-gray-600">{new Date(m.ts).toLocaleTimeString()}</span></p>
              <p className="text-sm">{m.text}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm" />
          <button onClick={send} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">Send</button>
        </div>

        <p className="text-xs text-gray-600 mt-4">Messages persist in memory. Real-time via WebSocket.</p>
      </div>
    </div>
  );
}
