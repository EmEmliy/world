'use client';

import { useRouter } from 'next/navigation';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { PageTracker } from '@/components/game/page-tracker';
import { track } from '@/lib/tracker';
import { XUHUI_SHOPS, type XuhuiShop } from '@/config/xuhui-shops';

interface LobsterWalker {
  id: string;
  name: string;
  variant: string;
  x: number;
  y: number;
  flipped: boolean;
  mode: 'traveling' | 'inside' | 'resting';
  destination: { kind: 'shop'; id: string } | { kind: 'spot'; id: string };
  currentShopId?: string;
  nextActionAt: number;
  scale: number;
  opacity: number;
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
  '/crayfish/base.png',
  '/crayfish/glasses.png',
  '/crayfish/hat.png',
  '/crayfish/mask.png',
  '/crayfish/apron.png',
];

const LOBSTER_NAMES = ['不饿', '饭团', '来福', '阿满', '小馋', '旺财', '冲冲'];
const LOBSTER_WAIT_SPOTS = [
  { id: 'bridge', label: '桥边等位', x: 60, y: 71 },
  { id: 'hill', label: '山坡打卡', x: 42, y: 37 },
  { id: 'pier', label: '码头闲逛', x: 12, y: 63 },
  { id: 'shore', label: '海边发呆', x: 79, y: 82 },
];
const CONSTRUCTION_SITES = [
  { id: 'construction-1', x: 18, y: 83, offsetX: 12, offsetY: -6 },
  { id: 'construction-2', x: 61.5, y: 83.5, offsetX: -8, offsetY: -6 },
  { id: 'construction-3', x: 86, y: 79, offsetX: -26, offsetY: -8 },
];
const DEFAULT_BOARD_SIZE: BoardSize = { width: 1420, height: 923 };
const TRAVEL_DURATION_MS = 3900;
const REST_DURATION_MS = 3400;

const hashShopId = (shopId: string) =>
  Array.from(shopId).reduce((total, char) => total + char.charCodeAt(0), 0);

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
        rating: computeHourlyRating(shop, new Date().getHours()),
        motionTick: 0,
      },
    ])
  ) as Record<string, ShopMetric>;

const toShopAnchorPoint = (shop: XuhuiShop, boardSize: BoardSize = DEFAULT_BOARD_SIZE) => {
  const width = boardSize.width || DEFAULT_BOARD_SIZE.width;
  const height = boardSize.height || DEFAULT_BOARD_SIZE.height;

  return {
    x: clamp(shop.x + ((shop.mapOffsetX ?? 0) / width) * 100, 8, 92),
    y: clamp(shop.y + (((shop.mapOffsetY ?? 0) + 34) / height) * 100, 10, 95),
  };
};

const toMarkerPoint = (shop: XuhuiShop, boardSize: BoardSize = DEFAULT_BOARD_SIZE) => {
  const anchor = toShopAnchorPoint(shop, boardSize);

  return {
    x: clamp(anchor.x + (Math.random() * 1.6 - 0.8), 8, 92),
    y: clamp(anchor.y + (Math.random() * 1.8 - 0.9), 10, 95),
  };
};

const findShopById = (shopId: string) => XUHUI_SHOPS.find((shop) => shop.id === shopId);
const findSpotById = (spotId: string) => LOBSTER_WAIT_SPOTS.find((spot) => spot.id === spotId);

const getRandomShopDestination = (excludeShopId?: string) => {
  const candidates = XUHUI_SHOPS.filter((shop) => shop.id !== excludeShopId);
  const nextShop = candidates[Math.floor(Math.random() * candidates.length)] ?? XUHUI_SHOPS[0];
  return { kind: 'shop' as const, id: nextShop.id };
};

const getRandomInsideDuration = () => 2200 + Math.floor(Math.random() * 2400);

const toDestinationPoint = (destination: LobsterWalker['destination']) => {
  if (destination.kind === 'shop') {
    const shop = findShopById(destination.id) ?? XUHUI_SHOPS[0];
    return toMarkerPoint(shop);
  }

  const spot = findSpotById(destination.id) ?? LOBSTER_WAIT_SPOTS[0];
  return { x: spot.x, y: spot.y };
};

