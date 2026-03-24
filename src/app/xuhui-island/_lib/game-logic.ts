/**
 * 龙虾商圈游戏核心逻辑工具函数
 * 从 page.tsx 提取，保持单一职责
 */
import { XUHUI_SHOPS, type XuhuiShop } from '@/config/xuhui-shops';

// ===== 常量 =====

export const LOBSTER_VARIANTS = [
  '/crayfish-gif/base.gif',
  '/crayfish-gif/glasses.gif',
  '/crayfish-gif/hat.gif',
  '/crayfish-gif/mask.gif',
  '/crayfish-gif/apron.gif',
  '/crayfish-gif/guest-bag.gif',
  '/crayfish-gif/guest-chopsticks.gif',
  '/crayfish-gif/guest-dancing.gif',
  '/crayfish-gif/guest-sitting.gif',
  '/crayfish-gif/guest-tea.gif',
  '/crayfish-gif/guest-thumbsup.gif',
];

export const LOBSTER_WAIT_SPOTS = [
  { id: 'bridge', label: '桥边等位', x: 60, y: 71 },
  { id: 'hill', label: '山坡打卡', x: 42, y: 37 },
  { id: 'pier', label: '码头闲逛', x: 12, y: 63 },
  { id: 'shore', label: '海边发呆', x: 79, y: 82 },
  { id: 'grove', label: '椰林散步', x: 27, y: 24 },
  { id: 'river', label: '河道吹风', x: 52, y: 52 },
];
export const CONSTRUCTION_SITES = [
  { id: 'construction-1', x: 18, y: 83, offsetX: 12, offsetY: -6 },
  { id: 'construction-2', x: 61.5, y: 83.5, offsetX: -8, offsetY: -6 },
  { id: 'construction-3', x: 86, y: 79, offsetX: -26, offsetY: -8 },
];
export const SHOP_QUEUE_OFFSETS = [
  { x: 0, y: 0 },
  { x: -2.2, y: 1.5 },
  { x: 2.3, y: 1.7 },
  { x: -3.3, y: -1.2 },
  { x: 3.2, y: -1.1 },
];
export const SPOT_OFFSETS = [
  { x: 0, y: 0 },
  { x: -2.8, y: 1.5 },
  { x: 2.6, y: 1.4 },
  { x: -1.8, y: -1.8 },
  { x: 1.9, y: -1.9 },
  { x: 4.1, y: 0.6 },
];
export const DEFAULT_BOARD_SIZE = { width: 1420, height: 923 };
export const TRAVEL_DURATION_MS = 14500;
export const TRAVEL_DURATION_FAST_MS = Math.round(TRAVEL_DURATION_MS / 3);
export const SPEAK_DURATION_MS = 3600;
export const REST_DURATION_MS = 6800;

export const SHOP_ICONS: Record<string, string> = {
  gaga: '🍰',
  azhong: '🥟',
  laotouer: '🦐',
  jiangbian: '🐟',
  wanglaida: '🐸',
  niunew: '🥩',
  cailan: '🥢',
  jinfuyuan: '🏮',
};

export type LobsterTimePeriod = 'morning' | 'midday' | 'sunset' | 'night';
export type LobsterDestination = { kind: 'shop'; id: string } | { kind: 'spot'; id: string };

export interface LobsterPersonality {
  slug: string;
  name: string;
  trait: string;
  preference: string;
  signatureBehavior: string;
  catchphrase: string;
  speedMultiplier: number;
  preferredDestinations?: string[];
  activeHours?: [number, number];
  bubbleLines: string[];
  timeAwareLines?: Partial<Record<LobsterTimePeriod, string[]>>;
  isLead?: boolean;
}

export const LEAD_LOBSTER_ID = 'lobster-0';

