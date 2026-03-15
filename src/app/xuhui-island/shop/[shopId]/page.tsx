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

interface SceneActor {
  id: string;
  role: SceneActorRole;
  name: string;
  variant: string;
  x: number;
  y: number;
  anchorType: 'seat' | 'walk';
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
  '/crayfish/base.png',
  '/crayfish/glasses.png',
  '/crayfish/hat.png',
  '/crayfish/mask.png',
  '/crayfish/apron.png',
];

const GUEST_NAMES = ['不饿', '阿满', '糯糯', '来福', '团团', '大饱', '卷卷', '圆宝', '旺财', '小馋'];
const GUEST_BUBBLES = ['好香', '这锅稳', '再来一份', '今天值了', '排队也值', '这家真火'];
const STAFF_BUBBLES = ['上菜啦', '里面请', '这边结账', '马上到', '您慢用'];
const OWNER_BUBBLES = ['今天很旺', '欢迎逛店', '合作继续加码'];
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

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #fff4e4 0%, #ffd89d 100%)',
  padding: '20px 14px 40px',
  color: '#4a3124',
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
  if (role === 'owner') return 78;
  if (role === 'staff') return 70;
  return 66;
}

function actorShellSize(role: SceneActorRole) {
  if (role === 'owner') return 104;
  if (role === 'staff') return 96;
  return 90;
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
    const yOffset = actor.role === 'guest' ? 0 : actor.role === 'staff' ? 10 : 12;

    return {
      x: clamp(actor.x, 8, 92),
      y: clamp(actor.y + yOffset, 12, 86),
    };
  }

  if (actor.role === 'owner') {
    return {
      x: clamp(76 + (actor.x - 50) * 0.08, 62, 88),
      y: clamp(58 + (actor.y - 28) * 0.42, 46, 74),
    };
  }

  const slot = Number.parseInt(actor.id.split('-')[1] ?? '0', 10) || 0;
  const anchor = KITCHEN_ANCHORS[slot % KITCHEN_ANCHORS.length];

  return {
    x: clamp(anchor.x + (actor.x - 50) * 0.08, 10, 90),
    y: clamp(anchor.y + (actor.y - 28) * 0.4, 44, 82),
  };
}

