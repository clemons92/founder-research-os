import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, idea } = await request.json();
  // In real: save to DB, trigger agent spawn via MCP for beta, email confirmation etc.
  console.log('Waitlist signup (demo):', email, 'idea:', idea);
  return NextResponse.json({ success: true, message: "Queued for beta. Real agent spawns coming." });
}
