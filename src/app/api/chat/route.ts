import { NextRequest, NextResponse } from 'next/server';
import { createSseEvent, createThinkStripper, resolveIncrementalVisibleText } from '@/lib/chat-stream';

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
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

function normalizeUpstreamSseStream(upstreamBody: ReadableStream<Uint8Array>) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      let emittedText = '';
      const stripThink = createThinkStripper();

      const processLine = (line: string) => {
        if (!line.startsWith('data:')) {
          return;
        }

        const data = line.replace(/^data:\s?/, '').trim();
        if (!data) {
          return;
        }

        if (data === '[DONE]') {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          return;
        }

        try {
          const parsed = JSON.parse(data) as unknown;
          const text = stripThink(resolveIncrementalVisibleText(parsed, emittedText));
          if (!text) {
            return;
          }
          emittedText += text;
          controller.enqueue(encoder.encode(createSseEvent(text)));
        } catch {
          controller.enqueue(encoder.encode(`${line}\n`));
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            processLine(line);
          }
        }

        buffer += decoder.decode();
        if (buffer) {
          processLine(buffer);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.KIMI_API_KEY?.trim();
  const model = process.env.KIMI_MODEL?.trim();
  const baseUrl = process.env.KIMI_BASE_URL?.trim();

  if (!apiKey || !model || !baseUrl) {
    return NextResponse.json(
      {
        error:
          'Kimi chat env is incomplete. Expected KIMI_API_KEY, KIMI_MODEL and KIMI_BASE_URL.',
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
          error: 'Kimi upstream request failed.',
          status: upstreamResponse.status,
          detail: errorText,
        },
        { status: upstreamResponse.status || 500 }
      );
    }

    return new Response(normalizeUpstreamSseStream(upstreamResponse.body), {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Kimi chat route error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Kimi upstream.' },
      { status: 500 }
    );
  }
}