const createInitialLobsters = (): LobsterWalker[] =>
  Array.from({ length: 7 }, (_, index) => {
    const now = Date.now();
    const shop = XUHUI_SHOPS[index % XUHUI_SHOPS.length];
    const point = toMarkerPoint(shop, DEFAULT_BOARD_SIZE);

    return {
      id: `lobster-${index}`,
      name: LOBSTER_NAMES[index % LOBSTER_NAMES.length],
      variant: LOBSTER_VARIANTS[index % LOBSTER_VARIANTS.length],
      x: point.x,
      y: point.y,
      flipped: index % 2 === 0,
      mode: 'traveling',
      destination: { kind: 'shop', id: shop.id },
      currentShopId: undefined,
      nextActionAt: now + 1200 + index * 380,
      scale: 1,
      opacity: 1,
    };
  });

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
};

const mapBoardStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10.4',
  overflow: 'hidden',
  borderRadius: 24,
  border: '4px solid #fff0d0',
  background: 'url(/xuhui-island/map-bg.png) center / cover no-repeat',
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

export default function XuhuiIslandPage() {
  const router = useRouter();
  const [shopMetrics, setShopMetrics] = useState<Record<string, ShopMetric>>(createShopMetrics);
  const [lobsters, setLobsters] = useState<LobsterWalker[]>(createInitialLobsters);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hoveredShopId, setHoveredShopId] = useState<string | null>(null);
  const [selectedLobsterId, setSelectedLobsterId] = useState<string | null>(null);
  const [boardSize, setBoardSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const mapBoardRef = useRef<HTMLDivElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const crowdAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const backgroundVideo = backgroundVideoRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (backgroundVideo) {
      backgroundVideo.muted = true;
      backgroundVideo.volume = 1;
      void backgroundVideo.play().catch(() => undefined);
    }
    if (crowdAudio) crowdAudio.volume = 0.18;
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
    const storedState = window.sessionStorage.getItem('xuhui-ambient-enabled');
    const shouldEnable = storedState !== '0';
    if (!storedState) window.sessionStorage.setItem('xuhui-ambient-enabled', '1');
    setSoundEnabled(shouldEnable);
  }, []);

  useEffect(() => {
    const backgroundVideo = backgroundVideoRef.current;
    const crowdAudio = crowdAudioRef.current;

    window.sessionStorage.setItem('xuhui-ambient-enabled', soundEnabled ? '1' : '0');
    if (backgroundVideo) {
      backgroundVideo.muted = !soundEnabled;
      backgroundVideo.volume = soundEnabled ? 1 : 0;
      void backgroundVideo.play().catch((error) => {
        if (soundEnabled) console.error('Ambient video audio play failed:', error);
      });
    }
    if (crowdAudio) {
      if (soundEnabled) {
        crowdAudio.muted = false;
        crowdAudio.volume = 0.18;
        void crowdAudio.play().catch((error) => {
          console.error('Crowd audio play failed:', error);
        });
      } else {
        crowdAudio.pause();
        crowdAudio.currentTime = 0;
      }
    }
  }, [soundEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const visitorDeltas = new Map<string, number>();

      setLobsters((currentLobsters) =>
        currentLobsters.map((lobster) => {
          if (now < lobster.nextActionAt) return lobster;

          if (lobster.mode === 'traveling') {
            if (lobster.destination.kind === 'shop') {
              visitorDeltas.set(
                lobster.destination.id,
                (visitorDeltas.get(lobster.destination.id) ?? 0) + 1
              );
              return {
                ...lobster,
                currentShopId: lobster.destination.id,
                mode: 'inside',
                scale: 0.34,
                opacity: 0,
                nextActionAt: now + getRandomInsideDuration(),
              };
            }

            return {
              ...lobster,
              mode: 'resting',
              scale: 1,
              opacity: 1,
              nextActionAt: now + REST_DURATION_MS,
            };
          }

          const leavingShopId = lobster.mode === 'inside' ? lobster.currentShopId : undefined;
          if (leavingShopId) {
            visitorDeltas.set(leavingShopId, (visitorDeltas.get(leavingShopId) ?? 0) - 1);
          }

          const nextDestination =
            lobster.mode === 'resting' && Math.random() < 0.25
              ? ({ kind: 'spot', id: LOBSTER_WAIT_SPOTS[Math.floor(Math.random() * LOBSTER_WAIT_SPOTS.length)]!.id } as const)
              : getRandomShopDestination(leavingShopId);
          const nextPoint =
            nextDestination.kind === 'shop'
              ? toMarkerPoint(findShopById(nextDestination.id) ?? XUHUI_SHOPS[0], boardSize)
              : toDestinationPoint(nextDestination);

          return {
            ...lobster,
            x: nextPoint.x,
            y: nextPoint.y,
            flipped: nextPoint.x < lobster.x,
            mode: 'traveling',
            destination: nextDestination,
            currentShopId: undefined,
            scale: 1,
            opacity: 1,
            nextActionAt: now + TRAVEL_DURATION_MS,
          };
        })
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
    }, 600);

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

  const toggleAmbientSound = async () => {
    const backgroundVideo = backgroundVideoRef.current;
    const crowdAudio = crowdAudioRef.current;

    if (soundEnabled) {
      if (backgroundVideo) {
        backgroundVideo.muted = true;
        backgroundVideo.volume = 0;
        void backgroundVideo.play().catch(() => undefined);
      }
      if (crowdAudio) {
        crowdAudio.pause();
        crowdAudio.currentTime = 0;
      }
      setSoundEnabled(false);
      return;
    }

    try {
      if (backgroundVideo) {
        backgroundVideo.muted = false;
        backgroundVideo.volume = 1;
        await backgroundVideo.play();
      }

      if (crowdAudio) {
        crowdAudio.muted = false;
        crowdAudio.volume = 0.18;
        crowdAudio.currentTime = 0;
        await crowdAudio.play().catch((error) => {
          console.error('Crowd audio play failed:', error);
        });
      }

      setSoundEnabled(true);
    } catch (error) {
      console.error('Ambient audio play failed:', error);
      setSoundEnabled(false);
    }
  };

  const enterShop = (shop: XuhuiShop) => {
    track('xuhui_shop_enter', { shopId: shop.id, shopName: shop.name });
    router.push(`/xuhui-island/shop/${shop.id}`);
  };

  const dispatchLobster = (
    lobsterId: string,
    destination: { kind: 'shop'; id: string } | { kind: 'spot'; id: string }
  ) => {
    const point =
      destination.kind === 'shop'
        ? toMarkerPoint(findShopById(destination.id) ?? XUHUI_SHOPS[0], boardSize)
        : toDestinationPoint(destination);
    const now = Date.now();

    setLobsters((currentLobsters) =>
      currentLobsters.map((lobster) => {
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

        return {
          ...lobster,
          x: point.x,
          y: point.y,
          flipped: point.x < lobster.x,
          mode: 'traveling',
          destination,
          currentShopId: undefined,
          scale: 1,
          opacity: 1,
          nextActionAt: now + TRAVEL_DURATION_MS,
        };
      })
    );
    setSelectedLobsterId(lobsterId);
  };

  const selectedLobster = lobsters.find((lobster) => lobster.id === selectedLobsterId) ?? null;

  return (
    <main style={pageStyle}>
      <PageTracker page="xuhui-island" />
      <audio ref={crowdAudioRef} loop preload="auto">
        <source src="https://www.soundjay.com/human/sounds/people-talking-1.mp3" type="audio/mp3" />
      </audio>

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
            onClick={toggleAmbientSound}
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
          <video
            ref={backgroundVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/xuhui-island/map-bg.png"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
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

          {lobsters.map((lobster) => (
            <div
              key={lobster.id}
              onClick={(event) => {
                event.stopPropagation();
                if (lobster.opacity < 0.1) return;
                setSelectedLobsterId((current) => (current === lobster.id ? null : lobster.id));
              }}
              style={{
                position: 'absolute',
                left: `${lobster.x}%`,
                top: `${lobster.y}%`,
                zIndex: selectedLobsterId === lobster.id ? 9 : 6,
                width: 90,
                height: 90,
                transform: `translate(-50%, -50%) scale(${lobster.scale})`,
                opacity: lobster.opacity,
                transition:
                  'left 3.9s ease-in-out, top 3.9s ease-in-out, transform 520ms ease, opacity 520ms ease',
                pointerEvents: lobster.opacity < 0.1 ? 'none' : 'auto',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.82) 0%, rgba(255, 224, 171, 0.34) 56%, rgba(255,255,255,0.06) 100%)',
                  border: '1px solid rgba(255, 250, 234, 0.88)',
                  boxShadow: '0 14px 28px rgba(89, 54, 27, 0.26)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  outline: selectedLobsterId === lobster.id ? '2px solid rgba(255, 231, 133, 0.92)' : 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: -14,
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
                  top: '50%',
                  width: 66,
                  height: 66,
                  transform: `translate(-50%, -50%) scaleX(${lobster.flipped ? -1 : 1})`,
                  transition: 'transform 3.8s ease-in-out',
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
                    filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.16))',
                  }}
                />
              </div>
            </div>
          ))}

          {selectedLobster ? (
            <div
              style={{
                position: 'absolute',
                left: 22,
                bottom: 22,
                zIndex: 12,
                width: 350,
                padding: 16,
                borderRadius: 22,
                background: 'rgba(255, 248, 236, 0.9)',
                border: '1px solid rgba(255,255,255,0.72)',
                boxShadow: '0 20px 42px rgba(75, 43, 20, 0.2)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>派遣 {selectedLobster.name}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#7a5c49', lineHeight: 1.5 }}>
                    点一家店让它过去排队进店，或者指定一个外部点位先待着。
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLobsterId(null)}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    background: 'rgba(73, 46, 30, 0.08)',
                    color: '#6a4632',
                    width: 32,
                    height: 32,
                    fontSize: 18,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginTop: 14, fontSize: 12, fontWeight: 900, color: '#b36a39' }}>去餐厅</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {XUHUI_SHOPS.map((shop) => (
                  <button
                    key={`${selectedLobster.id}-${shop.id}`}
                    type="button"
                    onClick={() => dispatchLobster(selectedLobster.id, { kind: 'shop', id: shop.id })}
                    style={{
                      ...darkGlassStyle,
                      border: 0,
                      borderRadius: 999,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      color: '#4c3023',
                      fontSize: 12,
                      fontWeight: 800,
                      background: 'rgba(255,255,255,0.72)',
                    }}
                  >
                    去 {shop.name}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 14, fontSize: 12, fontWeight: 900, color: '#b36a39' }}>先待外面</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {LOBSTER_WAIT_SPOTS.map((spot) => (
                  <button
                    key={`${selectedLobster.id}-${spot.id}`}
                    type="button"
                    onClick={() => dispatchLobster(selectedLobster.id, { kind: 'spot', id: spot.id })}
                    style={{
                      ...darkGlassStyle,
                      border: 0,
                      borderRadius: 999,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      color: '#4c3023',
                      fontSize: 12,
                      fontWeight: 800,
                      background: 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {spot.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
                onMouseEnter={() => setHoveredShopId(shop.id)}
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
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    ...metricGlassStyle,
                    textAlign: 'left',
                    animation: `metric-bob 2.8s ease-in-out ${(hashShopId(shop.id) % 5) * 0.2}s infinite`,
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
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: 'rgba(12, 10, 8, 0.74)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    boxShadow: '0 14px 26px rgba(35, 17, 10, 0.28)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    color: '#fff7ef',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 900 }}>{shop.name}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: 'rgba(255, 157, 83, 0.95)',
                      color: '#3f2112',
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                    }}
                  >
                    营业中
                    <span className="status-dot status-dot-1">.</span>
                    <span className="status-dot status-dot-2">.</span>
                    <span className="status-dot status-dot-3">.</span>
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
                    transition: 'opacity 180ms ease',
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
                        animation: `steam-rise 3.4s ease-out ${index * 0.6}s infinite`,
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
                  animation: `ripple-expand ${3 + (hashShopId(shop.id) % 3) * 0.6}s ease-out ${(hashShopId(shop.id) % 4) * 0.5}s infinite`,
                }} />
                {/* 浮动动画包裹层：island-bob 在此层，不干扰图片的 hover transform */}
                <div style={{
                  display: 'block',
                  width: displaySize,
                  height: displaySize,
                  animation: `island-bob ${4.5 + (hashShopId(shop.id) % 3) * 0.5}s ease-in-out ${(hashShopId(shop.id) % 5) * 0.4}s infinite`,
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
        </div>
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
          animation: metric-hop 1.6s ease-in-out infinite;
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
          animation: ocean-flow-x 18s linear infinite;
          opacity: 0.6;
        }
        .ocean-wave-mid {
          animation: ocean-flow-x 12s linear infinite reverse;
          opacity: 0.5;
        }

        /* 岛屿轻微上下浮动 */
        .island-float {
          animation: island-bob 5s ease-in-out infinite;
        }

        @keyframes ocean-flow-x {
          0% { background-position-x: 0; }
          100% { background-position-x: 200px; }
        }

        @keyframes island-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
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

        @keyframes metric-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
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
      `}</style>
    </main>
  );
}
