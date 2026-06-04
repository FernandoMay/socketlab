import { NextRequest, NextResponse } from 'next/server';
import { getMessages, addMessage } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ messages: getMessages() });
}

export async function POST(req: NextRequest) {
  try {
    const { from, text } = await req.json();
    if (!from || !text) return NextResponse.json({ error: 'from and text required' }, { status: 400 });
    const msg = addMessage(from, text);
    return NextResponse.json({ message: msg });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
