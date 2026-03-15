export type ShopActionId = 'work' | 'menu' | 'guest-chat' | 'owner-chat';

export interface ShopMenuItem {
  name: string;
  price: number;
  tag: string;
  desc: string;
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
    seats: ShopSceneAnchor[];
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
      seats: [
        { x: 20, y: 62 }, { x: 32, y: 70 }, { x: 48, y: 62 }, { x: 64, y: 70 }, { x: 78, y: 62 },
      ],
      walkPath: [
        { x: 16, y: 34 }, { x: 32, y: 28 }, { x: 48, y: 32 }, { x: 68, y: 28 }, { x: 82, y: 34 },
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
      seats: [
        { x: 18, y: 64 }, { x: 30, y: 72 }, { x: 46, y: 64 }, { x: 58, y: 72 }, { x: 72, y: 64 }, { x: 84, y: 72 },
      ],
      walkPath: [
        { x: 14, y: 34 }, { x: 28, y: 28 }, { x: 44, y: 34 }, { x: 60, y: 28 }, { x: 76, y: 34 }, { x: 88, y: 28 },
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
      seats: [
        { x: 22, y: 64 }, { x: 38, y: 64 }, { x: 54, y: 64 }, { x: 70, y: 64 }, { x: 82, y: 74 },
      ],
      walkPath: [
        { x: 14, y: 30 }, { x: 30, y: 24 }, { x: 48, y: 30 }, { x: 66, y: 24 }, { x: 84, y: 30 },
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
      seats: [
        { x: 18, y: 66 }, { x: 32, y: 74 }, { x: 48, y: 66 }, { x: 62, y: 74 }, { x: 78, y: 66 },
      ],
      walkPath: [
        { x: 16, y: 30 }, { x: 32, y: 24 }, { x: 48, y: 30 }, { x: 64, y: 24 }, { x: 80, y: 30 },
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
      seats: [
        { x: 16, y: 64 }, { x: 28, y: 74 }, { x: 42, y: 64 }, { x: 56, y: 74 }, { x: 70, y: 64 }, { x: 84, y: 74 },
      ],
      walkPath: [
        { x: 12, y: 30 }, { x: 28, y: 24 }, { x: 44, y: 30 }, { x: 60, y: 24 }, { x: 76, y: 30 }, { x: 88, y: 24 },
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
    intro: '重口味烤鱼馆，适合朋友聚餐，鱼锅和配菜会让桌面越煮越热闹。',
    owner: '鱼老板',
    ownerTitle: '老板',
    ownerGreeting: '先看鱼锅，还是跟桌边龙虾聊聊哪种口味最上头？',
    staffNames: ['小炭', '阿火'],
    guestTopics: ['什么口味最稳', '配菜怎么加不踩雷', '聚会点单够不够热闹'],
    ownerTopics: ['烤鱼店的高峰节奏', '大锅场景怎么在线上表现', '什么活动最容易出圈'],
    workTasks: ['补炭和酒精炉', '给锅里加配菜', '帮忙传锅上桌'],
    menu: [
      { name: '青花椒烤鱼', price: 108, tag: '常胜', desc: '香麻不燥，适合第一次来。' },
      { name: '香辣烤鱼', price: 108, tag: '重口', desc: '辣味更猛，朋友局很吃香。' },
      { name: '魔芋鸭血拼盘', price: 26, tag: '加料', desc: '涮锅标配，越煮越入味。' },
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
      seats: [
        { x: 18, y: 66 }, { x: 34, y: 74 }, { x: 50, y: 66 }, { x: 66, y: 74 }, { x: 82, y: 66 },
      ],
      walkPath: [
        { x: 14, y: 30 }, { x: 30, y: 24 }, { x: 48, y: 30 }, { x: 66, y: 24 }, { x: 84, y: 30 },
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
      seats: [
        { x: 18, y: 66 }, { x: 34, y: 74 }, { x: 50, y: 66 }, { x: 66, y: 74 }, { x: 82, y: 66 },
      ],
      walkPath: [
        { x: 14, y: 30 }, { x: 32, y: 24 }, { x: 50, y: 30 }, { x: 68, y: 24 }, { x: 86, y: 30 },
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
      seats: [
        { x: 20, y: 66 }, { x: 36, y: 74 }, { x: 52, y: 66 }, { x: 68, y: 74 }, { x: 82, y: 66 },
      ],
      walkPath: [
        { x: 14, y: 30 }, { x: 30, y: 24 }, { x: 48, y: 30 }, { x: 66, y: 24 }, { x: 84, y: 30 },
      ],
    },
  },
];

export const XUHUI_SHOP_MAP = Object.fromEntries(
  XUHUI_SHOPS.map((shop) => [shop.id, shop])
) as Record<string, XuhuiShop>;
