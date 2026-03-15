'use client';

import { useEffect, useState } from 'react';

interface CrayfishAvatarProps {
  variant?: 'base' | 'glasses' | 'hat' | 'mask' | 'apron';
  size?: 'sm' | 'md' | 'lg';
}

const CRAYFISH_EMOJI = '🦞';

const ACCESSORY = {
  base: '',
  glasses: '👓',
  hat: '🎩',
  mask: '😷',
  apron: '🍽️',
};

const SIZE_CLASSES = {
  sm: 'text-3xl',
  md: 'text-4xl',
  lg: 'text-6xl',
};

export function CrayfishAvatar({ variant = 'base', size = 'md' }: CrayfishAvatarProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentVariant, setCurrentVariant] = useState(variant);

  useEffect(() => {
    if (variant !== currentVariant) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setCurrentVariant(variant);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [variant, currentVariant]);

  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        relative flex-shrink-0
        transition-all duration-300
        ${isAnimating ? 'scale-50 opacity-50' : 'scale-100 opacity-100'}
      `}
    >
      <span className="relative">
        {CRAYFISH_EMOJI}
        {ACCESSORY[currentVariant] && (
          <span className="absolute -top-1 -right-2 text-sm">
            {ACCESSORY[currentVariant]}
          </span>
        )}
      </span>
    </div>
  );
}

export function getCrayfishVariant(points: number, daysActive: number = 0, friendsInvited: number = 0, shopsUnlocked: number = 0): 'base' | 'glasses' | 'hat' | 'mask' | 'apron' {
  if (points >= 300) return 'apron';
  if (friendsInvited >= 1) return 'mask';
  if (shopsUnlocked >= 3) return 'hat';
  if (daysActive >= 3) return 'glasses';
  return 'base';
}
