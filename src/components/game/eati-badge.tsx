'use client';

/**
 * EATI 匹配等级徽章
 * 显示在商店图标上，表示该商户与用户人格的匹配程度
 */

import { useMemo } from 'react';
import { loadEatiResult, matchShops } from '@/lib/eati';
import { XUHUI_SHOPS } from '@/config/xuhui-shops';

interface EatiBadgeProps {
  shopId: string;
  className?: string;
}

const BADGE_STYLE: Record<string, { emoji: string; bg: string; color: string }> = {
  destiny: {
    emoji: '🔥🔥🔥',
    bg: 'linear-gradient(135deg, #ffd36e 0%, #ff9a44 100%)',
    color: '#503014',
  },
  great: {
    emoji: '🔥🔥',
    bg: 'linear-gradient(135deg, #ff9a44 0%, #ff6b2c 100%)',
    color: '#fff8f1',
  },
  good: {
    emoji: '🔥',
    bg: 'rgba(255,200,100,0.3)',
    color: '#ffd36e',
  },
  contrast: {
    emoji: '⚡',
    bg: 'rgba(100,200,255,0.2)',
    color: '#63d9c2',
  },
  challenge: {
    emoji: '💀',
    bg: 'rgba(200,200,200,0.1)',
    color: 'rgba(200,240,230,0.4)',
  },
};

export function EatiBadge({ shopId, className }: EatiBadgeProps) {
  const badge = useMemo(() => {
    const result = loadEatiResult();
    if (!result) return null;

    const shops = XUHUI_SHOPS.map((s) => ({
      id: s.id,
      name: s.name,
      eatiCode: s.eatiCode,
    }));
    const matches = matchShops(result.code, shops);
    const match = matches.find((m) => m.shopId === shopId);
    if (!match) return null;

    const style = BADGE_STYLE[match.grade];
    if (!style) return null;

    return {
      emoji: style.emoji,
      grade: match.grade,
      label: match.gradeLabel,
      bg: style.bg,
      color: style.color,
    };
  }, [shopId]);

  if (!badge) return null;

  return (
    <div
      className={className}
      title={badge.label}
      style={{
        position: 'absolute',
        top: -4,
        right: -4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: badge.bg,
        color: badge.color,
        fontSize: 14,
        fontWeight: 900,
        border: '2px solid rgba(255,255,255,0.9)',
        boxShadow: `0 4px 12px ${
          badge.grade === 'destiny'
            ? 'rgba(255,200,100,0.4)'
            : badge.grade === 'great'
            ? 'rgba(255,150,50,0.3)'
            : badge.grade === 'good'
            ? 'rgba(255,200,100,0.2)'
            : 'rgba(100,200,255,0.2)'
        }`,
      }}
    >
      {badge.emoji}
    </div>
  );
}
