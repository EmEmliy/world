'use client';

import { useRouter } from 'next/navigation';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { PageTracker } from '@/components/game/page-tracker';
import { track } from '@/lib/tracker';
import { playAudioFile } from '@/lib/sound';
import { XUHUI_SHOPS, type XuhuiShop } from '@/config/xuhui-shops';

interface LobsterWalker {
  id: string;
  name: string;
  variant: string;
  x: number;
  y: number;
  destinationSlot: number;
  mode: 'traveling' | 'inside' | 'resting' | 'speaking';
  destination: { kind: 'shop'; id: string } | { kind: 'spot'; id: string };
  currentShopId?: string;
  nextActionAt: number;
  scale: number;
  opacity: number;
  bubbleText?: string;
  bubbleKey: number;
  isDispatched?: boolean; // 用户手动派遣的，3倍速行走
  isDispatching?: boolean; // 瞬移中，transition 关闭
  dispatchTarget?: { x: number; y: number }; // 最终目标坐标
}

interface ShopMetric {
  visitorCount: number;
  welfareLeft: number;
  rating: number;
  motionTick: number;
}

interface BoardSize {
  width: number;
  height: number;
}

const LOBSTER_VARIANTS = [
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

const LOBSTER_NAMES = ['不饿', '饭团', '来福', '阿满', '小馋', '旺财', '冲冲', '糯糯', '大饱', '卷卷', '圆宝'];
const LOBSTER_CHAT_LINES = [
  '吃饱了！',
  '再来一碗！',
  '去那家看看！',
  '休息一下~',
  '这家真香',
  '桥边等会儿',
  '山坡吹吹风',
  '下顿吃什么？',
];
const LOBSTER_WAIT_SPOTS = [
  { id: 'bridge', label: '桥边等位', x: 60, y: 71 },
  { id: 'hill', label: '山坡打卡', x: 42, y: 37 },
  { id: 'pier', label: '码头闲逛', x: 12, y: 63 },
  { id: 'shore', label: '海边发呆', x: 79, y: 82 },
  { id: 'grove', label: '椰林散步', x: 27, y: 24 },
  { id: 'river', label: '河道吹风', x: 52, y: 52 },
];
const CONSTRUCTION_SITES = [
  { id: 'construction-1', x: 18, y: 83, offsetX: 12, offsetY: -6 },
  { id: 'construction-2', x: 61.5, y: 83.5, offsetX: -8, offsetY: -6 },
  { id: 'construction-3', x: 86, y: 79, offsetX: -26, offsetY: -8 },
];
const SHOP_QUEUE_OFFSETS = [
  { x: 0, y: 0 },
  { x: -2.2, y: 1.5 },
  { x: 2.3, y: 1.7 },
  { x: -3.3, y: -1.2 },
  { x: 3.2, y: -1.1 },
];
const SPOT_OFFSETS = [
  { x: 0, y: 0 },
  { x: -2.8, y: 1.5 },
  { x: 2.6, y: 1.4 },
  { x: -1.8, y: -1.8 },
  { x: 1.9, y: -1.9 },
  { x: 4.1, y: 0.6 },
];
const DEFAULT_BOARD_SIZE: BoardSize = { width: 1420, height: 923 };
const TRAVEL_DURATION_MS = 14500;
const TRAVEL_DURATION_FAST_MS = Math.round(TRAVEL_DURATION_MS / 3); // 派遣龙虾3倍速
const SPEAK_DURATION_MS = 3600;
const REST_DURATION_MS = 6800;

const hashShopId = (shopId: string) =>
  Array.from(shopId).reduce((total, char) => total + char.charCodeAt(0), 0);

const SHOP_ICONS: Record<string, string> = {
  gaga: '🍰',
  azhong: '🥟',
  laotouer: '🦐',
  jiangbian: '🐟',
  wanglaida: '🐸',
  niunew: '🥩',
  cailan: '🥢',
  jinfuyuan: '🏮',
};

const computeHourlyRating = (shop: XuhuiShop, hour: number) => {
  const offset = ((hashShopId(shop.id) + hour) % 4) * 0.08;
  const crowdBoost = shop.crowdLevel === 'packed' ? 0.22 : shop.crowdLevel === 'busy' ? 0.14 : 0.06;
  return Math.min(5, Number((4.55 + crowdBoost + offset).toFixed(1)));
};

const createShopMetrics = () =>
  Object.fromEntries(
    XUHUI_SHOPS.map((shop) => [
      shop.id,
      {
        visitorCount: shop.baseVisitors,
        welfareLeft: 42 + (hashShopId(shop.id) % 24),
        rating: computeHourlyRating(shop, 12), // 固定初始值，避免 SSR/CSR 时间不同导致 Hydration mismatch
        motionTick: 0,
      },
    ])
  ) as Record<string, ShopMetric>;

const getDestinationKey = (destination: LobsterWalker['destination']) => `${destination.kind}:${destination.id}`;

const toShopAnchorPoint = (shop: XuhuiShop) => {
  const width = DEFAULT_BOARD_SIZE.width;
  const height = DEFAULT_BOARD_SIZE.height;

  return {
    x: clamp(shop.x + ((shop.mapOffsetX ?? 0) / width) * 100, 8, 92),
    y: clamp(shop.y + (((shop.mapOffsetY ?? 0) + 34) / height) * 100, 10, 95),
  };
};

const findShopById = (shopId: string) => XUHUI_SHOPS.find((shop) => shop.id === shopId);
const findSpotById = (spotId: string) => LOBSTER_WAIT_SPOTS.find((spot) => spot.id === spotId);

const getVisualDestinationKey = (lobster: LobsterWalker) => {
  if (lobster.mode === 'inside' && lobster.currentShopId) return `shop:${lobster.currentShopId}`;
  return `${lobster.destination.kind}:${lobster.destination.id}`;
};

const chooseSpreadDestination = (
  lobsters: LobsterWalker[],
  kind: 'shop' | 'spot',
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
  const minCount = candidates.reduce((min, item) => Math.min(min, counts.get(item.id) ?? 0), Number.POSITIVE_INFINITY);
  const quietCandidates = candidates.filter((item) => (counts.get(item.id) ?? 0) === minCount);
  const picked = quietCandidates[Math.floor(Math.random() * quietCandidates.length)] ?? candidates[0] ?? pool[0];

  return { kind, id: picked.id } as const;
};

const getRandomInsideDuration = () => 5200 + Math.floor(Math.random() * 3600);
const getRandomBubbleLine = () =>
  LOBSTER_CHAT_LINES[Math.floor(Math.random() * LOBSTER_CHAT_LINES.length)] ?? LOBSTER_CHAT_LINES[0];

const findDestinationSlot = (
  lobsters: LobsterWalker[],
  destination: LobsterWalker['destination'],
  excludeId?: string
) => {
  const slotPool = destination.kind === 'shop' ? SHOP_QUEUE_OFFSETS : SPOT_OFFSETS;
  const destinationKey = getDestinationKey(destination);
  const usage = new Array(slotPool.length).fill(0);

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

const toDestinationPoint = (destination: LobsterWalker['destination'], destinationSlot = 0) => {
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

const createInitialLobsters = (): LobsterWalker[] => {
  const initialDestinations = [
    ...XUHUI_SHOPS.map((shop) => ({ kind: 'shop' as const, id: shop.id })),
    ...LOBSTER_WAIT_SPOTS.map((spot) => ({ kind: 'spot' as const, id: spot.id })),
  ];

  return Array.from({ length: LOBSTER_VARIANTS.length }, (_, index): LobsterWalker => {
    const now = Date.now();
    const destination = initialDestinations[index % initialDestinations.length] ?? {
      kind: 'spot' as const,
      id: LOBSTER_WAIT_SPOTS[0]!.id,
    };
    const isSpotStart = destination.kind === 'spot';

    return {
      id: `lobster-${index}`,
      name: LOBSTER_NAMES[index % LOBSTER_NAMES.length],
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
    };
  }).reduce<LobsterWalker[]>((lobsters, lobster) => {
    const destinationSlot = findDestinationSlot(lobsters, lobster.destination, lobster.id);
    const point = toDestinationPoint(lobster.destination, destinationSlot);

    lobsters.push({
      ...lobster,
      x: point.x,
      y: point.y,
      destinationSlot,
    });

    return lobsters;
  }, []);
};

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '16px 10px 30px',
  background: 'linear-gradient(180deg, #0a2a3a 0%, #0d3d52 20%, #0f5068 45%, #0d6878 65%, #0b7a7a 80%, #0a8a72 100%)',
  color: '#e0f4f0',
  position: 'relative',
  overflow: 'hidden',
};

const heroStyle: CSSProperties = {
  maxWidth: 1420,
  margin: '0 auto 18px',
  padding: 24,
  borderRadius: 28,
  background: 'rgba(8, 30, 45, 0.72)',
  border: '1px solid rgba(100, 220, 200, 0.22)',
  boxShadow: '0 24px 80px rgba(0,30,60,0.35)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const statsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 18,
  position: 'relative',
  zIndex: 2,
};

const statCardStyle: CSSProperties = {
  flex: '1 1 180px',
  minWidth: 180,
  padding: '14px 16px',
  borderRadius: 20,
  background: 'rgba(8, 40, 55, 0.68)',
  border: '1px solid rgba(100,220,200,0.18)',
  boxShadow: '0 10px 24px rgba(0,20,40,0.3)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  textAlign: 'center',
  color: '#c0eee8',
};

const mapShellStyle: CSSProperties = {
  maxWidth: 1420,
  margin: '0 auto',
  padding: 10,
  borderRadius: 30,
  background: 'rgba(5, 25, 40, 0.55)',
  border: '2px solid rgba(80, 200, 180, 0.28)',
  boxShadow: '0 28px 100px rgba(0,20,50,0.5), 0 0 60px rgba(30,160,140,0.12)',
  position: 'relative', // 为派遣面板提供定位上下文
};

const mapBoardStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10.4',
  overflow: 'hidden',
  borderRadius: 24,
  border: '4px solid #fff0d0',
  background: 'linear-gradient(180deg, #7ec8d4 0%, #49b8cb 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 999,
  background: '#fff0d4',
  color: '#d36d2e',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.16em',
};

const darkGlassStyle: CSSProperties = {
  background: 'rgba(0, 0, 0, 0.05)',
  border: '1px solid rgba(255,255,255,0.16)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 12px 22px rgba(70,42,26,0.18)',
};

const metricGlassStyle: CSSProperties = {
  minWidth: 164,
  padding: '10px 14px',
  borderRadius: 20,
  background: 'rgba(6, 28, 44, 0.88)',
  border: '1px solid rgba(100,220,200,0.28)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 20px 34px rgba(0,20,50,0.4), 0 0 20px rgba(50,180,160,0.12)',
  color: '#d0f0ea',
};

const renderStars = (rating: number) => '⭐️'.repeat(Math.max(4, Math.round(rating)));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Web Audio 传送音效：咻的一声，从高频扫到低频 + 低频 boom */
function playPortalSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // 主音：从高频扫到低频（"咻"）
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1600, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.35);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.28, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // 次音：共鸣泡泡感
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.4);
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.5);

    // 出现感：低频 boom
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(120, now);
    osc3.frequency.exponentialRampToValueAtTime(60, now + 0.18);
    gain3.gain.setValueAtTime(0.22, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc3.start(now);
    osc3.stop(now + 0.25);

    window.setTimeout(() => void ctx.close(), 800);
  } catch { /* ignore */ }
}

