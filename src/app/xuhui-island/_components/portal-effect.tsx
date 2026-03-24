'use client';

interface PortalEffectProps {
  effect: { id: number; x: number; y: number } | null;
}

/** 传送门粒子爆发特效，从地图百分比坐标处展现 */
export function PortalEffect({ effect }: PortalEffectProps) {
  if (!effect) return null;

  return (
    <div
      key={effect.id}
      style={{
        position: 'absolute',
        left: `${effect.x}%`,
        top: `${effect.y}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {/* 外层扩散光环1 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 24px rgba(255,255,255,0.7), 0 0 48px rgba(180,220,255,0.5)',
          transform: 'translate(-50%,-50%)',
          animation: 'portal-ring-expand 1.0s ease-out forwards',
        }}
      />
      {/* 外层扩散光环2（延迟） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          border: '2px solid rgba(180,220,255,0.8)',
          boxShadow: '0 0 16px rgba(180,220,255,0.6)',
          transform: 'translate(-50%,-50%)',
          animation: 'portal-ring-expand 1.0s ease-out 0.12s forwards',
        }}
      />
      {/* 中心强光闪 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 70,
          height: 70,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,230,255,0.7) 40%, transparent 75%)',
          transform: 'translate(-50%,-50%)',
          animation: 'portal-core-flash 0.6s ease-out forwards',
        }}
      />
      {/* 旋转光圈 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '2px dashed rgba(160,200,255,0.7)',
          transform: 'translate(-50%,-50%)',
          animation:
            'portal-spin 0.6s linear forwards, portal-ring-expand 1.0s ease-out 0.05s forwards',
        }}
      />
      {/* 粒子光点：8个方向飞散 */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background:
              i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(180,220,255,0.85)',
            boxShadow: '0 0 6px rgba(200,230,255,0.8)',
            transformOrigin: '0 0',
            animation: `portal-particle-${i} 0.9s ease-out forwards`,
            transform: `translate(-50%,-50%) rotate(${i * 45}deg) translate(0, -55px)`,
            animationDelay: `${i * 0.02}s`,
          }}
        />
      ))}
    </div>
  );
}
