import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  systemPrompt?: string;
};

function normalizeChatEndpoint(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (
    trimmed.endsWith('/text/chatcompletion_v2') ||
    trimmed.endsWith('/chat/completions')
  ) {
    return trimmed;
  }

  if (trimmed.endsWith('/v1')) {
    return `${trimmed}/text/chatcompletion_v2`;
  }

  return `${trimmed}/chat/completions`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MINIMAX_API_KEY?.trim();
  const model = process.env.MINIMAX_MODEL?.trim();
  const baseUrl = process.env.MINIMAX_BASE_URL?.trim();

  if (!apiKey || !model || !baseUrl) {
    return NextResponse.json(
      {
        error:
          'MiniMax chat env is incomplete. Expected MINIMAX_API_KEY, MINIMAX_MODEL and MINIMAX_BASE_URL.',
      },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const incomingMessages = (body.messages ?? []).filter(
    (message): message is ChatMessage =>
      Boolean(message?.content) &&
      (message.role === 'system' || message.role === 'user' || message.role === 'assistant')
  );

  if (incomingMessages.length === 0 && !body.systemPrompt?.trim()) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const messages: ChatMessage[] = body.systemPrompt?.trim()
    ? [{ role: 'system', content: body.systemPrompt.trim() }, ...incomingMessages]
    : incomingMessages;

  try {
    const upstreamResponse = await fetch(normalizeChatEndpoint(baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorText = await upstreamResponse.text();
      return NextResponse.json(
        {
          error: 'MiniMax upstream request failed.',
          status: upstreamResponse.status,
          detail: errorText,
        },
        { status: upstreamResponse.status || 500 }
      );
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('MiniMax chat route error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to MiniMax upstream.' },
      { status: 500 }
    );
  }
}
