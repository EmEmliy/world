'use client';

/**
 * EATI 人格判决书页面 —— 游戏大师联合设计版
 * 高橋幸嗣(动森) × Phil Duncan(胡闹厨房) × Eric Barone(星露谷)
 *
 * 特性：
 *  - 人格名字符逐个「掉落」入场
 *  - 雷达图顶点从中心「弹射」出来
 *  - 全局暖沙底色 #FFF9F0
 *  - 5档契合度视觉系统（金/绿/蓝/紫/橙）
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  getPersonality,
  matchShops,
  parseCode,
  loadEatiResult,
  type ShopMatchResult,
} from '@/lib/eati';
import { XUHUI_SHOPS } from '@/config/xuhui-shops';
import { track } from '@/lib/tracker';
import { playAudioFile } from '@/lib/sound';

function playTap() { playAudioFile('/usual.mp3', 0.5); }

// ── 人格名字掉落动画组件 ──────────────────────────────────────────
function FallingTitle({ text }: { text: string }) {
  const [visible, setVisible] = useState<boolean[]>(Array(text.length).fill(false));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    text.split('').forEach((_, i) => {
      const t = setTimeout(() => {
        setVisible((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 300 + i * 80);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [text]);

  return (
    <div style={{ display: 'inline-block' }}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            opacity: visible[i] ? 1 : 0,
            transform: visible[i] ? 'translateY(0) rotate(0deg)' : 'translateY(-24px) rotate(-8deg)',
            transition: 'all 400ms cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

// ── 四维雷达图（顶点弹射动效）────────────────────────────────────
interface RadarChartProps { code: string; }

function RadarChart({ code }: RadarChartProps) {
  const dims = parseCode(code);
  const [animated, setAnimated] = useState(false);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 68;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 600);
    return () => clearTimeout(t);
  }, []);

  const axes = [
    { label: 'A 重口度', angle: -90, bit: dims.A, color: '#ff5252', emoji: '🌶️' },
    { label: 'B 探索欲', angle: 0,   bit: dims.B, color: '#00c87a', emoji: '🗺️' },
    { label: 'C 精细度', angle: 90,  bit: dims.C, color: '#ff9800', emoji: '✨' },
    { label: 'D 确定性', angle: 180, bit: dims.D, color: '#9c27b0', emoji: '🎯' },
  ];

  function polar(angleDeg: number, r: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) =>
    axes.map(({ angle }) => {
      const p = polar(angle, maxR * level);
      return `${p.x},${p.y}`;
    }).join(' ')
  );

  // 动画：从中心弹射
  const targetPoints = axes.map(({ angle, bit }) => {
    const r = bit === 'H' ? maxR : maxR * 0.42;
    return polar(angle, r);
  });
  const centerPoints = axes.map(() => ({ x: cx, y: cy }));
  const dataPoints = animated ? targetPoints : centerPoints;
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ position: 'relative', width: size + 60, height: size + 50, margin: '0 auto' }}>
      <svg
        width={size + 60}
        height={size + 50}
        viewBox={`-30 -25 ${size + 60} ${size + 50}`}
        style={{ overflow: 'visible' }}
      >
        {/* 背景圆形 */}
        <circle cx={cx} cy={cy} r={maxR + 5} fill="rgba(255,152,0,0.06)" stroke="rgba(255,152,0,0.2)" strokeWidth={1} />
        {/* 网格 */}
        {gridPolygons.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
        ))}
        {/* 轴线 */}
        {axes.map(({ angle, color }, i) => {
          const outer = polar(angle, maxR);
          return (
            <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y}
              stroke={`${color}60`} strokeWidth={1} strokeDasharray="3 3" />
          );
        })}
        {/* 数据多边形 */}
        <polygon
          points={dataPolygon}
          fill="rgba(255,152,0,0.15)"
          stroke="rgba(255,82,82,0.8)"
          strokeWidth={2.5}
          style={{ transition: 'all 600ms cubic-bezier(.34,1.56,.64,1)' }}
        />
        {/* 数据点 */}
        {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={animated ? 7 : 2}
            fill={axes[i].color} stroke="rgba(255,255,255,0.3)" strokeWidth={2}
            style={{ transition: `all 600ms cubic-bezier(.34,1.56,.64,1) ${i * 80}ms` }}
          />
        ))}
        {/* 轴标签 */}
        {axes.map(({ angle, label, bit, color }, i) => {
          const lp = polar(angle, maxR + 26);
          const isLeft = angle === 180;
          const isRight = angle === 0;
          return (
            <text key={i} x={lp.x} y={lp.y + 4}
              textAnchor={isLeft ? 'end' : isRight ? 'start' : 'middle'}
              fontSize={10} fontWeight={900} fill={color}>
              {label}{' '}
              <tspan fill={bit === 'H' ? '#ff7b6b' : 'rgba(255,255,255,0.3)'} fontSize={11} fontWeight={900}>
                {bit}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── 5档契合度配置（Coze 极简版）──────────────────────────────────────
const GRADE_CONFIG: Record<string, {
  accent: string;      // 左边框 accent 色
  accentAlpha: string; // 背景淡晕
  pill: string;        // 胶囊渐变
  pillColor: string;
  label: string;
  ctaBg: string;
  ctaColor: string;
  ctaGlow: string;
}> = {
  destiny: {
    accent: '#F5A623',
    accentAlpha: 'rgba(245,166,35,0.06)',
    pill: 'linear-gradient(90deg,#F5A623,#F7C948)',
    pillColor: '#fff',
    label: '👑 天命之选',
    ctaBg: 'linear-gradient(90deg,#F5A623,#F7C948)',
    ctaColor: '#fff',
    ctaGlow: '0 4px 14px rgba(245,166,35,0.4)',
  },
  great: {
    accent: '#2ECC9A',
    accentAlpha: 'rgba(46,204,154,0.05)',
    pill: 'linear-gradient(90deg,#2ECC9A,#26de81)',
    pillColor: '#fff',
    label: '🔥 高度契合',
    ctaBg: 'linear-gradient(90deg,#2ECC9A,#26de81)',
    ctaColor: '#fff',
    ctaGlow: '0 4px 14px rgba(46,204,154,0.35)',
  },
  good: {
    accent: '#4E9EF5',
    accentAlpha: 'rgba(78,158,245,0.04)',
    pill: 'linear-gradient(90deg,#4E9EF5,#6ab0f5)',
    pillColor: '#fff',
    label: '✨ 值得一试',
    ctaBg: 'rgba(78,158,245,0.12)',
    ctaColor: '#4E9EF5',
    ctaGlow: 'none',
  },
  contrast: {
    accent: '#A55EEA',
    accentAlpha: 'rgba(165,94,234,0.05)',
    pill: 'linear-gradient(90deg,#A55EEA,#8854d0)',
    pillColor: '#fff',
    label: '⚡ 反差体验',
    ctaBg: 'rgba(165,94,234,0.12)',
    ctaColor: '#A55EEA',
    ctaGlow: 'none',
  },
  challenge: {
    accent: 'rgba(0,0,0,0.12)',
    accentAlpha: 'rgba(0,0,0,0.02)',
    pill: 'rgba(0,0,0,0.08)',
    pillColor: '#999',
    label: '🤝 饭搭子带你去',
    ctaBg: 'transparent',
    ctaColor: '#bbb',
    ctaGlow: 'none',
  },
};

const DIM_LABELS_MAP: Record<string, string> = { A: '口味', B: '探索', C: '精致', D: '确定' };

// ── 商户匹配卡片（Coze × 乔布斯极简版）──────────────────────────────
function ShopCard({ result, onVisit }: { result: ShopMatchResult; onVisit: (id: string) => void }) {
  const shop = XUHUI_SHOPS.find((s) => s.id === result.shopId);
  const cfg = GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.good;
  const isBuddy = result.grade === 'challenge';

  return (
    <div style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 14px 14px 0',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.07)',
       backdropFilter: 'blur(12px)',
       border: '1px solid rgba(255,255,255,0.1)',
       boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      overflow: 'hidden',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
    }}>
      {/* 左侧 accent 色条 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: cfg.accent,
        borderRadius: '18px 0 0 18px',
      }} />

      {/* 左侧 accent 背景晕 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%',
        background: `linear-gradient(90deg, ${cfg.accentAlpha}, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* 商家图标 */}
      <div style={{ width: 16, flexShrink: 0 }} /> {/* accent 条间距 */}
      {shop?.image && (
        <div style={{
          width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <img src={shop.image} alt={shop.name} draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )}

      {/* 文字区 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 第一行：商家名 + 胶囊 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: 'rgba(255,255,255,0.92)' }}>
            {result.shopName}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.02em',
            padding: '2px 8px', borderRadius: 999,
            background: cfg.pill, color: cfg.pillColor,
          }}>
            {cfg.label}
          </span>
        </div>

        {/* 第二行：菜系 + 维度标签 */}
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
             {shop?.cuisine}
           </span>
           {result.matchedDimensions.map((dim) => (
             <span key={dim} style={{
               fontSize: 10, fontWeight: 700,
               padding: '1px 6px', borderRadius: 4,
               background: 'rgba(255,255,255,0.1)',
               color: 'rgba(255,255,255,0.55)',
             }}>
              {DIM_LABELS_MAP[dim]} ✓
            </span>
          ))}
        </div>
      </div>

      {/* CTA 按钮 */}
      {!isBuddy ? (
        <button type="button" onClick={() => onVisit(result.shopId)} style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: 999, border: 0,
          background: cfg.ctaBg, color: cfg.ctaColor,
          fontSize: 12, fontWeight: 900, cursor: 'pointer',
          boxShadow: cfg.ctaGlow,
          transition: 'transform 150ms ease, box-shadow 150ms ease',
          marginRight: 2,
        }}>去逛逛</button>
      ) : (
        <div style={{
          flexShrink: 0,
          color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.4, marginRight: 4,
        }}>饭搭子<br />带你去</div>
      )}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────
interface PersonalityClientProps { code: string; }

export function PersonalityClient({ code }: PersonalityClientProps) {
  const router = useRouter();
  const personality = getPersonality(code);
  const [matchResults, setMatchResults] = useState<ShopMatchResult[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const prevCodeRef = useRef(code);

  useEffect(() => {
    prevCodeRef.current = code;
    const result = loadEatiResult();
    const shopInputs = XUHUI_SHOPS.map((s) => ({ id: s.id, name: s.name, eatiCode: s.eatiCode }));
    setMatchResults(matchShops(code, shopInputs));
    track('eati_personality_viewed', { code, isSelf: result?.code === code });
    // 入场动画延迟
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
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
    } catch { /* noop */ }
  };

  const destinyShops = matchResults.filter((r) => r.grade === 'destiny');
  const greatShops = matchResults.filter((r) => r.grade === 'great');
  const otherShops = matchResults.filter((r) => r.grade !== 'destiny' && r.grade !== 'great');

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #1a1008 0%, #1e1204 50%, #1a0e14 100%)',
      color: '#f0e8d8',
      padding: '0 0 100px',
      overflowX: 'hidden',
    }}>
      {/* ── 全局动画 CSS ── */}
      <style>{`
        @keyframes eati-float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes eati-emoji-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes eati-lightning-border {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes eati-glow-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(255,200,40,0.35), 0 8px 24px rgba(255,150,0,0.2); }
          50% { box-shadow: 0 0 40px rgba(255,200,40,0.6), 0 12px 36px rgba(255,150,0,0.35); }
        }
        @keyframes eati-shine {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
        /* ── 宽屏两列布局 ── */
        .personality-layout {
          max-width: 1080px;
          margin: 0 auto;
        }
        .personality-inner {
          display: block;
        }
        .personality-hero {
          position: relative;
          padding: 52px 24px 36px;
          text-align: center;
          overflow: hidden;
        }
        .personality-right {
          padding: 0 16px 0;
        }
        .personality-section-gap {
          margin-left: 16px;
          margin-right: 16px;
        }
        @media (min-width: 900px) {
          .personality-inner {
            display: grid;
            grid-template-columns: 340px 1fr;
            align-items: start;
          }
          .personality-hero {
            position: sticky;
            top: 0;
            max-height: 100dvh;
            overflow-y: auto;
            scrollbar-width: none;
            padding: 52px 16px 36px;
          }
          .personality-hero::-webkit-scrollbar { display: none; }
          .personality-right {
            padding: 28px 32px 120px 20px;
          }
          .personality-section-gap {
            margin-left: 0;
            margin-right: 0;
          }
        }
      `}</style>

      {/* 顶部彩虹条 — 全宽 fixed */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 4, zIndex: 100,
        background: 'linear-gradient(90deg, #ff5252, #ff9800, #ffd36e, #26de81, #4ecdc4, #a55eea)',
      }} />

      <div className="personality-layout">
      <div className="personality-inner">

      {/* ── 左列：Hero 区域 ── */}
      <div className="personality-hero" style={{
        opacity: heroVisible ? 1 : 0,
        transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 600ms cubic-bezier(.22,1,.36,1)',
      }}>
        {/* 背景彩色光斑 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,152,0,0.15) 0%, transparent 55%), radial-gradient(ellipse at 20% 100%, rgba(165,94,234,0.1) 0%, transparent 45%)',
        }} />

        {/* 返回 */}
        <button type="button" onClick={handleGoIsland} style={{
          position: 'absolute', top: 16, left: 16,
          padding: '8px 14px', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}>← 回到岛上</button>

        {/* EATI 编码标签 */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 16px', borderRadius: 999, marginBottom: 16,
          background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.4)',
          fontSize: 12, fontWeight: 900, letterSpacing: '0.22em', color: '#ffb347',
        }}>
          🦞 EATI · {code}
        </div>

        {/* Emoji 大图 */}
        <div style={{
          fontSize: 'clamp(60px, 12vw, 92px)', lineHeight: 1,
          animation: 'eati-emoji-bounce 2.5s ease-in-out infinite',
        }}>
          {personality.emoji}
        </div>

        {/* 人格名字（掉落动画） */}
        <div style={{
          marginTop: 14,
          fontSize: 'clamp(28px, 6vw, 48px)',
          fontWeight: 900,
          lineHeight: 1.1,
          background: 'linear-gradient(135deg, #ff7b6b, #ffb347)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          <FallingTitle text={personality.name} />
        </div>

        {/* 标语 */}
        <div style={{
          marginTop: 10,
          fontSize: 'clamp(14px, 2.5vw, 18px)',
          fontWeight: 800, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5,
          opacity: heroVisible ? 1 : 0,
          transition: 'opacity 400ms ease 800ms',
        }}>
          {personality.tagline}
        </div>

        {/* 雷达图 */}
        <div style={{ marginTop: 28 }}>
          <RadarChart code={code} />
        </div>
      </div>

      {/* ── 右列：内容区 ── */}
      <div className="personality-right">

      {/* ── 旺财判决词 ── */}
      <div style={{
        margin: '0 0 24px',
        padding: '20px 20px',
        borderRadius: 26,
        background: 'linear-gradient(135deg, rgba(255,180,40,0.12), rgba(255,120,0,0.08))',
        border: '1px solid rgba(255,180,40,0.3)',
        boxShadow: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd36e, #ff9800)',
            boxShadow: '0 2px 8px rgba(255,180,40,0.5)',
          }} />
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(255,180,80,0.85)' }}>
            🦞 旺财的判决
          </span>
        </div>
        <div style={{
          fontSize: 15, lineHeight: 1.8, fontWeight: 800, color: 'rgba(255,230,180,0.9)',
          letterSpacing: '0.01em',
        }}>
          {personality.wangcaiVerdict}
        </div>
      </div>

      {/* ── 天命之选 ── */}
      {destinyShops.length > 0 && (
        <div style={{ margin: '0 0 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <div style={{ width: 3, height: 16, borderRadius: 99, background: '#F5A623', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.01em' }}>
               👑 天命之选
             </span>
             <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>为你而生</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {destinyShops.map((r) => (
              <ShopCard key={r.shopId} result={r} onVisit={handleVisitShop} />
            ))}
          </div>
        </div>
      )}

      {/* ── 高度契合 ── */}
      {greatShops.length > 0 && (
        <div style={{ margin: '0 0 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <div style={{ width: 3, height: 16, borderRadius: 99, background: '#2ECC9A', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.01em' }}>
               🔥 高度契合
             </span>
             <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>大概率会爱上</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {greatShops.map((r) => (
              <ShopCard key={r.shopId} result={r} onVisit={handleVisitShop} />
            ))}
          </div>
        </div>
      )}

      {/* ── 其他（折叠） ── */}
      {otherShops.length > 0 && (
        <div style={{ margin: '0 0 20px' }}>
          <button type="button"
            onClick={() => { playTap(); setShowAll((v) => !v); }}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 16,
               border: '1px solid rgba(255,255,255,0.1)',
               background: 'rgba(255,255,255,0.06)',
               backdropFilter: 'blur(8px)',
               color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <span>更多商家（含反差体验 & 饭搭子带你去）</span>
             <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)' }}>{showAll ? '↑' : '↓'}</span>
          </button>
          {showAll && (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {otherShops.map((r) => (
                <ShopCard key={r.shopId} result={r} onVisit={handleVisitShop} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 重测入口 ── */}
      <div style={{ margin: '4px 0 0' }}>
        <button type="button"
          onClick={() => { playTap(); track('eati_retake', { code }); router.push('/xuhui-island?eati=quiz'); }}
          style={{
            width: '100%', padding: '16px 18px', borderRadius: 20,
            border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
            fontSize: 14, fontWeight: 900, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
          <span style={{ fontSize: 22, animation: 'eati-float 3s ease-in-out infinite' }}>🔄</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.55)' }}>
              觉得结果不准？重新测一次
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
              12 题 · 2 分钟 · 结果会覆盖当前人格
            </span>
          </span>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)' }}>→</span>
        </button>
      </div>

      </div>{/* end personality-right */}
      </div>{/* end personality-inner */}
      </div>{/* end personality-layout */}

      {/* ── 固定底部 CTA ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 16px 24px',
        background: 'linear-gradient(0deg, rgba(26,16,8,1) 0%, rgba(26,16,8,0) 100%)',
        display: 'flex', gap: 10,
      }}>
        <button type="button" onClick={handleGoIsland} style={{
          flex: 1, padding: '15px 16px', borderRadius: 999, border: 0,
          background: 'linear-gradient(135deg, #FFD700, #FF9500)',
          color: '#5c3000', fontSize: 14, fontWeight: 900, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(255,180,40,0.45)',
          letterSpacing: '0.02em',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* 光泽扫过效果 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            animation: 'eati-shine 3s ease-in-out infinite',
          }} />
          <span style={{ position: 'relative' }}>去岛上找天命之选 🔥</span>
        </button>
        <button type="button" onClick={handleShare} style={{
          flex: '0 0 auto', padding: '15px 18px', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.15)',
          background: copied ? 'rgba(46,204,154,0.15)' : 'rgba(255,255,255,0.08)',
          color: copied ? '#2ECC9A' : 'rgba(255,255,255,0.7)',
          fontSize: 13, fontWeight: 900, cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'all 200ms ease',
          backdropFilter: 'blur(8px)',
        }}>
          {copied ? '已复制 ✓' : '分享给饭搭子 📤'}
        </button>
      </div>
    </div>
  );
}
