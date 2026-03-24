'use client';

import Link from 'next/link';
import type { XuhuiShop } from '@/config/xuhui-shops';
import { getShopIcon } from '../utils/shop-icon';

export interface ShopHeaderProps {
  shop: XuhuiShop;
  shopId: string;
}

export function ShopHeader({ shop, shopId }: ShopHeaderProps) {
  const icon = getShopIcon(shop.cuisine, shopId);
  return (
    <div style={{ display: 'flex', gap: 18, padding: '20px 0 16px', alignItems: 'center' }}>
      <Link href="/xuhui-island" style={{ background: 'rgba(255,255,255,0.94)', borderRadius: 16, padding: '6px 16px', fontSize: 14, color: '#555' }}>Back</Link>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 34 }}>{icon}</span>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{shop.name}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{shop.cuisine}</div>
        </div>
      </div>
    </div>
  );
}
