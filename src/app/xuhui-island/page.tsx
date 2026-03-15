'use client';

import { CSSProperties, useMemo, useState } from 'react';
import { PageTracker } from '@/components/game/page-tracker';

interface Shop {
  id: string;
  name: string;
  cuisine: string;
  image: string;
  x: string;
  y: string;
  size: number;
}

const MAP_BACKGROUND =
  'http://p0.meituan.net/aigchub/0d4af49987b9f0b95b550a7bb7f2c0231439538.png';

const SHOPS: Shop[] = [
  { id: 'gaga', name: 'gaga', cuisine: '西餐', image: 'http://p1.meituan.net/aigchub/be7bab57840dc0c4f381813714ba4381370742.png', x: '14%', y: '29%', size: 88 },
  { id: 'azhong', name: '阿忠食坊', cuisine: '厦门菜', image: 'http://p0.meituan.net/aigchub/1ecf87955180b3ad553c50c2b1989d45394744.png', x: '36%', y: '20%', size: 92 },
  { id: 'jinfuyuan', name: '锦府园', cuisine: '新台州菜', image: 'http://p0.meituan.net/aigchub/3e60e7a85f70bd6ee8d1e1d957039470398229.png', x: '66%', y: '23%', size: 94 },
  { id: 'cailan', name: '蔡澜点心', cuisine: '港式点心', image: 'http://p0.meituan.net/aigchub/649228e8c9a610fc81d3a388aa11a3bd403542.png', x: '82%', y: '43%', size: 94 },
  { id: 'laotouer', name: '老头儿油爆虾', cuisine: '江浙菜', image: 'http://p1.meituan.net/aigchub/670799cdcff5586e2475890c907b24fc381412.png', x: '22%', y: '62%', size: 92 },
  { id: 'jiangbian', name: '江边城外烤全鱼', cuisine: '烤全鱼', image: 'http://p0.meituan.net/aigchub/261b474439002d27cd0f941fe897dc7a400466.png', x: '49%', y: '55%', size: 96 },
  { id: 'wanglaida', name: '蛙来哒', cuisine: '湘味牛蛙', image: 'http://p0.meituan.net/aigchub/e7a643251d4afe103474b077dd86981c356784.png', x: '74%', y: '68%', size: 92 },
  { id: 'niunew', name: '牛New寿喜烧', cuisine: '日式寿喜烧', image: 'http://p1.meituan.net/aigchub/f9f4f4c11fac6eb97d60220d316c9eda340299.png', x: '36%', y: '82%', size: 98 },
];

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '20px 14px 32px',
  background: 'radial-gradient(circle at top, #fef4d7 0%, #ffd696 34%, #ef8454 100%)',
  color: '#4a3124',
};

const heroStyle: CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto 18px',
  padding: 24,
  borderRadius: 28,
  background: 'rgba(255, 248, 236, 0.86)',
  border: '1px solid rgba(255,255,255,0.72)',
  boxShadow: '0 24px 80px rgba(100,56,26,0.14)',
};

const statsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 18,
};

const statCardStyle: CSSProperties = {
  flex: '1 1 180px',
  minWidth: 180,
  padding: '14px 16px',
  borderRadius: 20,
  background: '#fff3de',
  boxShadow: '0 10px 24px rgba(136,83,33,0.08)',
};

const mapShellStyle: CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: 10,
  borderRadius: 30,
  background: 'rgba(255,255,255,0.26)',
  border: '1px solid rgba(255,255,255,0.48)',
  boxShadow: '0 28px 100px rgba(88,50,23,0.16)',
};

const mapBoardStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 11',
  overflow: 'hidden',
  borderRadius: 24,
  border: '4px solid #fff0d0',
  background: `url(${MAP_BACKGROUND}) center / cover no-repeat`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 999,
  background: '#fff0d4',
  color: '#d36d2e',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.16em',
};

