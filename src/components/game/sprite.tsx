'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export type CrayfishVariant = 'base' | 'glasses' | 'hat' | 'mask' | 'apron';

const CRAYFISH_IMAGES = {
  base: '/crayfish/base.png',
  glasses: '/crayfish/glasses.png',
  hat: '/crayfish/hat.png',
  mask: '/crayfish/mask.png',
  apron: '/crayfish/apron.png',
};

interface SpriteProps {
  x: number;
  y: number;
  variant?: CrayfishVariant;
  size?: number;
  label?: string;
  flipped?: boolean;
  isMoving?: boolean;
  onClick?: () => void;
  zIndex?: number;
}

export function Sprite({
  x, y, variant = 'base', size = 56, label,
  flipped = false, isMoving = false, onClick, zIndex = 10,
}: SpriteProps) {
  return (
    <div
      className="absolute select-none flex flex-col items-center"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        zIndex,
        transition: 'left 1.8s ease-in-out, top 1.8s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div
        style={{
          animation: isMoving ? 'spriteWalk 0.5s ease-in-out infinite alternate' : 'none',
          transform: flipped ? 'scaleX(-1)' : 'scaleX(1)',
        }}
      >
        <img
          src={CRAYFISH_IMAGES[variant]}
          alt={label || variant}
          width={size}
          height={size}
          crossOrigin="anonymous"
          style={{ imageRendering: 'auto', display: 'block' }}
          draggable={false}
        />
      </div>
      {label && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white drop-shadow-md px-1 rounded whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}

interface WanderingSpriteProps extends Omit<SpriteProps, 'x' | 'y' | 'isMoving'> {
  initialX: number;
  initialY: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  interval?: number;
}

export function WanderingSprite({
  initialX, initialY, bounds, interval = 2500, ...spriteProps
}: WanderingSpriteProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [flipped, setFlipped] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const move = () => {
      const newX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const newY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      setFlipped(newX < pos.x);
      setPos({ x: newX, y: newY });
      setIsMoving(true);
      setTimeout(() => setIsMoving(false), 1800);
    };

    const timer = setInterval(move, interval + Math.random() * 1000);
    return () => clearInterval(timer);
  }, [bounds, interval, pos.x]);

  return <Sprite {...spriteProps} x={pos.x} y={pos.y} flipped={flipped} isMoving={isMoving} />;
}
