'use client';

import { useState, useEffect, useRef } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ id: string; from: string; text: string; ts: number }[]>([]);
  const [from, setFrom] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch('/api/messages').then(r => r.json()).then(d => { setMessages(d.messages || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!from || !text) return;
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, text }) });
    setText('');
    const res = await fetch('/api/messages'); const d = await res.json(); setMessages(d.messages || []);
  };

  const poll = async () => { const res = await fetch('/api/messages'); const d = await res.json(); setMessages(d.messages || []); };
  useEffect(() => { const iv = setInterval(poll, 2000); return () => clearInterval(iv); }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">SocketLab Chat</h1>
        <p className="text-gray-400 text-sm mb-6">Real-time messaging via REST polling (WebSocket coming next)</p>

        <div className="flex gap-2 mb-4">
          <input value={from} onChange={e => setFrom(e.target.value)} placeholder="Your name" className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm" />
        </div>

        <div className="h-[400px] overflow-y-auto mb-4 space-y-2 rounded-xl border border-gray-800 p-4 bg-gray-900/50">
          {loading ? <p className="text-gray-500">Loading messages...</p> : messages.length === 0 ? <p className="text-gray-500 text-center py-10">No messages yet. Start chatting!</p> : messages.map(m => (
            <div key={m.id} className={p-3 rounded-xl }>
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

        <p className="text-xs text-gray-600 mt-4">Messages persist in memory. Refresh to see all.</p>
      </div>
    </div>
  );
}