export default function XuhuiIslandPage() {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const isSelected = useMemo(
    () => new Set(selectedShop ? [selectedShop.id] : []),
    [selectedShop]
  );

  return (
    <main style={pageStyle}>
      <PageTracker page="xuhui-island" />

      <section style={heroStyle}>
        <div style={badgeStyle}>LCM XUHUI ISLAND</div>
        <h1 style={{ margin: '14px 0 0', fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1.04 }}>
          LCM 旭辉小岛探店
        </h1>
        <p style={{ margin: '14px 0 0', maxWidth: 760, fontSize: 16, lineHeight: 1.8, color: '#6d5141' }}>
          线下门店只要参与合作，就可以同步挂到线上小岛。当前 Demo 锚定上海浦东 LCM
          旭辉广场，先把探店和下单入口做成统一地图体验。
        </p>

        <div style={statsRowStyle}>
          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: '#b36a39' }}>合作门店</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>{SHOPS.length}</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: '#b36a39' }}>商场锚点</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>浦东 LCM</div>
          </div>
        </div>
      </section>

      <section style={mapShellStyle}>
        <div style={mapBoardStyle}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,229,182,0.04) 48%, rgba(93,55,30,0.08) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 3,
              padding: '8px 12px',
              borderRadius: 999,
              background: 'rgba(255,248,230,0.88)',
              color: '#a16639',
              fontSize: 12,
              fontWeight: 800,
              boxShadow: '0 8px 18px rgba(117,74,37,0.16)',
            }}
          >
            Q版游戏地图
          </div>

          {SHOPS.map((shop) => {
            const active = isSelected.has(shop.id);

            return (
              <button
                key={shop.id}
                type="button"
                aria-label={`查看${shop.name}店铺信息`}
                onClick={() => setSelectedShop(shop)}
                style={{
                  position: 'absolute',
                  left: shop.x,
                  top: shop.y,
                  zIndex: active ? 4 : 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translate(-50%, -50%)',
                  border: 0,
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '52%',
                    width: 56,
                    height: 16,
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.18)',
                    filter: 'blur(7px)',
                    transform: 'translateY(-50%)',
                  }}
                />

                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                    borderRadius: 22,
                    background: active ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.38)',
                    border: '1px solid rgba(255,255,255,0.86)',
                    boxShadow: active
                      ? '0 18px 36px rgba(91,51,28,0.26)'
                      : '0 14px 28px rgba(91,51,28,0.18)',
                    transform: active ? 'translateY(-4px) scale(1.05)' : 'none',
                    transition: 'transform 160ms ease, box-shadow 160ms ease',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <img
                    src={shop.image}
                    alt={shop.name}
                    width={shop.size}
                    height={shop.size}
                    draggable={false}
                    style={{
                      display: 'block',
                      width: shop.size,
                      height: shop.size,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.18))',
                    }}
                  />
                </span>

                <span
                  style={{
                    marginTop: 8,
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'rgba(72,45,32,0.86)',
                    border: '1px solid rgba(255,255,255,0.72)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 12px 22px rgba(70,42,26,0.22)',
                  }}
                >
                  {shop.name}
                </span>
              </button>
            );
          })}

          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 16,
              transform: 'translateX(-50%)',
              zIndex: 3,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(74,47,34,0.74)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 16px 30px rgba(67,39,25,0.24)',
              whiteSpace: 'nowrap',
            }}
          >
            点击建筑查看店铺信息
          </div>
        </div>
      </section>

      {selectedShop && (
        <div
          onClick={() => setSelectedShop(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(46,26,18,0.52)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(100%, 460px)',
              padding: 24,
              borderRadius: 28,
              background: 'linear-gradient(180deg, #fff9ef 0%, #fff1db 100%)',
              boxShadow: '0 28px 90px rgba(64,34,20,0.3)',
            }}
          >
            <button
              type="button"
              aria-label="关闭店铺信息"
              onClick={() => setSelectedShop(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: 999,
                border: 0,
                background: 'rgba(89,56,38,0.08)',
                color: '#7a533d',
                fontSize: 24,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  padding: 10,
                  borderRadius: 22,
                  background: '#fff',
                  boxShadow: '0 10px 20px rgba(129,80,43,0.08)',
                }}
              >
                <img
                  src={selectedShop.image}
                  alt={selectedShop.name}
                  draggable={false}
                  style={{ display: 'block', width: 104, height: 104, objectFit: 'contain' }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: '#fff1d1',
                    color: '#d1692c',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  已入驻合作商户
                </div>
                <h2 style={{ margin: '12px 0 0', fontSize: 30, lineHeight: 1.1 }}>
                  {selectedShop.name}
                </h2>
                <p style={{ margin: '10px 0 0', color: '#7b5847', fontSize: 15 }}>
                  {selectedShop.cuisine}
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: '14px 16px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.84)',
                color: '#735243',
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              这里先放店铺信息卡和下单按钮占位。后面可以继续接真实菜单、跳转链接和门店详情。
            </div>

            <button
              type="button"
              style={{
                width: '100%',
                marginTop: 18,
                padding: '14px 16px',
                borderRadius: 18,
                border: 0,
                background: 'linear-gradient(90deg, #ff9d53 0%, #f26b3a 100%)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 18px 30px rgba(212,103,42,0.24)',
              }}
            >
              立即下单
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