export const LOBSTER_PERSONALITIES: LobsterPersonality[] = [
  {
    slug: 'wangcai',
    name: '旺财',
    trait: '懒但暖',
    preference: '爱海鲜，怕辣',
    signatureBehavior: '走路慢，喜欢停下来发呆',
    catchphrase: '哎，再走一步就到了……算了，休息一下。',
    speedMultiplier: 0.72,
    preferredDestinations: ['jiangbian', 'laotouer', 'pier', 'shore'],
    bubbleLines: [
      '我先替你闻闻今天哪家最香。',
      '不急，我慢慢替你看。',
      '这座岛今天风挺舒服的。',
      '你不在的时候，我也会帮你记着。',
    ],
    timeAwareLines: {
      morning: ['早……你也起这么早啊。'],
      midday: ['今天人好多，我帮你占个位！'],
      sunset: ['你来了，一起看吧。'],
      night: ['你怎么这么晚还没睡，我也睡不着。'],
    },
    isLead: true,
  },
  {
    slug: 'yuanbao',
    name: '圆宝',
    trait: '话少但深',
    preference: '爱甜品，夜猫子',
    signatureBehavior: '深夜才活跃，说话少但戳心',
    catchphrase: '你来了就好。',
    speedMultiplier: 0.92,
    preferredDestinations: ['gaga', 'shore', 'pier'],
    activeHours: [22, 6],
    bubbleLines: [
      '晚一点再热闹起来。',
      '甜的东西，会让夜里安静一点。',
      '你来了就好。',
    ],
  },
  {
    slug: 'aman',
    name: '阿满',
    trait: '阳光积极',
    preference: '什么都爱',
    signatureBehavior: '跑得最快，帮别人带情报',
    catchphrase: '今天吃了吗！我去帮你问问！',
    speedMultiplier: 1.38,
    preferredDestinations: ['azhong', 'wanglaida', 'bridge'],
    bubbleLines: [
      '我先冲一圈，回来告诉你！',
      '这边热闹，我替你去问问！',
      '别急，我跑得快！',
    ],
  },
  {
    slug: 'xiaochan',
    name: '小馋',
    trait: '八卦型',
    preference: '对每家店都有意见',
    signatureBehavior: '在餐厅门口徘徊最久',
    catchphrase: '我听说今天老板心情不好，要不要换一家？',
    speedMultiplier: 1.04,
    preferredDestinations: ['azhong', 'niunew', 'cailan'],
    bubbleLines: [
      '我刚听到隔壁桌在夸隐藏菜单。',
      '这家今天味道稳，但老板有点忙。',
      '先别急，我再听两句八卦。',
    ],
  },
  {
    slug: 'nuonuo',
    name: '糯糯',
    trait: '傲娇型',
    preference: '只去高分餐厅',
    signatureBehavior: '昂着头走路，差一点的店会犹豫',
    catchphrase: '……勉强可以吧。',
    speedMultiplier: 1.08,
    preferredDestinations: ['jinfuyuan', 'niunew', 'gaga'],
    bubbleLines: [
      '分数不够高的话，我就不进去了。',
      '这家评价还行，算你眼光不错。',
      '……勉强可以吧。',
    ],
  },
  {
    slug: 'bue',
    name: '不饿',
    trait: '哲学型',
    preference: '对食物没执念，爱风景',
    signatureBehavior: '经常在景点停留，很少进店',
    catchphrase: '今天的云很特别，你看见了吗？',
    speedMultiplier: 0.84,
    preferredDestinations: ['hill', 'shore', 'grove'],
    bubbleLines: [
      '今天的云很特别，你看见了吗？',
      '风景比菜单更像答案。',
      '先别催，我想看一会儿海。',
    ],
  },
  {
    slug: 'fantuan',
    name: '饭团',
    trait: '踏实型',
    preference: '爱主食，不挑',
    signatureBehavior: '走路稳，总第一个到',
    catchphrase: '我已经帮你踩好点了。',
    speedMultiplier: 1.12,
    preferredDestinations: ['azhong', 'cailan', 'laotouer'],
    bubbleLines: [
      '我先去排一眼，回来告诉你稳不稳。',
      '主食靠谱的店，我记得最清楚。',
      '我已经帮你踩好点了。',
    ],
  },
  {
    slug: 'laifu',
    name: '来福',
    trait: '热情型',
    preference: '爱人多的地方',
    signatureBehavior: '遇到别的龙虾就打招呼',
    catchphrase: '哇今天好多人！快来！',
    speedMultiplier: 1.18,
    preferredDestinations: ['azhong', 'wanglaida', 'cailan'],
    bubbleLines: [
      '这边好热闹，我先替你挤进去看看！',
      '人多的地方，消息也多。',
      '哇今天好多人！快来！',
    ],
  },
  {
    slug: 'juanjuan',
    name: '卷卷',
    trait: '焦虑型',
    preference: '爱效率，讨厌等位',
    signatureBehavior: '走路快，经常绕路',
    catchphrase: '等位15分钟？！我去找下一家。',
    speedMultiplier: 1.56,
    preferredDestinations: ['gaga', 'laotouer', 'river'],
    bubbleLines: [
      '排太久就不值当了。',
      '我先找条最快的路。',
      '等位15分钟？！我去找下一家。',
    ],
  },
  {
    slug: 'dabao',
    name: '大饱',
    trait: '贪吃型',
    preference: '每家都想去',
    signatureBehavior: '路过任何餐厅都要停一下',
    catchphrase: '这家我还没去过……',
    speedMultiplier: 0.96,
    preferredDestinations: ['gaga', 'azhong', 'jinfuyuan', 'cailan', 'laotouer', 'jiangbian', 'wanglaida', 'niunew'],
    bubbleLines: [
      '这家我还没去过……',
      '先进去看看，再去下一家。',
      '我觉得我还能再吃一轮。',
    ],
  },
  {
    slug: 'chongchong',
    name: '冲冲',
    trait: '冒险型',
    preference: '爱尝试新店',
    signatureBehavior: '总往地图边缘跑',
    catchphrase: '那边有个我没去过的地方。',
    speedMultiplier: 1.28,
    preferredDestinations: ['niunew', 'wanglaida', 'grove', 'pier'],
    bubbleLines: [
      '边上那条路我还没试过。',
      '新的地方，才有新的故事。',
      '那边有个我没去过的地方。',
    ],
  },
];

