import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, questProgress } = body;
    
    const completed = questProgress >= 100;
    
    return NextResponse.json({ completed });
  } catch (error) {
    return NextResponse.json({ error: 'Error checking task' }, { status: 500 });
  }
}
