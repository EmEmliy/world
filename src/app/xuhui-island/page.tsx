'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PageTracker } from '@/components/game/page-tracker';
import { LobsterDispatchMenu } from '@/components/game/lobster-dispatch-menu';
import { EatiQuiz } from '@/components/game/eati-quiz';
import { EatiBadge } from '@/components/game/eati-badge';
import { loadEatiResult, getPersonality, matchShops, type ShopMatchResult } from '@/lib/eati';
import { getItem, setItem } from '@/lib/storage';
import {
  DEFAULT_TRACE_STATE,
  PAW_PRINT_THRESHOLD,
  TREE_STREAK_THRESHOLD,
  getUnlockedPawPrintShopIds,
  recordIslandVisit,
  recordShopVisit,
  saveMemorialStone,
  saveShopRecommendation,
  type TraceState,
} from '@/lib/traces';
import { track } from '@/lib/tracker';
import { shareImageCard } from '@/lib/share';
import { playAudioFile, disposeAudioContext, playPortalSound } from '@/lib/sound';
import { XUHUI_SHOPS, type XuhuiShop } from '@/config/xuhui-shops';
import { PortalEffect } from './_components/portal-effect';
import { AgentStatusCard } from './_components/agent-status-card';
import { OnboardingJourney, type FirstDayAnswers } from './_components/onboarding-journey';
import { FirstDayStoryCard } from './_components/first-day-story-card';
import { TraceOverlays } from './_components/trace-overlays';
import {
  // 常量
  LEAD_LOBSTER_ID,
  LOBSTER_WAIT_SPOTS,
  CONSTRUCTION_SITES,
  DEFAULT_BOARD_SIZE,
  SPEAK_DURATION_MS,
  REST_DURATION_MS,
  // 类型
  type LobsterWalker,
  type ShopMetric,
  type BoardSize,
  // 工具函数
  clamp,
  hashShopId,
  computeHourlyRating,
  createShopMetrics,
  getVisualDestinationKey,
  getTimePeriod,
  choosePersonalityDestination,
  getRandomInsideDuration,
  getRandomBubbleLine,
  findDestinationSlot,
  getLobsterTravelDuration,
  toDestinationPoint,
  createInitialLobsters,
  renderStars,
  type LobsterTimePeriod,
} from './_lib/game-logic';
import {
  pageStyle,
  mapShellStyle,
  mapBoardStyle,
  badgeStyle,
  metricGlassStyle,
} from './_lib/styles';

const FIRST_DAY_STORAGE_KEY = 'xuhui_island_first_day_v1';
const FIRST_DAY_OPENING_MS = 2200;
const FIRST_DAY_REPORT_DELAY_MS = 45_000;

type JourneyPhase = 'hidden' | 'opening' | 'intro' | 'questions' | 'report';
type FirstDayDebugMode = Exclude<JourneyPhase, 'hidden'> | null;

interface FirstDayState extends FirstDayAnswers {
  activatedAt: number;
  firstShopId: string;
  reportReadyAt: number;
  reportViewedAt?: number;
}

const DEBUG_FIRST_DAY_ANSWERS: FirstDayAnswers = {
  taste: '热乎海鲜',
  vibe: '慢慢逛逛',
  mood: '想找惊喜',
};

function parseFirstDayDebugMode(value: string | null): FirstDayDebugMode {
  if (value === 'opening' || value === 'intro' || value === 'questions' || value === 'report') {
    return value;
  }
  return null;
}

function createDebugFirstDayState(): FirstDayState {
  return {
    ...DEBUG_FIRST_DAY_ANSWERS,
    activatedAt: Date.now() - 60_000,
    firstShopId: chooseFirstDayShop(DEBUG_FIRST_DAY_ANSWERS),
    reportReadyAt: Date.now() - 1,
  };
}

interface MapFeedbackEffect {
  id: number;
  tone: 'shop' | 'stone';
  title: string;
  subtitle?: string;
  detail: string;
  left: string;
  top: string;
}

const FIRST_DAY_CHOICE_GROUPS: Array<{
  key: keyof FirstDayAnswers;
  title: string;
  subtitle: string;
  options: string[];
}> = [
  {
    key: 'taste',
    title: '今天更想吃哪一口？',
    subtitle: '旺财会拿这个判断第一站先往哪儿跑',
    options: ['热乎海鲜', '扎实主食', '甜口轻食'],
  },
  {
    key: 'vibe',
    title: '你想把今晚交给什么气氛？',
    subtitle: '热闹、安静，还是只是慢慢逛',
    options: ['热闹一点', '安静一点', '慢慢逛逛'],
  },
  {
    key: 'mood',
    title: '你今天想被怎么对待？',
    subtitle: '让旺财知道今天该怎么陪你',
    options: ['想被照顾', '想找惊喜', '只想散散心'],
  },
];

function chooseFirstDayShop(answers: FirstDayAnswers) {
  if (answers.taste === '甜口轻食') return 'gaga';
  if (answers.taste === '热乎海鲜') return 'jiangbian';
  if (answers.vibe === '安静一点') return 'jinfuyuan';
  return 'azhong';
}

function getTimeLabel(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 10) return '清晨落岛';
  if (hour >= 10 && hour < 15) return '午间巡岛';
  if (hour >= 15 && hour < 19) return '傍晚看海';
  return '深夜亮灯';
}

function buildFirstDayReport(state: FirstDayState) {
  const firstShop = XUHUI_SHOPS.find((shop) => shop.id === state.firstShopId);
  const shopName = firstShop?.name ?? '岛上的第一家店';

  const openingLine =
    state.vibe === '安静一点'
      ? `我先替你去了一趟${shopName}，没敢太吵。`
      : `我先替你去了一趟${shopName}，一路上都在想你会不会喜欢。`;

  const summaryLine =
    state.mood === '想找惊喜'
      ? `你说自己今天想找点惊喜，所以我特意绕了远一点。你喜欢${state.taste}，也想要${state.vibe}的气氛，我就在门口多站了一会儿，把今天最像你的那一口先记下来了。`
      : state.mood === '只想散散心'
        ? `你说今天只想散散心，我就没替你催任何决定。你喜欢${state.taste}，想要${state.vibe}的气氛，所以我先替你把这家店的灯光、味道和门口的风都看了一遍。`
        : `你说今天想被照顾一下，所以我先替你走了一趟最像样的第一站。你喜欢${state.taste}，想要${state.vibe}的气氛，我就先去把这份安心替你端回来了。`;

  return {
    shopName,
    openingLine,
    summaryLine,
    closingLine: '明天还来吗？我会继续在这里等你。',
    timeLabel: getTimeLabel(),
    shopImage: firstShop?.image,
  };
}