function buildInitialActors(shop: XuhuiShop): SceneActor[] {
  const guestCount =
    shop.crowdLevel === 'packed' ? 11 : shop.crowdLevel === 'busy' ? 8 : 6;

  const guests: SceneActor[] = Array.from({ length: guestCount }, (_, index) => {
    const seat = shop.scene.seats[index % shop.scene.seats.length];

    return {
      id: `guest-${index}`,
      role: 'guest',
      name: GUEST_NAMES[index % GUEST_NAMES.length],
      variant: LOBSTER_VARIANTS[index % LOBSTER_VARIANTS.length],
      x: seat.x + ((index % 2 === 0 ? -1 : 1) * 2),
      y: seat.y + (index % 3) * 1.2,
      anchorType: 'seat',
      flipped: index % 2 === 0,
      bubble: GUEST_BUBBLES[index % GUEST_BUBBLES.length],
      bubbleVisible: false,
    };
  });

  const staff: SceneActor[] = shop.staffNames.map((name, index) => {
    const anchor = shop.scene.walkPath[index % shop.scene.walkPath.length];

    return {
      id: `staff-${index}`,
      role: 'staff',
      name,
      variant: LOBSTER_VARIANTS[(index + 1) % LOBSTER_VARIANTS.length],
      x: anchor.x,
      y: anchor.y,
      anchorType: 'walk',
      flipped: index % 2 === 1,
      bubble: STAFF_BUBBLES[index % STAFF_BUBBLES.length],
      bubbleVisible: false,
    };
  });

  const ownerAnchor = shop.scene.walkPath[Math.floor(shop.scene.walkPath.length / 2)];
  const owner: SceneActor = {
    id: 'owner-0',
    role: 'owner',
    name: shop.owner,
    variant: '/crayfish/apron.png',
    x: ownerAnchor.x,
    y: ownerAnchor.y,
    anchorType: 'walk',
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

function getActorDisplayName(actor: SceneActor) {
  return actor.role === 'owner' ? `${actor.name} 老板` : actor.name;
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
  const topDishes = Array.from({ length: 10 }, (_, index) => {
    const menuItem = shop.menu[index % shop.menu.length];
    const variantSuffixes = ['', '双人局', '老板推荐', '加料版', '加辣版', '人气拼盘', '夜宵档', '进店必点', '回头客款', '福利餐'];

    return {
      name: `${menuItem.name}${variantSuffixes[index] ? ` · ${variantSuffixes[index]}` : ''}`,
      count: Math.max(18, completedOrders - index * (6 + (seed % 3))),
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

function getDefaultChatOpening(shop: XuhuiShop, actor: SceneActor, ops: ShopOpsSnapshot) {
  if (actor.role === 'owner') {
    return `${actor.name}：今天已经做了 ${ops.completedOrders} 单，老板福利池还有机会。想聊免单、爆款还是店里的节奏？`;
  }

  if (actor.role === 'staff') {
    return `${actor.name}：我现在主要盯 ${shop.scene.counterLabel} 和堂食动线。你想问高峰期、服务节奏，还是哪道菜最容易爆单？`;
  }

  return `${actor.name}：我刚点了「${shop.menu[0].name}」，如果你想知道哪道最值、排队值不值，我可以直接说真实感受。`;
}

function buildActorReply(
  shop: XuhuiShop,
  actor: SceneActor,
  userMessage: string,
  ops: ShopOpsSnapshot
) {
  const normalized = userMessage.toLowerCase();

  if (actor.role === 'owner') {
    if (normalized.includes('免单') || normalized.includes('福利') || normalized.includes('优惠')) {
      return `${actor.name}：和老板聊确实更容易拿到免单机会。你先帮我完成两项高峰任务，再来找我，我会优先给你进老板福利池。当前老板放出的高概率名额还有 ${Math.max(3, Math.round(ops.ownerFreeMealChance / 12))} 个。`;
    }

    if (normalized.includes('外卖') || normalized.includes('堂食') || normalized.includes('订单')) {
      return `${actor.name}：今天我们已经做了 ${ops.completedOrders} 单，其中堂食 ${ops.dineInOrders} 单、外卖 ${ops.deliveryOrders} 单。线上线下同步之后，外卖拉新和堂食氛围都能一起带。`;
    }

    return `${actor.name}：我最看重的是让「${shop.menu[0].name}」和「${shop.menu[1].name}」在线上线下同时被看见。你要是想冲免单，就优先做老板相关任务，我会给更高机会。`;
  }

  if (actor.role === 'staff') {
    if (normalized.includes('高峰') || normalized.includes('忙') || normalized.includes('排队')) {
      return `${actor.name}：高峰一来我们会同时盯 ${ops.queueTime} 分钟左右的等位队列，先稳住堂食，再把外卖单推平。你要打工的话，最适合帮我补位和传菜。`;
    }

    if (normalized.includes('推荐') || normalized.includes('吃什么') || normalized.includes('菜')) {
      return `${actor.name}：如果你第一次来，我会先推「${shop.menu[0].name}」和「${shop.menu[1].name}」。这两道出得快，评价也最稳。`;
    }

    return `${actor.name}：我们现在最忙的是 ${shop.scene.counterLabel} 和堂食带位。你如果愿意帮忙，积分涨得会很快。`;
  }

  if (normalized.includes('推荐') || normalized.includes('吃什么') || normalized.includes('菜')) {
    return `${actor.name}：我会先点「${shop.menu[0].name}」，再补一份「${shop.menu[1].name}」。这两道是我今天觉得最值的组合。`;
  }

  if (normalized.includes('排队') || normalized.includes('值不值') || normalized.includes('等位')) {
    return `${actor.name}：如果是现在这个热度，我觉得值。虽然要等大概 ${ops.queueTime} 分钟，但堂食氛围和出菜速度都在线。`;
  }

  return `${actor.name}：我今天最满意的是这家的烟火气，尤其是「${shop.menu[0].name}」上桌的时候。你要是第一次来，真的可以先冲这个。`;
}

export default function XuhuiShopDetailPage({ params }: ShopPageProps) {
  const shop = XUHUI_SHOP_MAP[params.shopId];
  const [activeAction, setActiveAction] = useState<ShopActionId>('work');
  const [sceneFocus, setSceneFocus] = useState<SceneView>('hall');
  const [points, setPoints] = useState(120);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actors, setActors] = useState<SceneActor[]>(() =>
    shop ? buildInitialActors(shop) : []
  );
  const [selectedActorId, setSelectedActorId] = useState<string>('owner-0');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessagesByActor, setChatMessagesByActor] = useState<Record<string, ChatMessage[]>>({});
  const kitchenAudioRef = useRef<HTMLAudioElement>(null);

  if (!shop) {
    notFound();
  }

  const opsSnapshot = useMemo(() => buildShopOpsSnapshot(shop), [shop]);
  const kitchenProgressRows = useMemo(
    () =>
      shop.staffNames.map((name, index) => ({
        staffName: name,
        dishName: opsSnapshot.topDishes[index % opsSnapshot.topDishes.length]?.name ?? shop.menu[0].name,
        status: index < 2 ? '已完成' : '制作中',
      })),
    [opsSnapshot.topDishes, shop]
  );

  useEffect(() => {
    setActors(buildInitialActors(shop));
    setActiveAction('work');
    setSceneFocus('hall');
    setSelectedActorId('owner-0');
    setChatMessagesByActor({});
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

    setChatMessagesByActor((current) => {
      if (current[selectedActor.id]) return current;

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
  }, [opsSnapshot, selectedActor, shop]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActors((current) =>
        current.map((actor, index) => {
          if (actor.anchorType === 'seat') {
            if (Math.random() < 0.72) {
              return { ...actor, bubbleVisible: Math.random() < 0.05 };
            }

            const seat =
              shop.scene.seats[(index + Math.floor(Math.random() * 3)) % shop.scene.seats.length];
            return {
              ...actor,
              x: seat.x + (Math.random() * 3 - 1.5),
              y: seat.y + (Math.random() * 2 - 1),
              flipped: Math.random() > 0.5,
              bubble: GUEST_BUBBLES[Math.floor(Math.random() * GUEST_BUBBLES.length)],
              bubbleVisible: Math.random() < 0.12,
            };
          }

          const path = shop.scene.walkPath[Math.floor(Math.random() * shop.scene.walkPath.length)];
          const nextX = path.x + (Math.random() * 2 - 1);
          return {
            ...actor,
            x: nextX,
            y: path.y + (Math.random() * 2 - 1),
            flipped: nextX < actor.x,
            bubble:
              actor.role === 'owner'
                ? OWNER_BUBBLES[Math.floor(Math.random() * OWNER_BUBBLES.length)]
                : STAFF_BUBBLES[Math.floor(Math.random() * STAFF_BUBBLES.length)],
            bubbleVisible: actor.role === 'owner' ? Math.random() < 0.18 : Math.random() < 0.1,
          };
        })
      );
    }, 4400);

    return () => window.clearInterval(timer);
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
        description: `这里是${shop.scene.counterLabel}与后场动线，适合做打工和老板对话玩法。`,
        actors: actors.filter((actor) => actor.role !== 'guest'),
      },
      {
        id: 'hall' as const,
        title: '大堂',
        imageUrl: getSceneImageUrl(shop.id, 'hall'),
        description: crowdCopy,
        actors,
      },
    ],
    [actors, crowdCopy, shop]
  );

  const appendChatMessage = (actor: SceneActor, nextMessage: ChatMessage) => {
    setChatMessagesByActor((current) => ({
      ...current,
      [actor.id]: [...(current[actor.id] ?? []), nextMessage],
    }));
  };

  const handleQuickReply = async (actor: SceneActor, topic: string) => {
    appendChatMessage(actor, { role: 'user', content: topic });
    setChatLoading(true);

    window.setTimeout(() => {
      appendChatMessage(actor, {
        role: 'assistant',
        content: buildActorReply(shop, actor, topic, opsSnapshot),
      });
      setChatLoading(false);
    }, 520);
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
    setChatLoading(true);

    window.setTimeout(() => {
      appendChatMessage(selectedActor, {
        role: 'assistant',
        content: buildActorReply(shop, selectedActor, userMessage, opsSnapshot),
      });
      setChatLoading(false);
    }, 720);
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
                  background: '#fff9f1',
                  border: '1px solid rgba(145,95,52,0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{task}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: '#7b5d48' }}>
                      完成后可提升积分，靠近优惠券与免单机会。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPoints((value) => Math.min(999, value + 20 + index * 8))}
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
              background: 'linear-gradient(90deg, rgba(255,175,96,0.2), rgba(255,120,72,0.16))',
              fontSize: 14,
              lineHeight: 1.7,
              color: '#6a4b3a',
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
                background: '#fff9f1',
                border: '1px solid rgba(145,95,52,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 18 }}>{item.name}</strong>
                    <span style={{ ...darkChipStyle, background: 'rgba(215,108,44,0.82)' }}>{item.tag}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: '#7a5d49', lineHeight: 1.7 }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, whiteSpace: 'nowrap' }}>¥{item.price}</div>
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
              background: '#fff9f1',
              border: '1px solid rgba(145,95,52,0.08)',
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
                  background: line.role === 'user' ? 'rgba(255,172,100,0.16)' : 'rgba(33,24,20,0.06)',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {line.content}
              </div>
            ))}
            {chatLoading ? (
              <div style={{ fontSize: 13, color: '#8c6a54' }}>
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
                border: '1px solid rgba(145,95,52,0.18)',
                padding: '12px 16px',
                fontSize: 14,
                outline: 'none',
                background: '#fff',
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
            background: '#fff9f1',
            border: '1px solid rgba(145,95,52,0.08)',
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
                background: line.role === 'user' ? 'rgba(255,172,100,0.16)' : 'rgba(33,24,20,0.06)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {line.content}
            </div>
          ))}
          {chatLoading ? (
            <div style={{ fontSize: 13, color: '#8c6a54' }}>
              {currentActor ? `${getActorDisplayName(currentActor)} 正在回复...` : '正在回复...'}
            </div>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 18,
            background: 'linear-gradient(90deg, rgba(255,175,96,0.18), rgba(255,120,72,0.12))',
            fontSize: 13,
            lineHeight: 1.7,
            color: '#6a4b3a',
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
              border: '1px solid rgba(145,95,52,0.18)',
              padding: '12px 16px',
              fontSize: 14,
              outline: 'none',
              background: '#fff',
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
        <section style={{ ...glassCardStyle, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/xuhui-island" style={{ ...darkChipStyle, textDecoration: 'none' }}>
                  ← 返回小岛
                </Link>
                <button
                  type="button"
                  onClick={toggleAmbientSound}
                  style={{
                    ...secondaryChipStyle,
                    border: 0,
                    cursor: 'pointer',
                    background: '#fff',
                    color: '#1f1814',
                    padding: '8px 14px',
                    fontWeight: 900,
                  }}
                >
                  {soundEnabled ? '🔊 关闭店内白噪音' : '🔊 开启店内白噪音'}
                </button>
              </div>
              <h1 style={{ margin: '16px 0 0', fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1.04 }}>
                {shop.name}
              </h1>
              <p style={{ margin: '12px 0 0', maxWidth: 760, fontSize: 16, lineHeight: 1.8, color: '#6c5140' }}>
                {shop.intro}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
                {shop.actions.map((action) => (
                  <button
                    key={`hero-${action.id}`}
                    type="button"
                    onClick={() => {
                      setActiveAction(action.id);
                      setSceneFocus(SCENE_FOCUS_BY_ACTION[action.id]);
                    }}
                    style={{
                      border: activeAction === action.id ? '1px solid rgba(255, 116, 72, 0.55)' : '1px solid rgba(255, 159, 121, 0.5)',
                      background: '#fff8ef',
                      color: '#ff654f',
                      borderRadius: 20,
                      padding: '14px 22px',
                      fontSize: 20,
                      fontWeight: 900,
                      lineHeight: 1,
                      cursor: 'pointer',
                      boxShadow: activeAction === action.id ? '0 16px 28px rgba(255, 109, 66, 0.14)' : 'none',
                    }}
                  >
                    {action.id === 'guest-chat' ? '和顾客聊' : actionTitle(action.id)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(150px, 1fr))', gap: 12, flex: '1 1 420px', maxWidth: 520 }}>
              <div style={{ ...glassCardStyle, padding: 16, borderRadius: 20 }}>
                <div style={{ fontSize: 12, color: '#b66d3a' }}>当前在店龙虾</div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900 }}>{actors.filter((actor) => actor.role === 'guest').length}</div>
              </div>
              <div style={{ ...glassCardStyle, padding: 16, borderRadius: 20 }}>
                <div style={{ fontSize: 12, color: '#b66d3a' }}>今日完成单量</div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900 }}>{opsSnapshot.completedOrders}</div>
              </div>
              <div style={{ ...glassCardStyle, padding: 16, borderRadius: 20 }}>
                <div style={{ fontSize: 12, color: '#b66d3a' }}>堂食 / 外卖</div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
                  {opsSnapshot.dineInOrders} / {opsSnapshot.deliveryOrders}
                </div>
              </div>
              <div style={{ ...glassCardStyle, padding: 16, borderRadius: 20 }}>
                <div style={{ fontSize: 12, color: '#b66d3a' }}>老板免单机会</div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{opsSnapshot.ownerFreeMealChance}%</div>
              </div>
            </div>
          </div>
        </section>

        <section className="shop-detail-layout" style={{ display: 'grid', gap: 18, marginTop: 18 }}>
          <div style={{ ...glassCardStyle, padding: 14 }}>
            <div className="scene-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: '#b56b39', fontWeight: 800 }}>门店双场景</div>
                <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.7, color: '#7a5d49' }}>
                  上面放后厨，下面放大堂；后厨左侧会滚动出单进度，大堂顶部会飘过实时弹幕，店内环境音改成商场白噪音混合用餐与后厨声。
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {sceneStages.map((stage) => (
                <section
                  key={stage.id}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 28,
                    border:
                      stage.id === sceneFocus
                        ? '2px solid rgba(215,108,44,0.82)'
                        : '1px solid rgba(255,255,255,0.75)',
                    boxShadow:
                      stage.id === sceneFocus
                        ? '0 22px 44px rgba(215,108,44,0.16)'
                        : '0 10px 24px rgba(93,52,28,0.08)',
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
                    ) : null}

                    {stage.id === 'kitchen' ? (
                      <>
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
                            background: 'rgba(24, 18, 16, 0.52)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            color: '#fff7ea',
                            zIndex: 6,
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 900 }}>出单顺序</div>
                          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                            {kitchenProgressRows.map((row) => (
                              <div key={`${row.staffName}-${row.dishName}`} style={{ fontSize: 13, lineHeight: 1.6 }}>
                                <div style={{ fontWeight: 800 }}>{`${row.staffName}：${row.dishName}`}</div>
                                <div style={{ color: row.status === '已完成' ? '#8ff07f' : '#ffe395' }}>
                                  {row.status === '已完成' ? '✅ 已完成' : '🟠 制作中'}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div
                            style={{
                              marginTop: 16,
                              paddingTop: 12,
                              borderTop: '1px solid rgba(255,255,255,0.14)',
                              fontSize: 13,
                              lineHeight: 1.7,
                            }}
                          >
                            已完成滚动：
                            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                              {opsSnapshot.topDishes.slice(0, 4).map((dish, index) => (
                                <div key={`${dish.name}-${index}`} style={{ color: '#ffe7bd' }}>
                                  {`${index + 1}. ${dish.name} 已出单`}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            position: 'absolute',
                            left: 34,
                            top: 132,
                            bottom: 68,
                            width: 4,
                            borderRadius: 999,
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1))',
                            zIndex: 6,
                          }}
                        />

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

                    {stage.actors.map((actor) => {
                      const placement = actorPlacement(actor, stage.id);
                      const shellSize = actorShellSize(actor.role);
                      const coreSize = actorCoreSize(actor.role);
                      const glow = actorGlow(actor.role);
                      const bubbleOnLeft = placement.x > 68;

                      return (
                        <div
                          key={`${stage.id}-${actor.id}`}
                          style={{
                            position: 'absolute',
                            left: `${placement.x}%`,
                            top: `${placement.y}%`,
                            width: shellSize,
                            height: shellSize,
                            transform: 'translate(-50%, -50%)',
                            transition: 'left 3.6s ease-in-out, top 3.6s ease-in-out',
                            zIndex: actor.role === 'owner' ? 5 : actor.role === 'staff' ? 4 : 3,
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: '50%',
                              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.82) 0%, ${glow.bubble} 56%, rgba(255,255,255,0.06) 100%)`,
                              border: `1px solid ${glow.ring}`,
                              boxShadow: `0 14px 28px ${glow.shadow}`,
                              backdropFilter: 'blur(8px)',
                            }}
                          />

                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: -18,
                              transform: 'translateX(-50%)',
                              color: actor.role === 'guest' ? '#ffe56e' : '#fff6cd',
                              fontSize: actor.role === 'owner' ? 15 : 13,
                              fontWeight: 900,
                              textShadow: '0 1px 0 rgba(78,43,21,1), 0 0 10px rgba(0,0,0,0.18)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getActorDisplayName(actor)}
                          </div>

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
                                filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.16))',
                              }}
                            />
                          </div>

                          {actor.bubble && actor.bubbleVisible ? (
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
                              }}
                            >
                              {actor.bubble}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

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

          <aside style={{ display: 'grid', gap: 18, alignSelf: 'start' }}>
            <section style={{ ...glassCardStyle, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#b56b39', fontWeight: 800 }}>当前面板</div>
                  <h2 style={{ margin: '8px 0 0', fontSize: 26 }}>{actionTitle(activeAction)}</h2>
                </div>
                <div style={{ ...darkChipStyle, background: 'rgba(215,108,44,0.82)' }}>{shop.ownerTitle}</div>
              </div>
              <div style={{ marginTop: 14 }}>{actionPanel()}</div>
            </section>

            <section style={{ ...glassCardStyle, padding: 18 }}>
              <div style={{ fontSize: 13, color: '#b56b39', fontWeight: 800 }}>经营看板</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                <div style={{ padding: '14px 16px', borderRadius: 20, background: '#fff9f1' }}>
                  <div style={{ fontSize: 12, color: '#bb713d' }}>今日完成单</div>
                  <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900 }}>{opsSnapshot.completedOrders}</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: 20, background: '#fff9f1', fontSize: 14, lineHeight: 1.7 }}>
                  <div>堂食 {opsSnapshot.dineInOrders} 单</div>
                  <div>外卖 {opsSnapshot.deliveryOrders} 单</div>
                  <div>高峰等位约 {opsSnapshot.queueTime} 分钟</div>
                  <div>大堂可承载 {opsSnapshot.hallSeats} 位</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: 20, background: '#fff9f1' }}>
                  <div style={{ fontSize: 13, fontWeight: 900 }}>热销菜品 Top 10</div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    {opsSnapshot.topDishes.map((dish, index) => (
                      <div
                        key={`${dish.name}-${index}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: '#6b4e3e',
                        }}
                      >
                        <span>{`${index + 1}. ${dish.name}`}</span>
                        <strong>{dish.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
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
        `}</style>
      </div>
    </main>
  );
}
