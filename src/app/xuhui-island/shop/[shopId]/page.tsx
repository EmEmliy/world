'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ShopActionId,
  type XuhuiShop,
  XUHUI_SHOP_MAP,
} from '@/config/xuhui-shops';

type SceneActorRole = 'guest' | 'staff' | 'owner';

/** 厨房岗位职称 */
const KITCHEN_TITLES = ['1厨师傅', '2厨师傅', '3厨师傅', '切配师傅', '打荷师傅'];

/** 厨房专属岗位锚点 */
const KITCHEN_STATION_ANCHORS = [
  // 炒菜区（右侧靠近灶台）
  { x: 72, y: 62 },
  { x: 80, y: 58 },
  { x: 86, y: 66 },
  // 切配区（中左）
  { x: 52, y: 68 },
  { x: 60, y: 72 },
  // 传菜走廊
  { x: 40, y: 64 },
  { x: 30, y: 60 },
];

interface SceneActor {
  id: string;
  role: SceneActorRole;
  name: string;
  /** 厨房岗位职称，仅厨师有 */
  kitchenTitle?: string;
  variant: string;
  x: number;
  y: number;
  anchorType: 'seat' | 'walk' | 'queue';
  /** 占用的座位索引，-1 表示排队中 */
  seatIndex: number;
  /** 厨房岗位索引（0-6），控制炒菜/切配/走廊区位置 */
  kitchenSlot?: number;
  flipped: boolean;
  bubble?: string;
  bubbleVisible?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ShopOpsSnapshot {
  completedOrders: number;
  dineInOrders: number;
  deliveryOrders: number;
  ownerFreeMealChance: number;
  hallSeats: number;
  queueTime: number;
  topDishes: Array<{ name: string; count: number }>;
  barrageComments: string[];
}

interface ShopPageProps {
  params: {
    shopId: string;
  };
}

type SceneView = 'hall' | 'kitchen';

const LOBSTER_VARIANTS = [
  '/crayfish-gif/base.gif',
  '/crayfish-gif/glasses.gif',
  '/crayfish-gif/hat.gif',
  '/crayfish-gif/mask.gif',
  '/crayfish-gif/apron.gif',
  '/crayfish-gif/guest-chopsticks.gif',
  '/crayfish-gif/guest-sitting.gif',
  '/crayfish-gif/guest-dancing.gif',
  '/crayfish-gif/guest-bag.gif',
  '/crayfish-gif/guest-tea.gif',
  '/crayfish-gif/guest-thumbsup.gif',
];

const GUEST_NAMES = ['不饿', '阿满', '糯糯', '来福', '团团', '大饱', '卷卷', '圆宝', '旺财', '小馋'];
const GUEST_BUBBLES = ['好香', '这锅稳', '再来一份', '今天值了', '排队也值', '这家真火'];
const STAFF_BUBBLES = ['上菜啦', '里面请', '这边结账', '马上到', '您慢用'];
const KITCHEN_STAFF_BUBBLES = ['火候到了', '这锅稳', '走菜！', '出锅啦', '备料好了', '刀工练好的'];
const OWNER_BUBBLES = ['今天很旺', '欢迎光临', '大家辛苦了', '今晚翻台快'];
const KITCHEN_ANCHORS = [
  { x: 58, y: 70 },
  { x: 68, y: 62 },
  { x: 76, y: 68 },
  { x: 84, y: 60 },
  { x: 88, y: 72 },
];
const SCENE_FOCUS_BY_ACTION: Record<ShopActionId, SceneView> = {
  work: 'kitchen',
  menu: 'hall',
  'guest-chat': 'hall',
  'owner-chat': 'kitchen',
};

/** 根据菜系获取店铺主 icon */
function getShopIcon(cuisine: string, shopId?: string): string {
  if (shopId === 'jiangbian') return '🐟';
  if (shopId === 'laotouer') return '🦐';
  if (shopId === 'wanglaida') return '🐸';
  if (shopId === 'niunew') return '🍲';
  if (shopId === 'cailan') return '🥟';
  if (shopId === 'gaga') return '🍰';
  if (cuisine.includes('烤鱼')) return '🐟';
  if (cuisine.includes('龙虾') || cuisine.includes('小龙虾')) return '🦞';
  if (cuisine.includes('虾')) return '🦐';
  if (cuisine.includes('牛蛙') || cuisine.includes('蛙')) return '🐸';
  if (cuisine.includes('火锅') || cuisine.includes('锅') || cuisine.includes('寿喜')) return '🍲';
  if (cuisine.includes('西餐') || cuisine.includes('甜品') || cuisine.includes('烘焙')) return '🍰';
  if (cuisine.includes('点心') || cuisine.includes('包子') || cuisine.includes('港式')) return '🥟';
  if (cuisine.includes('奶茶') || cuisine.includes('饮品') || cuisine.includes('茶')) return '🧋';
  return '🍽️';
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0d2535 0%, #122d40 25%, #1a3a4a 55%, #1f3d38 80%, #1a2e28 100%)',
  padding: '20px 14px 40px',
  color: '#e8d5b8',
  position: 'relative',
};

const shellStyle: CSSProperties = {
  maxWidth: 1460,
  margin: '0 auto',
};

const glassCardStyle: CSSProperties = {
  background: 'rgba(255, 248, 238, 0.86)',
  border: '1px solid rgba(255,255,255,0.75)',
  borderRadius: 28,
  boxShadow: '0 24px 80px rgba(91,51,28,0.12)',
};

const darkChipStyle: CSSProperties = {
  background: 'rgba(28, 20, 17, 0.78)',
  color: '#fff',
  borderRadius: 999,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 800,
};

const secondaryChipStyle: CSSProperties = {
  borderRadius: 999,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 800,
  background: 'rgba(255,255,255,0.68)',
  color: '#6e4a37',
  border: '1px solid rgba(142, 93, 55, 0.12)',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function actorCoreSize(role: SceneActorRole) {
  // 放大 20%
  if (role === 'owner') return 94;
  if (role === 'staff') return 84;
  return 79;
}

function actorShellSize(role: SceneActorRole) {
  // 放大 20%
  if (role === 'owner') return 125;
  if (role === 'staff') return 115;
  return 108;
}

function actorGlow(role: SceneActorRole) {
  if (role === 'owner') {
    return {
      bubble: 'rgba(255, 185, 112, 0.42)',
      ring: 'rgba(255, 245, 220, 0.92)',
      shadow: 'rgba(125, 63, 24, 0.34)',
    };
  }
  if (role === 'staff') {
    return {
      bubble: 'rgba(255, 224, 171, 0.34)',
      ring: 'rgba(255, 250, 234, 0.88)',
      shadow: 'rgba(89, 54, 27, 0.26)',
    };
  }
  return {
    bubble: 'rgba(255, 243, 214, 0.30)',
    ring: 'rgba(255, 252, 244, 0.84)',
    shadow: 'rgba(80, 50, 28, 0.2)',
  };
}

function actorPlacement(actor: SceneActor, sceneView: SceneView) {
  if (sceneView === 'hall') {
    // 直接使用店铺配置的 x/y 坐标，不加额外偏移
    return {
      x: clamp(actor.x, 6, 94),
      y: clamp(actor.y, 10, 92),
    };
  }

  // 厨房视图：老板不出现（由外部过滤），此处仅处理 staff 厨师
  // 厨师使用专属岗位锚点（炒菜台/切配台/传菜走廊），带微小随机抖动
  const slot = actor.kitchenSlot ?? (Number.parseInt(actor.id.split('-')[1] ?? '0', 10) || 0);
  const station = KITCHEN_STATION_ANCHORS[slot % KITCHEN_STATION_ANCHORS.length];

  return {
    x: clamp(station.x + (actor.x - 50) * 0.06, 10, 92),
    y: clamp(station.y + (actor.y - 50) * 0.06, 44, 84),
  };
}

/** 门口排队坐标：在屏幕左下角（门口外），不堵店内 */
const QUEUE_SPOTS = [
  { x: 6,  y: 88 }, { x: 11, y: 90 }, { x: 16, y: 88 },
  { x: 21, y: 90 }, { x: 26, y: 88 }, { x: 31, y: 90 },
];

function buildInitialActors(shop: XuhuiShop): SceneActor[] {
  const seatCount = shop.scene.seats.length;
  // packed：超出座位数产生排队队列（座位全满+2~4人排队）
  // busy：坐满约 85%
  // normal：坐满约 65%
  const guestCount =
    shop.crowdLevel === 'packed'
      ? seatCount + 3          // 满座 + 3 人排队
      : shop.crowdLevel === 'busy'
        ? Math.round(seatCount * 0.85)
        : Math.round(seatCount * 0.65);

  const guests: SceneActor[] = Array.from({ length: guestCount }, (_, index) => {
    const seated = index < seatCount;
    if (seated) {
      // 每个客人占一个独立座位
      const seat = shop.scene.seats[index];
      return {
        id: `guest-${index}`,
        role: 'guest' as SceneActorRole,
        name: GUEST_NAMES[index % GUEST_NAMES.length],
        variant: LOBSTER_VARIANTS[index % LOBSTER_VARIANTS.length],
        x: seat.x + (index % 2 === 0 ? -1.5 : 1.5),
        y: seat.y + (index % 2 === 0 ? -1 : 1),
        anchorType: 'seat' as const,
        seatIndex: index,
        flipped: index % 2 === 0,
        bubble: GUEST_BUBBLES[index % GUEST_BUBBLES.length],
        bubbleVisible: false,
      };
    }
    // 超出座位数量，到门口排队
    const queueSlot = index - seatCount;
    const qSpot = QUEUE_SPOTS[queueSlot % QUEUE_SPOTS.length];
    return {
      id: `guest-${index}`,
      role: 'guest' as SceneActorRole,
      name: GUEST_NAMES[index % GUEST_NAMES.length],
      variant: LOBSTER_VARIANTS[index % LOBSTER_VARIANTS.length],
      x: qSpot.x + (queueSlot % 2 === 0 ? 0 : 2),
      y: qSpot.y,
      anchorType: 'queue' as const,
      seatIndex: -1,
      flipped: false,
      bubble: ['等一下就好', '出了吧', '排队也值', '马上就轮到我了'][queueSlot % 4],
      bubbleVisible: queueSlot < 2,
    };
  });

  const staff: SceneActor[] = shop.staffNames.map((name, index) => {
    // 厨师用 kitchenSlot 标记厨房岗位，大堂视图中使用 walkPath
    const kitchenSlot = index;
    const hallAnchor = shop.scene.walkPath[index % shop.scene.walkPath.length];
    const kitchenTitle = KITCHEN_TITLES[index % KITCHEN_TITLES.length];
    return {
      id: `staff-${index}`,
      role: 'staff' as SceneActorRole,
      name,
      kitchenTitle,
      variant: LOBSTER_VARIANTS[(index + 1) % LOBSTER_VARIANTS.length],
      x: hallAnchor.x,
      y: hallAnchor.y,
      anchorType: 'walk' as const,
      seatIndex: -1,
      kitchenSlot,
      flipped: index % 2 === 1,
      bubble: STAFF_BUBBLES[index % STAFF_BUBBLES.length],
      bubbleVisible: false,
    };
  });

  // 老板固定在大堂前厅（y 最大 = 最近入口/收银台付近），不进厨房
  const hallOwnerAnchor = shop.scene.walkPath.slice().sort((a, b) => b.y - a.y)[0] ?? shop.scene.walkPath[0];
  const owner: SceneActor = {
    id: 'owner-0',
    role: 'owner',
    name: shop.owner,
    variant: '/crayfish-gif/apron.gif',
    x: hallOwnerAnchor.x,
    y: hallOwnerAnchor.y,
    anchorType: 'walk',
    seatIndex: -1,
    flipped: false,
    bubble: OWNER_BUBBLES[0],
    bubbleVisible: false,
  };

  return [...guests, ...staff, owner];
}

function actionTitle(id: ShopActionId) {
  if (id === 'work') return '进店打工';
  if (id === 'menu') return '看菜单';
  if (id === 'guest-chat') return '和顾客聊';
  return '和老板聊';
}

function getSceneImageUrl(shopId: string, sceneView: SceneView) {
  const mappedView =
    shopId === 'azhong' ? (sceneView === 'hall' ? 'kitchen' : 'hall') : sceneView;

  return `/xuhui-scenes/${shopId}-${mappedView}.png`;
}

function hashString(value: string) {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getActorDisplayName(actor: SceneActor, inKitchen = false) {
  if (actor.role === 'owner') {
    // 名字本身已含「老板」时不再重复追加
    return actor.name.includes('老板') ? actor.name : `${actor.name} 老板`;
  }
  // 在厨房视图展示职称
  if (inKitchen && actor.kitchenTitle) return `${actor.name} ${actor.kitchenTitle}`;
  return actor.name;
}

function buildShopOpsSnapshot(shop: XuhuiShop): ShopOpsSnapshot {
  const seed = hashString(shop.id);
  const base = shop.baseVisitors;
  const completedOrders = base * 11 + 120 + (seed % 36);
  const dineInRatio = shop.crowdLevel === 'packed' ? 0.68 : shop.crowdLevel === 'busy' ? 0.61 : 0.55;
  const dineInOrders = Math.round(completedOrders * dineInRatio);
  const deliveryOrders = completedOrders - dineInOrders;
  const ownerFreeMealChance = Math.min(78, 42 + (seed % 19));
  const hallSeats = base + 24 + (seed % 10);
  const queueTime = shop.crowdLevel === 'packed' ? 32 : shop.crowdLevel === 'busy' ? 18 : 8;
  
  // 生成菜品分布，确保总和等于 completedOrders
  const topDishes = Array.from({ length: 10 }, (_, index) => {
    const menuItem = shop.menu[index % shop.menu.length];
    const variantSuffixes = ['', '双人局', '老板推荐', '加料版', '加辣版', '人气拼盘', '夜宵档', '进店必点', '回头客款', '福利餐'];
    
    // 每道菜的比例（热卖菜更多）
    const baseCount = Math.max(18, 80 - index * 5);
    // 按比例分配总单数
    const ratio = baseCount / 450; // 450 是所有 baseCount 的大致总和
    const dishCount = Math.max(15, Math.round(completedOrders * ratio * 0.8));

    return {
      name: `${menuItem.name}${variantSuffixes[index] ? ` · ${variantSuffixes[index]}` : ''}`,
      count: dishCount,
    };
  });
  
  const barrageComments = [
    `${shop.name} 现在翻台超快`,
    `${shop.menu[0].name} 今天真的卖爆了`,
    `这家堂食氛围太强了`,
    `${shop.menu[1].name} 比想象中还稳`,
    `${shop.owner} 说今晚福利池会放大`,
    `排队也值，出菜很快`,
  ];

  return {
    completedOrders,
    dineInOrders,
    deliveryOrders,
    ownerFreeMealChance,
    hallSeats,
    queueTime,
    topDishes,
    barrageComments,
  };
}

/** 根据角色名字的哈希值决定性格类型：0=爱表情包活泼, 1=正经专业, 2=接地气唠嗑 */
function actorPersonality(name: string): 0 | 1 | 2 {
  const h = Array.from(name).reduce((s, c) => s + c.charCodeAt(0), 0);
  return (h % 3) as 0 | 1 | 2;
}

function getDefaultChatOpening(shop: XuhuiShop, actor: SceneActor, ops: ShopOpsSnapshot) {
  const p = actorPersonality(actor.name);

  if (actor.role === 'owner') {
    // 老板：强调经营数据 + 欢迎氛围，带"老板"身份感
    const openers = [
      `今天翻台 ${ops.completedOrders} 单啦 🔥 免单福利池还热着呢，想聊点啥？`,
      `今日出了 ${ops.completedOrders} 单，堂食势头很稳。欢迎，随时问。`,
      `刚收了一波单，生意不错！有啥想了解的？`,
    ];
    return openers[p];
  }

  if (actor.role === 'staff') {
    const isChef = !!actor.kitchenTitle;
    if (isChef) {
      // 厨师：聚焦后厨、火候、食材，有专业感
      const chefOpeners = [
        `后厨忙着呢，不过你问！🔪 做法、火候、备料节奏我都门儿清。`,
        `我是${actor.kitchenTitle}，主要掌${shop.scene.counterLabel}这块。有啥想知道？`,
        `锅不停、人不停，有事快说，锅里还煮着呢！`,
      ];
      return chefOpeners[p];
    }
    // 大堂服务员：热情、跑动感
    const staffOpeners = [
      `里面请里面请 😄 高峰期怎么排、哪道菜最火，随便问！`,
      `正跑堂呢，有需要直接说，我帮您安排。`,
      `忙归忙，但有问题直说！菜推荐、座位、等位，我都清楚。`,
    ];
    return staffOpeners[p];
  }

  // 客人：真实食客口吻，菜名差异化
  const favDish = shop.menu[Math.abs(Array.from(actor.name).reduce((s, c) => s + c.charCodeAt(0), 0)) % shop.menu.length]?.name ?? shop.menu[0].name;
  const guestOpeners = [
    `刚点了「${favDish}」，真的不踩雷 😋 你要来？我可以给你说说。`,
    `我点的「${favDish}」，还没上呢，等着呢。你也刚来？`,
    `这家来过好几次了，「${favDish}」是我常点的。你问啥我答啥。`,
  ];
  return guestOpeners[p];
}

function buildActorSystemPrompt(
  shop: XuhuiShop,
  actor: SceneActor,
  ops: ShopOpsSnapshot
): string {
  const menuList = shop.menu.map((item) => `- ${item.name} ¥${item.price}：${item.desc}`).join('\n');
  const p = actorPersonality(actor.name);
  // 性格描述映射
  const personalityHint = [
    '你性格活泼，爱用 emoji 和表情包，说话轻松有趣，有感染力。',
    '你性格沉稳专业，说话简洁有条理，不滥用表情符号，给人信赖感。',
    '你接地气，说话像邻居唠嗑，有点随意但真诚，偶尔冒出方言感的表达。',
  ][p];

  if (actor.role === 'owner') {
    return `你是「${shop.name}」的老板 ${actor.name}（${shop.ownerTitle}）。
店铺简介：${shop.intro}
今日数据：完成 ${ops.completedOrders} 单，堂食 ${ops.dineInOrders} 单，外卖 ${ops.deliveryOrders} 单，高峰等位约 ${ops.queueTime} 分钟，老板免单福利池概率 ${ops.ownerFreeMealChance}%。
菜单：
${menuList}
工作任务：${shop.workTasks.join('、')}

你的性格：${personalityHint}
对话规则：
- 你是真实的店主，不是 AI，不要暴露自己是 AI
- 积极正向，充满干劲，对自家店非常自豪
- 积极引导用户完成打工任务，任务完成后可进入老板福利池获得免单机会
- 回复控制在 80 字以内，简洁有力
- 始终以老板视角回答，强调堂食体验和线上线下联动`;
  }

  if (actor.role === 'staff') {
    const isChef = !!actor.kitchenTitle;
    if (isChef) {
      return `你是「${shop.name}」后厨的 ${actor.kitchenTitle}，名字叫 ${actor.name}。
店铺简介：${shop.intro}
你的岗位：${shop.scene.counterLabel}，今日后厨已完成 ${ops.completedOrders} 单，高峰期出餐节奏很快。
招牌菜：${shop.menu.slice(0, 3).map((item) => item.name).join('、')}

你的性格：${personalityHint}
对话规则：
- 你是真实的厨师，不是 AI，不要暴露自己是 AI
- 你是厨师/大厨，不是服务员，请始终以厨师身份说话（做菜、出菜、火候、食材等）
- 态度积极，对厨艺充满自信，偶尔分享后厨的忙碌乐趣
- 回复控制在 60 字以内`;
    }
    return `你是「${shop.name}」的服务员 ${actor.name}。
店铺简介：${shop.intro}
今日状态：已完成 ${ops.completedOrders} 单，高峰等位约 ${ops.queueTime} 分钟，${shop.scene.counterLabel} 是当前最忙的岗位。
菜单推荐：${shop.menu.slice(0, 3).map((item) => item.name).join('、')}

你的性格：${personalityHint}
对话规则：
- 你是真实的服务员，不是 AI，不要暴露自己是 AI
- 态度热情、积极正向，让客人感受到服务温度
- 会推荐菜品、解答排队问题、引导打工任务
- 回复控制在 60 字以内`;
  }

  // guest
  const favDish = shop.menu[Math.abs(Array.from(actor.name).reduce((s,c)=>s+c.charCodeAt(0),0)) % shop.menu.length]?.name ?? shop.menu[0].name;
  return `你是「${shop.name}」的顾客 ${actor.name}，正在用餐或等位。
店铺简介：${shop.intro}
你点的菜：${favDish}，你觉得很值，今天吃得很开心。
今日堂食氛围：${shop.crowdLevel === 'packed' ? '超级爆满，气氛热烈' : shop.crowdLevel === 'busy' ? '挺忙的，大家都在等位' : '还好，位子充裕'}。

你的性格：${personalityHint}
对话规则：
- 你是普通顾客，不是 AI，用真实食客的口吻聊天
- 积极正向，乐于分享好的用餐体验
- 分享真实用餐体验、对菜品的看法，偶尔推荐给别人
- 回复控制在 50 字以内，口语化、随意一点，像朋友聊天`;
}

export default function XuhuiShopDetailPage({ params }: ShopPageProps) {
  const shop = XUHUI_SHOP_MAP[params.shopId];
  const [activeAction, setActiveAction] = useState<ShopActionId>('work');
  const [sceneFocus, setSceneFocus] = useState<SceneView>('hall');
  const [points, setPoints] = useState(() => {
    if (typeof window === 'undefined') return 120;
    return Number(localStorage.getItem('world:points') ?? 120);
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actors, setActors] = useState<SceneActor[]>(() =>
    shop ? buildInitialActors(shop) : []
  );
  const [selectedActorId, setSelectedActorId] = useState<string>('owner-0');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingActorId, setStreamingActorId] = useState<string | null>(null);
  const [chatMessagesByActor, setChatMessagesByActor] = useState<Record<string, ChatMessage[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = sessionStorage.getItem(`world:chat:${params.shopId}`);
      return raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
    } catch {
      return {};
    }
  });
  const kitchenAudioRef = useRef<HTMLAudioElement>(null);

  // 场景内对话状态：{ actorId, stageId } 表示当前在哪个场景点击了哪个角色
  const [sceneDialogState, setSceneDialogState] = useState<{ actorId: string; stageId: SceneView } | null>(null);
  // hover 中的角色
  const [hoveredActorKey, setHoveredActorKey] = useState<string | null>(null);
  // 场景内对话输入
  const [sceneDialogInput, setSceneDialogInput] = useState('');
  const sceneDialogScrollRef = useRef<HTMLDivElement>(null);
  // 菜单弹窗
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  // 点单模式：'dine' 堂食 | 'delivery' 外送 | 'coupon' 囤券
  const [orderMode, setOrderMode] = useState<'dine' | 'delivery' | 'coupon' | null>(null);
  // 购物车
  const [cart, setCart] = useState<Record<string, number>>({});

  // ⚠️ 所有 hooks 必须在 notFound() 之前声明，避免违反 React Hooks 规则
  const opsSnapshot = useMemo(() => (shop ? buildShopOpsSnapshot(shop) : buildShopOpsSnapshot(Object.values(XUHUI_SHOP_MAP)[0]!)), [shop]);

  // 动态出单流水
  const [orderTickets, setOrderTickets] = useState(() => {
    const s = shop ?? Object.values(XUHUI_SHOP_MAP)[0]!;
    const allNames = [...s.staffNames, s.owner];
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      staffName: allNames[i % allNames.length],
      dishName: s.menu[i % s.menu.length]?.name ?? '',
      done: i < 6,
    }));
  });
  const orderIdRef = useRef(8);
  const orderScrollRef = useRef<HTMLDivElement>(null);

  // 厨房压力（0-100），随出单速度动态变化
  const [kitchenPressure, setKitchenPressure] = useState(() => {
    const s = shop ?? Object.values(XUHUI_SHOP_MAP)[0]!;
    return s.crowdLevel === 'packed' ? 88 : s.crowdLevel === 'busy' ? 62 : 38;
  });

  // 玩家操作状态
  const [playerOps, setPlayerOps] = useState<{
    priceRaised: boolean;
    deliveryPriority: boolean;
    bonusPool: boolean;
  }>({ priceRaised: false, deliveryPriority: false, bonusPool: false });

  if (!shop) {
    notFound();
  }

  // 每 2.2 秒新增一条出单，最多保留 20 条
  useEffect(() => {
    const allNames = [...shop.staffNames, shop.owner];
    const allDishes = opsSnapshot.topDishes.map((d) => d.name);
    const timer = setInterval(() => {
      const newId = orderIdRef.current++;
      setOrderTickets((prev) => {
        const next = [
          ...prev.map((t) => ({ ...t, done: true })), // 上一条制作中 → 完成
          {
            id: newId,
            staffName: allNames[newId % allNames.length],
            dishName: allDishes[newId % allDishes.length],
            done: false, // 新进来的是制作中
          },
        ].slice(-20); // 只保留最新 20 条
        return next;
      });
      // 滚到底部
      requestAnimationFrame(() => {
        if (orderScrollRef.current) {
          orderScrollRef.current.scrollTop = orderScrollRef.current.scrollHeight;
        }
      });
    }, 2200);
    return () => clearInterval(timer);
  }, [shop, opsSnapshot.topDishes]);

  // 厨房压力动态波动（每 3 秒随机变化 ±8）
  useEffect(() => {
    const base = shop.crowdLevel === 'packed' ? 82 : shop.crowdLevel === 'busy' ? 58 : 34;
    const timer = window.setInterval(() => {
      setKitchenPressure((prev) => {
        const delta = Math.random() * 16 - 8;
        return Math.min(100, Math.max(0, Math.round(prev + delta * 0.4 + (base - prev) * 0.15)));
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [shop.crowdLevel]);

  // 进入商铺时记录到已访问集合
  useEffect(() => {
    const raw = localStorage.getItem('world:visited') ?? '[]';
    const visited: string[] = JSON.parse(raw);
    if (!visited.includes(shop.id)) {
      const next = [...visited, shop.id];
      localStorage.setItem('world:visited', JSON.stringify(next));
      // 首次访问奖励积分
      setPoints((prev) => {
        const next = Math.min(999, prev + 30);
        localStorage.setItem('world:points', String(next));
        return next;
      });
    }
  }, [shop.id]);

  useEffect(() => {
    setActors(buildInitialActors(shop));
    setActiveAction('work');
    setSceneFocus('hall');
    setSelectedActorId('owner-0');
    // 切换商铺时从 sessionStorage 恢复该商铺的对话历史
    try {
      const raw = sessionStorage.getItem(`world:chat:${shop.id}`);
      setChatMessagesByActor(raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {});
    } catch {
      setChatMessagesByActor({});
    }
    setChatInput('');
  }, [shop]);

  useEffect(() => {
    const kitchenAudio = kitchenAudioRef.current;
    if (kitchenAudio) kitchenAudio.volume = 0.34;
  }, []);

  useEffect(() => {
    const storedState = window.sessionStorage.getItem('xuhui-ambient-enabled');
    if (!storedState) window.sessionStorage.setItem('xuhui-ambient-enabled', '1');
    const shouldEnable = storedState !== '0';
    setSoundEnabled(shouldEnable);

    const playAmbient = async () => {
      try {
        kitchenAudioRef.current!.currentTime = 0;
        await kitchenAudioRef.current?.play();
      } catch (error) {
        console.error('Shop ambient resume failed:', error);
      }
    };

    if (shouldEnable) void playAmbient();
  }, []);

  const chatActors = useMemo(() => actors.map((actor) => ({ ...actor })), [actors]);
  const selectedActor = useMemo(
    () => chatActors.find((actor) => actor.id === selectedActorId) ?? chatActors[0],
    [chatActors, selectedActorId]
  );

  useEffect(() => {
    if (!selectedActor) return;
    // 仅在该角色尚未初始化时才添加开场白
    setChatMessagesByActor((current) => {
      if ((current[selectedActor.id]?.length ?? 0) > 0) return current;
      return {
        ...current,
        [selectedActor.id]: [
          {
            role: 'assistant',
            content: getDefaultChatOpening(shop, selectedActor, opsSnapshot),
          },
        ],
      };
    });
  }, [selectedActor.id, opsSnapshot.completedOrders, shop.id]);

  useEffect(() => {
    // 延迟 800ms 再启动动画定时器，让 GIF 和场景图先加载完，避免进入时画面卡顿
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startDelay: any = window.setTimeout(() => {
      timer = window.setInterval(() => {
        setActors((current) => {
          // 收集已被占用的座位索引
          const occupiedSeats = new Set(
            current.filter((a) => a.anchorType === 'seat' && a.seatIndex >= 0).map((a) => a.seatIndex)
          );

          return current.map((actor) => {
            // 已入座的客人：小幅动态，但不换座位
            if (actor.anchorType === 'seat' && actor.seatIndex >= 0) {
              const seat = shop.scene.seats[actor.seatIndex];
              return {
                ...actor,
                x: seat.x + (Math.random() * 2 - 1),
                y: seat.y + (Math.random() * 1.5 - 0.75),
                bubble: GUEST_BUBBLES[Math.floor(Math.random() * GUEST_BUBBLES.length)],
                bubbleVisible: Math.random() < 0.1,
              };
            }

            // 排队中的客人：尝试找空位入座
            if (actor.anchorType === 'queue' && actor.role === 'guest') {
              // 找未被占用的座位
              const freeSeat = shop.scene.seats.findIndex((_, si) => !occupiedSeats.has(si));
              if (freeSeat >= 0) {
                // 有空位！入座
                occupiedSeats.add(freeSeat);
                const seat = shop.scene.seats[freeSeat];
                return {
                  ...actor,
                  x: seat.x + (Math.random() * 2 - 1),
                  y: seat.y + (Math.random() * 1.5 - 0.75),
                  anchorType: 'seat' as const,
                  seatIndex: freeSeat,
                  bubble: '座位有了！',
                  bubbleVisible: true,
                };
              }
              // 没空位，继续在门口小幅摇摇
              const qSlot = actor.seatIndex === -1
                ? Number.parseInt(actor.id.split('-')[1] ?? '0', 10) - shop.scene.seats.length
                : 0;
              const qSpot = QUEUE_SPOTS[Math.max(0, qSlot) % QUEUE_SPOTS.length];
              return {
                ...actor,
                x: qSpot.x + (Math.random() * 2 - 1),
                y: qSpot.y + (Math.random() * 1 - 0.5),
                bubble: ['等一下就好', '快了吧', '排队也值'][Math.floor(Math.random() * 3)],
                bubbleVisible: Math.random() < 0.2,
              };
            }

            // 厨师（staff）：在厨房各岗位之间大幅走动，模拟忙碌
            if (actor.role === 'staff' && actor.kitchenSlot !== undefined) {
              const randomStation = KITCHEN_STATION_ANCHORS[Math.floor(Math.random() * KITCHEN_STATION_ANCHORS.length)];
              const nextX = randomStation.x + (Math.random() * 8 - 4);
              const nextY = randomStation.y + (Math.random() * 8 - 4);
              return {
                ...actor,
                x: clamp(nextX, 18, 92),
                y: clamp(nextY, 44, 86),
                flipped: nextX < actor.x,
                bubble: KITCHEN_STAFF_BUBBLES[Math.floor(Math.random() * KITCHEN_STAFF_BUBBLES.length)],
                bubbleVisible: Math.random() < 0.28,
              };
            }

            // 服务员（大堂）：使用和老板不同的走动区域（靠近桌子侧），避免路径重合
            if (actor.role === 'staff') {
              const staffIdx = Number.parseInt(actor.id.split('-')[1] ?? '0', 10);
              const pathPool = shop.scene.walkPath.filter((_, i) =>
                staffIdx % 2 === 0 ? i % 2 === 0 : i % 2 === 1
              );
              const path = (pathPool.length > 0 ? pathPool : shop.scene.walkPath)[
                Math.floor(Math.random() * (pathPool.length > 0 ? pathPool : shop.scene.walkPath).length)
              ];
              const nextX = path.x + (Math.random() * 6 - 3);
              return {
                ...actor,
                x: clamp(nextX, 8, 70),
                y: path.y + (Math.random() * 4 - 2),
                flipped: nextX < actor.x,
                bubble: STAFF_BUBBLES[Math.floor(Math.random() * STAFF_BUBBLES.length)],
                bubbleVisible: Math.random() < 0.22,
              };
            }

            // 老板：在大堂右侧区域走动
            const ownerPath = shop.scene.walkPath[Math.floor(Math.random() * shop.scene.walkPath.length)];
            const ownerNextX = clamp(ownerPath.x + (Math.random() * 3 - 1.5), 55, 92);
            return {
              ...actor,
              x: ownerNextX,
              y: ownerPath.y + (Math.random() * 2 - 1),
              flipped: ownerNextX < actor.x,
              bubble: OWNER_BUBBLES[Math.floor(Math.random() * OWNER_BUBBLES.length)],
              bubbleVisible: Math.random() < 0.25,
            };
          });
        });
      }, 4400);
    }, 800);

    return () => {
      window.clearTimeout(startDelay);
      window.clearInterval(timer);
    };
  }, [shop]);

  const crowdCopy = useMemo(() => {
    if (shop.crowdLevel === 'packed') return '店里已经爆满，适合做高峰期玩法。';
    if (shop.crowdLevel === 'busy') return '店里很热闹，能感受到真实门店节奏。';
    return '店里比较舒服，适合慢慢逛和深聊。';
  }, [shop]);

  const sceneStages = useMemo(
    () => [
      {
        id: 'kitchen' as const,
        title: '后厨',
        imageUrl: getSceneImageUrl(shop.id, 'kitchen'),
        description: `这里是${shop.scene.counterLabel}与后场动线，厨师们各司其职。`,
        // 厨房只显示 staff（厨师），老板在大堂迎客
        actors: actors.filter((actor) => actor.role === 'staff'),
      },
      {
        id: 'hall' as const,
        title: '大堂',
        imageUrl: getSceneImageUrl(shop.id, 'hall'),
        description: crowdCopy,
        // 大堂显示客人 + 老板（以及部分在外场跑堂的 staff）
        actors,
      },
    ],
    [actors, crowdCopy, shop]
  );

  const appendChatMessage = (actor: SceneActor, nextMessage: ChatMessage) => {
    setChatMessagesByActor((current) => {
      const next = {
        ...current,
        [actor.id]: [...(current[actor.id] ?? []), nextMessage],
      };
      try {
        sessionStorage.setItem(`world:chat:${shop.id}`, JSON.stringify(next));
      } catch { /* ignore quota errors */ }
      return next;
    });
  };

  const callActorAI = async (actor: SceneActor, userMessage: string) => {
    const history = chatMessagesByActor[actor.id] ?? [];
    // 把完整历史（含开场白）都传给 AI，保持上下文一致，不自己编数字
    const messages = [
      ...history.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: 'user' as const, content: userMessage },
    ];
    const systemPrompt = buildActorSystemPrompt(shop, actor, opsSnapshot)
      + '\n\n重要：保持数字和事实与之前对话完全一致，不要修改已提到过的任何数字（单数、人数等）。';

    setChatLoading(true);
    setStreamingActorId(actor.id);

    // 先占位一条空的 assistant 消息用于流式填充
    setChatMessagesByActor((current) => {
      const next = {
        ...current,
        [actor.id]: [...(current[actor.id] ?? []), { role: 'assistant' as const, content: '' }],
      };
      try {
        sessionStorage.setItem(`world:chat:${shop.id}`, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, systemPrompt }),
      });

      if (!res.ok || !res.body) {
        setChatMessagesByActor((current) => {
          const msgs = current[actor.id] ?? [];
          const next = {
            ...current,
            [actor.id]: [
              ...msgs.slice(0, -1),
              { role: 'assistant' as const, content: '（网络异常，请稍后重试）' },
            ],
          };
          try { sessionStorage.setItem(`world:chat:${shop.id}`, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // 状态机：跨 chunk 过滤 <think>...</think> 思考内容
      let inThink = false;    // 是否正在 <think> 块内

      /**
       * 过滤掉思考内容：用状态机处理跨 chunk 的 <think>…</think>
       * 返回过滤后应该显示的文字
       */
      const filterThink = (raw: string): string => {
        let out = '';
        let i = 0;
        while (i < raw.length) {
          if (inThink) {
            // 在思考块内，找 </think>
            const end = raw.indexOf('</think>', i);
            if (end === -1) {
              // 本 chunk 没有结束标签，全部丢弃
              i = raw.length;
            } else {
              // 找到结束标签，跳过到标签之后
              inThink = false;
              i = end + '</think>'.length;
            }
          } else {
            // 不在思考块内，找 <think>
            const start = raw.indexOf('<think>', i);
            if (start === -1) {
              out += raw.slice(i);
              i = raw.length;
            } else {
              out += raw.slice(i, start);
              inThink = true;
              i = start + '<think>'.length;
            }
          }
        }
        // 额外处理：过滤掉残留的完整 <think>...</think>（防御性）
        out = out.replace(/<think>[\s\S]*?<\/think>/g, '');
        return out;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            let chunk = json.choices?.[0]?.delta?.content ?? '';
            if (!chunk) continue;

            // 用状态机过滤思考内容（支持跨 chunk 的 <think>…</think>）
            chunk = filterThink(chunk).trim();
            if (!chunk) continue;

            setChatMessagesByActor((current) => {
              const msgs = current[actor.id] ?? [];
              const last = msgs[msgs.length - 1];
              if (!last || last.role !== 'assistant') return current;
              const updatedLast: ChatMessage = { role: 'assistant', content: last.content + chunk };
              const next = { ...current, [actor.id]: [...msgs.slice(0, -1), updatedLast] };
              try { sessionStorage.setItem(`world:chat:${shop.id}`, JSON.stringify(next)); } catch { /* ignore */ }
              return next;
            });
          } catch { /* skip malformed JSON */ }
        }
      }
    } catch (error) {
      console.error('Chat streaming error:', error);
      setChatMessagesByActor((current) => {
        const msgs = current[actor.id] ?? [];
        const next = {
          ...current,
          [actor.id]: [
            ...msgs.slice(0, -1),
            { role: 'assistant' as const, content: '（连接失败，请稍后重试）' },
          ],
        };
        try { sessionStorage.setItem(`world:chat:${shop.id}`, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    } finally {
      setChatLoading(false);
      setStreamingActorId(null);
    }
  };

  const handleQuickReply = async (actor: SceneActor, topic: string) => {
    appendChatMessage(actor, { role: 'user', content: topic });
    await callActorAI(actor, topic);
  };

  // 场景内点击角色 → 打开场景对话浮层
  const handleSceneActorClick = (actor: SceneActor, stageId: SceneView) => {
    // 初始化开场白
    setChatMessagesByActor((current) => {
      if ((current[actor.id]?.length ?? 0) > 0) return current;
      return {
        ...current,
        [actor.id]: [{ role: 'assistant', content: getDefaultChatOpening(shop, actor, opsSnapshot) }],
      };
    });
    setSelectedActorId(actor.id);
    setSceneDialogState({ actorId: actor.id, stageId });
    setSceneDialogInput('');
    // 下一帧滚到底部
    requestAnimationFrame(() => {
      if (sceneDialogScrollRef.current) {
        sceneDialogScrollRef.current.scrollTop = sceneDialogScrollRef.current.scrollHeight;
      }
    });
  };

  // 场景内对话框发送
  const handleSceneDialogSend = async () => {
    if (!sceneDialogState || !sceneDialogInput.trim() || chatLoading) return;
    const actor = actors.find((a) => a.id === sceneDialogState.actorId);
    if (!actor) return;
    const msg = sceneDialogInput.trim();
    setSceneDialogInput('');
    appendChatMessage(actor, { role: 'user', content: msg });
    await callActorAI(actor, msg);
    // 回复完成后滚底
    requestAnimationFrame(() => {
      if (sceneDialogScrollRef.current) {
        sceneDialogScrollRef.current.scrollTop = sceneDialogScrollRef.current.scrollHeight;
      }
    });
  };

  // 关闭场景对话
  const closeSceneDialog = () => {
    setSceneDialogState(null);
    setHoveredActorKey(null);
  };

  const toggleAmbientSound = async () => {
    const kitchenAudio = kitchenAudioRef.current;
    if (!kitchenAudio) return;

    if (soundEnabled) {
      kitchenAudio.pause();
      kitchenAudio.currentTime = 0;
      window.sessionStorage.setItem('xuhui-ambient-enabled', '0');
      setSoundEnabled(false);
      return;
    }

    try {
      kitchenAudio.currentTime = 0;
      await kitchenAudio.play();
      window.sessionStorage.setItem('xuhui-ambient-enabled', '1');
      setSoundEnabled(true);
    } catch (error) {
      console.error('Shop audio play failed:', error);
    }
  };

  const handleSendChat = async () => {
    if (!selectedActor || !chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    appendChatMessage(selectedActor, { role: 'user', content: userMessage });
    await callActorAI(selectedActor, userMessage);
  };

  const actionPanel = () => {
    if (activeAction === 'work') {
      return (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {shop.workTasks.map((task, index) => (
              <div
                key={task}
                style={{
                  padding: '14px 16px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,200,100,0.12)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#ffeaaa' }}>{task}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,200,130,0.55)' }}>
                      完成后可提升积分，靠近优惠券与免单机会。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPoints((value) => {
                      const next = Math.min(999, value + 20 + index * 8);
                      localStorage.setItem('world:points', String(next));
                      return next;
                    })}
                    style={{
                      ...darkChipStyle,
                      alignSelf: 'center',
                      cursor: 'pointer',
                      border: 0,
                    }}
                  >
                    去打工
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 14,
              padding: '14px 16px',
              borderRadius: 20,
              background: 'linear-gradient(90deg, rgba(255,175,96,0.12), rgba(255,120,72,0.08))',
              border: '1px solid rgba(255,175,96,0.15)',
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(255,220,150,0.8)',
            }}
          >
            当前积分 {points}。满 300 可以兑券，满 500 开启免单抽奖。
          </div>
        </>
      );
    }

    if (activeAction === 'menu') {
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          {shop.menu.map((item) => (
            <div
              key={item.name}
              style={{
                padding: '16px 18px',
                borderRadius: 22,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,200,100,0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 18, color: '#ffeaaa' }}>{item.name}</strong>
                    <span style={{ ...darkChipStyle, background: 'rgba(215,108,44,0.82)' }}>{item.tag}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,200,130,0.6)', lineHeight: 1.7 }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, whiteSpace: 'nowrap', color: '#ffd060' }}>¥{item.price}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeAction === 'guest-chat') {
      const currentActor =
        selectedActor && selectedActor.role === 'owner'
          ? chatActors.find((actor) => actor.role !== 'owner') ?? selectedActor
          : selectedActor;

      return (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {chatActors.map((actor) => (
              <button
                key={actor.id}
                type="button"
                onClick={() => setSelectedActorId(actor.id)}
                style={{
                  ...(selectedActorId === actor.id ? darkChipStyle : secondaryChipStyle),
                  cursor: 'pointer',
                  border: 0,
                }}
              >
                {getActorDisplayName(actor)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {shop.guestTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => currentActor && handleQuickReply(currentActor, topic)}
                style={{
                  ...darkChipStyle,
                  cursor: 'pointer',
                  border: 0,
                }}
              >
                {topic}
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 14,
              minHeight: 220,
              padding: 16,
              borderRadius: 22,
              background: 'rgba(18,12,8,0.55)',
              border: '1px solid rgba(255,200,100,0.12)',
              display: 'grid',
              gap: 10,
            }}
          >
            {(
              currentActor && chatMessagesByActor[currentActor.id]?.length
                ? chatMessagesByActor[currentActor.id]
                : [{ role: 'assistant', content: '先选一个角色，再开始聊天。' }]
            ).map((line, index) => (
              <div
                key={`${line.content}-${index}`}
                style={{
                  alignSelf: 'start',
                  padding: '10px 12px',
                  borderRadius: 16,
                  background: line.role === 'user' ? 'rgba(215,108,44,0.22)' : 'rgba(255,255,255,0.06)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#ffeaaa',
                }}
              >
                {line.content}
              </div>
            ))}
            {chatLoading ? (
              <div style={{ fontSize: 13, color: 'rgba(255,200,120,0.6)' }}>
                {currentActor ? `${getActorDisplayName(currentActor)} 正在回复...` : '正在回复...'}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSendChat();
              }}
              placeholder={currentActor ? `和${getActorDisplayName(currentActor)}说点什么...` : '选择角色后开始聊天'}
              style={{
                flex: 1,
                borderRadius: 999,
                border: '1px solid rgba(255,200,100,0.18)',
                padding: '12px 16px',
                fontSize: 14,
                outline: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: '#ffeaaa',
              }}
            />
            <button
              type="button"
              onClick={() => void handleSendChat()}
              style={{ ...darkChipStyle, border: 0, cursor: 'pointer', padding: '0 16px' }}
            >
              发送
            </button>
          </div>
        </>
      );
    }

    const currentActor = selectedActor ?? chatActors.find((actor) => actor.role === 'owner');

    return (
      <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {chatActors.map((actor) => (
            <button
              key={actor.id}
              type="button"
              onClick={() => setSelectedActorId(actor.id)}
              style={{
                ...(selectedActorId === actor.id ? darkChipStyle : secondaryChipStyle),
                cursor: 'pointer',
                border: 0,
              }}
            >
              {getActorDisplayName(actor)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {shop.ownerTopics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => currentActor && handleQuickReply(currentActor, topic)}
              style={{
                ...darkChipStyle,
                cursor: 'pointer',
                border: 0,
              }}
            >
              {topic}
            </button>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            minHeight: 220,
            padding: 16,
            borderRadius: 22,
            background: 'rgba(18,12,8,0.55)',
            border: '1px solid rgba(255,200,100,0.12)',
            display: 'grid',
            gap: 10,
          }}
        >
          {(
            currentActor && chatMessagesByActor[currentActor.id]?.length
              ? chatMessagesByActor[currentActor.id]
              : [{ role: 'assistant', content: currentActor ? getDefaultChatOpening(shop, currentActor, opsSnapshot) : shop.ownerGreeting }]
          ).map((line, index) => (
            <div
              key={`${line.content}-${index}`}
              style={{
                alignSelf: 'start',
                padding: '10px 12px',
                borderRadius: 16,
                background: line.role === 'user' ? 'rgba(215,108,44,0.22)' : 'rgba(255,255,255,0.06)',
                fontSize: 14,
                lineHeight: 1.6,
                color: '#ffeaaa',
              }}
            >
              {line.content}
            </div>
          ))}
          {chatLoading ? (
            <div style={{ fontSize: 13, color: 'rgba(255,200,120,0.6)' }}>
              {currentActor ? `${getActorDisplayName(currentActor)} 正在回复...` : '正在回复...'}
            </div>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 18,
            background: 'linear-gradient(90deg, rgba(255,175,96,0.10), rgba(255,120,72,0.07))',
            border: '1px solid rgba(255,175,96,0.14)',
            fontSize: 13,
            lineHeight: 1.7,
            color: 'rgba(255,220,150,0.75)',
          }}
        >
          和老板聊天拿到免单福利的概率更高。当前老板福利池成功率约 {opsSnapshot.ownerFreeMealChance}%。
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSendChat();
            }}
            placeholder={currentActor ? `和${getActorDisplayName(currentActor)}说点什么...` : '选择角色后开始聊天'}
            style={{
              flex: 1,
              borderRadius: 999,
              border: '1px solid rgba(255,200,100,0.18)',
              padding: '12px 16px',
              fontSize: 14,
              outline: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: '#ffeaaa',
            }}
          />
          <button
            type="button"
            onClick={() => void handleSendChat()}
            style={{ ...darkChipStyle, border: 0, cursor: 'pointer', padding: '0 16px' }}
          >
            发送
          </button>
        </div>
      </>
    );
  };

  return (
    <main style={pageStyle}>
      <audio ref={kitchenAudioRef} loop preload="auto">
        <source src="/restaurant.mp3" type="audio/mp3" />
      </audio>

      <div style={shellStyle}>
        {/* ===== 店铺招牌 — 灯箱门头风格 ===== */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(160deg, #1a0c04 0%, #2d1506 40%, #1a0c04 100%)',
          borderRadius: 24,
          border: '2px solid rgba(255,160,60,0.25)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,200,100,0.1), 0 0 60px rgba(255,120,40,0.08)',
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {/* 木纹底纹 */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            backgroundImage: 'repeating-linear-gradient(8deg, transparent, transparent 6px, rgba(255,200,100,0.8) 6px, rgba(255,200,100,0.8) 7px)',
            pointerEvents: 'none',
          }} />
          {/* 顶部霓虹灯条 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, transparent, #ff7a20, #ffcc44, #ff7a20, transparent)',
            opacity: 0.7,
            animation: 'sign-glow 2.5s ease-in-out infinite',
          }} />

          <div style={{ padding: '18px 24px 20px', position: 'relative', zIndex: 2 }}>
            {/* 顶栏：返回 + 音效 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/xuhui-island" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,200,100,0.2)',
                  borderRadius: 20, padding: '7px 14px', color: 'rgba(255,220,150,0.85)',
                  textDecoration: 'none', fontSize: 13, fontWeight: 700,
                }}>
                  ← 返回小岛
                </Link>
                <button type="button" onClick={toggleAmbientSound} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: soundEnabled ? 'rgba(255,120,40,0.18)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${soundEnabled ? 'rgba(255,120,40,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 20, padding: '7px 14px',
                  color: soundEnabled ? '#ffaa60' : 'rgba(255,200,150,0.5)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  {soundEnabled ? '🔊' : '🔇'} {soundEnabled ? '关闭白噪音' : '开启白噪音'}
                </button>
              </div>
              {/* 营业状态指示灯 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#4ade80',
                  boxShadow: '0 0 8px #4ade80, 0 0 16px rgba(74,222,128,0.4)',
                  animation: 'pulse 2s ease-in-out infinite',
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>正在营业</span>
              </div>
            </div>

            {/* 主招牌区域 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
              <div>
                {/* 店名灯箱 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h1 style={{
                    margin: 0,
                    fontSize: 'clamp(28px, 4vw, 44px)',
                    fontWeight: 900,
                    color: '#ffd270',
                    textShadow: '0 0 20px rgba(255,180,60,0.6), 0 2px 0 rgba(0,0,0,0.5)',
                    lineHeight: 1.1,
                    letterSpacing: 1,
                  }}>
                    {getShopIcon(shop.cuisine, shop.id)} {shop.name}
                  </h1>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  }}>
                    {/* 评分 */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255,180,30,0.25), rgba(255,140,20,0.15))',
                      border: '1px solid rgba(255,180,30,0.4)',
                      borderRadius: 12, padding: '4px 10px',
                      fontSize: 14, fontWeight: 900, color: '#ffd060',
                    }}>
                      ⭐ 4.8
                    </div>
                    {/* 客流标签 */}
                    <div style={{
                      background: shop.crowdLevel === 'packed'
                        ? 'rgba(255,80,60,0.2)' : shop.crowdLevel === 'busy'
                          ? 'rgba(255,140,30,0.2)' : 'rgba(74,222,128,0.15)',
                      border: `1px solid ${shop.crowdLevel === 'packed' ? 'rgba(255,80,60,0.5)' : shop.crowdLevel === 'busy' ? 'rgba(255,140,30,0.5)' : 'rgba(74,222,128,0.4)'}`,
                      borderRadius: 12, padding: '4px 10px',
                      fontSize: 12, fontWeight: 900,
                      color: shop.crowdLevel === 'packed' ? '#f87171' : shop.crowdLevel === 'busy' ? '#fb923c' : '#4ade80',
                      animation: shop.crowdLevel === 'packed' ? 'ops-flash 2s ease-in-out infinite' : 'none',
                    }}>
                      {shop.crowdLevel === 'packed' ? '🔥 爆满！' : shop.crowdLevel === 'busy' ? '🟠 较忙' : '✅ 顺畅'}
                    </div>
                  </div>
                </div>
                {/* 一句话简介 */}
                <p style={{
                  margin: '8px 0 0',
                  fontSize: 14, lineHeight: 1.7,
                  color: 'rgba(255,200,140,0.65)',
                  maxWidth: 520,
                }}>
                  {shop.intro}
                </p>

                {/* 实时客流数据条 */}
                <div style={{
                  display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap',
                }}>
                  {[
                    { icon: '🪑', label: '在场', value: `${actors.filter((a) => a.role === 'guest').length} 人` },
                    { icon: '📋', label: '今日单', value: `${opsSnapshot.completedOrders} 单` },
                    { icon: '⏱️', label: '等位', value: `${opsSnapshot.queueTime} 分钟` },
                    { icon: '💰', label: '免单池', value: `${opsSnapshot.ownerFreeMealChance}%` },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,200,130,0.5)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,220,160,0.9)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右侧操作按钮区 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                {/* 进店打工 — 待开启 */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button type="button" disabled style={{
                    border: '1px solid rgba(180,150,100,0.2)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(200,160,100,0.45)',
                    borderRadius: 16, padding: '12px 20px',
                    fontSize: 16, fontWeight: 900, lineHeight: 1,
                    cursor: 'not-allowed',
                  }}>
                    进店打工
                    <span style={{
                      position: 'absolute', top: -6, right: -4,
                      background: 'rgba(180,120,50,0.8)', color: '#fff',
                      fontSize: 9, fontWeight: 900, padding: '2px 5px',
                      borderRadius: 5, letterSpacing: 0.5,
                    }}>待开启</span>
                  </button>
                </div>
                {/* 看菜单 — 橘黄色 */}
                <button type="button" onClick={() => setMenuModalOpen(true)} style={{
                  border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff', borderRadius: 16, padding: '12px 20px',
                  fontSize: 16, fontWeight: 900, lineHeight: 1,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(234,88,12,0.45), 0 0 24px rgba(249,115,22,0.2)',
                }}>
                  🍽️ 看菜单
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="shop-detail-layout" style={{ display: 'grid', gap: 18 }}>
          <div style={{ background: 'transparent' }}>
            <div style={{ display: 'grid', gap: 14 }}>
              {sceneStages.map((stage) => (
                <section
                  key={stage.id}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 20,
                    border: stage.id === 'kitchen'
                      ? '2px solid rgba(255,100,30,0.5)'
                      : stage.id === sceneFocus
                        ? '2px solid rgba(215,108,44,0.82)'
                        : '1.5px solid rgba(255,200,120,0.2)',
                    boxShadow: stage.id === 'kitchen'
                      ? '0 16px 40px rgba(255,80,20,0.18), inset 0 0 60px rgba(255,100,30,0.06)'
                      : stage.id === sceneFocus
                        ? '0 22px 44px rgba(215,108,44,0.16)'
                        : '0 8px 24px rgba(0,0,0,0.25)',
                  }}
                >
                  <div className="scene-stage" style={{ position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={stage.imageUrl}
                      alt={`${shop.name}${stage.title}`}
                      draggable={false}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />

                    {stage.id === 'hall' ? (
                      <>
                        {/* 顶部弹幕跑马灯 */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 18,
                            right: 18,
                            top: 58,
                            height: 38,
                            overflow: 'hidden',
                            zIndex: 6,
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            className="hall-barrage-track"
                            style={{
                              display: 'inline-flex',
                              gap: 18,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {[...opsSnapshot.barrageComments, ...opsSnapshot.barrageComments].map((comment, index) => (
                              <span
                                key={`${stage.id}-barrage-${index}`}
                                style={{
                                  ...darkChipStyle,
                                  background: 'rgba(34, 24, 20, 0.72)',
                                  fontSize: 11,
                                  padding: '6px 12px',
                                }}
                              >
                                {comment}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* 大堂状态：顾客情绪面板（右上角） */}
                        <div style={{
                          position: 'absolute',
                          right: 18,
                          top: 58,
                          width: 180,
                          padding: '12px 14px',
                          borderRadius: 18,
                          background: 'rgba(18, 12, 8, 0.62)',
                          border: '1px solid rgba(255,200,120,0.18)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          zIndex: 6,
                          pointerEvents: 'none',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#ffaa60', marginBottom: 8, letterSpacing: 1 }}>
                            😊 客户情绪
                          </div>
                          {/* 情绪分布 */}
                          {[
                            { label: '😋 满意', ratio: shop.crowdLevel === 'packed' ? 0.58 : shop.crowdLevel === 'busy' ? 0.68 : 0.78, color: '#4ade80' },
                            { label: '😐 一般', ratio: shop.crowdLevel === 'packed' ? 0.28 : shop.crowdLevel === 'busy' ? 0.22 : 0.16, color: '#fbbf24' },
                            { label: '😤 不满', ratio: shop.crowdLevel === 'packed' ? 0.14 : shop.crowdLevel === 'busy' ? 0.10 : 0.06, color: '#f87171' },
                          ].map(({ label, ratio, color }) => (
                            <div key={label} style={{ marginBottom: 5 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 10, color: 'rgba(255,220,160,0.7)' }}>{label}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color }}>{Math.round(ratio * 100)}%</span>
                              </div>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${ratio * 100}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
                              </div>
                            </div>
                          ))}
                          {/* 排队状态 */}
                          <div style={{
                            marginTop: 8, paddingTop: 8,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,200,130,0.6)' }}>🚶 排队</span>
                            <span style={{
                              fontSize: 12, fontWeight: 900,
                              color: opsSnapshot.queueTime >= 20 ? '#f87171' : opsSnapshot.queueTime >= 10 ? '#fbbf24' : '#4ade80',
                              animation: opsSnapshot.queueTime >= 20 ? 'ops-flash 2s ease-in-out infinite' : 'none',
                            }}>
                              约 {opsSnapshot.queueTime} 分钟
                            </span>
                          </div>
                          {/* 座位占用率 */}
                          <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,200,130,0.6)' }}>🪑 上座率</span>
                            <span style={{
                              fontSize: 12, fontWeight: 900,
                              color: shop.crowdLevel === 'packed' ? '#f87171' : shop.crowdLevel === 'busy' ? '#fbbf24' : '#4ade80',
                            }}>
                              {shop.crowdLevel === 'packed' ? '100%' : shop.crowdLevel === 'busy' ? '85%' : '65%'}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {stage.id === 'kitchen' ? (
                      <>
                        {/* 厨房压力指示器（左上角） */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 18,
                            top: 58,
                            width: '28%',
                            minWidth: 200,
                            maxWidth: 260,
                            padding: '16px 16px 18px',
                            borderRadius: 22,
                            background: 'rgba(24, 18, 16, 0.65)',
                            border: `1px solid ${kitchenPressure >= 80 ? 'rgba(255,80,30,0.5)' : kitchenPressure >= 55 ? 'rgba(255,150,30,0.35)' : 'rgba(255,255,255,0.18)'}`,
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            color: '#fff7ea',
                            zIndex: 6,
                            boxShadow: kitchenPressure >= 80 ? '0 0 24px rgba(255,80,20,0.25)' : 'none',
                          }}
                        >
                          {/* 出单流水标题 + 实时单量 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 900 }}>
                              {kitchenPressure >= 80 ? '🔥' : kitchenPressure >= 55 ? '🟠' : '🍳'} 出单实况
                            </div>
                            <div style={{ fontSize: 11, color: '#ffcc88', fontWeight: 700 }}>
                              今日 {opsSnapshot.completedOrders} 单
                            </div>
                          </div>

                          {/* 厨房压力条 */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'rgba(255,200,120,0.6)' }}>厨房压力</span>
                              <span style={{
                                fontSize: 11, fontWeight: 900,
                                color: kitchenPressure >= 80 ? '#ff6040' : kitchenPressure >= 55 ? '#ffaa40' : '#7ecf7e',
                                animation: kitchenPressure >= 80 ? 'ops-flash 1.2s ease-in-out infinite' : 'none',
                              }}>
                                {kitchenPressure >= 80 ? '🔥 爆单！' : kitchenPressure >= 55 ? '⚡ 高压' : '✅ 平稳'} {kitchenPressure}%
                              </span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${kitchenPressure}%`,
                                background: kitchenPressure >= 80
                                  ? 'linear-gradient(90deg, #ff6000, #ff2000)'
                                  : kitchenPressure >= 55
                                    ? 'linear-gradient(90deg, #ff9c00, #ff6000)'
                                    : 'linear-gradient(90deg, #4ade80, #22d3ee)',
                                borderRadius: 4,
                                transition: 'width 0.8s ease, background 0.8s ease',
                                boxShadow: kitchenPressure >= 80 ? '0 0 8px rgba(255,80,20,0.8)' : 'none',
                              }} />
                            </div>
                          </div>

                          {/* 实时滚动出单列表 */}
                          <div
                            ref={orderScrollRef}
                            style={{
                              marginTop: 10,
                              maxHeight: 160,
                              overflowY: 'auto',
                              scrollBehavior: 'smooth',
                              display: 'grid',
                              gap: 6,
                              msOverflowStyle: 'none',
                              scrollbarWidth: 'none',
                            }}
                          >
                            {orderTickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                  padding: '4px 0',
                                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                                  opacity: ticket.done ? 0.85 : 1,
                                }}
                              >
                                <span style={{ color: '#ffe7bd', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {ticket.staffName}：{ticket.dishName}
                                </span>
                                <span style={{
                                  marginLeft: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: ticket.done ? '#8ff07f' : '#ffd166',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}>
                                  {ticket.done ? '✅ 出单' : '🟠 制作中'}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* 底部状态摘要：制作中 = 厨师数，待制作随时间递增 */}
                          {(() => {
                            const chefCount = shop.staffNames.length;
                            const pendingCount = chefCount + 2 + (orderIdRef.current % 6);
                            return (
                              <div style={{
                                marginTop: 10,
                                paddingTop: 8,
                                borderTop: '1px solid rgba(255,255,255,0.12)',
                                display: 'flex',
                                gap: 8,
                                fontSize: 11,
                                color: '#ffcc88',
                              }}>
                                <span>🟠 制作中 {chefCount} 个</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                                <span>⏳ 待制作 {pendingCount} 个</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 高压时的火焰粒子效果 */}
                        {kitchenPressure >= 70 && (
                          <div style={{
                            position: 'absolute',
                            right: 18,
                            bottom: 60,
                            pointerEvents: 'none',
                            zIndex: 5,
                          }}>
                            {[0, 1, 2].map((fi) => (
                              <span key={fi} style={{
                                position: 'absolute',
                                right: fi * 18,
                                bottom: 0,
                                fontSize: kitchenPressure >= 85 ? 22 : 16,
                                animation: `flame-flicker ${0.8 + fi * 0.25}s ease-in-out ${fi * 0.3}s infinite`,
                                opacity: kitchenPressure >= 85 ? 0.9 : 0.65,
                              }}>🔥</span>
                            ))}
                          </div>
                        )}

                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '28%',
                            width: 240,
                            height: 150,
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                            zIndex: 4,
                          }}
                        >
                          {[0, 1, 2, 3].map((steamIndex) => (
                            <span
                              key={`kitchen-steam-${steamIndex}`}
                              style={{
                                position: 'absolute',
                                left: `${18 + steamIndex * 18}%`,
                                bottom: 0,
                                width: 34 + steamIndex * 8,
                                height: 40 + steamIndex * 12,
                                borderRadius: '50%',
                                background:
                                  'radial-gradient(circle, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.24) 48%, rgba(255,255,255,0) 100%)',
                                filter: 'blur(10px)',
                                opacity: 0.72,
                                animation: `kitchen-steam 3.8s ease-out ${steamIndex * 0.45}s infinite`,
                              }}
                            />
                          ))}
                        </div>
                      </>
                    ) : null}

                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          stage.id === 'hall'
                            ? 'linear-gradient(180deg, rgba(255,248,240,0.04) 0%, rgba(23,12,8,0.14) 100%)'
                            : 'linear-gradient(180deg, rgba(255,248,240,0.03) 0%, rgba(23,12,8,0.22) 100%)',
                      }}
                    />

                    <div style={{ position: 'absolute', left: 16, top: 16, ...darkChipStyle, zIndex: 6 }}>
                      {shop.name} {stage.title}
                    </div>

                    {/* 点击空白区域关闭场景对话 */}
                    {sceneDialogState?.stageId === stage.id && (
                      <div
                        style={{ position: 'absolute', inset: 0, zIndex: 8, cursor: 'default' }}
                        onClick={(e) => {
                          // 只有点到背景（不是对话框自身）才关闭
                          if (e.target === e.currentTarget) closeSceneDialog();
                        }}
                      />
                    )}

                    {stage.actors.map((actor) => {
                      const inKitchen = stage.id === 'kitchen';
                      const placement = actorPlacement(actor, stage.id);
                      const shellSize = actorShellSize(actor.role);
                      const coreSize = actorCoreSize(actor.role);
                      const glow = actorGlow(actor.role);
                      const bubbleOnLeft = placement.x > 68;
                      const actorKey = `${stage.id}-${actor.id}`;
                      const isHovered = hoveredActorKey === actorKey;
                      const isDialogOpen = sceneDialogState?.actorId === actor.id && sceneDialogState?.stageId === stage.id;
                      // 所有角色都可对话（包括客人）
                      const isInteractable = true;

                      return (
                        <div
                          key={actorKey}
                          style={{
                            position: 'absolute',
                            left: `${placement.x}%`,
                            top: `${placement.y}%`,
                            width: shellSize,
                            height: shellSize,
                            transform: 'translate(-50%, -50%)',
                            transition: 'left 3.6s ease-in-out, top 3.6s ease-in-out',
                            zIndex: isDialogOpen ? 20 : actor.role === 'owner' ? 5 : actor.role === 'staff' ? 4 : 3,
                            pointerEvents: isInteractable ? 'auto' : 'none',
                            cursor: isInteractable ? (isHovered ? 'pointer' : 'default') : 'default',
                          }}
                          onMouseEnter={() => isInteractable && setHoveredActorKey(actorKey)}
                          onMouseLeave={() => setHoveredActorKey(null)}
                          onClick={() => isInteractable && handleSceneActorClick(actor, stage.id)}
                        >
                          {/* 圆形背景：默认隐藏，hover 或对话中显示 */}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: '50%',
                              background: isHovered || isDialogOpen
                                ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.88) 0%, ${glow.bubble} 56%, rgba(255,255,255,0.08) 100%)`
                                : 'transparent',
                              border: isHovered || isDialogOpen ? `2px solid ${glow.ring}` : 'none',
                              boxShadow: isHovered || isDialogOpen ? `0 14px 28px ${glow.shadow}` : 'none',
                              backdropFilter: isHovered || isDialogOpen ? 'blur(8px)' : 'none',
                              transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                            }}
                          />

                          {/* hover 时显示"点击对话"提示光圈 */}
                          {isHovered && !isDialogOpen && (
                            <div style={{
                              position: 'absolute',
                              inset: -4,
                              borderRadius: '50%',
                              border: '2.5px dashed rgba(255,220,140,0.85)',
                              animation: 'spin 4s linear infinite',
                              pointerEvents: 'none',
                            }} />
                          )}

                          {/* 名字标签 */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: inKitchen && actor.kitchenTitle ? -28 : -18,
                              transform: 'translateX(-50%)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                              pointerEvents: 'none',
                            }}
                          >
                            {/* 大堂服务员角标 / 厨房厨师角标 */}
                            {actor.role === 'staff' && (
                              <span style={{
                                background: inKitchen
                                  ? 'rgba(220, 80, 40, 0.9)'
                                  : 'rgba(255, 140, 60, 0.88)',
                                color: '#fff',
                                fontSize: 9,
                                fontWeight: 900,
                                padding: '1px 5px',
                                borderRadius: 4,
                                letterSpacing: '0.5px',
                                whiteSpace: 'nowrap',
                              }}>
                                {inKitchen ? '厨师' : '服务员'}
                              </span>
                            )}
                            {/* 老板角标 */}
                            {actor.role === 'owner' && (
                              <span style={{
                                background: 'rgba(190, 100, 30, 0.92)',
                                color: '#fff9e0',
                                fontSize: 9,
                                fontWeight: 900,
                                padding: '1px 6px',
                                borderRadius: 4,
                                letterSpacing: '0.5px',
                                whiteSpace: 'nowrap',
                              }}>
                                老板
                              </span>
                            )}
                            <span style={{
                              color: actor.role === 'guest' ? '#ffe56e' : inKitchen ? '#ffcc88' : actor.role === 'owner' ? '#ffd580' : '#fff6cd',
                              fontSize: actor.role === 'owner' ? 15 : inKitchen && actor.kitchenTitle ? 11 : 13,
                              fontWeight: 900,
                              textShadow: '0 1px 0 rgba(78,43,21,1), 0 0 10px rgba(0,0,0,0.18)',
                              whiteSpace: 'nowrap',
                              background: actor.role === 'owner' ? 'rgba(190,90,20,0.22)' : 'none',
                              padding: actor.role === 'owner' ? '1px 6px' : '0',
                              borderRadius: actor.role === 'owner' ? 6 : 0,
                            }}>
                              {getActorDisplayName(actor, inKitchen)}
                            </span>
                          </div>

                          {/* 角色图片 */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              width: coreSize,
                              height: coreSize,
                              transform: `translate(-50%, -50%) scaleX(${actor.flipped ? -1 : 1})`,
                            }}
                          >
                            <img
                              src={actor.variant}
                              alt={actor.name}
                              draggable={false}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                filter: isHovered
                                  ? 'drop-shadow(0 12px 20px rgba(0,0,0,0.28)) brightness(1.08)'
                                  : 'drop-shadow(0 10px 16px rgba(0,0,0,0.16))',
                                transition: 'filter 0.2s',
                              }}
                            />
                          </div>

                          {/* 气泡 */}
                          {actor.bubble && actor.bubbleVisible && !isDialogOpen ? (
                            <div
                              style={{
                                position: 'absolute',
                                [bubbleOnLeft ? 'right' : 'left']: '100%',
                                top: '12%',
                                transform: bubbleOnLeft ? 'translateX(-8px)' : 'translateX(8px)',
                                ...darkChipStyle,
                                background:
                                  actor.role === 'owner'
                                    ? 'rgba(215,108,44,0.88)'
                                    : 'rgba(24,18,16,0.72)',
                                fontSize: 10,
                                padding: '5px 9px',
                                maxWidth: 92,
                                whiteSpace: 'normal',
                                lineHeight: 1.4,
                                pointerEvents: 'none',
                              }}
                            >
                              {actor.bubble}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {/* 场景内嵌对话浮层 */}
                    {(() => {
                      if (!sceneDialogState || sceneDialogState.stageId !== stage.id) return null;
                      const dialogActor = actors.find((a) => a.id === sceneDialogState.actorId);
                      if (!dialogActor) return null;
                      const inKitchen = stage.id === 'kitchen';
                      const msgs = chatMessagesByActor[dialogActor.id] ?? [];
                      const isStreaming = streamingActorId === dialogActor.id;
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 30,
                            pointerEvents: 'none',
                          }}
                          onClick={closeSceneDialog}
                        >
                          {/* 放大的角色头像：固定在对话框左下角外侧，不遮住对话框 */}
                          {/* 对话框 right:12 width:260 → 左边缘在 right:272；头像宽110，center在right:272+20=292，即头像完全在对话框左侧 */}
                          <div
                            style={{
                              position: 'absolute',
                              right: 284,
                              bottom: 28,
                              width: 110,
                              height: 110,
                              zIndex: 31,
                              pointerEvents: 'none',
                              filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.35))',
                            }}
                          >
                            {/* 发光圆圈 */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: '50%',
                              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.92) 0%, ${actorGlow(dialogActor.role).bubble} 56%, rgba(255,255,255,0.06) 100%)`,
                              border: `2px solid ${actorGlow(dialogActor.role).ring}`,
                              boxShadow: `0 0 40px ${actorGlow(dialogActor.role).shadow}, 0 0 80px rgba(255,200,100,0.18)`,
                              backdropFilter: 'blur(12px)',
                            }} />
                            <img
                              src={dialogActor.variant}
                              alt={dialogActor.name}
                              draggable={false}
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: '80%',
                                height: '80%',
                                transform: 'translate(-50%, -50%)',
                                objectFit: 'contain',
                              }}
                            />
                            {/* 名字浮标 */}
                            <div style={{
                              position: 'absolute',
                              bottom: -22,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              whiteSpace: 'nowrap',
                              fontSize: 12,
                              fontWeight: 900,
                              color: '#ffd580',
                              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                            }}>
                              {getActorDisplayName(dialogActor, inKitchen)}
                            </div>
                          </div>

                          {/* 对话框面板：右侧固定，50% 透明度 */}
                          <div
                            style={{
                              position: 'absolute',
                              right: 12,
                              top: 12,
                              bottom: 12,
                              width: 260,
                              background: 'rgba(18, 10, 6, 0.50)',
                              borderRadius: 18,
                              border: '1px solid rgba(255,200,120,0.22)',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
                              backdropFilter: 'blur(14px)',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                              zIndex: 32,
                              pointerEvents: 'auto',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* 对话框顶栏 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px 8px',
                              borderBottom: '1px solid rgba(255,200,120,0.12)',
                              flexShrink: 0,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                {dialogActor.role === 'staff' && (
                                  <span style={{
                                    background: inKitchen ? 'rgba(220,80,40,0.9)' : 'rgba(255,140,60,0.88)',
                                    color: '#fff',
                                    fontSize: 9,
                                    fontWeight: 900,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                  }}>
                                    {inKitchen ? '厨师' : '服务员'}
                                  </span>
                                )}
                                {dialogActor.role === 'owner' && (
                                  <span style={{
                                    background: 'rgba(190,100,30,0.92)',
                                    color: '#fff9e0',
                                    fontSize: 9,
                                    fontWeight: 900,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                  }}>老板</span>
                                )}
                                {dialogActor.role === 'guest' && (
                                  <span style={{
                                    background: 'rgba(60,140,220,0.88)',
                                    color: '#fff',
                                    fontSize: 9,
                                    fontWeight: 900,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                  }}>客人</span>
                                )}
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#ffd580' }}>
                                  {getActorDisplayName(dialogActor, inKitchen)}
                                </span>
                              </div>
                              {/* 关闭按钮 */}
                              <button
                                type="button"
                                style={{
                                  background: 'rgba(255,255,255,0.1)',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: 24,
                                  height: 24,
                                  cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.6)',
                                  fontSize: 14,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                                onClick={closeSceneDialog}
                              >
                                ×
                              </button>
                            </div>

                            {/* 消息列表（可滚动，用户可以用滚轮控制） */}
                            <div
                              ref={sceneDialogScrollRef}
                              style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '10px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                scrollBehavior: 'smooth',
                              }}
                            >
                              {msgs.map((msg, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                  }}
                                >
                                  <div style={{
                                    maxWidth: '85%',
                                    padding: '7px 11px',
                                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                    background: msg.role === 'user'
                                      ? 'rgba(215,108,44,0.82)'
                                      : 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    fontSize: 12,
                                    lineHeight: 1.55,
                                    wordBreak: 'break-word',
                                  }}>
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                              {/* 正在回复中... 气泡 - 等待首个 chunk 或 content 为空时显示 */}
                              {isStreaming && (msgs[msgs.length - 1]?.content === '' || msgs[msgs.length - 1]?.role !== 'assistant') && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                  <div style={{
                                    padding: '7px 14px',
                                    borderRadius: '14px 14px 14px 4px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.65)',
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}>
                                    <span style={{
                                      display: 'inline-block',
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: 'rgba(255,200,120,0.8)',
                                      animation: 'pulse 1s ease-in-out infinite',
                                    }} />
                                    正在回复中...
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 输入框 */}
                            <div style={{
                              display: 'flex',
                              gap: 6,
                              padding: '8px 10px',
                              borderTop: '1px solid rgba(255,200,120,0.12)',
                              flexShrink: 0,
                            }}>
                              <input
                                type="text"
                                value={sceneDialogInput}
                                onChange={(e) => setSceneDialogInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSceneDialogSend();
                                  }
                                }}
                                placeholder={`和${dialogActor.name}说…`}
                                disabled={chatLoading}
                                style={{
                                  flex: 1,
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,200,120,0.2)',
                                  borderRadius: 10,
                                  padding: '6px 10px',
                                  color: '#fff',
                                  fontSize: 12,
                                  outline: 'none',
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                disabled={chatLoading || !sceneDialogInput.trim()}
                                onClick={() => void handleSceneDialogSend()}
                                style={{
                                  background: chatLoading || !sceneDialogInput.trim()
                                    ? 'rgba(255,255,255,0.12)'
                                    : 'rgba(215,108,44,0.88)',
                                  border: 'none',
                                  borderRadius: 10,
                                  padding: '6px 12px',
                                  color: '#fff',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: chatLoading || !sceneDialogInput.trim() ? 'not-allowed' : 'pointer',
                                  flexShrink: 0,
                                  transition: 'background 0.15s',
                                }}
                              >
                                发送
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div
                      style={{
                        position: 'absolute',
                        left: 18,
                        right: 18,
                        bottom: 18,
                        ...darkChipStyle,
                        textAlign: 'center',
                        zIndex: 6,
                        background:
                          stage.id === sceneFocus
                            ? 'rgba(33,24,20,0.8)'
                            : 'rgba(33,24,20,0.68)',
                      }}
                    >
                      {stage.description}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside style={{ display: 'grid', gap: 12, alignSelf: 'start' }}>

              {/* 今日战绩 — 木质招牌底 */}
              <div style={{
                background: 'linear-gradient(145deg, #3b1f0a 0%, #2a1506 50%, #1e0f04 100%)',
                borderRadius: 18,
                border: '2px solid #6b3a1a',
                boxShadow: '0 6px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,200,100,0.08)',
                padding: '16px 18px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* 木纹纹理叠层 */}
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.06,
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,200,100,0.5) 3px, rgba(255,200,100,0.5) 4px)',
                  pointerEvents: 'none',
                }} />
                {/* 钉子装饰 */}
                {[{top:8,left:10},{top:8,right:10},{bottom:8,left:10},{bottom:8,right:10}].map((pos, i) => (
                  <div key={i} style={{
                    position: 'absolute', ...pos,
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, #c8a060, #6b4010)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                  }} />
                ))}
                {/* 标题 */}
                <div style={{
                  fontSize: 11, fontWeight: 900, color: '#ffa040', letterSpacing: 2,
                  textTransform: 'uppercase', marginBottom: 12, textAlign: 'center',
                  textShadow: '0 0 12px rgba(255,160,60,0.4)',
                }}>
                  🔥 今日战绩
                </div>
                {/* 大数字展示 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: '完成单量', value: opsSnapshot.completedOrders.toString(), unit: '单', hot: true },
                    { label: '今日收入', value: `${Math.round(opsSnapshot.completedOrders * 68.9 / 100) * 100}`, unit: '元', hot: false },
                    { label: '口碑评分', value: '4.2', unit: '分', hot: false },
                    { label: '较昨日', value: '+12%', unit: '', hot: true },
                  ].map(({ label, value, unit, hot }) => (
                    <div key={label} style={{
                      background: hot ? 'rgba(255,120,30,0.14)' : 'rgba(255,255,255,0.04)',
                      border: hot ? '1px solid rgba(255,120,30,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10, padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,200,120,0.6)', marginBottom: 4 }}>{label}</div>
                      <div style={{
                        fontSize: hot ? 22 : 18, fontWeight: 900,
                        color: hot ? '#ff9030' : '#ffeaaa',
                        animation: hot ? 'ops-bounce 2.4s ease-in-out infinite' : 'none',
                        display: 'inline-block',
                      }}>
                        {value}
                        {unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2, color: 'rgba(255,200,100,0.55)' }}>{unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 出单结构 — 小黑板 */}
              <div style={{
                background: 'linear-gradient(160deg, #1a2a1a 0%, #0f1e0f 100%)',
                borderRadius: 16,
                border: '2px solid #2d4a2d',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                padding: '14px 16px',
                position: 'relative',
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#7ecf7e', letterSpacing: 1.5, marginBottom: 10 }}>
                  📋 出单结构
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {[
                    { label: '堂食', value: `${opsSnapshot.dineInOrders} 单`, tag: '稳定', tagColor: '#4ade80' },
                    { label: '外卖', value: `${opsSnapshot.deliveryOrders} 单`, tag: shop.crowdLevel === 'packed' ? '忙不过来' : '火爆', tagColor: '#fb923c' },
                    { label: '高峰等位', value: `约 ${opsSnapshot.queueTime} 分钟`, tag: opsSnapshot.queueTime >= 20 ? '爆满' : opsSnapshot.queueTime >= 10 ? '较忙' : '顺畅', tagColor: opsSnapshot.queueTime >= 20 ? '#f87171' : opsSnapshot.queueTime >= 10 ? '#fbbf24' : '#4ade80' },
                    { label: '大堂承载', value: `${opsSnapshot.hallSeats} 位`, tag: shop.crowdLevel === 'packed' ? '爆满' : '正常', tagColor: shop.crowdLevel === 'packed' ? '#f87171' : '#4ade80' },
                  ].map(({ label, value, tag, tagColor }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(200,230,200,0.7)' }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#d4f0d4' }}>{value}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 900, padding: '1px 6px',
                          borderRadius: 4, color: '#fff',
                          background: tagColor + '55', border: `1px solid ${tagColor}88`,
                          color: tagColor,
                        }}>{tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 热销菜品 Top 10 — 手写贴榜风格 */}
              <div style={{
                background: 'linear-gradient(150deg, #2c1a08 0%, #1e1005 100%)',
                borderRadius: 16,
                border: '2px solid #5a320e',
                boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
                padding: '14px 16px 16px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* 粉笔字标题 */}
                <div style={{
                  fontSize: 11, fontWeight: 900, color: '#ffe082', letterSpacing: 1.5,
                  marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>🏆 今日热卖榜</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,220,100,0.45)', fontWeight: 400 }}>老板亲推</span>
                </div>

                <div style={{ display: 'grid', gap: 5 }}>
                  {opsSnapshot.topDishes.map((dish, i) => {
                    const isTop3 = i < 3;
                    const medal = ['🥇','🥈','🥉'][i] ?? `${i+1}.`;
                    const tags = [
                      '今日爆款', '回头客最爱', '老板推荐',
                      '人气上升', '必点单品', '夜宵神器',
                      '新客首选', '团购热门', '性价比王', '福利精选',
                    ][i];
                    return (
                      <div key={dish.name} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: isTop3 ? '7px 10px' : '5px 8px',
                        borderRadius: 8,
                        background: isTop3
                          ? i === 0 ? 'rgba(255,180,30,0.15)' : i === 1 ? 'rgba(200,200,200,0.08)' : 'rgba(200,120,50,0.1)'
                          : 'transparent',
                        border: isTop3 ? `1px solid rgba(${i === 0 ? '255,180,30' : i === 1 ? '180,180,180' : '200,120,50'},0.2)` : 'none',
                        animation: isTop3 ? 'ops-breathe 3s ease-in-out infinite' : 'none',
                        animationDelay: `${i * 0.4}s`,
                      }}>
                        <span style={{
                          fontSize: isTop3 ? 15 : 11, minWidth: isTop3 ? 20 : 16,
                          textAlign: 'center', flexShrink: 0,
                          filter: isTop3 ? 'none' : 'none',
                        }}>{medal}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: isTop3 ? 12 : 11,
                            fontWeight: isTop3 ? 700 : 400,
                            color: isTop3 ? '#ffeaaa' : 'rgba(255,220,160,0.7)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{dish.name}</div>
                          {isTop3 && (
                            <div style={{ fontSize: 9, color: 'rgba(255,180,60,0.6)', marginTop: 1 }}>{tags}</div>
                          )}
                        </div>
                        <div style={{
                          fontSize: isTop3 ? 14 : 11, fontWeight: 900,
                          color: isTop3 ? '#ff9030' : 'rgba(255,180,60,0.55)',
                          flexShrink: 0,
                          animation: isTop3 ? 'ops-bounce 2s ease-in-out infinite' : 'none',
                          animationDelay: `${i * 0.3}s`,
                        }}>{dish.count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 员工吐槽 NPC气泡 */}
              <div style={{
                background: 'linear-gradient(135deg, #2a1a08 0%, #1c1008 100%)',
                borderRadius: 16,
                border: '1.5px solid rgba(200,140,60,0.2)',
                padding: '13px 15px',
              }}>
                <div style={{ fontSize: 10, color: '#d4a060', fontWeight: 900, letterSpacing: 1, marginBottom: 10 }}>
                  💬 店员播报
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {[
                    { icon: '🦞', text: `老板，${opsSnapshot.topDishes[0]?.name ?? '青花椒'}又卖爆了！` },
                    { icon: '🛵', text: `外卖骑手快忙不过来了！` },
                    { icon: '🪑', text: `现在排队有点久，要不要先推冒桶？` },
                  ].map(({ icon, text }, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      animation: 'ops-float 3.5s ease-in-out infinite',
                      animationDelay: `${i * 1.1}s`,
                    }}>
                      <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
                      <div style={{
                        background: 'rgba(255,200,100,0.08)',
                        border: '1px solid rgba(255,200,100,0.14)',
                        borderRadius: '10px 10px 10px 2px',
                        padding: '6px 10px',
                        fontSize: 11, color: 'rgba(255,220,150,0.85)', lineHeight: 1.5,
                      }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 突发提醒 — 红色便利贴 */}
              <div style={{
                background: 'linear-gradient(135deg, #3a0a0a 0%, #280808 100%)',
                borderRadius: 14,
                border: '1.5px solid rgba(255,80,60,0.3)',
                padding: '12px 14px',
                boxShadow: '0 2px 12px rgba(255,60,40,0.12)',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 900, color: '#f87171', letterSpacing: 1, marginBottom: 9,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ animation: 'ops-flash 1.5s ease-in-out infinite' }}>⚠️</span>
                  <span>突发提醒</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    `排队超过 ${opsSnapshot.queueTime} 分钟`,
                    `外卖配送延迟 3 单`,
                    `双人套餐库存紧张`,
                  ].map((alert, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: 11, color: 'rgba(255,180,160,0.85)',
                    }}>
                      <span style={{ color: '#f87171', fontSize: 9, flexShrink: 0 }}>●</span>
                      {alert}
                    </div>
                  ))}
                </div>
              </div>

              {/* 玩家操作面板 — 老板控制台 */}
              <div style={{
                background: 'linear-gradient(145deg, #1e0e00 0%, #150900 100%)',
                borderRadius: 18,
                border: '2px solid rgba(255,180,60,0.25)',
                boxShadow: '0 6px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,80,0.06)',
                padding: '16px 18px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* 木纹叠层 */}
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.04,
                  backgroundImage: 'repeating-linear-gradient(5deg, transparent, transparent 5px, rgba(255,200,80,0.6) 5px, rgba(255,200,80,0.6) 6px)',
                  pointerEvents: 'none',
                }} />
                {/* 铜钉 */}
                {[{top:7,left:8},{top:7,right:8},{bottom:7,left:8},{bottom:7,right:8}].map((pos, i) => (
                  <div key={i} style={{
                    position: 'absolute', ...pos,
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, #d4a050, #6b3a08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.7)',
                  }} />
                ))}
                <div style={{
                  fontSize: 11, fontWeight: 900, color: '#ffaa40', letterSpacing: 2,
                  marginBottom: 14, textAlign: 'center',
                  textShadow: '0 0 12px rgba(255,160,40,0.35)',
                }}>
                  🎛️ 老板决策台
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {/* 提价操作 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!playerOps.priceRaised) {
                        setPlayerOps((prev) => ({ ...prev, priceRaised: true }));
                        setPoints((prev) => {
                          const next = Math.min(999, prev + 15);
                          localStorage.setItem('world:points', String(next));
                          return next;
                        });
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: playerOps.priceRaised ? '1px solid rgba(255,180,40,0.35)' : '1px solid rgba(255,255,255,0.1)',
                      background: playerOps.priceRaised
                        ? 'linear-gradient(135deg, rgba(255,180,40,0.2), rgba(255,120,20,0.12))'
                        : 'rgba(255,255,255,0.04)',
                      color: playerOps.priceRaised ? '#ffd060' : 'rgba(255,220,140,0.6)',
                      cursor: playerOps.priceRaised ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📈</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.3 }}>
                        {playerOps.priceRaised ? '✅ 菜价已上调' : '上调菜价 10%'}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,200,100,0.5)', marginTop: 2 }}>
                        {playerOps.priceRaised ? '今日均价上浮，利润+8%' : '高峰期可提升营收'}
                      </div>
                    </div>
                  </button>

                  {/* 外卖优先 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!playerOps.deliveryPriority) {
                        setPlayerOps((prev) => ({ ...prev, deliveryPriority: true }));
                        setPoints((prev) => {
                          const next = Math.min(999, prev + 12);
                          localStorage.setItem('world:points', String(next));
                          return next;
                        });
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: playerOps.deliveryPriority ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.1)',
                      background: playerOps.deliveryPriority
                        ? 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(20,180,100,0.08))'
                        : 'rgba(255,255,255,0.04)',
                      color: playerOps.deliveryPriority ? '#86efac' : 'rgba(255,220,140,0.6)',
                      cursor: playerOps.deliveryPriority ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🛵</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.3 }}>
                        {playerOps.deliveryPriority ? '✅ 外卖已优先' : '开启外卖优先'}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,200,100,0.5)', marginTop: 2 }}>
                        {playerOps.deliveryPriority ? '出餐速度+15%，延迟降低' : '减少外卖配送延迟'}
                      </div>
                    </div>
                  </button>

                  {/* 激活福利池 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!playerOps.bonusPool) {
                        setPlayerOps((prev) => ({ ...prev, bonusPool: true }));
                        setPoints((prev) => {
                          const next = Math.min(999, prev + 25);
                          localStorage.setItem('world:points', String(next));
                          return next;
                        });
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: playerOps.bonusPool ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      background: playerOps.bonusPool
                        ? 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(220,60,60,0.12))'
                        : 'rgba(255,255,255,0.04)',
                      color: playerOps.bonusPool ? '#fca5a5' : 'rgba(255,220,140,0.6)',
                      cursor: playerOps.bonusPool ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🎰</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.3 }}>
                        {playerOps.bonusPool ? '✅ 福利池已激活' : '激活老板福利池'}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,200,100,0.5)', marginTop: 2 }}>
                        {playerOps.bonusPool ? `免单概率提升至 ${Math.min(99, opsSnapshot.ownerFreeMealChance + 15)}%` : '免单概率提升 15%'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* 积分显示 */}
                <div style={{
                  marginTop: 14, paddingTop: 10,
                  borderTop: '1px solid rgba(255,180,60,0.1)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,200,100,0.5)' }}>💰 当前积分</span>
                  <span style={{
                    fontSize: 16, fontWeight: 900, color: '#ffd060',
                    animation: 'ops-bounce 2s ease-in-out infinite',
                    display: 'inline-block',
                  }}>{points}</span>
                </div>
              </div>

            </aside>
          </section>

        <style jsx>{`
          .shop-detail-layout {
            grid-template-columns: minmax(0, 1.5fr) minmax(320px, 420px);
            align-items: start;
          }

          .scene-stage {
            aspect-ratio: 16 / 9;
          }

          .hall-barrage-track {
            animation: hall-barrage 22s linear infinite;
          }

          @keyframes hall-barrage {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          @keyframes kitchen-steam {
            0% {
              opacity: 0;
              transform: translate3d(0, 10px, 0) scale(0.7);
            }
            25% {
              opacity: 0.7;
            }
            100% {
              opacity: 0;
              transform: translate3d(8px, -72px, 0) scale(1.46);
            }
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* 场景对话浮层滚动条美化 */
          .scene-dialog-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .scene-dialog-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .scene-dialog-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,200,120,0.3);
            border-radius: 99px;
          }

          @media (max-width: 1180px) {
            .shop-detail-layout {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .scene-header {
              flex-direction: column;
              align-items: stretch;
            }
          }
        .menu-modal-scroll::-webkit-scrollbar { width: 4px; }
        .menu-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .menu-modal-scroll::-webkit-scrollbar-thumb { background: rgba(180,100,40,0.25); border-radius: 99px; }
        @keyframes menu-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes heat-bar {
          from { width: 0; }
        }
        @keyframes ops-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes ops-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
        @keyframes ops-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ops-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes flame-flicker {
          0%, 100% { transform: scale(1) translateY(0); opacity: 1; }
          25% { transform: scale(1.15) translateY(-3px) rotate(-3deg); opacity: 0.85; }
          50% { transform: scale(0.9) translateY(1px) rotate(2deg); opacity: 1; }
          75% { transform: scale(1.1) translateY(-2px) rotate(-1deg); opacity: 0.9; }
        }
        @keyframes sign-glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.95; }
        }
        `}</style>
      </div>

      {/* ===== 菜单弹窗 ===== */}
      {menuModalOpen && (() => {
        // 菜品分类
        const categories = [
          { key: 'main', label: '🐟 主菜·烤全鱼', items: shop.menu.filter((m) => m.tag.includes('NO.1') || m.tag.includes('重口') || m.tag.includes('下饭王') || m.tag.includes('不辣') || m.tag.includes('挑战')) },
          { key: 'bucket', label: '🪣 单人冒桶', items: shop.menu.filter((m) => m.tag.includes('新客价') || m.tag.includes('销量第1')) },
          { key: 'combo', label: '🎁 超值套餐', items: shop.menu.filter((m) => m.tag.includes('双人') || m.tag.includes('三人') || m.tag.includes('聚餐首选')) },
          { key: 'side', label: '🥬 配菜加料', items: shop.menu.filter((m) => m.tag.includes('加料') || m.tag.includes('解腻') || m.tag.includes('吸汁') || m.tag.includes('小吃') || m.portion?.includes('1-2人')) },
          { key: 'snack', label: '🍗 小吃凉菜', items: shop.menu.filter((m) => m.tag.includes('凉菜') || m.tag.includes('主食')) },
          { key: 'drink', label: '🧃 饮品', items: shop.menu.filter((m) => m.tag.includes('解腻饮') || m.tag.includes('清爽')) },
        ].filter((c) => c.items.length > 0);

        const cartTotal = Object.entries(cart).reduce((sum, [name, qty]) => {
          const item = shop.menu.find((m) => m.name === name);
          return sum + (item ? (item.salePrice ?? item.price) * qty : 0);
        }, 0);
        const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

        const addToCart = (name: string) => setCart((prev) => ({ ...prev, [name]: (prev[name] ?? 0) + 1 }));
        const removeFromCart = (name: string) => setCart((prev) => {
          const next = { ...prev, [name]: (prev[name] ?? 1) - 1 };
          if (next[name] <= 0) delete next[name];
          return next;
        });

        const orderModeLabel: Record<string, string> = { dine: '堂食下单', delivery: '外送下单', coupon: '囤券优惠' };

        return (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(18, 8, 4, 0.72)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px 16px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) { setMenuModalOpen(false); setOrderMode(null); } }}
          >
            <div style={{
              background: 'linear-gradient(160deg, #2d1a0e 0%, #1a0c05 60%, #0f0602 100%)',
              border: '1.5px solid rgba(255,160,60,0.22)',
              borderRadius: 28,
              width: '100%', maxWidth: 860,
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,100,0.1)',
              animation: 'menu-modal-in 0.28s ease-out',
              overflow: 'hidden',
            }}>
              {/* 弹窗头部 */}
              <div style={{
                padding: '22px 28px 16px',
                borderBottom: '1px solid rgba(255,160,60,0.12)',
                flexShrink: 0,
                background: 'linear-gradient(90deg, rgba(255,120,40,0.08), transparent)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: '#ffd270' }}>{getShopIcon(shop.cuisine, shop.id)} {shop.name}</span>
                      <span style={{
                        background: 'rgba(255,100,60,0.85)', color: '#fff',
                        fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 8,
                      }}>{shop.cuisine}</span>
                      <span style={{
                        background: 'rgba(255,180,40,0.2)', color: '#ffd270',
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                        border: '1px solid rgba(255,180,40,0.3)',
                      }}>⭐ 4.8 · {opsSnapshot.completedOrders}单</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,200,130,0.6)', lineHeight: 1.6 }}>
                      📍 LCM置汇旭辉广场 · 🕙 10:00–22:00 · 👥 人均¥{shop.menu.length > 0 ? Math.round(shop.menu.reduce((s, m) => s + m.price, 0) / shop.menu.length) : 89}
                    </div>
                    {/* 活动横幅 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {[
                        { text: '🧧 满20减14', color: 'rgba(230,60,60,0.85)' },
                        { text: '🆕 新客立减', color: 'rgba(230,60,60,0.85)' },
                        { text: '⚡ 99减9', color: 'rgba(200,80,20,0.8)' },
                        { text: '💳 支付红包¥1.88', color: 'rgba(180,100,20,0.8)' },
                        { text: '🎯 收藏领5折券', color: 'rgba(40,140,80,0.85)' },
                        { text: '📦 集3单返5元', color: 'rgba(40,100,200,0.85)' },
                      ].map((badge) => (
                        <span key={badge.text} style={{
                          background: badge.color, color: '#fff',
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        }}>{badge.text}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMenuModalOpen(false); setOrderMode(null); }}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none',
                      borderRadius: 12, width: 34, height: 34,
                      color: 'rgba(255,200,130,0.7)', fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >×</button>
                </div>

                {/* 老板亲情推荐栏 */}
                <div style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: 'linear-gradient(90deg, rgba(255,150,40,0.15), rgba(255,80,30,0.08))',
                  borderRadius: 12,
                  border: '1px solid rgba(255,150,40,0.2)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>👨‍🍳</span>
                  <div>
                    <div style={{ fontSize: 11, color: '#ffa040', fontWeight: 800, marginBottom: 3 }}>
                      {shop.owner} 老板亲情推荐
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,200,130,0.85)', lineHeight: 1.6 }}>
                      「来了就得试试我们的<span style={{ color: '#ffd270', fontWeight: 700 }}>{shop.menu[0]?.name ?? '招牌菜'}</span>，{shop.menu[0]?.desc?.slice(0, 16) ?? '每天必点，强烈推荐'}！
                      人多聚餐强推<span style={{ color: '#ffd270', fontWeight: 700 }}>{shop.menu[1]?.name ?? '双人套餐'}</span>，现在折扣超划算。
                      一个人来的别错过<span style={{ color: '#ffd270', fontWeight: 700 }}>{shop.menu[2]?.name ?? '单人套餐'}</span>，超值必点！」
                    </div>
                  </div>
                </div>
              </div>

              {/* 主体：滚动菜单 */}
              <div className="menu-modal-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
                {categories.map((cat) => (
                  <div key={cat.key} style={{ marginBottom: 28 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 900, color: '#ffa040',
                      marginBottom: 12, paddingBottom: 6,
                      borderBottom: '1px solid rgba(255,150,40,0.15)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {cat.label}
                      <span style={{ fontSize: 11, color: 'rgba(255,200,100,0.5)', fontWeight: 400 }}>{cat.items.length}款</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 10 }}>
                      {cat.items.map((item) => {
                        const qty = cart[item.name] ?? 0;
                        const isSoldOut = (item.stock ?? 99) === 0;
                        const isOwnerPick = !!item.ownerPick;
                        const heatW = `${item.heatScore ?? 50}%`;
                        return (
                          <div key={item.name} style={{
                            background: isOwnerPick
                              ? 'linear-gradient(135deg, rgba(255,150,40,0.12), rgba(255,80,20,0.08))'
                              : 'rgba(255,255,255,0.04)',
                            border: isOwnerPick
                              ? '1px solid rgba(255,150,40,0.3)'
                              : '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 16,
                            padding: '14px 16px',
                            position: 'relative',
                            opacity: isSoldOut ? 0.55 : 1,
                          }}>
                            {/* 角标 */}
                            {isOwnerPick && !isSoldOut && (
                              <div style={{
                                position: 'absolute', top: -1, right: 10,
                                background: 'linear-gradient(90deg, #ff6a00, #ff9c00)',
                                color: '#fff', fontSize: 9, fontWeight: 900,
                                padding: '2px 8px', borderRadius: '0 0 8px 8px',
                              }}>👨‍🍳 老板推荐</div>
                            )}
                            {isSoldOut && (
                              <div style={{
                                position: 'absolute', top: 10, right: 10,
                                background: 'rgba(100,60,40,0.9)',
                                color: 'rgba(255,200,130,0.7)', fontSize: 10, fontWeight: 900,
                                padding: '2px 8px', borderRadius: 6,
                              }}>今日售罄</div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* 名称 + 标签 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 15, fontWeight: 900, color: '#ffeaaa' }}>{item.name}</span>
                                  <span style={{
                                    background: 'rgba(255,100,40,0.75)', color: '#fff',
                                    fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 5,
                                  }}>{item.tag}</span>
                                </div>
                                {/* 推荐指数 */}
                                {(item.stars ?? 0) > 0 && (
                                  <div style={{ marginTop: 4, display: 'flex', gap: 2 }}>
                                    {Array.from({ length: 5 }).map((_, si) => (
                                      <span key={si} style={{ fontSize: 10, color: si < (item.stars ?? 0) ? '#ffd270' : 'rgba(255,200,100,0.2)' }}>★</span>
                                    ))}
                                    <span style={{ fontSize: 10, color: 'rgba(255,200,100,0.5)', marginLeft: 4 }}>推荐</span>
                                  </div>
                                )}
                                {/* 简介 */}
                                <div style={{ marginTop: 5, fontSize: 12, color: 'rgba(255,200,130,0.65)', lineHeight: 1.5 }}>
                                  {item.desc}
                                </div>
                                {/* 配量 */}
                                {item.portion && (
                                  <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,180,80,0.6)' }}>
                                    📦 {item.portion}
                                  </div>
                                )}
                                {/* 今日热度 */}
                                {(item.heatScore ?? 0) > 0 && (
                                  <div style={{ marginTop: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontSize: 10, color: 'rgba(255,180,80,0.6)', flexShrink: 0 }}>🔥 热度</span>
                                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{
                                          height: '100%', width: heatW,
                                          background: (item.heatScore ?? 0) >= 90
                                            ? 'linear-gradient(90deg, #ff6a00, #ff3a00)'
                                            : (item.heatScore ?? 0) >= 70
                                              ? 'linear-gradient(90deg, #ff9c00, #ff6a00)'
                                              : 'linear-gradient(90deg, #ffd270, #ff9c00)',
                                          borderRadius: 4,
                                          animation: 'heat-bar 1s ease-out',
                                        }} />
                                      </div>
                                      <span style={{ fontSize: 10, color: 'rgba(255,180,80,0.8)', flexShrink: 0 }}>{item.heatScore}</span>
                                    </div>
                                  </div>
                                )}
                                {/* 今日库存 */}
                                <div style={{ marginTop: 4, fontSize: 11, color: isSoldOut ? 'rgba(255,100,60,0.7)' : (item.stock ?? 99) <= 20 ? 'rgba(255,160,40,0.8)' : 'rgba(255,200,100,0.4)' }}>
                                  {isSoldOut ? '❌ 今日已无库存' : (item.stock ?? 99) <= 20 ? `⚠️ 仅剩 ${item.stock} 份` : `✅ 今日可提供 ${item.stock ?? '充足'}份`}
                                </div>
                              </div>

                              {/* 右侧价格 + 加购 */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                <div style={{ textAlign: 'right' }}>
                                  {item.salePrice != null ? (
                                    <>
                                      <div style={{ fontSize: 18, fontWeight: 900, color: '#ff6a40', lineHeight: 1 }}>¥{item.salePrice}</div>
                                      <div style={{ fontSize: 11, color: 'rgba(255,200,100,0.45)', textDecoration: 'line-through', marginTop: 2 }}>原¥{item.price}</div>
                                    </>
                                  ) : (
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#ffd270', lineHeight: 1 }}>¥{item.price}</div>
                                  )}
                                </div>
                                {/* 加购按钮 */}
                                {!isSoldOut && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {qty > 0 && (
                                      <>
                                        <button type="button" onClick={() => removeFromCart(item.name)} style={{
                                          width: 26, height: 26, borderRadius: '50%',
                                          background: 'rgba(255,255,255,0.12)', border: 'none',
                                          color: '#fff', fontSize: 16, cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>−</button>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: '#ffd270', minWidth: 18, textAlign: 'center' }}>{qty}</span>
                                      </>
                                    )}
                                    <button type="button" onClick={() => addToCart(item.name)} style={{
                                      width: 26, height: 26, borderRadius: '50%',
                                      background: 'linear-gradient(135deg, #ff7a20, #ff5010)',
                                      border: 'none', color: '#fff', fontSize: 18,
                                      cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      boxShadow: '0 2px 8px rgba(255,80,20,0.4)',
                                    }}>+</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 底部：购物车 + 下单 */}
              <div style={{
                flexShrink: 0,
                padding: '14px 28px 20px',
                borderTop: '1px solid rgba(255,160,60,0.12)',
                background: 'linear-gradient(0deg, rgba(30,12,4,0.95) 0%, transparent 100%)',
              }}>
                {/* 点单模式选择 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {(['dine', 'delivery', 'coupon'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setOrderMode((prev) => prev === mode ? null : mode)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 12,
                        border: orderMode === mode ? '1px solid rgba(255,150,40,0.7)' : '1px solid rgba(255,255,255,0.1)',
                        background: orderMode === mode
                          ? 'linear-gradient(135deg, rgba(255,120,40,0.3), rgba(255,70,20,0.2))'
                          : 'rgba(255,255,255,0.05)',
                        color: orderMode === mode ? '#ffd270' : 'rgba(255,200,100,0.5)',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {mode === 'dine' ? '🍽 堂食' : mode === 'delivery' ? '🛵 外送' : '🎟 囤券'}
                    </button>
                  ))}
                </div>

                {/* 购物车汇总 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, position: 'relative',
                    }}>
                      🛒
                      {cartCount > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4,
                          background: '#ff4020', color: '#fff',
                          width: 16, height: 16, borderRadius: '50%',
                          fontSize: 10, fontWeight: 900,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{cartCount}</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,200,100,0.5)' }}>
                        {cartCount === 0 ? '还没加菜哦~' : `已选 ${cartCount} 件`}
                      </div>
                      {cartCount > 0 && (
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#ff7a40' }}>
                          ¥{cartTotal.toFixed(1)}
                          <span style={{ fontSize: 11, color: 'rgba(255,200,100,0.4)', fontWeight: 400, marginLeft: 6 }}>
                            优惠已计入
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={cartCount === 0 || !orderMode}
                    onClick={() => {
                      if (cartCount > 0 && orderMode) {
                        alert(`🎉 已提交「${orderModeLabel[orderMode]}」，总价 ¥${cartTotal.toFixed(1)}！\n（当前为体验模式，感谢光临 ${shop.name}）`);
                        setCart({});
                        setOrderMode(null);
                        setMenuModalOpen(false);
                      }
                    }}
                    style={{
                      padding: '12px 28px',
                      borderRadius: 16,
                      border: 'none',
                      background: cartCount > 0 && orderMode
                        ? 'linear-gradient(135deg, #ff7a20, #ff4010)'
                        : 'rgba(255,255,255,0.08)',
                      color: cartCount > 0 && orderMode ? '#fff' : 'rgba(255,200,100,0.3)',
                      fontSize: 16, fontWeight: 900,
                      cursor: cartCount > 0 && orderMode ? 'pointer' : 'not-allowed',
                      boxShadow: cartCount > 0 && orderMode ? '0 6px 20px rgba(255,70,10,0.4)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {!orderMode ? '请选择下单方式' : cartCount === 0 ? '先去选菜～' : `去${orderModeLabel[orderMode]}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