function LobsterDispatchMenu({
  lobster,
  shops,
  spots,
  onClose,
  onDispatchShop,
  onDispatchSpot,
}: {
  lobster: LobsterWalker;
  shops: typeof XUHUI_SHOPS;
  spots: typeof LOBSTER_WAIT_SPOTS;
  onClose: () => void;
  onDispatchShop: (shopId: string) => void;
  onDispatchSpot: (spotId: string) => void;
}) {
  return (
    <div
      className="pointer-events-auto animate-[menu-pop_420ms_cubic-bezier(0.22,1,0.36,1)]"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: 'rgba(30, 15, 5, 0.52)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,200,120,0.22)',
          padding: '10px 12px 10px',
          display: 'flex',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        {/* 左侧：被选中的龙虾大展示框 */}
        <div
          style={{
            flexShrink: 0,
            width: 160,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'rgba(255,200,100,0.10)',
            border: '1.5px solid rgba(255,200,100,0.36)',
            borderRadius: 18,
            padding: '10px 8px 8px',
            position: 'relative',
          }}
        >
          {/* 取消按钮悬浮在右上角 */}
          <button
            type="button"
            onClick={() => { playAudioFile('/usual.mp3', 0.5); onClose(); }}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '1px solid rgba(255,200,100,0.35)',
              background: 'rgba(255,200,100,0.12)',
              color: 'rgba(255,220,160,0.7)',
              fontSize: 11,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
          <img
            src={lobster.variant}
            alt={lobster.name}
            draggable={false}
            style={{ width: 110, height: 110, objectFit: 'contain', filter: 'drop-shadow(0 6px 16px rgba(255,160,60,0.55))' }}
          />
          <span style={{ fontSize: 16, fontWeight: 900, color: '#ffe97a', textShadow: '0 1px 4px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
            {lobster.name}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,220,140,0.6)', fontWeight: 700 }}>⚡ 3倍速冲过去</span>
        </div>

        {/* 右侧：按钮区居中 wrap */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,200,100,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>去餐厅</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
            {shops.map((shop) => (
              <DispatchBtn
                key={`${lobster.id}-${shop.id}`}
                icon={SHOP_ICONS[shop.id] ?? '🍽️'}
                label={`去 ${shop.name}`}
                sub="路过看看"
                onClick={() => onDispatchShop(shop.id)}
              />
            ))}
          </div>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,200,100,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>外部点位</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
            {spots.map((spot) => (
              <DispatchBtn
                key={`${lobster.id}-${spot.id}`}
                label={spot.label}
                onClick={() => onDispatchSpot(spot.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DispatchBtn({ icon, label, sub, onClick }: { icon?: string; label: string; sub?: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { playAudioFile('/usual.mp3', 0.5); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '6px 12px',
        borderRadius: 14,
        border: `1px solid ${hovered ? 'rgba(255,140,30,0.7)' : 'rgba(255,200,100,0.20)'}`,
        background: hovered ? 'rgba(235,110,20,0.88)' : 'rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'background 180ms, border-color 180ms, transform 180ms',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        minWidth: 70,
      }}
    >
      {icon ? <span style={{ fontSize: 15 }}>{icon}</span> : null}
      <span style={{ fontSize: 12, fontWeight: 900, color: hovered ? '#fff' : 'rgba(255,230,160,0.88)', whiteSpace: 'nowrap' }}>{label}</span>
      {sub ? <span style={{ fontSize: 10, color: hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,200,120,0.45)', fontWeight: 700 }}>{sub}</span> : null}
    </button>
  );
}

export default function XuhuiIslandPage() {
  const router = useRouter();
  const [shopMetrics, setShopMetrics] = useState<Record<string, ShopMetric>>(createShopMetrics);
  const [lobsters, setLobsters] = useState<LobsterWalker[]>(createInitialLobsters);
  const [soundEnabled, setSoundEnabled] = useState(true); // 默认显示已开启，首次交互后真正播放
  const [hoveredShopId, setHoveredShopId] = useState<string | null>(null);
  const [hoveredLobsterId, setHoveredLobsterId] = useState<string | null>(null);
  const [selectedLobsterId, setSelectedLobsterId] = useState<string | null>(null);
  const [boardSize, setBoardSize] = useState<BoardSize | null>(null); // null = 尚未测量，避免错误 scale 引发位移
  // 传送门特效状态：{ id, x%, y% } 对应地图百分比坐标
  const [portalEffect, setPortalEffect] = useState<{ id: number; x: number; y: number } | null>(null);
  const portalIdRef = useRef(0);
  const [videoReady, setVideoReady] = useState(false);
  const mapBoardRef = useRef<HTMLDivElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const ambientVideoRef = useRef<HTMLVideoElement>(null); // 专门播背景音乐的隐藏 video
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const ambientBootedRef = useRef(false);
  const ambientIntentRef = useRef(true);

  // 客户端 mount 后，用真实时间修正 rating（避免 SSR 固定值 12 与实际时间不符）
  useEffect(() => {
    const realHour = new Date().getHours();
    setShopMetrics((prev) => {
      const next = { ...prev };
      for (const shop of XUHUI_SHOPS) {
        if (next[shop.id]) {
          next[shop.id] = { ...next[shop.id], rating: computeHourlyRating(shop, realHour) };
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    // 画面视频永远静音
    const backgroundVideo = backgroundVideoRef.current;
    if (backgroundVideo) {
      backgroundVideo.muted = true;
      backgroundVideo.volume = 0;
      void backgroundVideo.play().catch(() => {});
    }

    if (ambientBootedRef.current) return;
    ambientBootedRef.current = true;
    ambientIntentRef.current = true;

    // 用隐藏 video 播音频：muted autoplay 绕过浏览器限制，canplay 后立刻 unmute
    const av = ambientVideoRef.current;
    if (!av) return;
    av.volume = 0.72;
    av.muted = true;
    void av.play().then(() => {
      // autoplay 成功后立刻 unmute
      av.muted = false;
      setSoundEnabled(true);
    }).catch(() => {
      // autoplay 被拦截，等首次交互
      setSoundEnabled(false);
      const onFirstGesture = () => {
        if (!ambientIntentRef.current) return;
        av.muted = false;
        void av.play().then(() => setSoundEnabled(true)).catch(() => {});
      };
      window.addEventListener('pointerdown', onFirstGesture, { passive: true, once: true });
      window.addEventListener('keydown', onFirstGesture, { passive: true, once: true });
    });
  }, []);

  useEffect(() => {
    const element = mapBoardRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setBoardSize({
        width: rect.width || DEFAULT_BOARD_SIZE.width,
        height: rect.height || DEFAULT_BOARD_SIZE.height,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const visitorDeltas = new Map<string, number>();

      setLobsters((currentLobsters) =>
        currentLobsters.reduce<LobsterWalker[]>((nextLobsters, lobster, index) => {
          if (now < lobster.nextActionAt) {
            nextLobsters.push(lobster);
            return nextLobsters;
          }

          if (lobster.mode === 'traveling') {
            if (lobster.destination.kind === 'shop') {
              visitorDeltas.set(
                lobster.destination.id,
                (visitorDeltas.get(lobster.destination.id) ?? 0) + 1
              );
              nextLobsters.push({
                ...lobster,
                currentShopId: lobster.destination.id,
                mode: 'inside',
                scale: 0.34,
                opacity: 0,
                bubbleText: undefined,
                nextActionAt: now + getRandomInsideDuration(),
              });
              return nextLobsters;
            }

            nextLobsters.push({
              ...lobster,
              mode: 'speaking',
              scale: 1,
              opacity: 1,
              bubbleText: getRandomBubbleLine(),
              bubbleKey: lobster.bubbleKey + 1,
              nextActionAt: now + SPEAK_DURATION_MS,
            });
            return nextLobsters;
          }

          if (lobster.mode === 'speaking') {
            nextLobsters.push({
              ...lobster,
              mode: 'resting',
              bubbleText: undefined,
              nextActionAt: now + REST_DURATION_MS,
            });
            return nextLobsters;
          }

          const leavingShopId = lobster.mode === 'inside' ? lobster.currentShopId : undefined;
          if (leavingShopId) {
            visitorDeltas.set(leavingShopId, (visitorDeltas.get(leavingShopId) ?? 0) - 1);
          }

          const referenceLobsters = [...nextLobsters, ...currentLobsters.slice(index + 1)];
          const nextDestination =
            lobster.mode === 'inside'
              ? chooseSpreadDestination(referenceLobsters.filter((item) => item.id !== lobster.id), 'spot')
              : chooseSpreadDestination(referenceLobsters.filter((item) => item.id !== lobster.id), 'shop', leavingShopId);
          const destinationSlot = findDestinationSlot(referenceLobsters, nextDestination, lobster.id);
          const nextPoint = toDestinationPoint(nextDestination, destinationSlot);

          nextLobsters.push({
            ...lobster,
            x: nextPoint.x,
            y: nextPoint.y,
            destinationSlot,
            mode: 'traveling',
            destination: nextDestination,
            currentShopId: undefined,
            scale: 1,
            opacity: 1,
            bubbleText: undefined,
            isDispatched: false, // 自动行走，正常速度
            nextActionAt: now + TRAVEL_DURATION_MS,
          });
          return nextLobsters;
        }, [])
      );

      if (visitorDeltas.size > 0) {
        setShopMetrics((currentMetrics) => {
          const nextMetrics = { ...currentMetrics };
          visitorDeltas.forEach((delta, shopId) => {
            const currentMetric = nextMetrics[shopId];
            if (!currentMetric) return;
            nextMetrics[shopId] = {
              ...currentMetric,
              visitorCount: clamp(currentMetric.visitorCount + delta, 8, 99),
              motionTick: currentMetric.motionTick + 1,
            };
          });
          return nextMetrics;
        });
      }
    }, 900);

    return () => window.clearInterval(timer);
  }, [boardSize]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentHour = new Date().getHours();

      setShopMetrics((currentMetrics) =>
        Object.fromEntries(
          XUHUI_SHOPS.map((shop) => {
            const currentMetric = currentMetrics[shop.id];
            const visitorSwing = Math.random() < 0.58 ? 0 : Math.random() > 0.5 ? 1 : -1;
            const welfareDrop = Math.random() < 0.45 ? 1 : 0;

            return [
              shop.id,
              {
                ...currentMetric,
                visitorCount: clamp(
                  (currentMetric?.visitorCount ?? shop.baseVisitors) + visitorSwing,
                  8,
                  99
                ),
                welfareLeft: Math.max(0, (currentMetric?.welfareLeft ?? 40) - welfareDrop),
                rating: computeHourlyRating(shop, currentHour),
                motionTick: (currentMetric?.motionTick ?? 0) + 1,
              },
            ];
          })
        ) as Record<string, ShopMetric>
      );
    }, 3800);

    return () => window.clearInterval(timer);
  }, []);

  const toggleAmbientSound = () => {
    const av = ambientVideoRef.current;
    if (soundEnabled) {
      if (av) { av.muted = true; av.pause(); }
      ambientIntentRef.current = false;
      setSoundEnabled(false);
    } else {
      ambientIntentRef.current = true;
      if (av) {
        av.muted = false;
        void av.play().then(() => setSoundEnabled(true)).catch(() => {});
      }
    }
  };

  const enterShop = (shop: XuhuiShop) => {
    track('xuhui_shop_enter', { shopId: shop.id, shopName: shop.name });
    playAudioFile('/put.wav', 0.7);
    router.push(`/xuhui-island/shop/${shop.id}`);
  };

  const dispatchLobster = (
    lobsterId: string,
    destination: { kind: 'shop'; id: string } | { kind: 'spot'; id: string }
  ) => {
    const now = Date.now();

    setLobsters((currentLobsters) => {
      const destinationSlot = findDestinationSlot(currentLobsters, destination, lobsterId);
      const point = toDestinationPoint(destination, destinationSlot);

      return currentLobsters.map((lobster) => {
        if (lobster.id !== lobsterId) return lobster;

        if (lobster.mode === 'inside' && lobster.currentShopId) {
          setShopMetrics((currentMetrics) => {
            const currentMetric = currentMetrics[lobster.currentShopId!];
            if (!currentMetric) return currentMetrics;
            return {
              ...currentMetrics,
              [lobster.currentShopId!]: {
                ...currentMetric,
                visitorCount: clamp(currentMetric.visitorCount - 1, 8, 99),
                motionTick: currentMetric.motionTick + 1,
              },
            };
          });
        }

        // 第一步：把龙虾瞬移到桥的位置（地图底部居中）作为传送出现点
        return {
          ...lobster,
          x: 48,     // 桥所在位置，水平约 48%（底部居中）
          y: 90,     // 桥所在位置，垂直约 90%
          destinationSlot,
          mode: 'traveling' as const,
          destination,
          currentShopId: undefined,
          scale: 1,
          opacity: 1,
          bubbleText: undefined,
          bubbleKey: lobster.bubbleKey + 1,
          isDispatched: true,
          isDispatching: true, // 瞬移中，transition 关闭
          dispatchTarget: point, // 记录最终目标
          nextActionAt: now + TRAVEL_DURATION_FAST_MS,
        };
      });
    });
    setSelectedLobsterId(null);

    // 派遣后 1 秒播放 wind 声效
    window.setTimeout(() => playAudioFile('/wind.mp3', 0.6), 1000);

    // 触发传送门特效：从桥的位置爆出（与龙虾出现点一致）
    const portalX = 48; // 桥的水平位置
    const portalY = 90; // 桥的垂直位置
    const effectId = ++portalIdRef.current;
    setPortalEffect({ id: effectId, x: portalX, y: portalY });
    // 播放传送音效
    playPortalSound();
    // 1.2s 后清除特效
    window.setTimeout(() => {
      setPortalEffect((cur) => (cur?.id === effectId ? null : cur));
    }, 1200);

    // 下一帧：开启 transition，把坐标设为最终目标，龙虾从底部飞出
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLobsters((currentLobsters) =>
          currentLobsters.map((lobster) => {
            if (lobster.id !== lobsterId || !lobster.isDispatching || !lobster.dispatchTarget) return lobster;
            return {
              ...lobster,
              x: lobster.dispatchTarget.x,
              y: lobster.dispatchTarget.y,
              isDispatching: false,
              dispatchTarget: undefined,
            };
          })
        );
      });
    });
  };

  const selectedLobster = lobsters.find((lobster) => lobster.id === selectedLobsterId) ?? null;
  const boardScale = boardSize
    ? (Math.min(
        boardSize.width / DEFAULT_BOARD_SIZE.width,
        boardSize.height / DEFAULT_BOARD_SIZE.height
      ) || 1)
    : null; // null 时隐藏龙虾层，避免位移抖动

  return (
    <main style={pageStyle}>
      <PageTracker page="xuhui-island" />
      {/* 隐藏的背景音乐 video（map-bg-original.mp4 有声音轨），muted autoplay 启动后 unmute */}
      <video
        ref={ambientVideoRef}
        src="/xuhui-island/map-bg-original.mp4"
        loop
        muted
        playsInline
        preload="auto"
        style={{ display: 'none' }}
      />

      {/* === 海洋水面动态背景层 === */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="ocean-wave-deep" style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.016) 1px, transparent 2px, transparent 60px)',
          backgroundSize: '120px 100%',
        }} />
        <div className="ocean-wave-mid" style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(92deg, transparent 0px, rgba(80,200,180,0.022) 2px, transparent 4px, transparent 80px)',
          backgroundSize: '200px 100%',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 15% 25%, rgba(100,220,200,0.07) 0%, transparent 45%), radial-gradient(ellipse at 80% 65%, rgba(60,180,200,0.055) 0%, transparent 45%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(5,40,50,0.2) 100%)',
        }} />
      </div>

      <section style={{ ...heroStyle, position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...badgeStyle, background: 'rgba(15,80,68,0.55)', color: '#7eeee0', border: '1px solid rgba(100,220,200,0.3)', letterSpacing: '0.12em' }}>🏝️ JINYANG ISLAND · 美食岛</div>
          <button
            type="button"
            onClick={() => { playAudioFile('/usual.mp3', 0.5); toggleAmbientSound(); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 999,
              background: soundEnabled ? 'rgba(15,80,68,0.5)' : 'rgba(8,40,55,0.45)',
              color: soundEnabled ? '#7eeee0' : '#4a9a94',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              border: `1px solid ${soundEnabled ? 'rgba(100,220,200,0.35)' : 'rgba(60,160,150,0.2)'}`,
            }}
          >
            <span>{soundEnabled ? '🌊' : '🔇'}</span>
            {soundEnabled ? '关闭海浪声' : '开启海浪声'}
          </button>
        </div>

        <h1
          style={{
            margin: '14px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            fontSize: 'clamp(30px, 5vw, 48px)',
            lineHeight: 1.04,
            color: '#b8f0e8',
            textShadow: '0 0 30px rgba(80,200,180,0.35)',
          }}
        >
          <span style={{ fontSize: '1.18em', lineHeight: 1 }}>🏝️</span>
          <span>美食之岛 · 解锁8大秘境 · 金杨, 上海</span>
        </h1>
        <p style={{ margin: '14px 0 0', maxWidth: 760, fontSize: 16, lineHeight: 1.8, color: 'rgba(160,230,220,0.72)' }}>
          这片漂浮在蓝绿色海洋上的美食岛，藏着8家各有烟火气的餐厅。和岛上的小龙虾一起探索，进店开聊、看菜单、赚积分！
        </p>
      </section>

      <section style={mapShellStyle}>
        <div ref={mapBoardRef} style={mapBoardStyle}>
          <img
            src="/xuhui-island/map-bg.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: videoReady ? 0 : 1,
              transition: 'opacity 400ms ease',
              pointerEvents: 'none',
            }}
          />
          <video
            ref={backgroundVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: videoReady ? 1 : 0,
              transition: videoReady ? 'opacity 200ms ease' : 'none',
            }}
          >
            <source src="/xuhui-island/map-bg.mp4" type="video/mp4" />
          </video>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,229,182,0.02) 48%, rgba(93,55,30,0.08) 100%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 15% 22%, rgba(255,255,255,0.16) 0%, transparent 28%), radial-gradient(circle at 84% 68%, rgba(255,255,255,0.12) 0%, transparent 24%)',
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: DEFAULT_BOARD_SIZE.width,
              height: DEFAULT_BOARD_SIZE.height,
              transform: boardScale ? `scale(${boardScale})` : 'scale(1)',
              transformOrigin: 'top left',
              zIndex: 3,
              // 首次测量完成前隐藏，避免 scale 跳变产生位移抖动
              visibility: boardScale ? 'visible' : 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                zIndex: 5,
                padding: '8px 12px',
                borderRadius: 999,
                background: 'rgba(255,248,230,0.88)',
                color: '#a16639',
                fontSize: 12,
                fontWeight: 800,
                boxShadow: '0 8px 18px rgba(117,74,37,0.16)',
              }}
            >
              Q版游戏地图
            </div>

            {lobsters.map((lobster) => {
              const isSelected = selectedLobsterId === lobster.id;
              const isHoveredLobster = hoveredLobsterId === lobster.id;
              // 被选中的龙虾在底部弹框展示，地图上隐藏
              const hiddenOnMap = isSelected;
              // 移动时长：被派遣的用快速时长
              const travelDuration = lobster.isDispatched ? TRAVEL_DURATION_FAST_MS : TRAVEL_DURATION_MS;

              return (
                <div
                  key={lobster.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (lobster.opacity < 0.1) return;
                    playAudioFile('/paopao.mp3', 0.7);
                    setSelectedLobsterId((current) => (current === lobster.id ? null : lobster.id));
                  }}
                  onMouseEnter={() => setHoveredLobsterId(lobster.id)}
                  onMouseLeave={() => setHoveredLobsterId((cur) => cur === lobster.id ? null : cur)}
                  style={{
                    position: 'absolute',
                    left: `${lobster.x}%`,
                    top: `${lobster.y}%`,
                    zIndex: isSelected ? 9 : (isHoveredLobster ? 8 : 6),
                    width: 118,
                    height: 118,
                    transform: `translate(-50%, -50%) scale(${hiddenOnMap ? 0 : lobster.scale})`,
                    opacity: hiddenOnMap ? 0 : lobster.opacity,
                    transition: lobster.isDispatching
                      ? 'transform 900ms ease, opacity 900ms ease'  // 瞬移中：只保留 scale/opacity 过渡，left/top 无动画
                      : `left ${travelDuration}ms ease-in-out, top ${travelDuration}ms ease-in-out, transform 900ms ease, opacity 900ms ease`,
                    pointerEvents: lobster.opacity < 0.1 || hiddenOnMap ? 'none' : 'auto',
                    cursor: 'pointer',
                  }}
                >
                  {/* hover 发光圆环 */}
                  {isHoveredLobster ? (
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '54%',
                      width: 104,
                      height: 104,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      background: 'radial-gradient(circle, rgba(255,200,80,0.28) 0%, rgba(255,160,40,0.14) 50%, transparent 75%)',
                      border: '2px solid rgba(255,200,80,0.55)',
                      boxShadow: '0 0 18px rgba(255,180,50,0.45), inset 0 0 12px rgba(255,200,80,0.2)',
                      animation: 'lobster-ring-pulse 1.4s ease-in-out infinite',
                    }} />
                  ) : null}

                  {lobster.mode === 'speaking' && lobster.bubbleText ? (
                    <div
                      key={`${lobster.id}-${lobster.bubbleKey}`}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '88%',
                        transform: 'translateX(-50%)',
                        padding: '10px 14px',
                        borderRadius: 18,
                        background: 'rgba(255, 251, 242, 0.88)',
                        color: '#6d4b37',
                        fontSize: 13,
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 14px 24px rgba(55,34,20,0.16)',
                        border: '1px solid rgba(255,255,255,0.75)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        animation: 'npc-bubble-rise 3.8s ease-out forwards',
                        pointerEvents: 'none',
                      }}
                    >
                      {lobster.bubbleText}
                      <span
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: -7,
                          width: 14,
                          height: 14,
                          background: 'rgba(255, 251, 242, 0.88)',
                          borderRight: '1px solid rgba(255,255,255,0.75)',
                          borderBottom: '1px solid rgba(255,255,255,0.75)',
                          transform: 'translateX(-50%) rotate(45deg)',
                        }}
                      />
                    </div>
                  ) : null}

                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      transform: 'translateX(-50%)',
                      color: '#ffe66a',
                      fontSize: 15,
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 0 rgba(93,44,17,1), 0 2px 0 rgba(93,44,17,0.92), 0 0 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    {lobster.name}
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '54%',
                      width: 88,
                      height: 88,
                      transform: 'translate(-50%, -50%)',
                      transition: 'transform 900ms ease',
                      filter: (isSelected || isHoveredLobster)
                        ? 'drop-shadow(0 0 14px rgba(255,231,133,0.75)) drop-shadow(0 12px 20px rgba(0,0,0,0.22))'
                        : 'drop-shadow(0 12px 20px rgba(0,0,0,0.22))',
                      animation: lobster.mode === 'resting' || lobster.mode === 'speaking'
                        ? 'lobster-idle 5.8s ease-in-out infinite'
                        : 'none',
                    }}
                  >
                    <img
                      src={lobster.variant}
                      alt=""
                      draggable={false}
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {XUHUI_SHOPS.map((shop) => (
              (() => {
                const metric = shopMetrics[shop.id];
                const displaySize = Math.round(shop.size * 2 * (shop.mapScale ?? 1));
                const isHovered = hoveredShopId === shop.id;

                return (
              <button
                key={shop.id}
                type="button"
                aria-label={`进入${shop.name}`}
                onClick={() => enterShop(shop)}
                onMouseEnter={() => { setHoveredShopId(shop.id); playAudioFile('/longpaopao.mp3', 0.35); }}
                onMouseLeave={() => setHoveredShopId((current) => (current === shop.id ? null : current))}
                onFocus={() => setHoveredShopId(shop.id)}
                onBlur={() => setHoveredShopId((current) => (current === shop.id ? null : current))}
                style={{
                  position: 'absolute',
                  left: `calc(${shop.x}% + ${shop.mapOffsetX ?? 0}px)`,
                  top: `calc(${shop.y}% + ${shop.mapOffsetY ?? 0}px)`,
                  zIndex: isHovered ? 8 : 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translate(-50%, -50%)',
                  border: 0,
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 'calc(100% - 18px)',
                    minWidth: 220,
                    opacity: isHovered ? 1 : 0,
                    pointerEvents: 'none',
                    transform: `translateY(${isHovered ? 0 : 10}px) scale(${isHovered ? 1 : 0.96})`,
                    transition: 'opacity 260ms ease, transform 260ms ease',
                    ...metricGlassStyle,
                    textAlign: 'left',
                    animation: `metric-bob 4.8s ease-in-out ${(hashShopId(shop.id) % 5) * 0.3}s infinite`,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>{`《 ${shop.name} 》`}</div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800 }}>
                    在店人数：
                    <span className="metric-value" style={{ marginLeft: 2, color: '#2f7de1' }}>
                      {metric?.visitorCount ?? shop.baseVisitors}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800 }}>
                    今日星级：{renderStars(metric?.rating ?? 5)}{' '}
                    <span className="metric-value" style={{ color: '#2f7de1' }}>
                      {(metric?.rating ?? 5).toFixed(1)}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800 }}>
                    福利餐剩余：
                    <span className="metric-value" style={{ marginLeft: 2, color: '#2f7de1' }}>
                      {metric?.welfareLeft ?? 0}
                    </span>{' '}
                    份
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    borderRadius: 999,
                    background: 'rgba(8, 17, 24, 0.42)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: '0 14px 28px rgba(10, 18, 28, 0.18)',
                    backdropFilter: 'blur(16px) saturate(1.08)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.08)',
                    color: '#fff7ef',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: 'rgba(255,250,242,0.96)',
                      textShadow: '0 1px 10px rgba(0,0,0,0.16)',
                    }}
                  >
                    {shop.name}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '2px 0 0',
                      color: 'rgba(230, 242, 240, 0.68)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'rgba(125, 232, 193, 0.82)',
                        boxShadow: '0 0 8px rgba(125,232,193,0.32)',
                        flexShrink: 0,
                      }}
                    />
                    营业中
                  </span>
                </div>

                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '53%',
                    width: displaySize * 0.9,
                    height: displaySize * 0.54,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 260ms ease',
                    background:
                      'radial-gradient(circle, rgba(255, 203, 125, 0.34) 0%, rgba(255, 171, 75, 0.2) 42%, rgba(255, 171, 75, 0.02) 72%, rgba(255, 171, 75, 0) 100%)',
                    filter: 'blur(12px)',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 34,
                    width: displaySize * 0.52,
                    height: 76,
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  {[0, 1, 2].map((index) => (
                    <span
                      key={`${shop.id}-smoke-${index}`}
                      style={{
                        position: 'absolute',
                        left: `${24 + index * 22}%`,
                        bottom: 0,
                        width: 20 + index * 7,
                        height: 28 + index * 10,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.24) 52%, rgba(255,255,255,0) 100%)',
                        filter: 'blur(6px)',
                        animation: `steam-rise 5.6s ease-out ${index * 0.8}s infinite`,
                        opacity: 0.82,
                      }}
                    />
                  ))}
                </div>

                <span
                  style={{
                    position: 'absolute',
                    top: '62%',
                    width: displaySize * 0.86,
                    height: 28,
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.34)',
                    filter: 'blur(12px)',
                    transform: 'translateY(-50%)',
                  }}
                />

                {/* 水波扩散效果 */}
                <span style={{
                  position: 'absolute',
                  left: '50%',
                  top: '58%',
                  width: displaySize * 0.7,
                  height: displaySize * 0.25,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(80,200,180,0.25)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  animation: `ripple-expand ${5.8 + (hashShopId(shop.id) % 3) * 0.8}s ease-out ${(hashShopId(shop.id) % 4) * 0.7}s infinite`,
                }} />
                {/* 浮动动画包裹层：island-bob 在此层，不干扰图片的 hover transform */}
                <div style={{
                  display: 'block',
                  width: displaySize,
                  height: displaySize,
                  animation: `island-bob ${8.2 + (hashShopId(shop.id) % 3) * 0.8}s ease-in-out ${(hashShopId(shop.id) % 5) * 0.45}s infinite`,
                  position: 'relative',
                  zIndex: 2,
                }}>
                  <img
                    src={shop.image}
                    alt={shop.name}
                    width={displaySize}
                    height={displaySize}
                    draggable={false}
                    className="island-shop-img"
                    style={{
                      display: 'block',
                      width: displaySize,
                      height: displaySize,
                      objectFit: 'contain',
                      transform: isHovered ? 'translateY(-6px) scale(1.03)' : 'translateY(0px) scale(1)',
                      transition: 'transform 200ms ease',
                      filter: 'drop-shadow(0 28px 36px rgba(0,0,0,0.38)) saturate(1.08)',
                    }}
                  />
                </div>
              </button>
                );
              })()
            ))}

            {CONSTRUCTION_SITES.map((site, index) => (
              <div
                key={site.id}
                style={{
                  position: 'absolute',
                  left: `calc(${site.x}% + ${site.offsetX}px)`,
                  top: `calc(${site.y}% + ${site.offsetY}px)`,
                  zIndex: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(66, 48, 36, 0.78)',
                    border: '1px solid rgba(255,255,255,0.24)',
                    color: '#fff6e7',
                    fontSize: 12,
                    fontWeight: 900,
                    boxShadow: '0 12px 24px rgba(34, 20, 12, 0.26)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  建设中
                  <span className="status-dot status-dot-1">.</span>
                  <span className="status-dot status-dot-2">.</span>
                  <span className="status-dot status-dot-3">.</span>
                </div>

                <span
                  style={{
                    position: 'absolute',
                    top: '62%',
                    width: 88,
                    height: 24,
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.28)',
                    filter: 'blur(10px)',
                    transform: 'translateY(-50%)',
                  }}
                />

                <img
                  src="/xuhui-island-clean/building.png"
                  alt={`建设中的店铺 ${index + 1}`}
                  draggable={false}
                  style={{
                    display: 'block',
                    width: 118,
                    height: 118,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.24)) saturate(1.02)',
                  }}
                />
              </div>
            ))}

            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 16,
                transform: 'translateX(-50%)',
                zIndex: 5,
                padding: '10px 18px',
                borderRadius: 999,
                background: 'rgba(5,30,50,0.65)',
                border: '1px solid rgba(100,220,200,0.2)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                color: 'rgba(160,230,220,0.85)',
                fontSize: 12,
                fontWeight: 700,
                boxShadow: '0 16px 30px rgba(0,20,40,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              点击店铺直接进入店内，查看菜单、聊天或打工赚积分
            </div>

            {/* 传送门特效：从白色圆圈位置爆出 */}
            {portalEffect ? (
              <div
                key={portalEffect.id}
                style={{
                  position: 'absolute',
                  left: `${portalEffect.x}%`,
                  top: `${portalEffect.y}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              >
                {/* 外层扩散光环1 */}
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: 160, height: 160,
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 0 24px rgba(255,255,255,0.7), 0 0 48px rgba(180,220,255,0.5)',
                  transform: 'translate(-50%,-50%)',
                  animation: 'portal-ring-expand 1.0s ease-out forwards',
                }} />
                {/* 外层扩散光环2（延迟） */}
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: 100, height: 100,
                  borderRadius: '50%',
                  border: '2px solid rgba(180,220,255,0.8)',
                  boxShadow: '0 0 16px rgba(180,220,255,0.6)',
                  transform: 'translate(-50%,-50%)',
                  animation: 'portal-ring-expand 1.0s ease-out 0.12s forwards',
                }} />
                {/* 中心强光闪 */}
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: 70, height: 70,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,230,255,0.7) 40%, transparent 75%)',
                  transform: 'translate(-50%,-50%)',
                  animation: 'portal-core-flash 0.6s ease-out forwards',
                }} />
                {/* 旋转光圈 */}
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: 120, height: 120,
                  borderRadius: '50%',
                  border: '2px dashed rgba(160,200,255,0.7)',
                  transform: 'translate(-50%,-50%)',
                  animation: 'portal-spin 0.6s linear forwards, portal-ring-expand 1.0s ease-out 0.05s forwards',
                }} />
                {/* 粒子光点 */}
                {[0,1,2,3,4,5,6,7].map((i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(180,220,255,0.85)',
                    boxShadow: '0 0 6px rgba(200,230,255,0.8)',
                    transformOrigin: '0 0',
                    animation: `portal-particle-${i} 0.9s ease-out forwards`,
                    transform: `translate(-50%,-50%) rotate(${i * 45}deg) translate(0, -55px)`,
                    animationDelay: `${i * 0.02}s`,
                  }} />
                ))}
              </div>
            ) : null}
          </div>

        </div>

        {/* 派遣面板：在 section 内、mapBoard 外，absolute 贴底，不被 overflow:hidden 裁切 */}
        {selectedLobster ? (
          <LobsterDispatchMenu
            lobster={selectedLobster}
            shops={XUHUI_SHOPS}
            spots={LOBSTER_WAIT_SPOTS}
            onClose={() => setSelectedLobsterId(null)}
            onDispatchShop={(shopId) => dispatchLobster(selectedLobster.id, { kind: 'shop', id: shopId })}
            onDispatchSpot={(spotId) => dispatchLobster(selectedLobster.id, { kind: 'spot', id: spotId })}
          />
        ) : null}
      </section>


      <section
        style={{
          maxWidth: 1420,
          margin: '14px auto 0',
        }}
      >
        <div style={statsRowStyle}>
          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: 'rgba(100,220,200,0.7)' }}>🏪 入驻门店</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: '#7eeee0' }}>{XUHUI_SHOPS.length}</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: 'rgba(100,220,200,0.7)' }}>📍 所在商场</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900, color: '#7eeee0' }}>浦东 LCM</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: 'rgba(100,220,200,0.7)' }}>🦞 岛上巡游虾</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: '#7eeee0' }}>{lobsters.length}</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: 'rgba(100,220,200,0.7)' }}>🌊 世界观</div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 900, color: '#7eeee0', lineHeight: 1.4 }}>漂浮海洋上的美食岛</div>
          </div>
        </div>
      </section>
      <style jsx>{`
        .metric-value {
          display: inline-block;
          animation: metric-hop 2.8s ease-in-out infinite;
        }

        .status-dot {
          display: inline-block;
          width: 0.2em;
          text-align: center;
          opacity: 0.12;
          animation: status-blink 1.2s steps(1) infinite;
        }

        .status-dot-2 {
          animation-delay: 0.2s;
        }

        .status-dot-3 {
          animation-delay: 0.4s;
        }

        /* 海洋水波流动动效 */
        .ocean-wave-deep {
          animation: ocean-flow-x 26s linear infinite;
          opacity: 0.6;
        }
        .ocean-wave-mid {
          animation: ocean-flow-x 18s linear infinite reverse;
          opacity: 0.5;
        }

        /* 岛屿轻微上下浮动 */
        .island-float {
          animation: island-bob 8.5s ease-in-out infinite;
        }

        @keyframes ocean-flow-x {
          0% { background-position-x: 0; }
          100% { background-position-x: 200px; }
        }

        @keyframes island-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }

        @keyframes steam-rise {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.72);
          }
          20% {
            opacity: 0.82;
          }
          100% {
            opacity: 0;
            transform: translate3d(10px, -52px, 0) scale(1.46);
          }
        }

        @keyframes lobster-idle {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-4px); }
        }

        @keyframes menu-pop {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lobster-ring-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.75; }
        }

        @keyframes npc-bubble-rise {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(10px) scale(0.94);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-26px) scale(1.02);
          }
        }

        @keyframes metric-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes metric-hop {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          35% {
            transform: translateY(-2px) scale(1.06);
          }
          60% {
            transform: translateY(1px) scale(0.98);
          }
        }

        @keyframes status-blink {
          0%,
          100% {
            opacity: 0.12;
          }
          50% {
            opacity: 1;
          }
        }

        /* 水波扩散效果 */
        @keyframes ripple-expand {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }

        /* 数字跳动 */
        @keyframes num-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-3px) scale(1.05); }
          65% { transform: translateY(1px) scale(0.97); }
        }

        /* 传送门特效 */
        @keyframes portal-ring-expand {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 1; }
          60%  { opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(3.2); opacity: 0; }
        }

        @keyframes portal-core-flash {
          0%   { transform: translate(-50%,-50%) scale(0.1); opacity: 1; }
          35%  { transform: translate(-50%,-50%) scale(1.4); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(0.6); opacity: 0; }
        }

        @keyframes portal-spin {
          0%   { transform: translate(-50%,-50%) rotate(0deg); }
          100% { transform: translate(-50%,-50%) rotate(360deg); }
        }

        /* 8个粒子向不同方向飞散 */
        @keyframes portal-particle-0 {
          0%   { transform: translate(-50%,-50%) rotate(0deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(0deg) translate(0,-80px) scale(0); opacity:0; }
        }
        @keyframes portal-particle-1 {
          0%   { transform: translate(-50%,-50%) rotate(45deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(45deg) translate(0,-75px) scale(0); opacity:0; }
        }
        @keyframes portal-particle-2 {
          0%   { transform: translate(-50%,-50%) rotate(90deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(90deg) translate(0,-82px) scale(0); opacity:0; }
        }
        @keyframes portal-particle-3 {
          0%   { transform: translate(-50%,-50%) rotate(135deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(135deg) translate(0,-70px) scale(0); opacity:0; }
        }
        @keyframes portal-particle-4 {
          0%   { transform: translate(-50%,-50%) rotate(180deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(180deg) translate(0,-78px) scale(0); opacity:0; }
        }
        @keyframes portal-particle-5 {
          0%   { transform: translate(-50%,-50%) rotate(225deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(225deg) translate(0,-72px) scale(0); opacity:0; }
        }
        @keyframes portal-particle-6 {
          0%   { transform: translate(-50%,-50%) rotate(270deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(270deg) translate(0,-80px) scale(0); opacity:0; }
        }
        @keyframes portal-particle-7 {
          0%   { transform: translate(-50%,-50%) rotate(315deg) translate(0,-10px); opacity:1; }
          100% { transform: translate(-50%,-50%) rotate(315deg) translate(0,-74px) scale(0); opacity:0; }
        }
      `}</style>
    </main>
  );
}