interface TimeMoodConfig {
  label: string;
  subtitle: string;
  chip: string;
  mapFilter: string;
  glow: string;
  overlay: CSSProperties;
  haze: CSSProperties;
}

const TIME_MOOD_CONFIG: Record<LobsterTimePeriod, TimeMoodConfig> = {
  morning: {
    label: '清晨 6:00-9:59',
    subtitle: '薄雾刚散，岛先醒了。',
    chip: '☁️ 冷白晨光',
    mapFilter: 'brightness(0.88) hue-rotate(-8deg)',
    glow: '0 0 40px rgba(214, 242, 255, 0.24)',
    overlay: {
      background:
        'linear-gradient(180deg, rgba(222,239,255,0.34) 0%, rgba(194,226,255,0.14) 42%, rgba(77,119,150,0.12) 100%)',
      mixBlendMode: 'screen',
      opacity: 0.82,
    },
    haze: {
      background:
        'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 32%, transparent 58%), linear-gradient(180deg, rgba(226,240,255,0.16) 0%, transparent 55%)',
      opacity: 0.86,
    },
  },
  midday: {
    label: '午间 10:00-14:59',
    subtitle: '太阳正高，整座岛都在营业。',
    chip: '☀️ 暖阳满岛',
    mapFilter: 'none',
    glow: '0 0 36px rgba(255, 210, 140, 0.18)',
    overlay: {
      background:
        'linear-gradient(180deg, rgba(255,243,214,0.18) 0%, rgba(255,215,152,0.08) 46%, rgba(126,188,198,0.04) 100%)',
      mixBlendMode: 'screen',
      opacity: 0.88,
    },
    haze: {
      background:
        'radial-gradient(circle at 20% 12%, rgba(255,248,224,0.18) 0%, transparent 34%), radial-gradient(circle at 82% 20%, rgba(255,236,186,0.12) 0%, transparent 28%)',
      opacity: 0.68,
    },
  },
  sunset: {
    label: '傍晚 15:00-18:59',
    subtitle: '橙金压下来，大家会往海边靠。',
    chip: '🌇 橙金夕照',
    mapFilter: 'hue-rotate(15deg) saturate(1.2)',
    glow: '0 0 46px rgba(255, 176, 88, 0.28)',
    overlay: {
      background:
        'linear-gradient(180deg, rgba(255,211,166,0.22) 0%, rgba(255,170,76,0.18) 46%, rgba(173,96,38,0.16) 100%)',
      mixBlendMode: 'screen',
      opacity: 0.92,
    },
    haze: {
      background:
        'radial-gradient(circle at 70% 20%, rgba(255,192,118,0.24) 0%, rgba(255,155,74,0.08) 26%, transparent 52%), linear-gradient(180deg, transparent 0%, rgba(120,62,22,0.16) 100%)',
      opacity: 0.84,
    },
  },
  night: {
    label: '深夜 19:00+',
    subtitle: '灯光落下去，码头开始发亮。',
    chip: '🌌 星空暗调',
    mapFilter: 'none',
    glow: '0 0 32px rgba(109, 164, 255, 0.12)',
    overlay: {
      background: 'transparent',
      mixBlendMode: 'normal',
      opacity: 0,
    },
    haze: {
      background:
        'radial-gradient(circle at 18% 16%, rgba(184,220,255,0.08) 0%, transparent 24%), radial-gradient(circle at 82% 14%, rgba(162,200,255,0.06) 0%, transparent 20%)',
      opacity: 0.38,
    },
  },
};

const QUICK_RECOMMENDATION_LINES = [
  '今晚风大，但这一口值得等。',
  '这里的灯一亮起来，就想坐久一点。',
  '我下次还会来，想带朋友一起。',
];

function getShopFeedbackPosition(shop: XuhuiShop) {
  return {
    left: `calc(${shop.x}% + ${(shop.mapOffsetX ?? 0) + 26}px)`,
    top: `calc(${shop.y}% + ${(shop.mapOffsetY ?? 0) - 118}px)`,
  };
}


