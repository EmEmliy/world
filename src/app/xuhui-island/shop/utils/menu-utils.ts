import type { XuhuiShop, ShopMenuItem } from '@/config/xuhui-shops';

export const DEFAULT_MENU_PROMO_BADGES = [
  { text: '🧧 满20减14', color: 'rgba(230,60,60,0.85)' },
  { text: '🆕 新客立减', color: 'rgba(230,60,60,0.85)' },
  { text: '⚡ 99减9', color: 'rgba(200,80,20,0.8)' },
  { text: '💳 支付红包¥1.88', color: 'rgba(180,100,20,0.8)' },
  { text: '🎯 收藏领5折券', color: 'rgba(40,140,80,0.85)' },
  { text: '📦 集3单返5元', color: 'rgba(40,100,200,0.85)' },
];

export function buildLegacyMenuCategories(shop: XuhuiShop, excludedNames = new Set<string>()) {
  return [
    { key: 'main', label: '🐟 主菜·烤全鱼', items: shop.menu.filter((m) => !excludedNames.has(m.name) && (m.tag.includes('NO.1') || m.tag.includes('重口') || m.tag.includes('下饭王') || m.tag.includes('不辣') || m.tag.includes('挑战'))) },
    { key: 'bucket', label: '🪣 单人冒桶', items: shop.menu.filter((m) => !excludedNames.has(m.name) && (m.tag.includes('新客价') || m.tag.includes('销量第1'))) },
    { key: 'combo', label: '🎁 超值套餐', items: shop.menu.filter((m) => !excludedNames.has(m.name) && (m.tag.includes('双人') || m.tag.includes('三人') || m.tag.includes('聚餐首选'))) },
    { key: 'side', label: '🥬 配菜加料', items: shop.menu.filter((m) => !excludedNames.has(m.name) && (m.tag.includes('加料') || m.tag.includes('解腻') || m.tag.includes('吸汁') || m.tag.includes('小吃') || m.portion?.includes('1-2人'))) },
    { key: 'snack', label: '🍗 小吃凉菜', items: shop.menu.filter((m) => !excludedNames.has(m.name) && (m.tag.includes('凉菜') || m.tag.includes('主食'))) },
    { key: 'drink', label: '🧃 饮品', items: shop.menu.filter((m) => !excludedNames.has(m.name) && (m.tag.includes('解腻饮') || m.tag.includes('清爽'))) },
  ].filter((category) => category.items.length > 0);
}

export function buildMenuCategories(shop: XuhuiShop) {
  const explicitGroups = new Map<string, ShopMenuItem[]>();
  const categorizedNames = new Set<string>();

  shop.menu.forEach((item) => {
    if (!item.category) return;
    categorizedNames.add(item.name);
    const existing = explicitGroups.get(item.category);
    if (existing) {
      existing.push(item);
      return;
    }
    explicitGroups.set(item.category, [item]);
  });

  const explicitCategories = Array.from(explicitGroups.entries()).map(([label, items], index) => ({
    key: `custom-${index}`,
    label,
    items,
  }));

  if (explicitCategories.length === 0) {
    const legacyCategories = buildLegacyMenuCategories(shop);
    return legacyCategories.length > 0
      ? legacyCategories
      : [{ key: 'all', label: '🍽️ 店铺推荐', items: shop.menu }];
  }

  const uncategorizedItems = shop.menu.filter((item) => !categorizedNames.has(item.name));
  const legacyCategories = buildLegacyMenuCategories(shop, categorizedNames);

  if (legacyCategories.length > 0) return [...explicitCategories, ...legacyCategories];
  if (uncategorizedItems.length > 0) {
    return [...explicitCategories, { key: 'other', label: '🍽️ 其他推荐', items: uncategorizedItems }];
  }
  return explicitCategories;
}
