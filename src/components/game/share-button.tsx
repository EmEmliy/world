'use client';

import { Share2 } from 'lucide-react';
import { shareGame } from '@/lib/share';

export function ShareButton() {
  const handleShare = async () => {
    await shareGame('点个外卖', '一起来玩 AI 外卖小岛吧！');
  };

  return (
    <button
      onClick={handleShare}
      className="fixed top-4 left-4 p-2 bg-white/80 rounded-full shadow-md z-40"
      aria-label="分享"
    >
      <Share2 size={20} />
    </button>
  );
}
