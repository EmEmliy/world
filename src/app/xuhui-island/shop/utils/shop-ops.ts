import type { XuhuiShop } from '@/config/xuhui-shops';
import type { ShopOpsSnapshot } from '../types/shop-types';

function hashString(value: string) {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function buildShopOpsSnapshot(shop: XuhuiShop): ShopOpsSnapshot {
  const seed = hashString(shop.id);
  const base = shop.baseVisitors;
  const completedOrders = base * 11 + 120 + (seed % 36);
  const dineInRatio = shop.crowdLevel === 'packed' ? 0.68 : shop.crowdLevel === 'busy' ? 0.61 : 0.55;
  const dineInOrders = Math.round(completedOrders * dineInRatio);
  const deliveryOrders = completedOrders - dineInOrders;
  const ownerFreeMealChance = Math.min(78, 42 + (seed % 19));
  const hallSeats = base + 24 + (seed % 10);
  const queueTime = shop.crowdLevel === 'packed' ? 32 : shop.crowdLevel === 'busy' ? 18 : 8;
  
  // 生成菜品分布，确保总和等于 completedOrders
  const topDishes = Array.from({ length: 10 }, (_, index) => {
    const menuItem = shop.menu[index % shop.menu.length];
    const variantSuffixes = ['', '双人局', '老板推荐', '加料版', '加辣版', '人气拼盘', '夜宵档', '进店必点', '回头客款', '福利餐'];
    
    // 每道菜的比例（热卖菜更多）
    const baseCount = Math.max(18, 80 - index * 5);
    // 按比例分配总单数
    const ratio = baseCount / 450; // 450 是所有 baseCount 的大致总和
    const dishCount = Math.max(15, Math.round(completedOrders * ratio * 0.8));

    return {
      name: `${menuItem.name}${variantSuffixes[index] ? ` · ${variantSuffixes[index]}` : ''}`,
      count: dishCount,
    };
  });
  
  const barrageComments = [
    `${shop.name} 现在翻台超快`,
    `${shop.menu[0].name} 今天真的卖爆了`,
    `这家堂食氛围太强了`,
    `${shop.menu[1].name} 比想象中还稳`,
    `${shop.owner} 说今晚福利池会放大`,
    `排队也值，出菜很快`,
  ];

  return {
    completedOrders,
    dineInOrders,
    deliveryOrders,
    ownerFreeMealChance,
    hallSeats,
    queueTime,
    topDishes,
    barrageComments,
  };
}
