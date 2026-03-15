export const GAME_CONFIG = {
  title: '点个外卖',
  subtitle: '欢迎来到你的外卖小岛 🏝️',
  cta: '开始探索',
  version: 'MVP v1.0',
} as const;

export const NPC_CONFIG = {
  id: 'xiaomei',
  name: '小美',
  shopName: '小美拉面馆',
  avatar: '/images/xiaomei-avatar.png',
  greeting: '哟，来客了！欢迎来到小美拉面馆~ 😋',
} as const;

export const MENU = [
  { id: 'tonkotsu_ramen', name: '招牌豚骨拉面', price: 32, desc: '熬了8小时的豚骨汤底，溏心蛋必须是流心的', tags: ['招牌', '必点'] },
  { id: 'spicy_beef_noodle', name: '麻辣牛肉面', price: 36, desc: '小美自己调的辣椒酱，吃完嘴巴麻麻的特别上头', tags: ['辣', '上头'] },
  { id: 'matcha_pudding', name: '抹茶布丁', price: 18, desc: '小美偷偷学的甜品，用的是正宗宇治抹茶', tags: ['甜品', '隐藏好评'] },
] as const;

export const QUEST_CONFIG = {
  id: 'ingredient-quest',
  name: '食材探秘',
  description: '和小美聊聊拉面食材的秘密',
  markers: ['flour', 'broth', 'topping'] as const,
  reward: {
    type: 'coupon' as const,
    title: '🍜 小美拉面券',
    description: '恭喜获得小美拉面馆招牌豚骨拉面兑换券！',
    disclaimer: '仅供演示，不可用于真实交易',
  },
} as const;
