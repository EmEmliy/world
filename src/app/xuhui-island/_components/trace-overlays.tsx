'use client';

import { XUHUI_SHOPS } from '@/config/xuhui-shops';
import type { TraceState } from '@/lib/traces';

interface TraceOverlaysProps {
  traceState: TraceState;
}

function getPawPrintPosition(shopId: string) {
  const shop = XUHUI_SHOPS.find((item) => item.id === shopId);
  if (!shop) return null;

  const offsetX = (shop.mapOffsetX ?? 0) + 18;
  const offsetY = (shop.mapOffsetY ?? 0) + 42;

  return {
    left: `calc(${shop.x}% + ${offsetX}px)`,
    top: `calc(${shop.y}% + ${offsetY}px)`,
  };
}

export function TraceOverlays({ traceState }: TraceOverlaysProps) {
  const unlockedShopIds = Object.keys(traceState.shopVisits).filter(
    (shopId) => (traceState.shopVisits[shopId] ?? 0) >= 10
  );

  return (
    <>
      {unlockedShopIds.map((shopId) => {
        const position = getPawPrintPosition(shopId);
        if (!position) return null;

        return (
          <div
            key={`paw-print-${shopId}`}
            style={{
              position: 'absolute',
              left: position.left,
              top: position.top,
              zIndex: 4,
              transform: 'translate(-50%, -50%) rotate(-14deg)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(28, 19, 16, 0.7)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: '#ffd2a2',
                boxShadow: '0 12px 24px rgba(0,0,0,0.22)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ fontSize: 17, lineHeight: 1 }}>⭐</span>
              <span style={{ fontSize: 17, lineHeight: 1 }}>💛</span>
              <span style={{ fontSize: 11, fontWeight: 800 }}>常去</span>
            </div>
          </div>
        );
      })}

      {traceState.visitStreak >= 7 ? (
        <div
          style={{
            position: 'absolute',
            left: '20%',
            top: '17%',
            zIndex: 4,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: '#f3ffe7',
              textShadow: '0 4px 18px rgba(0,0,0,0.28)',
            }}
          >
            <span style={{ fontSize: 42, lineHeight: 1 }}>🌳</span>
            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(7, 44, 31, 0.62)',
                border: '1px solid rgba(180,255,202,0.24)',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              你种的树
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
