import type { ShopActionId } from '@/config/xuhui-shops';

export type SceneView = 'hall' | 'kitchen';

export const SCENE_FOCUS_BY_ACTION: Record<ShopActionId, SceneView> = {
  work: 'kitchen',
  menu: 'hall',
  'guest-chat': 'hall',
  'owner-chat': 'kitchen',
};

/** 根据菜系获取店铺主 icon */
export function getShopIcon(cuisine: string, shopId?: string): string {
  if (shopId === 'jiangbian') return '🐟';
  if (shopId === 'laotouer') return '🦐';
  if (shopId === 'wanglaida') return '🐸';
  if (shopId === 'niunew') return '🍲';
  if (shopId === 'cailan') return '🥟';
  if (shopId === 'gaga') return '🍰';
  if (cuisine.includes('烤鱼')) return '🐟';
  if (cuisine.includes('龙虾') || cuisine.includes('小龙虾')) return '🦞';
  if (cuisine.includes('虾')) return '🦐';
  if (cuisine.includes('牛蛙') || cuisine.includes('蛙')) return '🐸';
  if (cuisine.includes('火锅') || cuisine.includes('锅') || cuisine.includes('寿喜')) return '🍲';
  if (cuisine.includes('西餐') || cuisine.includes('甜品') || cuisine.includes('烘焙')) return '🍰';
  if (cuisine.includes('点心') || cuisine.includes('包子') || cuisine.includes('港式')) return '🥟';
  if (cuisine.includes('奶茶') || cuisine.includes('饮品') || cuisine.includes('茶')) return '🧋';
  return '🍽️';
}
