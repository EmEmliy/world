import type { SceneActor, SceneActorRole, SceneView, ActorGlowConfig } from '../types/shop-types';
import { KITCHEN_STATION_ANCHORS, QUEUE_SPOTS, GUEST_NAMES, LOBSTER_VARIANTS, GUEST_BUBBLES, KITCHEN_TITLES, OWNER_BUBBLES, STAFF_BUBBLES, KITCHEN_STAFF_BUBBLES } from '../types/shop-types';
import type { XuhuiShop } from '@/config/xuhui-shops';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function actorCoreSize(role: SceneActorRole) {
  // 放大 20%
  if (role === 'owner') return 94;
  if (role === 'staff') return 84;
  return 79;
}

export function actorShellSize(role: SceneActorRole) {
  // 放大 20%
  if (role === 'owner') return 125;
  if (role === 'staff') return 115;
  return 108;
}

export function actorGlow(role: SceneActorRole) {
  if (role === 'owner') {
    return {
      bubble: 'rgba(255, 185, 112, 0.42)',
      ring: 'rgba(255, 245, 220, 0.92)',
      shadow: 'rgba(125, 63, 24, 0.34)',
    };
  }
  if (role === 'staff') {
    return {
      bubble: 'rgba(255, 224, 171, 0.34)',
      ring: 'rgba(255, 250, 234, 0.88)',
      shadow: 'rgba(89, 54, 27, 0.26)',
    };
  }
  return {
    bubble: 'rgba(255, 243, 214, 0.30)',
    ring: 'rgba(255, 252, 244, 0.84)',
    shadow: 'rgba(80, 50, 28, 0.2)',
  };
}

export function actorPlacement(actor: SceneActor, sceneView: SceneView) {
  if (sceneView === 'hall') {
    // 直接使用店铺配置的 x/y 坐标，不加额外偏移
    return {
      x: clamp(actor.x, 6, 94),
      y: clamp(actor.y, 10, 92),
    };
  }

  // 厨房视图：老板不出现（由外部过滤），此处仅处理 staff 厨师
  // 厨师使用专属岗位锚点（炒菜台/切配台/传菜走廊），带微小随机抖动
  const slot = actor.kitchenSlot ?? (Number.parseInt(actor.id.split('-')[1] ?? '0', 10) || 0);
  const station = KITCHEN_STATION_ANCHORS[slot % KITCHEN_STATION_ANCHORS.length];

  return {
    x: clamp(station.x + (actor.x - 50) * 0.06, 10, 92),
    y: clamp(station.y + (actor.y - 50) * 0.06, 44, 84),
  };
}
export function buildInitialActors(shop: XuhuiShop): SceneActor[] {
  const seatCount = shop.scene.seats.length;
  // packed：超出座位数产生排队队列（座位全满+2~4人排队）
  // busy：坐满约 85%
  // normal：坐满约 65%
  const guestCount =
    shop.crowdLevel === 'packed'
      ? seatCount + 3          // 满座 + 3 人排队
      : shop.crowdLevel === 'busy'
        ? Math.round(seatCount * 0.85)
        : Math.round(seatCount * 0.65);

  const guests: SceneActor[] = Array.from({ length: guestCount }, (_, index) => {
    const seated = index < seatCount;
    if (seated) {
      // 每个客人占一个独立座位
      const seat = shop.scene.seats[index];
      return {
        id: `guest-${index}`,
        role: 'guest' as SceneActorRole,
        name: GUEST_NAMES[index % GUEST_NAMES.length],
        variant: LOBSTER_VARIANTS[index % LOBSTER_VARIANTS.length],
        x: seat.x + (index % 2 === 0 ? -1.5 : 1.5),
        y: seat.y + (index % 2 === 0 ? -1 : 1),
        anchorType: 'seat' as const,
        seatIndex: index,
        flipped: index % 2 === 0,
        bubble: GUEST_BUBBLES[index % GUEST_BUBBLES.length],
        bubbleVisible: false,
      };
    }
    // 超出座位数量，到门口排队
    const queueSlot = index - seatCount;
    const qSpot = QUEUE_SPOTS[queueSlot % QUEUE_SPOTS.length];
    return {
      id: `guest-${index}`,
      role: 'guest' as SceneActorRole,
      name: GUEST_NAMES[index % GUEST_NAMES.length],
      variant: LOBSTER_VARIANTS[index % LOBSTER_VARIANTS.length],
      x: qSpot.x + (queueSlot % 2 === 0 ? 0 : 2),
      y: qSpot.y,
      anchorType: 'queue' as const,
      seatIndex: -1,
      flipped: false,
      bubble: ['等一下就好', '出了吧', '排队也值', '马上就轮到我了'][queueSlot % 4],
      bubbleVisible: queueSlot < 2,
    };
  });

  const staff: SceneActor[] = shop.staffNames.map((name, index) => {
    // 厨师用 kitchenSlot 标记厨房岗位，大堂视图中使用 walkPath
    const kitchenSlot = index;
    const hallAnchor = shop.scene.walkPath[index % shop.scene.walkPath.length];
    const kitchenTitle = KITCHEN_TITLES[index % KITCHEN_TITLES.length];
    return {
      id: `staff-${index}`,
      role: 'staff' as SceneActorRole,
      name,
      kitchenTitle,
      variant: LOBSTER_VARIANTS[(index + 1) % LOBSTER_VARIANTS.length],
      x: hallAnchor.x,
      y: hallAnchor.y,
      anchorType: 'walk' as const,
      seatIndex: -1,
      kitchenSlot,
      flipped: index % 2 === 1,
      bubble: STAFF_BUBBLES[index % STAFF_BUBBLES.length],
      bubbleVisible: false,
    };
  });

  // 老板固定在大堂前厅（y 最大 = 最近入口/收银台付近），不进厨房
  const hallOwnerAnchor = shop.scene.walkPath.slice().sort((a, b) => b.y - a.y)[0] ?? shop.scene.walkPath[0];
  const owner: SceneActor = {
    id: 'owner-0',
    role: 'owner',
    name: shop.owner,
    variant: '/crayfish-gif/apron.gif',
    x: hallOwnerAnchor.x,
    y: hallOwnerAnchor.y,
    anchorType: 'walk',
    seatIndex: -1,
    flipped: false,
    bubble: OWNER_BUBBLES[0],
    bubbleVisible: false,
  };

  return [...guests, ...staff, owner];
}
