'use client';

interface RewardModalProps {
  isOpen: boolean;
  shopName?: string;
  onClose: () => void;
}

export function RewardModal({ isOpen, shopName = '小美拉面馆', onClose }: RewardModalProps) {
  if (!isOpen) return null;

  const couponCode = `MEITUAN${Date.now().toString().slice(-6)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-3xl p-1 max-w-sm mx-4">
        <div className="bg-white rounded-[22px] p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-[#4A3728] mb-2">恭喜解锁！</h3>
            <p className="text-[#4A3728]/70 mb-4">你已获得 {shopName} 专属优惠券</p>
            
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] rounded-xl p-4 mb-4">
              <p className="text-white text-sm mb-1">招牌豚骨拉面</p>
              <p className="text-white text-4xl font-bold">¥28</p>
              <p className="text-white/80 text-xs mt-2">免费兑换券</p>
            </div>

            <div className="bg-gray-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">兑换码</p>
              <p className="text-lg font-mono font-bold text-[#4A3728]">{couponCode}</p>
            </div>

            <div className="text-xs text-gray-500 mb-4">
              <p>打开美团APP搜索「{shopName}」</p>
              <p>出示兑换码即可使用</p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-[#FF6B35] text-white py-3 rounded-full font-bold hover:bg-[#E55A2B] transition-colors"
            >
              收下优惠券
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
