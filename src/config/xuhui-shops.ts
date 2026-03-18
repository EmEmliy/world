export type ShopActionId = 'work' | 'menu' | 'guest-chat' | 'owner-chat';

export interface ShopMenuItem {
  name: string;
  /** 原价 */
  price: number;
  /** 优惠价（可选） */
  salePrice?: number;
  tag: string;
  desc: string;
  /** 今日可提供份数，0 = 售罄 */
  stock?: number;
  /** 点单热度 0-100 */
  heatScore?: number;
  /** 老板推荐 */
  ownerPick?: boolean;
  /** 配量说明 */
  portion?: string;
  /** 推荐指数 1-5 */
  stars?: number;
}

export interface ShopAction {
  id: ShopActionId;
  title: string;
  subtitle: string;
  description: string;
}

export interface ShopSceneAnchor {
  x: number;
  y: number;
}

export interface XuhuiShop {
  id: string;
  name: string;
  cuisine: string;
  image: string;
  x: number;
  y: number;
  mapOffsetX?: number;
  mapOffsetY?: number;
  mapScale?: number;
  lobsterX: number;
  lobsterY: number;
  size: number;
  baseVisitors: number;
  crowdLevel: 'normal' | 'busy' | 'packed';
  /** 营业开始小时 0-23 */
  openHour: number;
  /** 营业结束小时，>24 表示过凌晨，如 25 = 凌晨 1 点 */
  closeHour: number;
  /** 是否 24h 营业 */
  isAllDay?: boolean;
  intro: string;
  owner: string;
  ownerTitle: string;
  ownerGreeting: string;
  staffNames: string[];
  guestTopics: string[];
  ownerTopics: string[];
  workTasks: string[];
  menu: ShopMenuItem[];
  actions: ShopAction[];
  scene: {
    counterLabel: string;
    floorTone: string;
    wallTone: string;
    accent: string;
    /** 顾客座位坐标（椅子旁，桌子外缘）% */
    seats: ShopSceneAnchor[];
    /** 员工/老板走动坐标（桌间走廊）% */
    walkPath: ShopSceneAnchor[];
  };
}