export const LOBSTER_NAMES = LOBSTER_PERSONALITIES.map((personality) => personality.name);
export const LOBSTER_CHAT_LINES = LOBSTER_PERSONALITIES.flatMap((personality) => personality.bubbleLines);

// ===== 类型定义 =====

export interface LobsterWalker {
  id: string;
  name: string;
  personality: LobsterPersonality;
  variant: string;
  x: number;
  y: number;
  destinationSlot: number;
  mode: 'traveling' | 'inside' | 'resting' | 'speaking';
  destination: LobsterDestination;
  currentShopId?: string;
  nextActionAt: number;
  scale: number;
  opacity: number;
  bubbleText?: string;
  bubbleKey: number;
  completedTrips: number;
  intelCount: number;
  isDispatched?: boolean;
  isDispatching?: boolean;
  dispatchTarget?: { x: number; y: number };
}

export interface ShopMetric {
  visitorCount: number;
  welfareLeft: number;
  rating: number;
  motionTick: number;
}

export interface BoardSize {
  width: number;
  height: number;
}

// ===== 纯工具函数 =====

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const hashShopId = (shopId: string) =>
  Array.from(shopId).reduce((total, char) => total + char.charCodeAt(0), 0);

export const computeHourlyRating = (shop: XuhuiShop, hour: number) => {
  const offset = ((hashShopId(shop.id) + hour) % 4) * 0.08;
  const crowdBoost =
    shop.crowdLevel === 'packed' ? 0.22 : shop.crowdLevel === 'busy' ? 0.14 : 0.06;
  return Math.min(5, Number((4.55 + crowdBoost + offset).toFixed(1)));
};

export const getTimePeriod = (hour = new Date().getHours()): LobsterTimePeriod => {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 15) return 'midday';
  if (hour >= 15 && hour < 19) return 'sunset';
  return 'night';
};

