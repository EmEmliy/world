'use client';

import { useState } from 'react';
import { playAudioFile } from '@/lib/sound';
import { XUHUI_SHOPS } from '@/config/xuhui-shops';
import { LOBSTER_WAIT_SPOTS, SHOP_ICONS, type LobsterWalker } from '@/app/xuhui-island/_lib/game-logic';

interface LobsterDispatchMenuProps {
  lobster: LobsterWalker;
  shops: typeof XUHUI_SHOPS;
  spots: typeof LOBSTER_WAIT_SPOTS;
  onClose: () => void;
  onDispatchShop: (shopId: string) => void;
  onDispatchSpot: (spotId: string) => void;
}

export function LobsterDispatchMenu({
  lobster,
  shops,
  spots,
  onClose,
  onDispatchShop,
  onDispatchSpot,
}: LobsterDispatchMenuProps) {
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
            style={{
              width: 110,
              height: 110,
              objectFit: 'contain',
              filter: 'drop-shadow(0 6px 16px rgba(255,160,60,0.55))',
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: '#ffe97a',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              whiteSpace: 'nowrap',
            }}
          >
            {lobster.name}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,230,160,0.82)',
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            {lobster.personality.trait} · {lobster.personality.preference}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,220,160,0.6)',
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.45,
              maxWidth: 132,
            }}
          >
            “{lobster.personality.catchphrase}”
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,220,140,0.6)', fontWeight: 700 }}>
            ⚡ 3倍速冲过去
          </span>
        </div>

        {/* 右侧：按钮区居中 wrap */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: 'rgba(255,200,100,0.55)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            去餐厅
          </div>
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
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: 'rgba(255,200,100,0.45)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            外部点位
          </div>
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

interface DispatchBtnProps {
  icon?: string;
  label: string;
  sub?: string;
  onClick: () => void;
}

function DispatchBtn({ icon, label, sub, onClick }: DispatchBtnProps) {
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
      <span
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: hovered ? '#fff' : 'rgba(255,230,160,0.88)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {sub ? (
        <span
          style={{
            fontSize: 10,
            color: hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,200,120,0.45)',
            fontWeight: 700,
          }}
        >
          {sub}
        </span>
      ) : null}
    </button>
  );
}
