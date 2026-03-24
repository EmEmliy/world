import type { CSSProperties } from 'react';

export const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0d2535 0%, #122d40 25%, #1a3a4a 55%, #1f3d38 80%, #1a2e28 100%)',
  padding: '20px 14px 40px',
  color: '#e8d5b8',
  position: 'relative',
};

export const shellStyle: CSSProperties = {
  maxWidth: 1460,
  margin: '0 auto',
};

export const glassCardStyle: CSSProperties = {
  background: 'rgba(255, 248, 238, 0.86)',
  border: '1px solid rgba(255,255,255,0.75)',
  borderRadius: 28,
  boxShadow: '0 24px 80px rgba(91,51,28,0.12)',
};

export const darkChipStyle: CSSProperties = {
  background: 'rgba(28, 20, 17, 0.78)',
  color: '#fff',
  borderRadius: 999,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 800,
};

export const secondaryChipStyle: CSSProperties = {
  borderRadius: 999,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 800,
  background: 'rgba(255,255,255,0.68)',
  color: '#6e4a37',
  border: '1px solid rgba(142, 93, 55, 0.12)',
};
