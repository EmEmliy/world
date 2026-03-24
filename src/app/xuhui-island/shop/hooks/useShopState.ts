'use client';

import { useState, useMemo } from 'react';
import type { XuhuiShop, ShopActionId } from '@/config/xuhui-shops';
import type { SceneView, ShopOpsSnapshot } from '../types/shop-types';
import { buildShopOpsSnapshot } from '../utils/shop-ops';

export function useShopState(shop: XuhuiShop | undefined) {
  const [activeAction, setActiveAction] = useState<ShopActionId>('work');
  const [sceneFocus, setSceneFocus] = useState<SceneView>('hall');
  const [showAllTopDishes, setShowAllTopDishes] = useState(false);
  const [points, setPoints] = useState(() => {
    if (typeof window === 'undefined') return 120;
    return Number(localStorage.getItem('world:points') ?? 120);
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const opsSnapshot = useMemo(() => shop ? buildShopOpsSnapshot(shop) : ({} as ShopOpsSnapshot), [shop]);
  const [kitchenPressure, setKitchenPressure] = useState(() => {
    if (!shop) return 38;
    return shop.crowdLevel === 'packed' ? 88 : shop.crowdLevel === 'busy' ? 62 : 38;
  });
  const [playerOps, setPlayerOps] = useState({ priceRaised: false, deliveryPriority: false, bonusPool: false });
  const [orderTickets, setOrderTickets] = useState<Array<{id: number; staffName: string; dishName: string; done: boolean}>>(() => {
    if (!shop) return [];
    const allNames = [...shop.staffNames, shop.owner];
    return Array.from({ length: 8 }, (_, i) => ({ id: i, staffName: allNames[i % allNames.length], dishName: shop.menu[i % shop.menu.length]?.name ?? '', done: i < 6 }));
  });
  return { activeAction, setActiveAction, sceneFocus, setSceneFocus, showAllTopDishes, setShowAllTopDishes, points, setPoints, soundEnabled, setSoundEnabled, opsSnapshot, playerOps, setPlayerOps, kitchenPressure, setKitchenPressure, orderTickets, setOrderTickets };
}