export const XUHUI_SHOPS: XuhuiShop[] = [
  {
    id: 'gaga',
    name: 'gaga',
    cuisine: '西餐',
    image: '/xuhui-island-clean/gaga.png',
    x: 16.5,
    y: 42,
    mapOffsetX: 150,
    mapOffsetY: -80,
    lobsterX: 13.5,
    lobsterY: 49,
    size: 88,
    baseVisitors: 22,
    crowdLevel: 'normal',
    openHour: 9,
    closeHour: 21,
    intro: '开放式西餐小馆，适合下午茶、早午餐和轻社交，招牌是高颜值甜品与轻食组合。',
    owner: '高高姐',
    ownerTitle: '主理人',
    ownerGreeting: '欢迎进店，今天的甜品台刚补满，想先逛逛还是直接上手赚点积分？',
    staffNames: ['桃桃', '卷卷'],
    guestTopics: ['今天哪道最出片', '约会坐哪排最好', '轻食饱腹感怎么样'],
    ownerTopics: ['品牌调性怎么做出来', '线下高峰期怎么接待', '为什么想进驻线上小岛'],
    workTasks: ['招呼进店客虾', '帮忙摆甜品台', '给外带单贴标签'],
    menu: [
      { name: '海盐焦糖松饼', price: 48, tag: '招牌', desc: '松软厚松饼配海盐奶油和焦糖香蕉。' },
      { name: '牛油果鸡肉沙拉', price: 42, tag: '清爽', desc: '轻食热门款，适合中午快速吃一份。' },
      { name: '拿铁云朵杯', price: 29, tag: '爆款', desc: '杯口有奶盖造型，适合拍照打卡。' },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '赚积分冲免单', description: '完成门店小任务，攒积分换优惠券或免单机会。' },
      { id: 'menu', title: '看菜单', subtitle: '先看点什么', description: '先浏览菜品和招牌推荐，再决定下单路线。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '听真实反馈', description: '和正在用餐的店虾聊聊人气菜和用餐体验。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '聊品牌故事', description: '听老板讲门店定位、经营想法和合作计划。' },
    ],
    scene: {
      counterLabel: '甜品台',
      floorTone: '#f4d6b7',
      wallTone: '#fff5ea',
      accent: '#ff9d6f',
      // gaga: 吧台区(左)+ 散座区(右)，共 3 组桌位
      seats: [
        // 左侧吧台高脚椅（y 更高 = 更靠近画面上方桌子）
        { x: 14, y: 50 }, { x: 20, y: 54 }, { x: 26, y: 50 },
        // 中区小圆桌（2人位）
        { x: 42, y: 44 }, { x: 50, y: 50 }, { x: 40, y: 56 }, { x: 52, y: 57 },
        // 右区小方桌（4人位）
        { x: 66, y: 40 }, { x: 74, y: 44 }, { x: 80, y: 50 }, { x: 70, y: 54 },
        // 右窗边桌（较远/高）
        { x: 84, y: 36 }, { x: 90, y: 42 },
      ],
      walkPath: [
        { x: 18, y: 62 }, { x: 34, y: 56 }, { x: 52, y: 62 },
        { x: 68, y: 56 }, { x: 84, y: 62 },
      ],
    },
  },
  {
    id: 'azhong',
    name: '阿忠食坊',
    cuisine: '厦门菜',
    image: '/xuhui-island-clean/azhong.png',
    x: 39.5,
    y: 29,
    mapOffsetX: 20,
    mapOffsetY: 40,
    lobsterX: 38,
    lobsterY: 41,
    size: 92,
    baseVisitors: 31,
    crowdLevel: 'packed',
    openHour: 11,
    closeHour: 23,
    intro: '偏闽南烟火气的热炒馆，晚餐时段最热闹，招牌海鲜和沙茶味很冲。',
    owner: '阿忠叔',
    ownerTitle: '掌勺老板',
    ownerGreeting: '进来随便看，今天沙茶锅正开着，想先帮忙跑堂还是先听我讲招牌？',
    staffNames: ['小海', '阿晶', '乐乐'],
    guestTopics: ['海鲜点什么不踩雷', '适合几个人拼桌', '下饭菜哪道最猛'],
    ownerTopics: ['闽南菜为什么适合商场', '高峰期如何翻台', '线上合作能带来什么'],
    workTasks: ['端沙茶锅底', '补餐具和蘸料', '喊号给打包单'],
    menu: [
      { name: '沙茶海鲜锅', price: 88, tag: '爆单', desc: '浓沙茶底配虾、鱿鱼和贝类。' },
      { name: '厦门海蛎煎', price: 36, tag: '必点', desc: '外焦里嫩，配蒜蓉辣酱最稳。' },
      { name: '姜母鸭拌饭', price: 32, tag: '下饭', desc: '偏甜香口，米饭吸汁很强。' },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '高峰跑堂局', description: '高峰时段帮忙跑单、招呼和补位，积分给得更快。' },
      { id: 'menu', title: '看菜单', subtitle: '海鲜热炒区', description: '按人数和口味选菜，先看哪些是高峰爆单。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '问真实推荐', description: '听正在拼桌的店虾说说什么最下饭。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '听闽南故事', description: '老板会讲门店招牌和上海客群偏好。' },
    ],
    scene: {
      counterLabel: '热炒出餐口',
      floorTone: '#e2c19d',
      wallTone: '#fff0df',
      accent: '#d66a31',
      // 阿忠食坊：2 张大辺桌 + 左下散座，共 14 个座位
      seats: [
        // 左大桌（6 把椅，围绕 x≈22,y≈42）
        { x: 14, y: 40 }, { x: 22, y: 36 }, { x: 30, y: 40 },
        { x: 30, y: 48 }, { x: 22, y: 52 }, { x: 14, y: 48 },
        // 右大桌（6 把椅，围绕 x≈60,y≈42）
        { x: 52, y: 40 }, { x: 60, y: 36 }, { x: 68, y: 40 },
        { x: 68, y: 48 }, { x: 60, y: 52 }, { x: 52, y: 48 },
        // 右下角小桌（2人位，较近前景）
        { x: 80, y: 52 }, { x: 88, y: 58 },
      ],
      walkPath: [
        { x: 18, y: 62 }, { x: 36, y: 56 }, { x: 52, y: 62 },
        { x: 68, y: 56 }, { x: 84, y: 62 },
      ],
    },
  },
  {
    id: 'jinfuyuan',
    name: '锦府园',
    cuisine: '新台州菜',
    image: '/xuhui-island-clean/jinfuyuan.png',
    x: 68.5,
    y: 30.5,
    mapOffsetX: -160,
    mapOffsetY: 110,
    mapScale: 0.95,
    lobsterX: 67.5,
    lobsterY: 43,
    size: 94,
    baseVisitors: 28,
    crowdLevel: 'busy',
    openHour: 11,
    closeHour: 21,
    intro: '带点宴请感的新台州菜，适合家庭聚餐，讲究大菜上桌和分餐节奏。',
    owner: '锦老板',
    ownerTitle: '店长',
    ownerGreeting: '今天台州海鲜很鲜，要不要进包间区域看看，顺便接个积分任务？',
    staffNames: ['阿祺', '小满'],
    guestTopics: ['家庭聚餐点哪些', '海鲜今天新不新鲜', '适合请客的组合'],
    ownerTopics: ['新台州菜的卖点', '包间服务怎么做', '合作后线上怎么承接客流'],
    workTasks: ['摆台和分餐', '传菜到包间', '迎宾带位'],
    menu: [
      { name: '黄鱼年糕煲', price: 98, tag: '门面菜', desc: '黄鱼鲜味重，年糕吸汁很足。' },
      { name: '台州糟羹', price: 36, tag: '特色', desc: '咸鲜热羹，适合多人分享。' },
      { name: '椒盐虾姑', price: 78, tag: '高人气', desc: '壳脆肉嫩，适合下酒和聚餐。' },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '迎宾分餐局', description: '做迎宾和分餐支持，适合体验高客单门店节奏。' },
      { id: 'menu', title: '看菜单', subtitle: '聚餐点单逻辑', description: '按请客、家庭、商务场景看怎么配菜。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '听聚餐评价', description: '和桌边用餐的龙虾聊聊大菜表现。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '聊经营策略', description: '适合了解高客单门店如何做线上合作。' },
    ],
    scene: {
      counterLabel: '包间前厅',
      floorTone: '#d8bea4',
      wallTone: '#fff2e7',
      accent: '#8f5c3d',
      // 锦府园：3 张大圆桌，等轴透视 y 值偏小=靠近画面上方
      seats: [
        // 左桌（前景，x≈18-36, y≈58-72）
        { x: 18, y: 58 }, { x: 26, y: 54 }, { x: 34, y: 58 },
        { x: 34, y: 66 }, { x: 26, y: 70 }, { x: 18, y: 66 },
        // 中桌（中间，x≈46-62, y≈48-62）
        { x: 46, y: 46 }, { x: 54, y: 42 }, { x: 62, y: 46 },
        { x: 62, y: 54 }, { x: 54, y: 58 }, { x: 46, y: 54 },
        // 右桌（远景，x≈68-86, y≈32-46）
        { x: 68, y: 34 }, { x: 76, y: 30 }, { x: 84, y: 34 },
        { x: 84, y: 42 }, { x: 76, y: 46 }, { x: 68, y: 42 },
      ],
      walkPath: [
        { x: 14, y: 72 }, { x: 30, y: 66 }, { x: 48, y: 60 },
        { x: 64, y: 54 }, { x: 80, y: 48 },
      ],
    },
  },
  {
    id: 'cailan',
    name: '蔡澜点心',
    cuisine: '港式点心',
    image: '/xuhui-island-clean/cailan.png',
    x: 84.5,
    y: 58,
    mapOffsetX: -10,
    mapOffsetY: -30,
    lobsterX: 83,
    lobsterY: 67,
    size: 94,
    baseVisitors: 26,
    crowdLevel: 'busy',
    openHour: 9,
    closeHour: 21,
    intro: '偏港式茶楼感，蒸笼区和点心车是核心体验，适合逛一圈再慢慢点。',
    owner: '蔡师傅',
    ownerTitle: '主理人',
    ownerGreeting: '刚出笼的点心最香，想先看蒸笼台，还是直接和茶客们聊聊口碑？',
    staffNames: ['阿早', '蓉蓉'],
    guestTopics: ['什么蒸笼最值得等', '一个人怎么点不浪费', '下午茶坐多久合适'],
    ownerTopics: ['点心车为什么好玩', '茶楼氛围怎么在线上表现', '联名活动怎么做'],
    workTasks: ['推点心车', '补蘸料小碟', '喊蒸笼新鲜出炉'],
    menu: [
      { name: '虾饺皇', price: 29, tag: '必点', desc: '皮薄虾弹，出笼后口感最佳。' },
      { name: '流沙奶黄包', price: 24, tag: '爆款', desc: '热度高，适合拍开瞬间。' },
      { name: '豉汁凤爪', price: 22, tag: '老饕爱点', desc: '偏软糯，配茶很稳。' },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '点心车支援', description: '推车、补蒸笼、招呼茶客，能很快累积积分。' },
      { id: 'menu', title: '看菜单', subtitle: '蒸点区', description: '适合先看蒸点、炸点和茶饮搭配。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '问点心口碑', description: '听茶客说哪一笼最值得先下手。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '聊茶楼体验', description: '了解门店为什么适合做线上逛店。' },
    ],
    scene: {
      counterLabel: '蒸笼出笼区',
      floorTone: '#ecd2b8',
      wallTone: '#fff6ee',
      accent: '#c45138',
      // 蔡澜点心：港式茶楼，桌子散布全场
      seats: [
        { x: 14, y: 54 }, { x: 26, y: 48 }, { x: 42, y: 56 },
        { x: 56, y: 44 }, { x: 70, y: 50 }, { x: 84, y: 40 },
      ],
      walkPath: [
        { x: 18, y: 66 }, { x: 36, y: 60 }, { x: 52, y: 66 },
        { x: 68, y: 60 }, { x: 84, y: 66 },
      ],
    },
  },
  {
    id: 'laotouer',
    name: '老头儿油爆虾',
    cuisine: '江浙菜',
    image: '/xuhui-island-clean/laotouer.png',
    x: 23.5,
    y: 73,
    mapOffsetX: -20,
    mapOffsetY: -150,
    mapScale: 1.1,
    lobsterX: 22,
    lobsterY: 82,
    size: 92,
    baseVisitors: 34,
    crowdLevel: 'packed',
    openHour: 10,
    closeHour: 22,
    intro: '招牌油爆虾和家常热菜都很能打，晚餐高峰翻台快，现场烟火气最足。',
    owner: '老周',
    ownerTitle: '店长',
    ownerGreeting: '来得巧，刚好一锅虾起锅。要不要进后场帮忙摆盘，或者直接看看爆单菜单？',
    staffNames: ['阿武', '小琳', '阿诚'],
    guestTopics: ['油爆虾值不值', '一桌怎么点最稳', '人多要不要等位'],
    ownerTopics: ['招牌菜如何保持稳定', '等位期怎么留人', '线上优惠怎么带动线下核销'],
    workTasks: ['摆盘油爆虾', '给等位客发号', '帮忙收桌翻台'],
    menu: [
      { name: '招牌油爆虾', price: 88, tag: '王炸', desc: '壳脆甜口，门店第一爆单菜。' },
      { name: '响油鳝糊', price: 62, tag: '下饭', desc: '江浙经典，热油一浇香气立起。' },
      { name: '酒酿圆子', price: 16, tag: '收尾', desc: '甜口收尾，适合全桌分享。' },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '高峰翻台局', description: '人最多、任务最猛，但积分和免单几率也最高。' },
      { id: 'menu', title: '看菜单', subtitle: '爆款热菜区', description: '先看油爆虾和下饭菜组合。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '问排队值不值', description: '真实客流最能反映热度。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '聊烟火气', description: '听老板讲怎样把热闹感做到线上。' },
    ],
    scene: {
      counterLabel: '热锅出菜口',
      floorTone: '#deb995',
      wallTone: '#fff0de',
      accent: '#b54e2f',
      // 老头儿油爆虾：3 张圆桌，从前景到远景分散
      seats: [
        // 左圆桌（前景，6 把）
        { x: 14, y: 60 }, { x: 22, y: 56 }, { x: 30, y: 60 },
        { x: 30, y: 68 }, { x: 22, y: 72 }, { x: 14, y: 68 },
        // 中圆桌（中景，6 把）
        { x: 44, y: 48 }, { x: 52, y: 44 }, { x: 60, y: 48 },
        { x: 60, y: 56 }, { x: 52, y: 60 }, { x: 44, y: 56 },
        // 右圆桌（远景，4 把）
        { x: 72, y: 36 }, { x: 80, y: 32 },
        { x: 82, y: 40 }, { x: 74, y: 44 },
      ],
      walkPath: [
        { x: 16, y: 74 }, { x: 32, y: 66 }, { x: 50, y: 58 },
        { x: 66, y: 50 }, { x: 82, y: 44 },
      ],
    },
  },
  {
    id: 'jiangbian',
    name: '江边城外烤全鱼',
    cuisine: '烤鱼',
    image: '/xuhui-island-clean/jiangbian.png',
    x: 48.5,
    y: 67.5,
    lobsterX: 49,
    lobsterY: 76,
    size: 96,
    baseVisitors: 29,
    crowdLevel: 'busy',
    openHour: 10,
    closeHour: 22,
    intro: '活鱼现烤·多口味川味烤鱼，适合朋友聚餐，鱼锅和配菜越煮越热闹。综合评分 4.2，4448 条真实评价。',
    owner: '鱼老板',
    ownerTitle: '老板',
    ownerGreeting: '先看鱼锅，还是跟桌边龙虾聊聊哪种口味最上头？',
    staffNames: ['小炭', '阿火'],
    guestTopics: ['什么口味最稳', '配菜怎么加不踩雷', '聚会点单够不够热闹'],
    ownerTopics: ['烤鱼店的高峰节奏', '大锅场景怎么在线上表现', '什么活动最容易出圈'],
    workTasks: ['补炭和酒精炉', '给锅里加配菜', '帮忙传锅上桌'],
    menu: [
      // 主菜 - 烤全鱼
      { name: '青花椒烤鱼', price: 128, salePrice: 108, tag: '常胜NO.1', desc: '香麻不燥、鱼肉细嫩，适合第一次来的必选款。活鱼现烤，青花椒香气扑鼻。', stock: 40, heatScore: 95, ownerPick: true, portion: '约 2-3 人份', stars: 5 },
      { name: '香辣烤鱼', price: 128, salePrice: 108, tag: '重口爆单', desc: '辣味更猛更过瘾，朋友局和宵夜场最吃香，适合无辣不欢。', stock: 35, heatScore: 90, portion: '约 2-3 人份', stars: 5 },
      { name: '酱香烤鱼', price: 128, salePrice: 108, tag: '下饭王', desc: '浓郁酱香底，入味深，配米饭绝配，老少皆宜。', stock: 20, heatScore: 78, portion: '约 2-3 人份', stars: 4 },
      { name: '茄汁烤鱼（不辣）', price: 128, salePrice: 108, tag: '不辣款', desc: '蛋香茄汁口味，不辣版首选，酸甜开胃，适合怕辣的朋友。', stock: 15, heatScore: 72, portion: '约 2-3 人份', stars: 4 },
      { name: '怪味烤鱼', price: 128, salePrice: 108, tag: '挑战款', desc: '甜酸辣三味复合，第一口懵第二口上头，资深食客挚爱。', stock: 8, heatScore: 65, portion: '约 2-3 人份', stars: 4 },
      // 单人冒桶
      { name: '单人冒菜桶（青花椒）', price: 41.9, salePrice: 24.4, tag: '新客价', desc: '单人爆款，新客价直接6折。活鱼冒桶，分量足、出餐快。', stock: 60, heatScore: 99, ownerPick: true, portion: '1人份', stars: 5 },
      { name: '活鱼冒桶', price: 32, salePrice: 28.2, tag: '门店销量第1', desc: '回头客最爱，活鱼现做，汤底鲜美，常驻榜首。', stock: 50, heatScore: 96, portion: '1人份', stars: 5 },
      // 套餐
      { name: '双人餐套餐', price: 257, salePrice: 188.99, tag: '双人优选', desc: '烤鱼+配菜+饮品，双人最划算组合，约 7.4 折。', stock: 25, heatScore: 85, ownerPick: true, portion: '2人份', stars: 5 },
      { name: '三人餐套餐', price: 380, salePrice: 308, tag: '三人聚餐', desc: '三人聚餐标配，含一条烤鱼+配菜+饮品，约 8.1 折。', stock: 18, heatScore: 80, portion: '3人份', stars: 4 },
      { name: '多人餐套餐', price: 520, salePrice: 397.99, tag: '聚餐首选', desc: '4人以上聚餐，含大份烤鱼+丰富配菜，性价比拉满。', stock: 12, heatScore: 76, portion: '4-5人份', stars: 4 },
      // 配菜
      { name: '魔芋鸭血拼盘', price: 26, tag: '加料必点', desc: '涮锅标配，越煮越入味，鸭血嫩滑魔芋弹牙。', stock: 80, heatScore: 88, portion: '2-3人份', stars: 4 },
      { name: '娃娃菜', price: 12, tag: '解腻', desc: '清甜娃娃菜，平衡重口锅底的好搭档。', stock: 99, heatScore: 60, portion: '1-2人份', stars: 3 },
      { name: '腐竹', price: 10, tag: '吸汁王', desc: '吸满锅底精华，越煮越香软。', stock: 99, heatScore: 65, portion: '1-2人份', stars: 3 },
      { name: '脆皮肠', price: 14, tag: '小吃', desc: '烤至焦脆，肠内多汁，大人小孩都爱。', stock: 40, heatScore: 70, portion: '1-2人份', stars: 4 },
      // 小吃
      { name: '口水鸡', price: 32, tag: '凉菜', desc: '麻辣鲜香，先上这道等鱼的时候先开吃。', stock: 20, heatScore: 75, portion: '2人份', stars: 4 },
      { name: '蕨根粉', price: 18, tag: '主食', desc: '弹牙爽滑，拌入烤鱼汤底超香。', stock: 35, heatScore: 72, portion: '1-2人份', stars: 4 },
      // 饮品
      { name: '山楂饮', price: 12, tag: '解腻饮', desc: '酸甜山楂，解辣解腻效果一流。', stock: 99, heatScore: 55, portion: '1杯', stars: 3 },
      { name: '柠檬茶', price: 12, tag: '清爽', desc: '清新柠檬，搭配重口烤鱼刚刚好。', stock: 99, heatScore: 58, portion: '1杯', stars: 3 },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '传锅补菜局', description: '适合做重场景互动，积分涨得快。' },
      { id: 'menu', title: '看菜单', subtitle: '鱼锅口味区', description: '先从鱼锅和加料区切入。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '听朋友局反馈', description: '问问哪锅最适合多人开局。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '聊热闹体验', description: '聊聊为什么烤鱼是线下氛围最强的品类。' },
    ],
    scene: {
      counterLabel: '鱼锅出锅台',
      floorTone: '#deb995',
      wallTone: '#fff3e4',
      accent: '#2f6ea0',
      // 江边城外：成排套间，等轴透视从左下到右上
      seats: [
        // 左前桌（4 把）
        { x: 14, y: 62 }, { x: 22, y: 58 }, { x: 26, y: 66 }, { x: 18, y: 70 },
        // 左中桌（4 把）
        { x: 34, y: 50 }, { x: 42, y: 46 }, { x: 46, y: 54 }, { x: 38, y: 58 },
        // 右中桌（4 把）
        { x: 56, y: 40 }, { x: 64, y: 36 }, { x: 68, y: 44 }, { x: 60, y: 48 },
        // 右远桌（2 把）
        { x: 76, y: 30 }, { x: 84, y: 34 },
      ],
      walkPath: [
        { x: 18, y: 74 }, { x: 34, y: 64 }, { x: 50, y: 54 },
        { x: 66, y: 44 }, { x: 82, y: 36 },
      ],
    },
  },
  {
    id: 'wanglaida',
    name: '蛙来哒',
    cuisine: '湘味牛蛙',
    image: '/xuhui-island-clean/wanglaid.png',
    x: 76,
    y: 83,
    mapOffsetX: -90,
    mapOffsetY: -180,
    lobsterX: 74,
    lobsterY: 88,
    size: 92,
    baseVisitors: 24,
    crowdLevel: 'busy',
    openHour: 11,
    closeHour: 26, // 凌晨 2 点
    intro: '牛蛙锅和香辣口味是主打，整体氛围活跃，年轻客群多，适合社交聚餐。',
    owner: '蛙姐',
    ownerTitle: '店长',
    ownerGreeting: '店里今天辣度拉满，想先进锅区看看，还是和旁边桌的龙虾聊聊味型？',
    staffNames: ['小辣', '阿蛙'],
    guestTopics: ['哪个锅底最香', '第一次来怎么选辣度', '双人局怎么点最划算'],
    ownerTopics: ['年轻客群喜欢什么体验', '辣味品类怎么做活动', '线上线下联动最适合什么玩法'],
    workTasks: ['分装配菜', '安排取号入座', '补冰粉和饮料'],
    menu: [
      { name: '招牌紫苏牛蛙锅', price: 98, tag: '必点', desc: '紫苏香气冲得很出来。' },
      { name: '香辣干锅牛蛙', price: 96, tag: '下饭', desc: '重口味首选，锅气更足。' },
      { name: '冰粉桶', price: 18, tag: '解辣', desc: '搭辣锅很实用。' },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '辣锅支援局', description: '忙的时候连冰粉都要快补，任务节奏快。' },
      { id: 'menu', title: '看菜单', subtitle: '锅底与辣度', description: '先看锅底和加料组合。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '问真实辣度', description: '最适合做口味分流。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '聊年轻客群', description: '适合讨论活动和社交玩法。' },
    ],
    scene: {
      counterLabel: '牛蛙锅出餐台',
      floorTone: '#e7c7a7',
      wallTone: '#fff4e8',
      accent: '#8bbf43',
      // 蛙来哒：等轴布局，从左前到右远
      seats: [
        // 左区圆桌（6把，前景）
        { x: 14, y: 62 }, { x: 22, y: 58 }, { x: 30, y: 62 },
        { x: 30, y: 70 }, { x: 22, y: 74 }, { x: 14, y: 70 },
        // 中区圆桌（6把，中景）
        { x: 48, y: 46 }, { x: 56, y: 42 }, { x: 64, y: 46 },
        { x: 64, y: 54 }, { x: 56, y: 58 }, { x: 48, y: 54 },
        // 右区小座（2把，远景）
        { x: 76, y: 32 }, { x: 84, y: 36 },
      ],
      walkPath: [
        { x: 16, y: 76 }, { x: 34, y: 66 }, { x: 52, y: 56 },
        { x: 68, y: 46 }, { x: 84, y: 38 },
      ],
    },
  },
  {
    id: 'niunew',
    name: '牛New寿喜烧',
    cuisine: '日式寿喜烧',
    image: '/xuhui-island-clean/niunew.png',
    x: 31.5,
    y: 87.5,
    mapOffsetX: 30,
    mapOffsetY: -200,
    mapScale: 0.9,
    lobsterX: 31,
    lobsterY: 92,
    size: 98,
    baseVisitors: 21,
    crowdLevel: 'normal',
    openHour: 11,
    closeHour: 22,
    intro: '偏温暖、慢节奏的寿喜烧场景，适合坐下慢慢煮，服务动作和食材上桌体验都很重要。',
    owner: '牛老板',
    ownerTitle: '店主',
    ownerGreeting: '寿喜烧讲究节奏，想先学怎么煮，还是先帮忙上菜赚点积分？',
    staffNames: ['阿卷', '小雪'],
    guestTopics: ['先下肉还是先下菜', '自助线值不值', '两个人怎么吃更稳'],
    ownerTopics: ['日式锅物为什么适合沉浸体验', '服务节奏怎么控制', '线上种草怎么转线下消费'],
    workTasks: ['补蛋液和酱汁', '帮忙摆肉盘', '招呼自助线排队'],
    menu: [
      { name: '招牌寿喜锅', price: 108, tag: '主推', desc: '甜咸锅底，肉片表现稳定。' },
      { name: '安格斯肥牛拼盘', price: 48, tag: '加肉', desc: '想吃爽一点就加这份。' },
      { name: '抹茶冰淇淋', price: 16, tag: '收尾', desc: '吃完锅物后解腻刚好。' },
    ],
    actions: [
      { id: 'work', title: '进店打工', subtitle: '上菜补位局', description: '节奏没那么炸，但体验很细致。' },
      { id: 'menu', title: '看菜单', subtitle: '锅物与加肉', description: '先看锅底和肉盘组合。' },
      { id: 'guest-chat', title: '和店内龙虾聊', subtitle: '问煮法与体验', description: '适合听真实食用建议。' },
      { id: 'owner-chat', title: '和老板聊', subtitle: '聊沉浸式服务', description: '看锅物门店怎么把服务做成体验。' },
    ],
    scene: {
      counterLabel: '肉盘出餐台',
      floorTone: '#ead6c0',
      wallTone: '#fff8f1',
      accent: '#8b6f5a',
      // 牛New寿喜烧：包厢式桌，从前景到远景
      seats: [
        // 左前桌（4 把）
        { x: 14, y: 64 }, { x: 22, y: 60 }, { x: 24, y: 68 }, { x: 16, y: 72 },
        // 左中桌（2 把）
        { x: 36, y: 52 }, { x: 44, y: 48 },
        // 右中桌（4 把）
        { x: 54, y: 42 }, { x: 62, y: 38 }, { x: 66, y: 46 }, { x: 58, y: 50 },
        // 右远桌（2 把）
        { x: 74, y: 30 }, { x: 82, y: 34 },
      ],
      walkPath: [
        { x: 16, y: 76 }, { x: 34, y: 66 }, { x: 52, y: 56 },
        { x: 68, y: 46 }, { x: 84, y: 38 },
      ],
    },
  },
];

export const XUHUI_SHOP_MAP = Object.fromEntries(
  XUHUI_SHOPS.map((shop) => [shop.id, shop])
) as Record<string, XuhuiShop>;
