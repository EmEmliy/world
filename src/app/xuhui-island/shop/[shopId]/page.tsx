import ShopDetailClient from '../ShopDetailClient';

interface ShopPageProps {
  params: {
    shopId: string;
  };
}

export default function XuhuiShopDynamicPage({ params }: ShopPageProps) {
  return <ShopDetailClient shopId={params.shopId} />;
}
