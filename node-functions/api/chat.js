const DEFAULT_MODEL = 'MiniMax-M2.5-highspeed';
const DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1';
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
    apiKey: env.MINIMAX_API_KEY || process.env.MINIMAX_API_KEY,
    model: env.MINIMAX_MODEL || process.env.MINIMAX_MODEL || DEFAULT_MODEL,
    baseUrl: env.MINIMAX_BASE_URL || process.env.MINIMAX_BASE_URL || DEFAULT_BASE_URL,
  };
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
      return json({ error: 'MINIMAX_API_KEY is not configured' }, { status: 500 });
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
      return json({ error: `MiniMax API error: ${errorText}` }, { status: upstream.status });
    }

    return new Response(upstream.body, {
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