export default function XuhuiIslandPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const storyCardRef = useRef<HTMLDivElement>(null);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>('hidden');
  const [firstDayState, setFirstDayState] = useState<FirstDayState | null>(null);
  const [firstDayAnswers, setFirstDayAnswers] = useState<FirstDayAnswers>({
    taste: '',
    vibe: '',
    mood: '',
  });
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [traceState, setTraceState] = useState<TraceState>(DEFAULT_TRACE_STATE);
  const [traceShopId, setTraceShopId] = useState<string>(XUHUI_SHOPS[0]?.id ?? 'gaga');
  const [recommendationDraft, setRecommendationDraft] = useState('');
  const [stoneDraft, setStoneDraft] = useState('');
  const [activeHudPanel, setActiveHudPanel] = useState<'trace' | 'message' | null>(null);
  const [mapFeedbackEffect, setMapFeedbackEffect] = useState<MapFeedbackEffect | null>(null);
  const [memorialHovered, setMemorialHovered] = useState(false);
  const [memorialMode, setMemorialMode] = useState<'idle' | 'prompt' | 'editing'>('idle');
  const mapFeedbackTimerRef = useRef<number | null>(null);
  const memorialPromptShownRef = useRef(false);
  const firstDayDebugMode = parseFirstDayDebugMode(searchParams.get('firstDay'));
  // EATI 测评相关状态
  const [showEatiQuiz, setShowEatiQuiz] = useState(false);
  const [eatiCode, setEatiCode] = useState<string | null>(null);
  const [eatiMatchMap, setEatiMatchMap] = useState<Record<string, ShopMatchResult>>({});

  // 页面卸载时释放 AudioContext，防止内存泄漏
  useEffect(() => {
    return () => {
      disposeAudioContext();
      if (mapFeedbackTimerRef.current) {
        window.clearTimeout(mapFeedbackTimerRef.current);
      }
    };
  }, []);

  // EATI：根据编码计算所有商家匹配结果并更新 matchMap
  function buildEatiMatchMap(code: string) {
    const shopInputs = XUHUI_SHOPS.map((s) => ({ id: s.id, name: s.name, eatiCode: s.eatiCode }));
    const results = matchShops(code, shopInputs);
    const map: Record<string, ShopMatchResult> = {};
    results.forEach((r) => { map[r.shopId] = r; });
    setEatiMatchMap(map);
  }

  // EATI：初始化从 localStorage 读取已有测评结果
  useEffect(() => {
    const saved = loadEatiResult();
    if (saved) {
      setEatiCode(saved.code);
      buildEatiMatchMap(saved.code);
    }
    // URL 参数 ?eati=quiz 时自动弹出测评
    if (searchParams.get('eati') === 'quiz') {
      setShowEatiQuiz(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 客户端 mount 后，用真实时间修正 rating（避免 SSR 固定值 12 与实际时间不符）
  useEffect(() => {
    const realHour = new Date().getHours();
    setCurrentHour(realHour);
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
    const syncHour = () => setCurrentHour(new Date().getHours());
    syncHour();
    const timer = window.setInterval(syncHour, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nextTraceState = recordIslandVisit();
    setTraceState(nextTraceState);
    setStoneDraft(nextTraceState.memorialStone?.text ?? '');
  }, []);

  useEffect(() => {
    if (!hoveredShopId) return;
    setTraceShopId(hoveredShopId);
  }, [hoveredShopId]);

  useEffect(() => {
    setRecommendationDraft(traceState.recommendations[traceShopId]?.text ?? '');
  }, [traceShopId, traceState]);

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
    if (firstDayDebugMode) {
      if (firstDayDebugMode === 'report') {
        const debugState = createDebugFirstDayState();
        setFirstDayState(debugState);
        setFirstDayAnswers({
          taste: debugState.taste,
          vibe: debugState.vibe,
          mood: debugState.mood,
        });
        setJourneyPhase('report');
        return;
      }

      setFirstDayState(null);
      setFirstDayAnswers({
        taste: '',
        vibe: '',
        mood: '',
      });
      setJourneyPhase(firstDayDebugMode);
      return;
    }

    const saved = getItem<FirstDayState | null>(FIRST_DAY_STORAGE_KEY, null);
    if (saved) {
      setFirstDayState(saved);
      setFirstDayAnswers({
        taste: saved.taste,
        vibe: saved.vibe,
        mood: saved.mood,
      });
      if (!saved.reportViewedAt && Date.now() >= saved.reportReadyAt) {
        setJourneyPhase('report');
      }
      return;
    }
    setJourneyPhase('opening');
  }, [firstDayDebugMode]);

  useEffect(() => {
    if (journeyPhase !== 'opening') return;
    const timer = window.setTimeout(() => setJourneyPhase('intro'), FIRST_DAY_OPENING_MS);
    return () => window.clearTimeout(timer);
  }, [journeyPhase]);

  useEffect(() => {
    if (!firstDayState || firstDayState.reportViewedAt) return;
    if (Date.now() >= firstDayState.reportReadyAt) {
      setJourneyPhase('report');
      return;
    }
    const timer = window.setTimeout(
      () => setJourneyPhase('report'),
      firstDayState.reportReadyAt - Date.now()
    );
    return () => window.clearTimeout(timer);
  }, [firstDayState]);

  useEffect(() => {
    if (!firstDayState || firstDayState.reportViewedAt) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [firstDayState]);


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
                completedTrips: lobster.completedTrips + 1,
                intelCount: lobster.intelCount + 1,
                nextActionAt: now + getRandomInsideDuration(),
              });
              return nextLobsters;
            }

            nextLobsters.push({
              ...lobster,
              mode: 'speaking',
              scale: 1,
              opacity: 1,
              bubbleText: getRandomBubbleLine(lobster),
              bubbleKey: lobster.bubbleKey + 1,
              completedTrips: lobster.completedTrips + 1,
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
              ? choosePersonalityDestination(
                  referenceLobsters.filter((item) => item.id !== lobster.id),
                  lobster,
                  'spot'
                )
              : choosePersonalityDestination(
                  referenceLobsters.filter((item) => item.id !== lobster.id),
                  lobster,
                  'shop',
                  leavingShopId
                );
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
            nextActionAt: now + getLobsterTravelDuration(lobster),
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
    const nextTraceState = recordShopVisit(shop.id);
    setTraceState(nextTraceState);
    track('xuhui_shop_enter', { shopId: shop.id, shopName: shop.name });
    playAudioFile('/put.wav', 0.7);
    router.push(`/xuhui-island/shop/${shop.id}`);
  };

  const playDefaultButtonSound = () => {
    playAudioFile('/usual.mp3', 0.5);
  };

  const showMapFeedbackEffect = (effect: Omit<MapFeedbackEffect, 'id'>) => {
    const effectId = Date.now();
    setMapFeedbackEffect({ id: effectId, ...effect });
    if (mapFeedbackTimerRef.current) {
      window.clearTimeout(mapFeedbackTimerRef.current);
    }
    mapFeedbackTimerRef.current = window.setTimeout(() => {
      setMapFeedbackEffect((current) => (current?.id === effectId ? null : current));
    }, 3000);
  };

  const dispatchLobster = (
    lobsterId: string,
    destination: { kind: 'shop'; id: string } | { kind: 'spot'; id: string }
  ) => {
    const currentLobster = lobsters.find((lobster) => lobster.id === lobsterId);
    if (!currentLobster) return;

    const departingShopId =
      currentLobster.mode === 'inside' ? currentLobster.currentShopId : undefined;
    const dispatchedTravelDuration = getLobsterTravelDuration(currentLobster, true);
    const now = Date.now();

    setLobsters((currentLobsters) => {
      const destinationSlot = findDestinationSlot(currentLobsters, destination, lobsterId);
      const point = toDestinationPoint(destination, destinationSlot);

      return currentLobsters.map((lobster) => {
        if (lobster.id !== lobsterId) return lobster;

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
          nextActionAt: now + dispatchedTravelDuration,
        };
      });
    });

    if (departingShopId) {
      setShopMetrics((currentMetrics) => {
        const currentMetric = currentMetrics[departingShopId];
        if (!currentMetric) return currentMetrics;

        return {
          ...currentMetrics,
          [departingShopId]: {
            ...currentMetric,
            visitorCount: clamp(currentMetric.visitorCount - 1, 8, 99),
            motionTick: currentMetric.motionTick + 1,
          },
        };
      });
    }

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
  const leadLobster = lobsters.find((lobster) => lobster.id === LEAD_LOBSTER_ID) ?? lobsters[0] ?? null;
  const firstDayReport = firstDayState ? buildFirstDayReport(firstDayState) : null;
  const timePeriod = getTimePeriod(currentHour);
  const timeMood = TIME_MOOD_CONFIG[timePeriod];
  const leadPeriodSpeech = leadLobster?.personality.timeAwareLines?.[timePeriod]?.[0];
  const backgroundVideoSrc =
    timePeriod === 'night'
      ? '/xuhui-island/map-nigt-bg.mp4'
      : '/xuhui-island/map-bg.mp4';
  const traceShop = XUHUI_SHOPS.find((shop) => shop.id === traceShopId) ?? XUHUI_SHOPS[0];
  const unlockedPawPrintShopIds = getUnlockedPawPrintShopIds(traceState);
  const unlockedPawPrintCount = unlockedPawPrintShopIds.length;
  const memorialText = traceState.memorialStone?.text ?? '';
  const hasMemorialText = Boolean(memorialText.trim());
  const boardScale = boardSize
    ? (Math.min(
        boardSize.width / DEFAULT_BOARD_SIZE.width,
        boardSize.height / DEFAULT_BOARD_SIZE.height
      ) || 1)
    : null; // null 时隐藏龙虾层，避免位移抖动

  useEffect(() => {
    setVideoReady(false);
  }, [backgroundVideoSrc]);

  const handleAnswer = (field: keyof FirstDayAnswers, value: string) => {
    setFirstDayAnswers((current) => ({ ...current, [field]: value }));
  };

  const handleActivateFirstDay = () => {
    if (!firstDayAnswers.taste || !firstDayAnswers.vibe || !firstDayAnswers.mood) return;
    const nextState: FirstDayState = {
      ...firstDayAnswers,
      activatedAt: Date.now(),
      firstShopId: chooseFirstDayShop(firstDayAnswers),
      reportReadyAt: Date.now() + FIRST_DAY_REPORT_DELAY_MS,
    };
    setItem(FIRST_DAY_STORAGE_KEY, nextState);
    setFirstDayState(nextState);
    setJourneyPhase('hidden');
    setSelectedLobsterId(null);
    dispatchLobster(LEAD_LOBSTER_ID, { kind: 'shop', id: nextState.firstShopId });
  };

  const handleCloseReport = () => {
    if (!firstDayState) {
      setJourneyPhase('hidden');
      return;
    }
    const nextState = {
      ...firstDayState,
      reportViewedAt: Date.now(),
    };
    setItem(FIRST_DAY_STORAGE_KEY, nextState);
    setFirstDayState(nextState);
    setJourneyPhase('hidden');
  };

  const handleShareStory = async () => {
    if (!firstDayState || !firstDayReport) return;
    setIsSharingStory(true);
    try {
      await shareImageCard(storyCardRef.current, {
        title: '旺财的第一天',
        text: `${leadLobster?.name ?? '旺财'}替我跑了今天的第一站：${firstDayReport.shopName}`,
        fileName: 'wangcai-first-day.png',
        backgroundColor: '#081f31',
        preferDownload: true,
      });
    } finally {
      setIsSharingStory(false);
    }
  };

  const handleSaveRecommendation = () => {
    if (!traceShop) return;
    playAudioFile('/banner.mp3', 0.72);
    const trimmedText = recommendationDraft.trim();
    const nextTraceState = saveShopRecommendation(traceShop.id, recommendationDraft);
    setTraceState(nextTraceState);
    if (trimmedText) {
      const position = getShopFeedbackPosition(traceShop);
      showMapFeedbackEffect({
        tone: 'shop',
        title: `${traceShop.name} · 门口小卡`,
        subtitle: traceShop.intro,
        detail: `我刚留在门口：${trimmedText}`,
        left: position.left,
        top: position.top,
      });
    }
  };

  const handleSaveStone = () => {
    playAudioFile('/ddda.mp3', 0.76);
    const trimmedText = stoneDraft.trim();
    const nextTraceState = saveMemorialStone(stoneDraft);
    setTraceState(nextTraceState);
    setStoneDraft(trimmedText);
    setMemorialMode('idle');
    if (trimmedText) {
      showMapFeedbackEffect({
        tone: 'stone',
        title: '龙虾纪念石',
        subtitle: '海风会替你记住这句',
        detail: `我刚刻上去：${trimmedText}`,
        left: 'calc(20.5% - 150px)',
        top: '13%',
      });
    }
  };

  const cycleTraceShop = (direction: 1 | -1) => {
    const currentIndex = XUHUI_SHOPS.findIndex((shop) => shop.id === traceShopId);
    const nextIndex = (currentIndex + direction + XUHUI_SHOPS.length) % XUHUI_SHOPS.length;
    setTraceShopId(XUHUI_SHOPS[nextIndex]?.id ?? XUHUI_SHOPS[0]?.id ?? 'gaga');
  };

  const toggleHudPanel = (panel: 'trace' | 'message') => {
    playDefaultButtonSound();
    setActiveHudPanel((current) => (current === panel ? null : panel));
  };

  const closeHudPanel = () => {
    playDefaultButtonSound();
    setActiveHudPanel(null);
  };

  const handleMemorialMouseEnter = () => {
    setMemorialHovered(true);
    if (!memorialPromptShownRef.current && !hasMemorialText && memorialMode === 'idle') {
      memorialPromptShownRef.current = true;
      setMemorialMode('prompt');
    }
  };

  const handleMemorialMouseLeave = () => {
    setMemorialHovered(false);
  };

  const openMemorialPrompt = () => {
    playDefaultButtonSound();
    memorialPromptShownRef.current = true;
    setMemorialMode('prompt');
  };

  const startMemorialEditing = () => {
    playDefaultButtonSound();
    setStoneDraft(memorialText);
    setMemorialMode('editing');
  };

  const dismissMemorialPrompt = () => {
    playDefaultButtonSound();
    setMemorialMode('idle');
  };

  const cancelMemorialEditing = () => {
    playDefaultButtonSound();
    setStoneDraft(memorialText);
    setMemorialMode('idle');
  };

  const handleMemorialClick = () => {
    if (hasMemorialText) {
      startMemorialEditing();
      return;
    }
    if (memorialMode === 'idle') {
      openMemorialPrompt();
    }
  };

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

      <section style={mapShellStyle}>
        <div
          ref={mapBoardRef}
          style={{
            ...mapBoardStyle,
            filter: timeMood.mapFilter,
            transition: 'filter 900ms ease, box-shadow 900ms ease',
            boxShadow: `${mapBoardStyle.boxShadow}, ${timeMood.glow}`,
          }}
        >
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
            key={backgroundVideoSrc}
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
            <source src={backgroundVideoSrc} type="video/mp4" />
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
              inset: 0,
              pointerEvents: 'none',
              zIndex: 1,
              transition: 'opacity 900ms ease, background 900ms ease',
              ...timeMood.overlay,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 1,
              transition: 'opacity 900ms ease, background 900ms ease',
              ...timeMood.haze,
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
                left: 18,
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: 'min(70%, 780px)',
                padding: '12px 18px',
                borderRadius: 999,
                background: 'rgba(7, 25, 38, 0.74)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 16px 32px rgba(0,18,36,0.28)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                color: '#eefbf8',
              }}
            >
              <div style={{ ...badgeStyle, background: 'rgba(15,80,68,0.55)', color: '#7eeee0', border: '1px solid rgba(100,220,200,0.3)', letterSpacing: '0.12em', flexShrink: 0 }}>
                🏝️ JINYANG ISLAND · 美食岛
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 'clamp(18px, 2vw, 28px)',
                    fontWeight: 900,
                    lineHeight: 1.08,
                    color: '#dffff8',
                    textShadow: '0 0 20px rgba(80,200,180,0.18)',
                  }}
                >
                  美食之岛 · 金杨, 上海
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: 'rgba(205,240,234,0.72)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  11 位小邻居住在这座岛上。你来了，它们就知道了。
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playAudioFile('/usual.mp3', 0.5);
                  toggleAmbientSound();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginLeft: 'auto',
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: soundEnabled ? 'rgba(15,80,68,0.5)' : 'rgba(8,40,55,0.45)',
                  color: soundEnabled ? '#7eeee0' : '#4a9a94',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  border: `1px solid ${soundEnabled ? 'rgba(100,220,200,0.35)' : 'rgba(60,160,150,0.2)'}`,
                  flexShrink: 0,
                }}
              >
                <span>{soundEnabled ? '🌊' : '🔇'}</span>
                {soundEnabled ? '关闭海浪声' : '开启海浪声'}
              </button>
            </div>

            {timePeriod === 'night' ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 1,
                  background:
                    'radial-gradient(circle at 14% 18%, rgba(255,255,255,0.8) 0 1px, transparent 1.5px), radial-gradient(circle at 29% 12%, rgba(255,255,255,0.72) 0 1.2px, transparent 1.7px), radial-gradient(circle at 43% 17%, rgba(255,255,255,0.7) 0 1.1px, transparent 1.6px), radial-gradient(circle at 61% 10%, rgba(255,255,255,0.74) 0 1.2px, transparent 1.7px), radial-gradient(circle at 74% 19%, rgba(255,255,255,0.7) 0 1.1px, transparent 1.6px), radial-gradient(circle at 86% 13%, rgba(255,255,255,0.76) 0 1.3px, transparent 1.8px)',
                  opacity: 0.58,
                }}
              />
            ) : null}
            <TraceOverlays traceState={traceState} />
            <div
              onMouseEnter={handleMemorialMouseEnter}
              onMouseLeave={handleMemorialMouseLeave}
              onClick={handleMemorialClick}
              style={{
                position: 'absolute',
                left: 'calc(20.5% - 150px)',
                top: '22%',
                zIndex: 8,
                transform: `translate(-50%, -50%) scale(${memorialHovered ? 1.08 : 1})`,
                transformOrigin: 'center bottom',
                transition: 'transform 240ms ease',
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 196,
                  height: 176,
                }}
              >
                {hasMemorialText ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none',
                      animation: 'memorial-flag-wave 3.2s ease-in-out infinite',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        maxWidth: 160,
                        minWidth: 108,
                        padding: '8px 14px 9px',
                        borderRadius: 999,
                        background:
                          'linear-gradient(180deg, rgba(255,244,214,0.98) 0%, rgba(242,222,170,0.96) 100%)',
                        border: '1px solid rgba(151,112,45,0.26)',
                        boxShadow: '0 12px 22px rgba(86,62,38,0.14)',
                        color: '#6e4b1b',
                        fontSize: 12,
                        fontWeight: 900,
                        lineHeight: 1.2,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {memorialText}
                      <span
                        style={{
                          position: 'absolute',
                          left: -11,
                          top: 10,
                          width: 16,
                          height: 18,
                          background: 'linear-gradient(180deg, rgba(239,212,149,0.94) 0%, rgba(222,187,108,0.94) 100%)',
                          clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
                          transform: 'rotate(-8deg)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: -11,
                          top: 10,
                          width: 16,
                          height: 18,
                          background: 'linear-gradient(180deg, rgba(239,212,149,0.94) 0%, rgba(222,187,108,0.94) 100%)',
                          clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                          transform: 'rotate(8deg)',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 30,
                        width: 12,
                        height: 10,
                        transform: 'translateX(-50%)',
                        background: 'rgba(233,203,130,0.96)',
                        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                        boxShadow: '0 4px 8px rgba(86,62,38,0.1)',
                      }}
                    />
                  </div>
                ) : null}

                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 8,
                    width: 100,
                    height: 26,
                    transform: 'translateX(-50%)',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.16)',
                    filter: 'blur(12px)',
                    pointerEvents: 'none',
                  }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 18,
                    transform: 'translateX(-50%)',
                    fontSize: 88,
                    lineHeight: 1,
                    filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.18))',
                    pointerEvents: 'none',
                  }}
                >
                  🪨
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: hasMemorialText ? 46 : 30,
                    transform: 'translateX(-50%)',
                    fontSize: 76,
                    lineHeight: 1,
                    filter: 'drop-shadow(0 8px 12px rgba(229,117,54,0.28))',
                    pointerEvents: 'none',
                  }}
                >
                  🦞
                </span>

                {memorialMode === 'prompt' && !hasMemorialText ? (
                  <div
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      position: 'absolute',
                      left: 150,
                      top: 54,
                      width: 210,
                      padding: '14px 14px 12px',
                      borderRadius: 20,
                      background: 'rgba(9, 28, 42, 0.94)',
                      border: '1px solid rgba(121,212,198,0.2)',
                      boxShadow: '0 20px 34px rgba(0,18,36,0.24)',
                      color: '#eefbf8',
                      pointerEvents: 'auto',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.45 }}>
                      需要在纪念石上刻字吗？
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={startMemorialEditing}
                        style={{
                          flex: 1,
                          border: 0,
                          borderRadius: 999,
                          background: 'linear-gradient(135deg, #ffd89d 0%, #ffb86e 100%)',
                          color: '#5c3116',
                          padding: '10px 12px',
                          fontSize: 13,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        是
                      </button>
                      <button
                        type="button"
                        onClick={dismissMemorialPrompt}
                        style={{
                          flex: 1,
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#eefbf8',
                          padding: '10px 12px',
                          fontSize: 13,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        否
                      </button>
                    </div>
                  </div>
                ) : null}

                {memorialMode === 'editing' ? (
                  <div
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      position: 'absolute',
                      left: 146,
                      top: hasMemorialText ? 46 : 38,
                      width: 250,
                      padding: '14px 14px 12px',
                      borderRadius: 22,
                      background: 'rgba(244,235,222,0.96)',
                      border: '1px solid rgba(128,96,66,0.14)',
                      boxShadow: '0 20px 34px rgba(86,62,38,0.18)',
                      color: '#5e4735',
                      pointerEvents: 'auto',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 900 }}>在纪念石上刻一句</div>
                    <input
                      value={stoneDraft}
                      onChange={(event) => setStoneDraft(event.target.value)}
                      placeholder="写下想留在岛上的话"
                      style={{
                        width: '100%',
                        marginTop: 10,
                        borderRadius: 14,
                        border: '1px solid rgba(128,96,66,0.16)',
                        background: 'rgba(255,255,255,0.72)',
                        color: '#5e4735',
                        padding: '12px 14px',
                        fontSize: 14,
                      }}
                    />
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleSaveStone}
                        style={{
                          flex: 1,
                          border: 0,
                          borderRadius: 999,
                          background: 'linear-gradient(135deg, #ffd89d 0%, #ffb86e 100%)',
                          color: '#5c3116',
                          padding: '10px 12px',
                          fontSize: 13,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        确定
                      </button>
                      <button
                        type="button"
                        onClick={cancelMemorialEditing}
                        style={{
                          flex: 1,
                          borderRadius: 999,
                          border: '1px solid rgba(128,96,66,0.16)',
                          background: 'rgba(255,255,255,0.62)',
                          color: '#5e4735',
                          padding: '10px 12px',
                          fontSize: 13,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {lobsters.map((lobster) => {
              const isSelected = selectedLobsterId === lobster.id;
              const isHoveredLobster = hoveredLobsterId === lobster.id;
              // 被选中的龙虾在底部弹框展示，地图上隐藏
              const hiddenOnMap = isSelected;
              // 移动时长：被派遣的用快速时长
              const travelDuration = getLobsterTravelDuration(lobster, Boolean(lobster.isDispatched));

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
                  {traceState.recommendations[shop.id] ? (
                    <div
                      style={{
                        marginTop: 7,
                        paddingTop: 7,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: 'rgba(224,245,240,0.86)',
                      }}
                    >
                      <span style={{ color: '#7eeee0', fontWeight: 900 }}>
                        {traceState.recommendations[shop.id]?.authorName}
                      </span>
                      {` 留下的话：${traceState.recommendations[shop.id]?.text}`}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    marginBottom: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0,
                    padding: eatiMatchMap[shop.id] ? '8px 16px 10px' : '10px 16px',
                    borderRadius: eatiMatchMap[shop.id] ? 20 : 999,
                    background: eatiMatchMap[shop.id]?.grade === 'destiny'
                      ? 'linear-gradient(135deg, rgba(255,200,60,0.32) 0%, rgba(255,120,30,0.22) 100%)'
                      : eatiMatchMap[shop.id]?.grade === 'great'
                      ? 'linear-gradient(135deg, rgba(255,140,40,0.22) 0%, rgba(255,80,20,0.14) 100%)'
                      : 'rgba(8, 17, 24, 0.42)',
                    border: eatiMatchMap[shop.id]?.grade === 'destiny'
                      ? '1.5px solid rgba(255,211,110,0.7)'
                      : eatiMatchMap[shop.id]?.grade === 'great'
                      ? '1.5px solid rgba(255,150,50,0.55)'
                      : '1px solid rgba(255,255,255,0.18)',
                    boxShadow: eatiMatchMap[shop.id]?.grade === 'destiny'
                      ? '0 0 20px rgba(255,200,60,0.35), 0 14px 28px rgba(10,18,28,0.18)'
                      : eatiMatchMap[shop.id]?.grade === 'great'
                      ? '0 0 14px rgba(255,140,40,0.25), 0 14px 28px rgba(10,18,28,0.18)'
                      : '0 14px 28px rgba(10, 18, 28, 0.18)',
                    backdropFilter: 'blur(16px) saturate(1.08)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.08)',
                    color: '#fff7ef',
                    whiteSpace: 'nowrap',
                    transition: 'all 300ms ease',
                  }}
                >
                  {/* 第一行：店名 + 营业中 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  {/* 第二行：EATI 匹配等级（有测评时显示）*/}
                  {eatiMatchMap[shop.id] && (() => {
                    const m = eatiMatchMap[shop.id];
                    const GRADE_LABEL: Record<string, string> = {
                      destiny: '🔥🔥🔥 天命之选',
                      great: '🔥🔥 高度契合',
                      good: '🔥 值得一试',
                      contrast: '⚡ 反差体验',
                      challenge: '💀 饭搭子带你去',
                    };
                    const GRADE_COLOR: Record<string, string> = {
                      destiny: '#ffd36e',
                      great: '#ffaa60',
                      good: '#ffd36e',
                      contrast: '#7de8e0',
                      challenge: 'rgba(200,230,220,0.5)',
                    };
                    return (
                      <div style={{
                        marginTop: 5,
                        fontSize: 12,
                        fontWeight: 900,
                        color: GRADE_COLOR[m.grade] ?? '#ffd36e',
                        letterSpacing: '0.04em',
                      }}>
                        {GRADE_LABEL[m.grade]}
                      </div>
                    );
                  })()}
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
                  {/* EATI 徽章已整合进店名胶囊，此处不再显示小圆圈 */}
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

            <button
              type="button"
              onClick={() => toggleHudPanel('trace')}
              style={{
                position: 'absolute',
                left: 14,
                bottom: 26,
                zIndex: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(12, 28, 39, 0.82)',
                color: '#f2fff9',
                boxShadow: '0 0 0 1px rgba(126,238,224,0.06), 0 0 24px rgba(126,238,224,0.24)',
                cursor: 'pointer',
                animation: 'hud-glow 2.4s ease-in-out infinite',
              }}
            >
              <span style={{ fontSize: 18 }}>📖</span>
              <span style={{ fontSize: 12, fontWeight: 900 }}>岛民手账</span>
              <span style={{ fontSize: 12, opacity: 0.76 }}>➜</span>
            </button>

            <button
              type="button"
              onClick={() => toggleHudPanel('message')}
              style={{
                position: 'absolute',
                right: 14,
                bottom: 34,
                zIndex: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(31, 26, 45, 0.84)',
                color: '#fff6ee',
                boxShadow: '0 0 0 1px rgba(255,192,128,0.06), 0 0 26px rgba(255,176,88,0.24)',
                cursor: 'pointer',
                animation: 'hud-glow-warm 2.4s ease-in-out infinite',
              }}
            >
              <span style={{ fontSize: 18 }}>💌</span>
              <span style={{ fontSize: 12, fontWeight: 900 }}>岛上留言</span>
              <span style={{ fontSize: 12, opacity: 0.76 }}>➜</span>
            </button>

            {activeHudPanel === 'trace' ? (
              <div
                style={{
                  position: 'absolute',
                  left: 20,
                  bottom: 78,
                  zIndex: 7,
                  width: 340,
                  maxWidth: 'calc(100% - 40px)',
                  padding: '18px 18px 16px',
                  borderRadius: 26,
                  background: 'rgba(7, 28, 40, 0.9)',
                  border: '1px solid rgba(100,220,200,0.24)',
                  boxShadow: '0 22px 42px rgba(0,18,36,0.36)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  color: '#e8fbf5',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#9af7e6', letterSpacing: '0.12em' }}>
                      COLLECTION
                    </div>
                    <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>你的常去店</div>
                  </div>
                  <button
                    type="button"
                    onClick={closeHudPanel}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#e8fbf5',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 10,
                  }}
                >
                  <div style={{ padding: '12px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(196,232,226,0.72)' }}>🗓 连续来岛</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, color: '#7eeee0' }}>
                      {traceState.visitStreak} 天
                    </div>
                  </div>
                  <div style={{ padding: '12px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(196,232,226,0.72)' }}>⭐ 常去店</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, color: '#ffd9a2' }}>
                      {unlockedPawPrintCount} 家
                    </div>
                  </div>
                  <div style={{ padding: '12px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(196,232,226,0.72)' }}>🌳 你的树</div>
                    <div style={{ marginTop: 6, fontSize: 15, fontWeight: 900, color: '#c6f7a4' }}>
                      {traceState.visitStreak >= TREE_STREAK_THRESHOLD ? '长出来了' : `还差 ${Math.max(TREE_STREAK_THRESHOLD - traceState.visitStreak, 0)} 天`}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {unlockedPawPrintShopIds.slice(0, 3).map((shopId) => {
                    const shop = XUHUI_SHOPS.find((item) => item.id === shopId);
                    if (!shop) return null;
                    return (
                      <div
                        key={shop.id}
                        style={{
                          flex: '1 1 90px',
                          minWidth: 90,
                          padding: '10px 8px',
                          borderRadius: 18,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src={shop.image}
                          alt={shop.name}
                          draggable={false}
                          style={{
                            width: 64,
                            height: 64,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))',
                          }}
                        />
                        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 900, color: '#fff7ee' }}>
                          ⭐ {shop.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeHudPanel === 'message' ? (
              <div
                style={{
                  position: 'absolute',
                  right: 20,
                  bottom: 86,
                  zIndex: 7,
                  width: 340,
                  maxWidth: 'calc(100% - 40px)',
                  padding: '18px 18px 16px',
                  borderRadius: 26,
                  background: 'rgba(18, 24, 38, 0.92)',
                  border: '1px solid rgba(255,214,163,0.18)',
                  boxShadow: '0 22px 42px rgba(0,18,36,0.36)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  color: '#fff7ee',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#ffd59d', letterSpacing: '0.12em' }}>
                      POSTCARD
                    </div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900 }}>
                      给 {traceShop?.name ?? '这家店'} 留张小卡
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeHudPanel}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff7ee',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      playDefaultButtonSound();
                      cycleTraceShop(-1);
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff7ee',
                      cursor: 'pointer',
                    }}
                  >
                    ←
                  </button>
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 14,
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  >
                    {traceShop?.name ?? '岛上的这家店'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playDefaultButtonSound();
                      cycleTraceShop(1);
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff7ee',
                      cursor: 'pointer',
                    }}
                  >
                    →
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {traceShop ? (
                      <img
                        src={traceShop.image}
                        alt={traceShop.name}
                        draggable={false}
                        style={{
                          width: 84,
                          height: 84,
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.18))',
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { icon: '💛', line: QUICK_RECOMMENDATION_LINES[0] },
                        { icon: '🌙', line: QUICK_RECOMMENDATION_LINES[1] },
                        { icon: '✨', line: QUICK_RECOMMENDATION_LINES[2] },
                      ].map((item) => (
                        <button
                          key={item.line}
                          type="button"
                          onClick={() => {
                            playDefaultButtonSound();
                            setRecommendationDraft(item.line);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff7ee',
                            fontSize: 20,
                            cursor: 'pointer',
                          }}
                        >
                          {item.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <input
                  value={recommendationDraft}
                  onChange={(event) => setRecommendationDraft(event.target.value)}
                  placeholder="写一句短短的话"
                  style={{
                    width: '100%',
                    marginTop: 12,
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fffdf9',
                    padding: '12px 14px',
                    fontSize: 14,
                  }}
                />
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleSaveRecommendation}
                    style={{
                      flex: 1,
                      border: 0,
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #ffd89d 0%, #ffb86e 100%)',
                      color: '#5c3116',
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    留在店门口
                  </button>
                </div>
              </div>
            ) : null}

            {/* 传送门特效组件 */}
            <PortalEffect effect={portalEffect} />
            {mapFeedbackEffect ? (
              <div
                key={mapFeedbackEffect.id}
                style={{
                  position: 'absolute',
                  left: mapFeedbackEffect.left,
                  top: mapFeedbackEffect.top,
                  zIndex: 9,
                  width: 290,
                  maxWidth: 290,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  animation: 'map-feedback-rise 3s cubic-bezier(0.22,1,0.36,1) forwards',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    padding: '14px 16px 14px 14px',
                    borderRadius: 24,
                    border:
                      mapFeedbackEffect.tone === 'shop'
                        ? '1px solid rgba(255,214,163,0.46)'
                        : '1px solid rgba(196,183,160,0.52)',
                    background:
                      mapFeedbackEffect.tone === 'shop'
                        ? 'linear-gradient(180deg, rgba(61,37,23,0.94) 0%, rgba(38,24,18,0.92) 100%)'
                        : 'linear-gradient(180deg, rgba(241,233,221,0.96) 0%, rgba(219,207,191,0.94) 100%)',
                    color: mapFeedbackEffect.tone === 'shop' ? '#fff6eb' : '#4f3f34',
                    boxShadow:
                      mapFeedbackEffect.tone === 'shop'
                        ? '0 20px 36px rgba(36,18,9,0.28)'
                        : '0 20px 36px rgba(70,52,36,0.18)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        mapFeedbackEffect.tone === 'shop'
                          ? 'radial-gradient(circle at 18% 22%, rgba(255,220,170,0.22) 0%, transparent 28%), radial-gradient(circle at 84% 20%, rgba(255,174,90,0.14) 0%, transparent 24%)'
                          : 'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.36) 0%, transparent 30%), radial-gradient(circle at 84% 20%, rgba(173,149,122,0.18) 0%, transparent 26%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          mapFeedbackEffect.tone === 'shop'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(110,88,64,0.08)',
                        border:
                          mapFeedbackEffect.tone === 'shop'
                            ? '1px solid rgba(255,255,255,0.08)'
                            : '1px solid rgba(110,88,64,0.12)',
                        fontSize: 22,
                      }}
                    >
                      {mapFeedbackEffect.tone === 'shop' ? '💌' : '🪨'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.2 }}>
                        {mapFeedbackEffect.title}
                      </div>
                      {mapFeedbackEffect.subtitle ? (
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 11,
                            lineHeight: 1.45,
                            color:
                              mapFeedbackEffect.tone === 'shop'
                                ? 'rgba(255,232,209,0.74)'
                                : 'rgba(93,72,54,0.74)',
                          }}
                        >
                          {mapFeedbackEffect.subtitle}
                        </div>
                      ) : null}
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          lineHeight: 1.55,
                          fontWeight: 800,
                          color:
                            mapFeedbackEffect.tone === 'shop'
                              ? '#ffdcb0'
                              : '#5f4737',
                        }}
                      >
                        {mapFeedbackEffect.detail}
                      </div>
                    </div>
                  </div>
                  {[0, 1, 2].map((index) => (
                    <span
                      key={`feedback-spark-${index}`}
                      style={{
                        position: 'absolute',
                        right: 20 + index * 16,
                        top: 12 + (index % 2) * 12,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background:
                          mapFeedbackEffect.tone === 'shop'
                            ? 'rgba(255,225,176,0.88)'
                            : 'rgba(143,112,83,0.54)',
                        boxShadow:
                          mapFeedbackEffect.tone === 'shop'
                            ? '0 0 12px rgba(255,210,130,0.54)'
                            : '0 0 10px rgba(143,112,83,0.26)',
                        animation: `feedback-spark 1.4s ease-in-out ${index * 0.12}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <AgentStatusCard
              lobster={leadLobster}
              period={timePeriod}
              periodSpeech={leadPeriodSpeech}
            />
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

        @keyframes first-day-opening {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes hud-glow {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 0 0 1px rgba(126,238,224,0.06), 0 0 24px rgba(126,238,224,0.24);
          }
          50% {
            transform: translateY(-2px);
            box-shadow: 0 0 0 1px rgba(126,238,224,0.12), 0 0 34px rgba(126,238,224,0.34);
          }
        }

        @keyframes hud-glow-warm {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 0 0 1px rgba(255,192,128,0.06), 0 0 26px rgba(255,176,88,0.24);
          }
          50% {
            transform: translateY(-2px);
            box-shadow: 0 0 0 1px rgba(255,192,128,0.12), 0 0 36px rgba(255,176,88,0.34);
          }
        }

        @keyframes map-feedback-rise {
          0% {
            opacity: 0;
            transform: translate(-50%, -88%) scale(0.92);
            filter: blur(4px);
          }
          12% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1);
            filter: blur(0);
          }
          82% {
            opacity: 1;
            transform: translate(-50%, -106%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -118%) scale(1.03);
          }
        }

        @keyframes feedback-spark {
          0%,
          100% {
            opacity: 0.35;
            transform: translateY(0) scale(0.9);
          }
          50% {
            opacity: 1;
            transform: translateY(-4px) scale(1.08);
          }
        }

        @keyframes memorial-flag-wave {
          0%,
          100% {
            transform: translateX(-50%) rotate(-2deg) skewX(0deg);
          }
          50% {
            transform: translateX(-50%) rotate(2deg) skewX(-4deg);
          }
        }
      `}</style>

      <OnboardingJourney
        phase={journeyPhase}
        answers={firstDayAnswers}
        choiceGroups={FIRST_DAY_CHOICE_GROUPS}
        report={firstDayReport}
        onAnswer={handleAnswer}
        onContinueIntro={() => setJourneyPhase('questions')}
        onActivate={handleActivateFirstDay}
        onCloseReport={handleCloseReport}
        onShareStory={firstDayState ? handleShareStory : undefined}
        isSharingStory={isSharingStory}
        leadVariant={leadLobster?.variant}
      />

      {/* ── EATI 测评 Banner（未测评时）或人格快捷入口（已测评时）── */}
      {journeyPhase === 'hidden' && (
        <div
          style={{
            position: 'fixed',
            bottom: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            maxWidth: 420,
            width: 'calc(100% - 32px)',
          }}
        >
          {!eatiCode ? (
            /* 未测评：引导 Banner */
            <button
              type="button"
              onClick={() => setShowEatiQuiz(true)}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 999,
                border: 0,
                background: 'linear-gradient(135deg, rgba(255,211,110,0.9) 0%, rgba(255,150,50,0.85) 100%)',
                color: '#503014',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 28px rgba(255,160,60,0.36)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 22 }}>🦞</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>
                  旺财在等你 · 做完测评解锁专属推荐
                </span>
                <span style={{ display: 'block', fontSize: 11, opacity: 0.7, marginTop: 1 }}>
                  12 题 · 2 分钟 · 找到你的天命之店
                </span>
              </span>
              <span style={{ fontSize: 16 }}>→</span>
            </button>
          ) : (
            /* 已测评：显示人格快捷入口 */
            <button
              type="button"
              onClick={() => {
                window.location.href = `/xuhui-island/personality/${eatiCode}`;
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 999,
                border: '1.5px solid rgba(255,211,110,0.4)',
                background: 'rgba(3,14,24,0.82)',
                color: '#ffd36e',
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <span style={{ fontSize: 22 }}>{eatiCode ? getPersonality(eatiCode).emoji : '✦'}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>
                  {eatiCode ? getPersonality(eatiCode).name : '你的人格'}
                </span>
                <span style={{ display: 'block', fontSize: 11, opacity: 0.6, marginTop: 1 }}>
                  查看天命之选
                </span>
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #ffd36e 0%, #ff9a44 100%)',
                  color: '#503014',
                  fontSize: 11,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {eatiCode}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── EATI 测评弹窗 ── */}
      {showEatiQuiz && (
        <EatiQuiz
          leadVariant={leadLobster?.variant}
          onComplete={(code) => {
            setEatiCode(code);
            buildEatiMatchMap(code);
            setShowEatiQuiz(false);
            // 跳转到判决书
            window.location.href = `/xuhui-island/personality/${code}`;
          }}
          onClose={() => setShowEatiQuiz(false)}
        />
      )}

      {firstDayState && firstDayReport ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: -10000,
            top: 0,
            width: 760,
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          <div ref={storyCardRef}>
            <FirstDayStoryCard
              taste={firstDayState.taste}
              vibe={firstDayState.vibe}
              mood={firstDayState.mood}
              firstLine={firstDayReport.openingLine}
              firstStop={firstDayReport.shopName}
              reportLine={firstDayReport.summaryLine}
              timeLabel={firstDayReport.timeLabel}
              leadName={leadLobster?.name ?? '旺财'}
              leadVariant={leadLobster?.variant}
              shopImage={firstDayReport.shopImage}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
