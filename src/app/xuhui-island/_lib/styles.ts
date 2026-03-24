/**
 * 龙虾商圈游戏页面样式常量
 * 从 page.tsx 提取，保持单一职责
 */
import type { CSSProperties } from 'react';

export const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '16px 10px 30px',
  background:
    'linear-gradient(180deg, #0a2a3a 0%, #0d3d52 20%, #0f5068 45%, #0d6878 65%, #0b7a7a 80%, #0a8a72 100%)',
  color: '#e0f4f0',
  position: 'relative',
  overflow: 'hidden',
};

export const heroStyle: CSSProperties = {
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

export const statsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 18,
  position: 'relative',
  zIndex: 2,
};

export const statCardStyle: CSSProperties = {
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

export const mapShellStyle: CSSProperties = {
  maxWidth: 1420,
  margin: '0 auto',
  padding: 10,
  borderRadius: 30,
  background: 'rgba(5, 25, 40, 0.55)',
  border: '2px solid rgba(80, 200, 180, 0.28)',
  boxShadow: '0 28px 100px rgba(0,20,50,0.5), 0 0 60px rgba(30,160,140,0.12)',
  position: 'relative',
};

export const mapBoardStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10.4',
  overflow: 'hidden',
  borderRadius: 24,
  border: '4px solid #fff0d0',
  background: 'linear-gradient(180deg, #7ec8d4 0%, #49b8cb 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
};

export const badgeStyle: CSSProperties = {
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

export const darkGlassStyle: CSSProperties = {
  background: 'rgba(0, 0, 0, 0.05)',
  border: '1px solid rgba(255,255,255,0.16)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 12px 22px rgba(70,42,26,0.18)',
};

export const metricGlassStyle: CSSProperties = {
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
