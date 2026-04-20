'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  getPersonality,
  loadEatiResult,
  matchShops,
  parseCode,
  type ShopMatchResult,
} from '@/lib/eati';
import { XUHUI_SHOPS } from '@/config/xuhui-shops';
import { playAudioFile } from '@/lib/sound';
import { track } from '@/lib/tracker';

function playTap() {
  playAudioFile('/usual.mp3', 0.5);
}

type MatchGrade = ShopMatchResult['grade'];

const SHELL_BG =
  'radial-gradient(circle at top left, rgba(245,169,75,0.22), transparent 28%), radial-gradient(circle at 85% 14%, rgba(48,182,163,0.18), transparent 24%), linear-gradient(180deg, #140d08 0%, #1b120d 42%, #120b10 100%)';

const PANEL_BG = 'linear-gradient(180deg, rgba(42,28,21,0.92), rgba(24,17,14,0.92))';
const PANEL_BORDER = '1px solid rgba(255, 225, 176, 0.12)';
const CARD_BG = 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))';
const CARD_BORDER = '1px solid rgba(255,255,255,0.1)';
const SOFT_SHADOW = '0 22px 60px rgba(0,0,0,0.28)';
const DIM_LABELS_MAP: Record<string, string> = { A: '口味', B: '探索', C: '精致', D: '决策' };

const DIMENSION_META = {
  A: {
    title: '口味雷达',
    low: '清爽派',
    high: '重口派',
    color: '#ff8b66',
  },
  B: {
    title: '探索欲',
    low: '熟悉更稳',
    high: '新鲜优先',
    color: '#45d6b5',
  },
  C: {
    title: '精致度',
    low: '随意好吃',
    high: '讲究体验',
    color: '#f8b34f',
  },
  D: {
    title: '决策模式',
    low: '当机立断',
    high: '慢慢筛选',
    color: '#bf7cff',
  },
} as const;

const GRADE_CONFIG: Record<
  MatchGrade,
  {
    accent: string;
    accentSoft: string;
    pill: string;
    pillColor: string;
    label: string;
    hint: string;
    buttonBg: string;
    buttonColor: string;
    buttonShadow: string;
  }
> = {
  destiny: {
    accent: '#f8bd53',
    accentSoft: 'rgba(248,189,83,0.18)',
    pill: 'linear-gradient(135deg, #f5a53b, #ffd667)',
    pillColor: '#472600',
    label: '天命之选',
    hint: '几乎像为你预设',
    buttonBg: 'linear-gradient(135deg, #f8bd53, #ff9e2b)',
    buttonColor: '#402200',
    buttonShadow: '0 14px 28px rgba(248,189,83,0.22)',
  },
  great: {
    accent: '#37d5aa',
    accentSoft: 'rgba(55,213,170,0.16)',
    pill: 'linear-gradient(135deg, #2bcfa1, #4ae4bf)',
    pillColor: '#08251d',
    label: '高度契合',
    hint: '大概率会一口入坑',
    buttonBg: 'linear-gradient(135deg, #2bcfa1, #45f0bb)',
    buttonColor: '#07281f',
    buttonShadow: '0 14px 28px rgba(55,213,170,0.2)',
  },
  good: {
    accent: '#62a8ff',
    accentSoft: 'rgba(98,168,255,0.16)',
    pill: 'linear-gradient(135deg, #5b9bff, #7ec1ff)',
    pillColor: '#08203d',
    label: '值得一试',
    hint: '这顿吃它不会难受',
    buttonBg: 'rgba(98,168,255,0.14)',
    buttonColor: '#d9e9ff',
    buttonShadow: 'none',
  },
  contrast: {
    accent: '#c287ff',
    accentSoft: 'rgba(194,135,255,0.16)',
    pill: 'linear-gradient(135deg, #ad74ff, #d19cff)',
    pillColor: '#241237',
    label: '反差体验',
    hint: '换口味时可以冒一次险',
    buttonBg: 'rgba(194,135,255,0.12)',
    buttonColor: '#f0ddff',
    buttonShadow: 'none',
  },
  challenge: {
    accent: '#8d7768',
    accentSoft: 'rgba(184,165,150,0.12)',
    pill: 'linear-gradient(135deg, rgba(176,154,135,0.35), rgba(122,102,92,0.55))',
    pillColor: '#fff0dc',
    label: '饭搭子带你去',
    hint: '有人带你反而会更好玩',
    buttonBg: 'rgba(255,255,255,0.08)',
    buttonColor: 'rgba(255,245,230,0.78)',
    buttonShadow: 'none',
  },
};

