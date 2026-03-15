'use client';

interface QuestProgressProps {
  progress: number;
}

export function QuestProgress({ progress }: QuestProgressProps) {
  const points = Math.floor(progress * 3);
  const maxPoints = 300;
  const progressPercent = Math.min((points / maxPoints) * 100, 100);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold text-[#4A3728]">🪙 积分</span>
        <span className="text-sm font-bold text-[#FF6B35]">{points} / {maxPoints}</span>
      </div>
      <div className="bg-[#FFF3CD] rounded-full h-3 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {points >= 300 && (
        <p className="text-xs text-green-600 mt-2">🎉 已解锁优惠券！</p>
      )}
    </div>
  );
}
