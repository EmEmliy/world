'use client';

import { useEffect, useState } from 'react';
import { XUHUI_SHOPS } from '@/config/xuhui-shops';
import type { LobsterTimePeriod } from '../_lib/game-logic';
import { LOBSTER_WAIT_SPOTS, type LobsterWalker } from '../_lib/game-logic';

interface AgentStatusCardProps {
  lobster: LobsterWalker | null;
  periodSpeech?: string;
  period?: LobsterTimePeriod;
}

function formatEta(ms: number) {
  if (ms <= 0) return '马上';
  const minutes = Math.ceil(ms / 60000);
  return minutes <= 1 ? '不到1分钟' : `${minutes}分钟后`;
}

export function AgentStatusCard({
  lobster,
  periodSpeech,
  period,
}: AgentStatusCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!lobster) return null;

  const activeShopId = lobster.mode === 'inside' ? lobster.currentShopId : lobster.destination.kind === 'shop' ? lobster.destination.id : undefined;
  const shop = activeShopId ? XUHUI_SHOPS.find((item) => item.id === activeShopId) : null;
  const spot = lobster.destination.kind === 'spot'
    ? LOBSTER_WAIT_SPOTS.find((item) => item.id === lobster.destination.id)
    : null;

  const locationLabel = lobster.mode === 'inside'
    ? `正在打听：${shop?.name ?? '店里'}`
    : lobster.destination.kind === 'shop'
      ? `正在前往：${shop?.name ?? '下一家店'}`
      : `正在停留：${spot?.label ?? '岛上角落'}`;

  const speech = lobster.mode === 'inside'
    ? `帮你看看${shop?.name ?? '这家店'}今天有没有隐藏菜单……`
    : periodSpeech ?? lobster.bubbleText ?? lobster.personality.catchphrase;

  const accentColor =
    period === 'sunset'
      ? '#ffd58a'
      : period === 'night'
        ? '#9dd9ff'
        : period === 'morning'
          ? '#d7f3ff'
          : '#9af7e6';

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 7,
        width: 360,
        maxWidth: 'calc(100% - 32px)',
        padding: '18px 18px 16px',
        borderRadius: 26,
        background: 'rgba(8, 26, 40, 0.94)',
        border: '1px solid rgba(100,220,200,0.24)',
        boxShadow: '0 22px 42px rgba(0,20,50,0.26)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: '#d9f6ef',
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900, color: '#9af7e6' }}>
        🦞 {lobster.name} · Agent 在线
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          color: accentColor,
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.08em',
        }}
      >
        {period === 'night' ? '深夜亮灯' : period === 'sunset' ? '傍晚看海' : period === 'morning' ? '清晨落岛' : '午间巡岛'}
      </div>
      <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: 'rgba(220,255,246,0.94)' }}>
        📍 {locationLabel}
      </div>
      <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: 'rgba(210,245,236,0.88)' }}>
        💬 “{speech}”
      </div>
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: 'rgba(160,230,220,0.88)' }}>
        🕐 预计回报：{formatEta(lobster.nextActionAt - now)}
      </div>
      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'rgba(140,220,208,0.82)' }}>
        ✦ 今日已巡岛 {lobster.completedTrips} 次 · 带回 {lobster.intelCount} 条情报
      </div>
    </div>
  );
}
