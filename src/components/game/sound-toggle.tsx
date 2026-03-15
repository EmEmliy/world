'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { playSound, toggleSound, isSoundEnabled } from '@/lib/sound';

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    toggleSound(newValue);
    if (newValue) playSound('click');
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-4 p-2 bg-white/80 rounded-full shadow-md z-40"
      aria-label={enabled ? '关闭音效' : '开启音效'}
    >
      {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}
