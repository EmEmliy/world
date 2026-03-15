'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sprite, WanderingSprite } from '@/components/game/sprite';
import { MAP_CONFIG } from '@/config/map';
import { PageTracker } from '@/components/game/page-tracker';
import { track } from '@/lib/tracker';

export default function IslandPage() {
  const router = useRouter();
  const [playerPos, setPlayerPos] = useState(MAP_CONFIG.playerStart);
  const [playerFlipped, setPlayerFlipped] = useState(false);
  const [playerMoving, setPlayerMoving] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = MAP_CONFIG.width / rect.width;
    const scaleY = MAP_CONFIG.height / rect.height;
    const newX = Math.max(MAP_CONFIG.walkBounds.minX,
      Math.min(MAP_CONFIG.walkBounds.maxX, (e.clientX - rect.left) * scaleX));
    const newY = Math.max(MAP_CONFIG.walkBounds.minY,
      Math.min(MAP_CONFIG.walkBounds.maxY, (e.clientY - rect.top) * scaleY));
    setPlayerFlipped(newX < playerPos.x);
    setPlayerPos({ x: newX, y: newY });
    setPlayerMoving(true);
    setTimeout(() => setPlayerMoving(false), 1800);
  };

  const handleShopClick = (shopId: string, href: string | null) => {
    if (!href) return;
    track('island_shop_enter', { shopId });
    router.push(href);
  };

  const unlockedCount = MAP_CONFIG.shops.filter(s => !s.locked).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-300 via-emerald-200 to-yellow-100 flex flex-col items-center justify-center p-4">
      <PageTracker page="island" />
      
      <audio ref={audioRef} loop preload="auto">
        <source src="https://www.soundjay.com/nature/sounds/ocean-waves-7.mp3" type="audio/mp3" />
      </audio>
      
      <button
        onClick={toggleAudio}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
        aria-label="Toggle ocean sounds"
      >
        🔊
      </button>

      <h1 className="text-2xl font-bold text-white drop-shadow mb-3">🏝️ 我的小岛</h1>

      <div
        ref={mapRef}
        className="relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
        style={{
          width: '100%',
          maxWidth: MAP_CONFIG.width,
          aspectRatio: `${MAP_CONFIG.width} / ${MAP_CONFIG.height}`,
          background: 'linear-gradient(160deg, #87CEEB 0%, #98FB98 50%, #F4A460 100%), url(/map-bg.png) center/cover no-repeat',
        }}
        onClick={handleMapClick}
      >
        <img src="/decorations/tree.png" alt="" className="absolute select-none pointer-events-none" style={{ left: 30, top: 60, width: 80, height: 80 }} />
        <img src="/decorations/tree.png" alt="" className="absolute select-none pointer-events-none" style={{ left: 680, top: 40, width: 80, height: 80 }} />
        <img src="/decorations/dock.png" alt="" className="absolute select-none pointer-events-none" style={{ left: 200, top: 500, width: 60, height: 60 }} />
        <img src="/decorations/dock.png" alt="" className="absolute select-none pointer-events-none" style={{ left: 600, top: 520, width: 60, height: 60 }} />
        <div className="absolute text-2xl select-none pointer-events-none" style={{ left: 400, top: 30 }}>☁️</div>

        {MAP_CONFIG.shops.map((shop) => (
          <div
            key={shop.id}
            className={`absolute flex flex-col items-center justify-center rounded-xl transition-all
              ${shop.locked
                ? 'cursor-not-allowed opacity-60 grayscale'
                : 'cursor-pointer hover:scale-105 active:scale-95 hover:drop-shadow-lg hover:shadow-orange-200/50'
              }`}
            style={{ left: shop.x - shop.width / 2, top: shop.y - shop.height / 2, width: shop.width, height: shop.height, zIndex: 5 }}
            onClick={(e) => { e.stopPropagation(); handleShopClick(shop.id, shop.href); }}
          >
            {!shop.locked && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-6 overflow-hidden pointer-events-none">
                <div className="absolute w-2 h-2 bg-white/30 rounded-full animate-steam" style={{ left: '20%', animationDelay: '0s' }} />
                <div className="absolute w-2 h-2 bg-white/30 rounded-full animate-steam" style={{ left: '50%', animationDelay: '0.5s' }} />
                <div className="absolute w-2 h-2 bg-white/30 rounded-full animate-steam" style={{ left: '80%', animationDelay: '1s' }} />
              </div>
            )}
            <img 
              src={shop.locked ? '/shops/mystery-shop.png' : '/shops/noodle-shop.png'} 
              alt={shop.name}
              className="w-20 h-20 object-contain"
            />
            <span className="text-xs font-bold text-gray-800 mt-1 drop-shadow-md">{shop.name}</span>
            {shop.locked && <span className="text-xs text-gray-400">（未解锁）</span>}
          </div>
        ))}

        <WanderingSprite
          initialX={150} initialY={300}
          bounds={{ minX: 60, maxX: 350, minY: 120, maxY: 480 }}
          variant="glasses" label="阿智" size={44} interval={3000}
        />
        <WanderingSprite
          initialX={620} initialY={250}
          bounds={{ minX: 400, maxX: 760, minY: 120, maxY: 450 }}
          variant="hat" label="探探" size={44} interval={3500}
        />
        <WanderingSprite
          initialX={400} initialY={420}
          bounds={{ minX: 200, maxX: 600, minY: 300, maxY: 560 }}
          variant="mask" label="小酷" size={44} interval={4000}
        />

        <Sprite
          x={playerPos.x} y={playerPos.y}
          variant="base" label="你" size={52}
          flipped={playerFlipped} isMoving={playerMoving}
          zIndex={20}
        />

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full pointer-events-none">
          点击地图移动 · 点击店铺进入
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500">已解锁 {unlockedCount} / {MAP_CONFIG.shops.length} 家店铺</p>
    </main>
  );
}
