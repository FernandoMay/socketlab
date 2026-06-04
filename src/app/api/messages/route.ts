import { NextRequest, NextResponse } from 'next/server';

const messages: { id: string; from: string; text: string; ts: number }[] = [];
let idCounter = 0;

export async function GET() {
  return NextResponse.json({ messages: messages.slice(-50) });
}

export async function POST(req: NextRequest) {
  try {
    const { from, text } = await req.json();
    if (!from || !text) return NextResponse.json({ error: 'from and text required' }, { status: 400 });
    const msg = { id: String(++idCounter), from, text, ts: Date.now() };
    messages.push(msg);
    return NextResponse.json({ message: msg });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