export const isHourInRange = (hour: number, [start, end]: [number, number]) => {
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

export const createShopMetrics = () =>
  Object.fromEntries(
    XUHUI_SHOPS.map((shop) => [
      shop.id,
      {
        visitorCount: shop.baseVisitors,
        welfareLeft: 42 + (hashShopId(shop.id) % 24),
        rating: computeHourlyRating(shop, 12),
        motionTick: 0,
      },
    ])
  ) as Record<string, ShopMetric>;

export const getDestinationKey = (destination: LobsterWalker['destination']) =>
  `${destination.kind}:${destination.id}`;

export const toShopAnchorPoint = (shop: XuhuiShop) => {
  const { width, height } = DEFAULT_BOARD_SIZE;
  return {
    x: clamp(shop.x + ((shop.mapOffsetX ?? 0) / width) * 100, 8, 92),
    y: clamp(shop.y + (((shop.mapOffsetY ?? 0) + 34) / height) * 100, 10, 95),
  };
};

export const findShopById = (shopId: string) =>
  XUHUI_SHOPS.find((shop) => shop.id === shopId);

export const findSpotById = (spotId: string) =>
  LOBSTER_WAIT_SPOTS.find((spot) => spot.id === spotId);

export const getVisualDestinationKey = (lobster: LobsterWalker) => {
  if (lobster.mode === 'inside' && lobster.currentShopId) {
    return `shop:${lobster.currentShopId}`;
  }
  return `${lobster.destination.kind}:${lobster.destination.id}`;
};

export const chooseSpreadDestination = (
  lobsters: LobsterWalker[],
  kind: 'shop' | 'spot',
  excludeId?: string
) => {
  return chooseBalancedDestination(lobsters, kind, undefined, excludeId);
};

const chooseBalancedDestination = (
  lobsters: LobsterWalker[],
  kind: 'shop' | 'spot',
  preferredDestinationIds?: string[],
  excludeId?: string
) => {
  const counts = new Map<string, number>();
  for (const lobster of lobsters) {
    const [destinationKind, destinationId] = getVisualDestinationKey(lobster).split(':');
    if (destinationKind !== kind || !destinationId || destinationId === excludeId) continue;
    counts.set(destinationId, (counts.get(destinationId) ?? 0) + 1);
  }

  const pool = kind === 'shop' ? XUHUI_SHOPS : LOBSTER_WAIT_SPOTS;
  const candidates = pool.filter((item) => item.id !== excludeId);
  const preferredCandidates = preferredDestinationIds?.length
    ? candidates.filter((item) => preferredDestinationIds.includes(item.id))
    : [];
  const activePool =
    preferredCandidates.length > 0 && Math.random() < 0.74 ? preferredCandidates : candidates;
  const minCount = activePool.reduce(
    (min, item) => Math.min(min, counts.get(item.id) ?? 0),
    Number.POSITIVE_INFINITY
  );
  const quietCandidates = activePool.filter((item) => (counts.get(item.id) ?? 0) === minCount);
  const picked =
    quietCandidates[Math.floor(Math.random() * quietCandidates.length)] ??
    activePool[0] ??
    pool[0];

  return { kind, id: picked.id } as const;
};

export const getRandomInsideDuration = () => 5200 + Math.floor(Math.random() * 3600);

export const choosePersonalityDestination = (
  lobsters: LobsterWalker[],
  lobster: LobsterWalker,
  kind: 'shop' | 'spot',
  excludeId?: string
) => {
  const preferredIds = lobster.personality.preferredDestinations?.filter((id) =>
    kind === 'shop' ? Boolean(findShopById(id)) : Boolean(findSpotById(id))
  );

  return chooseBalancedDestination(lobsters, kind, preferredIds, excludeId);
};

export const getRandomBubbleLine = (
  lobster: LobsterWalker,
  hour = new Date().getHours()
) => {
  const period = getTimePeriod(hour);
  const candidateLines = lobster.personality.timeAwareLines?.[period]?.length
    ? lobster.personality.timeAwareLines[period]
    : lobster.personality.bubbleLines;

  return (
    candidateLines?.[Math.floor(Math.random() * candidateLines.length)] ??
    lobster.personality.catchphrase
  );
};

export const getLobsterTravelDuration = (
  lobster: Pick<LobsterWalker, 'personality'>,
  isDispatched = false
) => {
  const baseDuration = Math.round(TRAVEL_DURATION_MS / lobster.personality.speedMultiplier);
  return isDispatched ? Math.round(baseDuration / 3) : baseDuration;
};

const resolvePreferredDestination = (
  personality: LobsterPersonality,
  fallbackDestination: LobsterDestination
): LobsterDestination => {
  for (const destinationId of personality.preferredDestinations ?? []) {
    if (findShopById(destinationId)) return { kind: 'shop', id: destinationId };
    if (findSpotById(destinationId)) return { kind: 'spot', id: destinationId };
  }
  return fallbackDestination;
};

export const findDestinationSlot = (
  lobsters: LobsterWalker[],
  destination: LobsterWalker['destination'],
  excludeId?: string
) => {
  const slotPool = destination.kind === 'shop' ? SHOP_QUEUE_OFFSETS : SPOT_OFFSETS;
  const destinationKey = getDestinationKey(destination);
  const usage = new Array(slotPool.length).fill(0) as number[];

  for (const lobster of lobsters) {
    if (lobster.id === excludeId) continue;
    if (getVisualDestinationKey(lobster) !== destinationKey) continue;
    usage[lobster.destinationSlot % slotPool.length] += 1;
  }

  const minimumUsage = Math.min(...usage);
  const candidateSlots = usage
    .map((count, index) => ({ count, index }))
    .filter((item) => item.count === minimumUsage);

  return candidateSlots[Math.floor(Math.random() * candidateSlots.length)]?.index ?? 0;
};

export const toDestinationPoint = (
  destination: LobsterWalker['destination'],
  destinationSlot = 0
) => {
  const offsets = destination.kind === 'shop' ? SHOP_QUEUE_OFFSETS : SPOT_OFFSETS;
  const slotOffset = offsets[destinationSlot % offsets.length] ?? offsets[0];

  if (destination.kind === 'shop') {
    const shop = findShopById(destination.id) ?? XUHUI_SHOPS[0];
    const anchor = toShopAnchorPoint(shop);
    return {
      x: clamp(anchor.x + slotOffset.x, 8, 92),
      y: clamp(anchor.y + slotOffset.y, 10, 95),
    };
  }

  const spot = findSpotById(destination.id) ?? LOBSTER_WAIT_SPOTS[0];
  return {
    x: clamp(spot.x + slotOffset.x, 8, 92),
    y: clamp(spot.y + slotOffset.y, 10, 95),
  };
};

export const createInitialLobsters = (): LobsterWalker[] => {
  const initialDestinations = [
    ...XUHUI_SHOPS.map((shop) => ({ kind: 'shop' as const, id: shop.id })),
    ...LOBSTER_WAIT_SPOTS.map((spot) => ({ kind: 'spot' as const, id: spot.id })),
  ];

  return Array.from({ length: LOBSTER_PERSONALITIES.length }, (_, index): LobsterWalker => {
    const now = Date.now();
    const personality = LOBSTER_PERSONALITIES[index] ?? LOBSTER_PERSONALITIES[0];
    const fallbackDestination = initialDestinations[index % initialDestinations.length] ?? {
      kind: 'spot' as const,
      id: LOBSTER_WAIT_SPOTS[0]!.id,
    };
    const destination = resolvePreferredDestination(personality, fallbackDestination);
    const isSpotStart = destination.kind === 'spot';

    return {
      id: `lobster-${index}`,
      name: personality.name,
      personality,
      variant: LOBSTER_VARIANTS[index % LOBSTER_VARIANTS.length],
      x: 0,
      y: 0,
      destinationSlot: 0,
      mode: isSpotStart ? 'resting' : 'traveling',
      destination,
      currentShopId: undefined,
      nextActionAt: now + 1400 + index * 1300,
      scale: 1,
      opacity: 1,
      bubbleText: undefined,
      bubbleKey: 0,
      completedTrips: 0,
      intelCount: 0,
    };
  }).reduce<LobsterWalker[]>((lobsters, lobster) => {
    const destinationSlot = findDestinationSlot(lobsters, lobster.destination, lobster.id);
    const point = toDestinationPoint(lobster.destination, destinationSlot);
    lobsters.push({ ...lobster, x: point.x, y: point.y, destinationSlot });
    return lobsters;
  }, []);
};

export const renderStars = (rating: number) => '⭐️'.repeat(Math.max(4, Math.round(rating)));
