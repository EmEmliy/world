import type { ShopActionId } from '@/config/xuhui-shops';

export type SceneActorRole = 'guest' | 'staff' | 'owner';

/** 厨房岗位职称 */
export const KITCHEN_TITLES = ['1厨师傅', '2厨师傅', '3厨师傅', '切配师傅', '打荷师傅'];

/** 厨房专属岗位锚点 */
export const KITCHEN_STATION_ANCHORS = [
  // 炒菜区（右侧靠近灶台）
  { x: 72, y: 62 },
  { x: 80, y: 58 },
  { x: 86, y: 66 },
  // 切配区（中左）
  { x: 52, y: 68 },
  { x: 60, y: 72 },
  // 传菜走廊
  { x: 40, y: 64 },
  { x: 30, y: 60 },
];

export interface SceneActor {
  id: string;
  role: SceneActorRole;
  name: string;
  /** 厨房岗位职称，仅厨师有 */
  kitchenTitle?: string;
  variant: string;
  x: number;
  y: number;
  anchorType: 'seat' | 'walk' | 'queue';
  /** 占用的座位索引，-1 表示排队中 */
  seatIndex: number;
  /** 厨房岗位索引（0-6），控制炒菜/切配/走廊区位置 */
  kitchenSlot?: number;
  flipped: boolean;
  bubble?: string;
  bubbleVisible?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SceneDialogStateValue {
  actorId: string;
  stageId: SceneView;
}

export interface SceneDialogMotion {
  actorId: string;
  stageId: SceneView;
  fromX: number;
  fromY: number;
  fromSize: number;
  phase: 'opening' | 'open' | 'closing';
}

export interface ShopOpsSnapshot {
  completedOrders: number;
  dineInOrders: number;
  deliveryOrders: number;
  ownerFreeMealChance: number;
  hallSeats: number;
  queueTime: number;
  topDishes: Array<{ name: string; count: number }>;
  barrageComments: string[];
}

export type SceneView = 'hall' | 'kitchen';

export const LOBSTER_VARIANTS = [
  '/crayfish-gif/base.gif',
  '/crayfish-gif/glasses.gif',
  '/crayfish-gif/hat.gif',
  '/crayfish-gif/mask.gif',
  '/crayfish-gif/apron.gif',
  '/crayfish-gif/guest-chopsticks.gif',
  '/crayfish-gif/guest-sitting.gif',
  '/crayfish-gif/guest-dancing.gif',
  '/crayfish-gif/guest-bag.gif',
  '/crayfish-gif/guest-tea.gif',
  '/crayfish-gif/guest-thumbsup.gif',
];

export const GUEST_NAMES = ['不饿', '阿满', '糯糯', '来福', '团团', '大饱', '卷卷', '圆宝', '旺财', '小馋'];
export const GUEST_BUBBLES = ['好香', '这锅稳', '再来一份', '今天值了', '排队也值', '这家真火'];
export const STAFF_BUBBLES = ['上菜啦', '里面请', '这边结账', '马上到', '您慢用'];
export const KITCHEN_STAFF_BUBBLES = ['火候到了', '这锅稳', '走菜！', '出锅啦', '备料好了', '刀工练好的'];
export const OWNER_BUBBLES = ['今天很旺', '欢迎光临', '大家辛苦了', '今晚翻台快'];
export const KITCHEN_ANCHORS = [
  { x: 58, y: 70 },
  { x: 68, y: 62 },
  { x: 76, y: 68 },
  { x: 84, y: 60 },
  { x: 88, y: 72 },
];
export const SCENE_FOCUS_BY_ACTION: Record<ShopActionId, SceneView> = {
  work: 'kitchen',
  menu: 'hall',
  'guest-chat': 'hall',
  'owner-chat': 'kitchen',
};

export const DEFAULT_MENU_PROMO_BADGES = [
  { text: '🧧 满20减14', color: 'rgba(230,60,60,0.85)' },
  { text: '🆕 新客立减', color: 'rgba(230,60,60,0.85)' },
  { text: '⚡ 99减9', color: 'rgba(200,80,20,0.8)' },
  { text: '💳 支付红包¥1.88', color: 'rgba(180,100,20,0.8)' },
];

export const QUEUE_SPOTS = [
  { x: 6,  y: 88 }, { x: 11, y: 90 }, { x: 16, y: 88 },
  { x: 21, y: 90 }, { x: 26, y: 88 }, { x: 31, y: 90 },
];

export interface ActorGlowConfig {
  bubble: string;
  ring: string;
  shadow: string;
}
