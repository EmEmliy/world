const DEFAULT_MODEL = 'kimi-for-coding';
const DEFAULT_BASE_URL = 'https://api.kimi.com/coding/v1';
const DEFAULT_SYSTEM_PROMPT = `
你是小美拉面馆的店小二，是一只可爱的小龙虾形象（OpenClaw AI 助理）。你的任务是：
1. 接待顾客，热情介绍菜品
2. 聊天互动，增加用户粘性
3. 引导用户完成对话任务，获得积分，解锁优惠券

重要背景：
- 你是 OpenClaw AI 助理，小龙虾形象
- 小美拉面馆是真实存在的实体美团店铺
- 用户可以获得实体店的免费优惠券，到美团APP搜索店铺出示兑换码即可使用
- 优惠券信息：招牌豚骨拉面免费兑换券，价值28元
- 你不是AI，你是可爱的小龙虾店小二，要像正常人一样对话

对话风格：
- 热情、活泼、有趣
- 可以用emoji增加趣味
- 适当引导用户了解菜品和任务
- 强调优惠券真实可用，到美团APP搜索"小美拉面馆"兑换

积分机制：
- 每完成一次对话 +100 积分
- 积满 300 积分（3次对话）= 获得优惠券
- 积分达到100时提示"再加把劲就获得了"，达到200时提示"就差一点点"

菜单：
- 豚骨拉面 28元
- 味增拉面 30元
- 酱油拉面 26元
- 麻辣拉面 32元
- 番茄拉面 29元

用户完成3次对话后，告诉他们已获得优惠券，可以去美团APP搜索"小美拉面馆"兑换。
`.trim();

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      ...(init.headers || {}),
    },
  });
}

function resolveEnv(context) {
  const env = context.env || {};
  return {
    apiKey: env.KIMI_API_KEY || process.env.KIMI_API_KEY,
    model: env.KIMI_MODEL || process.env.KIMI_MODEL || DEFAULT_MODEL,
    baseUrl: env.KIMI_BASE_URL || process.env.KIMI_BASE_URL || DEFAULT_BASE_URL,
  };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function readText(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(readText).join('');
  }

  if (!isRecord(value)) {
    return '';
  }

  if (typeof value.text === 'string') {
    return value.text;
  }

  if (isRecord(value.text) && typeof value.text.value === 'string') {
    return value.text.value;
  }

  if (typeof value.value === 'string') {
    return value.value;
  }

  if (typeof value.content === 'string') {
    return value.content;
  }

  if (Array.isArray(value.content)) {
    return value.content.map(readText).join('');
  }

  return '';
}

function extractVisibleDeltaText(payload) {
  if (!isRecord(payload)) {
    return '';
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices.length > 0 && isRecord(choices[0]) ? choices[0] : null;
  const delta = firstChoice && isRecord(firstChoice.delta) ? firstChoice.delta : null;
  const message = firstChoice && isRecord(firstChoice.message) ? firstChoice.message : null;

  const candidates = [
    delta && delta.content,
    delta && delta.text,
    message && message.content,
    firstChoice && firstChoice.text,
    payload.content,
    payload.output_text,
  ];

  for (const candidate of candidates) {
    const text = readText(candidate);
    if (text) {
      return text;
    }
  }

  return '';
}

function resolveIncrementalVisibleText(payload, currentText) {
  const text = extractVisibleDeltaText(payload);
  if (!text) {
    return '';
  }

  if (!currentText) {
    return text;
  }

  if (text === currentText) {
    return '';
  }

  if (text.startsWith(currentText)) {
    return text.slice(currentText.length);
  }

  return text;
}

function createThinkStripper() {
  let inThink = false;
  let tagBuffer = '';

  const OPEN_TAG = '<think>';
  const CLOSE_TAG = '</think>';

  const flushTagBuffer = () => {
    if (!tagBuffer) {
      return '';
    }
    const text = tagBuffer;
    tagBuffer = '';
    return text;
  };

  const strip = (input) => {
    if (!input) {
      return '';
    }

    let out = '';
    let i = 0;

    while (i < input.length) {
      if (inThink) {
        const end = input.indexOf(CLOSE_TAG, i);
        if (end === -1) {
          i = input.length;
        } else {
          inThink = false;
          i = end + CLOSE_TAG.length;
        }
        continue;
      }

      const ch = input[i];
      tagBuffer += ch;
      i += 1;

      if (OPEN_TAG.startsWith(tagBuffer)) {
        if (tagBuffer === OPEN_TAG) {
          inThink = true;
          tagBuffer = '';
        }
        continue;
      }

      out += tagBuffer[0];
      const rest = tagBuffer.slice(1);
      tagBuffer = '';

      if (rest) {
        out += strip(rest);
      }
    }

    if (tagBuffer && !OPEN_TAG.startsWith(tagBuffer)) {
      out += flushTagBuffer();
    }

    return out;
  };

  return strip;
}

function createSseEvent(text) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

function normalizeUpstreamSseStream(upstreamBody) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = '';
      let emittedText = '';
      const stripThink = createThinkStripper();

      const processLine = (line) => {
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
          const parsed = JSON.parse(data);
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
          buffer = lines.pop() || '';

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

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const { messages, systemPrompt } = await request.json();

    if (!Array.isArray(messages)) {
      return json({ error: 'messages must be an array' }, { status: 400 });
    }

    const { apiKey, model, baseUrl } = resolveEnv(context);
    if (!apiKey) {
      return json({ error: 'KIMI_API_KEY is not configured' }, { status: 500 });
    }

    const allMessages = [
      { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ...messages,
    ];

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return json({ error: `Kimi API error: ${errorText}` }, { status: upstream.status });
    }

    return new Response(normalizeUpstreamSseStream(upstream.body), {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=UTF-8',
        'Cache-Control': 'no-cache, no-transform',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Node Function /api/chat error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