function getDimensionCards(code: string) {
  const dims = parseCode(code);
  return (Object.entries(dims) as Array<[keyof typeof dims, 'H' | 'L']>).map(([key, value]) => {
    const meta = DIMENSION_META[key];
    return {
      key,
      color: meta.color,
      title: meta.title,
      value,
      label: value === 'H' ? meta.high : meta.low,
    };
  });
}

function FallingTitle({ text }: { text: string }) {
  const [visible, setVisible] = useState<boolean[]>(Array(text.length).fill(false));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    text.split('').forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisible((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, 240 + index * 70);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [text]);

  return (
    <span style={{ display: 'inline-block' }}>
      {text.split('').map((char, index) => (
        <span
          key={`${char}-${index}`}
          style={{
            display: 'inline-block',
            opacity: visible[index] ? 1 : 0,
            transform: visible[index]
              ? 'translateY(0) rotate(0deg)'
              : 'translateY(-18px) rotate(-6deg)',
            transition: 'all 420ms cubic-bezier(.2, .9, .2, 1.2)',
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

function RadarChart({ code }: { code: string }) {
  const dims = parseCode(code);
  const [animated, setAnimated] = useState(false);
  const size = 220;
  const center = size / 2;
  const maxRadius = 74;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const axes = [
    { key: 'A', label: '重口', angle: -90, bit: dims.A, color: '#ff8860' },
    { key: 'B', label: '探索', angle: 0, bit: dims.B, color: '#34d9af' },
    { key: 'C', label: '精致', angle: 90, bit: dims.C, color: '#ffbf54' },
    { key: 'D', label: '决策', angle: 180, bit: dims.D, color: '#bf7cff' },
  ] as const;

  const polar = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  };

  const levels = [0.3, 0.55, 0.78, 1];
  const polygons = levels.map((level) =>
    axes
      .map(({ angle }) => {
        const point = polar(angle, maxRadius * level);
        return `${point.x},${point.y}`;
      })
      .join(' ')
  );

  const targetPoints = axes.map(({ angle, bit }) => polar(angle, bit === 'H' ? maxRadius : maxRadius * 0.42));
  const currentPoints = animated ? targetPoints : axes.map(() => ({ x: center, y: center }));
  const polygonPoints = currentPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        padding: 22,
        borderRadius: 28,
        background:
          'radial-gradient(circle at center, rgba(248,189,83,0.12), rgba(255,255,255,0.02) 55%, transparent 75%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <svg width={size + 76} height={size + 76} viewBox={`-38 -38 ${size + 76} ${size + 76}`}>
        <defs>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,190,98,0.34)" />
            <stop offset="100%" stopColor="rgba(57,213,171,0.18)" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={maxRadius + 14} fill="rgba(255,255,255,0.03)" />
        {polygons.map((points, index) => (
          <polygon
            key={points}
            points={points}
            fill="none"
            stroke={index === polygons.length - 1 ? 'rgba(255,225,176,0.24)' : 'rgba(255,255,255,0.08)'}
            strokeWidth={1}
          />
        ))}
        {axes.map(({ angle, color, key }) => {
          const outer = polar(angle, maxRadius);
          return (
            <line
              key={key}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke={`${color}70`}
              strokeWidth={1.4}
              strokeDasharray="4 5"
            />
          );
        })}
        <polygon
          points={polygonPoints}
          fill="url(#radarFill)"
          stroke="rgba(255,216,138,0.95)"
          strokeWidth={2.2}
          style={{ transition: 'all 680ms cubic-bezier(.18, 1.1, .24, 1)' }}
        />
        {currentPoints.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r={animated ? 7 : 2}
            fill={axes[index].color}
            stroke="rgba(255,255,255,0.32)"
            strokeWidth={2}
            style={{ transition: `all 680ms cubic-bezier(.18, 1.1, .24, 1) ${index * 70}ms` }}
          />
        ))}
        {axes.map(({ angle, label, bit, color, key }) => {
          const point = polar(angle, maxRadius + 28);
          const textAnchor = angle === 180 ? 'end' : angle === 0 ? 'start' : 'middle';
          return (
            <text
              key={key}
              x={point.x}
              y={point.y + 4}
              textAnchor={textAnchor}
              fontSize={11}
              fontWeight={800}
              fill={color}
            >
              {label} {bit}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accent,
            boxShadow: `0 0 0 7px ${accent}20`,
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff0d9' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,231,204,0.62)', marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function ShopCard({ result, onVisit }: { result: ShopMatchResult; onVisit: (id: string) => void }) {
  const shop = XUHUI_SHOPS.find((entry) => entry.id === result.shopId);
  const cfg = GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.good;
  const isBuddy = result.grade === 'challenge';

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 28,
        padding: 22,
        background: `linear-gradient(135deg, ${cfg.accentSoft}, rgba(255,255,255,0.03) 55%)`,
        border: CARD_BORDER,
        boxShadow: '0 14px 36px rgba(0,0,0,0.16)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: 4,
          background: cfg.accent,
        }}
      />
      <div
        className="shop-card-body"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 18,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: 22,
            background: 'rgba(255,248,235,0.9)',
            border: '1px solid rgba(255,255,255,0.16)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {shop?.image ? (
            <img
              src={shop.image}
              alt={shop.name}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 28 }}>{result.grade === 'destiny' ? '👑' : '🍽️'}</span>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 900, color: '#fff5e6', lineHeight: 1.1 }}>
              {result.shopName}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: cfg.pill,
                color: cfg.pillColor,
                fontSize: 12,
                fontWeight: 900,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              {result.gradeLabel}
            </span>
          </div>

          <div style={{ fontSize: 14, color: 'rgba(255,233,204,0.7)', marginBottom: 12 }}>
            {shop?.cuisine || '岛上精选店铺'} · {cfg.hint}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {result.matchedDimensions.map((dimension) => (
              <span
                key={dimension}
                style={{
                  padding: '7px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,241,221,0.8)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {DIM_LABELS_MAP[dimension]}命中
              </span>
            ))}
          </div>
        </div>

        {!isBuddy ? (
          <button
            type="button"
            onClick={() => onVisit(result.shopId)}
            style={{
              justifySelf: 'end',
              border: 0,
              borderRadius: 999,
              padding: '13px 18px',
              background: cfg.buttonBg,
              color: cfg.buttonColor,
              fontSize: 14,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: cfg.buttonShadow,
              whiteSpace: 'nowrap',
            }}
          >
            去逛逛
          </button>
        ) : (
          <div
            style={{
              justifySelf: 'end',
              padding: '12px 14px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,239,220,0.74)',
              fontWeight: 700,
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            饭搭子
            <br />
            带你去
          </div>
        )}
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: CSSProperties['color'];
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: 12, color: 'rgba(255,231,204,0.54)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: tone ?? '#fff0d9' }}>{value}</div>
    </div>
  );
}

interface PersonalityClientProps {
  code: string;
}

export function PersonalityClient({ code }: PersonalityClientProps) {
  const router = useRouter();
  const personality = getPersonality(code);
  const [matchResults, setMatchResults] = useState<ShopMatchResult[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const result = loadEatiResult();
    const shopInputs = XUHUI_SHOPS.map((shop) => ({ id: shop.id, name: shop.name, eatiCode: shop.eatiCode }));
    setMatchResults(matchShops(code, shopInputs));
    track('eati_personality_viewed', { code, isSelf: result?.code === code });

    const timer = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(timer);
  }, [code]);

  const handleVisitShop = (shopId: string) => {
    playTap();
    track('eati_shop_clicked', { code, shopId, from: 'personality_page' });
    router.push(`/xuhui-island/shop/${shopId}`);
  };

  const handleGoIsland = () => {
    playTap();
    track('eati_go_island', { code });
    router.push('/xuhui-island');
  };

  const handleShare = async () => {
    playTap();
    const url = `${window.location.origin}/xuhui-island/personality/${code}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      track('eati_share_copied', { code });
    } catch {
      // noop
    }
  };

  const destinyShops = matchResults.filter((result) => result.grade === 'destiny');
  const greatShops = matchResults.filter((result) => result.grade === 'great');
  const otherShops = matchResults.filter((result) => result.grade !== 'destiny' && result.grade !== 'great');
  const dimensionCards = getDimensionCards(code);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: SHELL_BG,
        color: '#fff6ea',
        paddingBottom: 132,
        overflowX: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes eati-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes eati-shimmer {
          0% { transform: translateX(-120%) skewX(-18deg); }
          100% { transform: translateX(220%) skewX(-18deg); }
        }

        .personality-shell {
          position: relative;
          max-width: 1280px;
          margin: 0 auto;
          padding: 28px 18px 0;
        }

        .personality-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .hero-panel {
          position: relative;
          overflow: hidden;
          border-radius: 34px;
          background: ${PANEL_BG};
          border: ${PANEL_BORDER};
          box-shadow: ${SOFT_SHADOW};
        }

        .content-panel {
          display: grid;
          gap: 18px;
        }

        .shop-grid {
          display: grid;
          gap: 14px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .dimension-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        @media (min-width: 980px) {
          .personality-shell {
            padding: 34px 28px 0;
          }

          .personality-layout {
            grid-template-columns: minmax(360px, 420px) minmax(0, 1fr);
            gap: 24px;
            align-items: start;
          }

          .hero-panel {
            position: sticky;
            top: 22px;
          }

          .shop-grid {
            gap: 16px;
          }
        }

        @media (max-width: 760px) {
          .info-grid,
          .dimension-grid {
            grid-template-columns: 1fr;
          }

          .shop-card-body,
          .retake-card,
          .bottom-actions {
            grid-template-columns: 1fr !important;
          }

          .shop-card-body > :last-child,
          .retake-card > :last-child {
            justify-self: start !important;
          }
        }

        @media (max-width: 900px) {
          .shop-card-grid-fallback {
            grid-template-columns: 1fr !important;
          }
        }
      ` }} />

      <div
        style={{
          position: 'fixed',
          inset: '0 auto auto 0',
          width: '100%',
          height: 5,
          zIndex: 30,
          background: 'linear-gradient(90deg, #ff8b66 0%, #f7bd53 25%, #3bdab1 60%, #86b7ff 80%, #bf7cff 100%)',
          boxShadow: '0 0 22px rgba(255,183,76,0.35)',
        }}
      />

      <div className="personality-shell">
        <div className="personality-layout">
          <aside
            className="hero-panel"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 650ms cubic-bezier(.2, .9, .2, 1)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 20% 18%, rgba(248,189,83,0.18), transparent 28%), radial-gradient(circle at 80% 12%, rgba(59,218,177,0.12), transparent 25%), radial-gradient(circle at 50% 100%, rgba(191,124,255,0.14), transparent 36%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ padding: '22px 22px 24px', position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={handleGoIsland}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,240,220,0.82)',
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  ← 回到岛上
                </button>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: 'rgba(248,189,83,0.12)',
                    border: '1px solid rgba(248,189,83,0.28)',
                    color: '#ffd695',
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.18em',
                  }}
                >
                  🦞 EATI · {code}
                </div>
              </div>

              <div
                style={{
                  padding: '24px 22px 20px',
                  borderRadius: 30,
                  background: CARD_BG,
                  border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    width: 108,
                    height: 108,
                    borderRadius: 30,
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 18,
                    background:
                      'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), rgba(255,255,255,0.06) 58%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
                    fontSize: 62,
                    animation: 'eati-float 4s ease-in-out infinite',
                  }}
                >
                  {personality.emoji}
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'rgba(59,218,177,0.12)',
                    border: '1px solid rgba(59,218,177,0.22)',
                    color: '#9ef2da',
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 14,
                  }}
                >
                  代号 {personality.shortName}
                </div>

                <div
                  style={{
                    fontSize: 'clamp(34px, 5vw, 50px)',
                    fontWeight: 900,
                    lineHeight: 1.04,
                    color: '#fff3df',
                    marginBottom: 12,
                    letterSpacing: '-0.04em',
                  }}
                >
                  <FallingTitle text={personality.name} />
                </div>

                <div
                  style={{
                    fontSize: 17,
                    lineHeight: 1.7,
                    color: 'rgba(255,233,204,0.76)',
                    marginBottom: 20,
                    maxWidth: 420,
                  }}
                >
                  {personality.tagline}
                </div>

                <div style={{ marginBottom: 18 }}>
                  <RadarChart code={code} />
                </div>

                <div className="dimension-grid">
                  {dimensionCards.map((item) => (
                    <div
                      key={item.key}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 18,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div style={{ fontSize: 12, color: item.color, fontWeight: 800, marginBottom: 6 }}>
                        {item.key} · {item.title}
                      </div>
                      <div style={{ fontSize: 15, color: '#fff3df', fontWeight: 800 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="content-panel">
            <section
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 34,
                padding: 24,
                background: PANEL_BG,
                border: PANEL_BORDER,
                boxShadow: SOFT_SHADOW,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 'auto -10% -36% auto',
                  width: 260,
                  height: 260,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(248,189,83,0.18), transparent 65%)',
                  pointerEvents: 'none',
                }}
              />

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  marginBottom: 16,
                  background: 'rgba(248,189,83,0.1)',
                  border: '1px solid rgba(248,189,83,0.24)',
                  color: '#ffdb9a',
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                }}
              >
                旺财的判决
              </div>

              <div
                style={{
                  fontSize: 'clamp(18px, 2vw, 28px)',
                  lineHeight: 1.75,
                  fontWeight: 800,
                  color: '#fff1d8',
                  maxWidth: 920,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {personality.wangcaiVerdict}
              </div>

              <div className="info-grid" style={{ marginTop: 20 }}>
                <InfoTile label="人格编号" value={code} tone="#ffd695" />
                <InfoTile
                  label="优先推荐"
                  value={destinyShops.length > 0 ? `${destinyShops.length} 家天命之选` : `${greatShops.length} 家高度契合`}
                  tone={destinyShops.length > 0 ? '#f8bd53' : '#65e4be'}
                />
                <InfoTile label="你的风格" value={personality.shortName} />
                <InfoTile label="可逛店铺" value={matchResults.length} />
              </div>
            </section>

            {destinyShops.length > 0 && (
              <section
                style={{
                  borderRadius: 32,
                  padding: 22,
                  background: PANEL_BG,
                  border: PANEL_BORDER,
                  boxShadow: SOFT_SHADOW,
                }}
              >
                <SectionHeader
                  title="天命之选"
                  subtitle="最应该先去的那几家"
                  accent={GRADE_CONFIG.destiny.accent}
                />
                <div className="shop-grid">
                  {destinyShops.map((result) => (
                    <ShopCard key={result.shopId} result={result} onVisit={handleVisitShop} />
                  ))}
                </div>
              </section>
            )}

            {greatShops.length > 0 && (
              <section
                style={{
                  borderRadius: 32,
                  padding: 22,
                  background: PANEL_BG,
                  border: PANEL_BORDER,
                  boxShadow: SOFT_SHADOW,
                }}
              >
                <SectionHeader
                  title="高度契合"
                  subtitle="不一定一眼心动，但吃完会记住"
                  accent={GRADE_CONFIG.great.accent}
                />
                <div className="shop-grid">
                  {greatShops.map((result) => (
                    <ShopCard key={result.shopId} result={result} onVisit={handleVisitShop} />
                  ))}
                </div>
              </section>
            )}

            {otherShops.length > 0 && (
              <section
                style={{
                  borderRadius: 32,
                  padding: 22,
                  background: PANEL_BG,
                  border: PANEL_BORDER,
                  boxShadow: SOFT_SHADOW,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setShowAll((value) => !value);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    borderRadius: 24,
                    padding: '18px 20px',
                    border: '1px solid rgba(255,255,255,0.09)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))',
                    color: '#fff0d8',
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  <span>更多商家：反差体验 / 值得一试 / 饭搭子路线</span>
                  <span style={{ fontSize: 22, color: 'rgba(255,241,220,0.68)' }}>{showAll ? '−' : '+'}</span>
                </button>

                {showAll && (
                  <div className="shop-grid" style={{ marginTop: 16 }}>
                    {otherShops.map((result) => (
                      <ShopCard key={result.shopId} result={result} onVisit={handleVisitShop} />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section
              style={{
                borderRadius: 32,
                padding: 22,
                background: PANEL_BG,
                border: PANEL_BORDER,
                boxShadow: SOFT_SHADOW,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  playTap();
                  track('eati_retake', { code });
                  router.push('/xuhui-island?eati=quiz');
                }}
                className="retake-card"
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  border: 0,
                  borderRadius: 26,
                  padding: '22px 20px',
                  background:
                    'linear-gradient(135deg, rgba(98,168,255,0.12), rgba(255,255,255,0.05) 38%, rgba(194,135,255,0.1) 100%)',
                  color: '#fff2de',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 18,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,0.09)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 24,
                  }}
                >
                  🔄
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>觉得结果不准？重新测一次</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,231,204,0.66)', lineHeight: 1.6 }}>
                    12 道题，约 2 分钟。新的结果会直接覆盖当前人格。
                  </div>
                </div>
                <div style={{ fontSize: 24, color: 'rgba(255,241,220,0.74)' }}>→</div>
              </button>
            </section>
          </main>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '14px 16px 22px',
          background: 'linear-gradient(180deg, rgba(18,11,16,0), rgba(18,11,16,0.94) 50%)',
          zIndex: 20,
        }}
      >
        <div
          className="bottom-actions"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={handleGoIsland}
            style={{
              position: 'relative',
              overflow: 'hidden',
              border: 0,
              borderRadius: 999,
              padding: '18px 24px',
              background: 'linear-gradient(135deg, #ffe17d, #ffad2e 48%, #ff9135)',
              color: '#3e2205',
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              boxShadow: '0 18px 40px rgba(255,173,46,0.32)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.44), transparent)',
                animation: 'eati-shimmer 3.4s linear infinite',
              }}
            />
            <span style={{ position: 'relative' }}>去岛上找天命之选</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            style={{
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: copied ? 'rgba(59,218,177,0.16)' : 'rgba(255,255,255,0.08)',
              color: copied ? '#9ef2da' : '#fff0d9',
              padding: '18px 20px',
              fontSize: 14,
              fontWeight: 900,
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '链接已复制' : '分享给饭搭子'}
          </button>
        </div>
      </div>
    </div>
  );
}
