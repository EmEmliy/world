/**
 * EATI 人格×商家匹配系统
 * Eating Attitude Type Indicator
 *
 * 四个维度：
 *   A = Appetite Intensity  重口度   L=清淡  H=重口
 *   B = Boldness            探索欲   L=守旧  H=冒险
 *   C = Craft Sensitivity   精细度   L=随便  H=讲究
 *   D = Decision Certainty  确定性   L=果断  H=纠结
 *
 * 商家编码 [A'][B'][C'][D']:
 *   A' = 口味强度    L=清淡  H=重口
 *   B' = 新奇度      L=老牌  H=新奇稀缺
 *   C' = 精致度      L=大众消费  H=高品质
 *   D' = 决策复杂度  L=菜单丰富  H=招牌突出
 *
 * ⚠️  D 维度是【反向映射】——非翻转，而是语义对称：
 *   用户 D=H（选择困难）→ 需要「帮他做决定」的商家 → 商家 D'=H（招牌突出 ≤5 SPU）
 *   用户 D=L（果断秒选）→ 享受丰富选项的掌控感  → 商家 D'=L（菜单丰富 >15 SPU）
 *   因此匹配时直接比较 user.D === shop.D'，无需翻转，编码含义已对称。
 */

// ── 类型定义 ────────────────────────────────────────────────────────

export type EatiBit = 'H' | 'L';

/** 用户 EATI 人格编码，4个字符，每位为 H 或 L */
export type EatiCode = string; // e.g. 'HHLH'

/** 测评单题答案 */
export type EatiAnswer = 'H' | 'L' | null; // null = 跳过（系统随机补值）

/** 测评结果 */
export interface EatiQuizResult {
  code: EatiCode;           // 4-bit 编码，如 'HHLH'
  skippedCount: number;     // 跳过题数
  answeredAt: number;       // 时间戳
  version: string;          // 题库版本，用于题目更新后失效旧结果
}

/** 单道测评题 */
export interface EatiQuestion {
  id: number;               // 1-12
  dimension: 'A' | 'B' | 'C' | 'D';
  text: string;             // 题目正文
  optionL: string;          // 选 L 的选项文案
  optionH: string;          // 选 H 的选项文案
  wangcaiReactionL: string; // 旺财对选 L 的即时反应
  wangcaiReactionH: string; // 旺财对选 H 的即时反应
}

/** 16 种人格信息 */
export interface EatiPersonality {
  code: EatiCode;
  emoji: string;
  name: string;
  shortName: string;       // 英文简码，如 CANTN
  tagline: string;         // 一句话描述
  wangcaiVerdict: string;  // 旺财判决词（3-5句口语化）
}

/** 商家匹配结果 */
export interface ShopMatchResult {
  shopId: string;
  shopName: string;
  shopEatiCode: string;
  score: number;            // 0-4 匹配维度数
  grade: EatiMatchGrade;
  gradeLabel: string;
  gradeEmoji: string;
  matchedDimensions: ('A' | 'B' | 'C' | 'D')[];
  sortKey: number;          // 用于同分次级排序
}

export type EatiMatchGrade =
  | 'destiny'     // 4/4 天命之选
  | 'great'       // 3/4 高度契合
  | 'good'        // 2/4 值得一试
  | 'contrast'    // 1/4 反差体验
  | 'challenge';  // 0/4 饭搭子带你去

// ── 12 道测评题 ───────────────────────────────────────────────────

export const EATI_QUESTIONS: EatiQuestion[] = [
  // ── A 维度：重口度 ──
  {
    id: 1,
    dimension: 'A',
    text: '你跟朋友约火锅，锅底你会选？',
    optionL: '清汤或番茄，清清爽爽',
    optionH: '麻辣或鸳鸯（麻辣那边多一点）',
    wangcaiReactionL: '好，你是那种让大家不被辣哭的温柔龙虾～',
    wangcaiReactionH: '我就知道！你那一口就要够刺激的！',
  },
  {
    id: 2,
    dimension: 'A',
    text: '深夜肚子饿，外卖第一反应是？',
    optionL: '粥、面、清淡小食，吃完好睡觉',
    optionH: '宵夜烤串、辣炒、重口，夜深了才要爽',
    wangcaiReactionL: '嗯，你是那种温柔对自己胃的好龙虾。',
    wangcaiReactionH: '深夜辣党！岛上好几家等你呢！',
  },
  {
    id: 3,
    dimension: 'A',
    text: '聚餐点菜你负责压轴那道，你选？',
    optionL: '白切鸡、清蒸鱼，让大家都吃得好',
    optionH: '毛血旺、香辣蟹，就得来这一锅重口的',
    wangcaiReactionL: '你就是那种帮全桌兜底的老实龙虾。',
    wangcaiReactionH: '果然！你是为了那锅红汤来的！',
  },
  // ── B 维度：探索欲 ──
  {
    id: 4,
    dimension: 'B',
    text: '周末觅食，你更倾向？',
    optionL: '去上次那家，已经知道好不好吃',
    optionH: '刷到一家新开的，不知道怎样但想试试',
    wangcaiReactionL: '稳健型！你是那种「踩准了就不放手」的龙虾。',
    wangcaiReactionH: '冒险家！在岛上我会帮你找最新鲜的那一站！',
  },
  {
    id: 5,
    dimension: 'B',
    text: '看到菜单上有个完全没吃过的菜，你会？',
    optionL: '选熟悉的，今天不冒险',
    optionH: '就点这个，就为了试试',
    wangcaiReactionL: '懂，今天想要稳稳的幸福。',
    wangcaiReactionH: '这才是真正的好奇龙虾！',
  },
  {
    id: 6,
    dimension: 'B',
    text: '外卖平台给你推了一家没怎么有人评价的新店，你的反应？',
    optionL: '不放心，换一家口碑好的',
    optionH: '有趣，点进去看看是什么路数',
    wangcaiReactionL: '嗯，要踩雷的事还是留给别人吧。',
    wangcaiReactionH: '你是岛上第一个发现宝藏的那种龙虾！',
  },
  // ── C 维度：精细度 ──
  {
    id: 7,
    dimension: 'C',
    text: '你去一家口碑很好但环境很一般的餐厅，你会？',
    optionL: '无所谓，好吃才是真的',
    optionH: '有点不适，环境也是体验的一部分',
    wangcaiReactionL: '务实的龙虾！味道在哪里，你就在哪里。',
    wangcaiReactionH: '你懂，吃饭是个完整的仪式。',
  },
  {
    id: 8,
    dimension: 'C',
    text: '外卖打开来，摆盘很随意，一团糊糊，味道应该不错。你的感受？',
    optionL: '无所谓，吃饱就好',
    optionH: '有点扫兴，哪怕外卖也想好看一点',
    wangcaiReactionL: '对，好吃就是最大的诚意！',
    wangcaiReactionH: '明白，你是那种会被摆盘打动的精致龙虾。',
  },
  {
    id: 9,
    dimension: 'C',
    text: '朋友推荐一家店：食材新鲜、摆盘精致、但贵20%。你会去吗？',
    optionL: '20%太多了，差不多就行',
    optionH: '值，这就是我愿意多付的那一部分',
    wangcaiReactionL: '性价比战士！',
    wangcaiReactionH: '你明白，好东西值得那个价。',
  },
  // ── D 维度：确定性 ──
  {
    id: 10,
    dimension: 'D',
    text: '拿到一份20道菜的菜单，你的状态是？',
    optionL: '很快锁定2-3道，下单，结束',
    optionH: '来来回回翻，总觉得有更好的还没看到',
    wangcaiReactionL: '果断！你这种龙虾最省心。',
    wangcaiReactionH: '哈，我懂那种感觉，翻到最后又回到第一页。',
  },
  {
    id: 11,
    dimension: 'D',
    text: '外卖APP打开，选择困难发作，你最后怎么决定的？',
    optionL: '随便选一个关掉，就这家了',
    optionH: '反复比较最后超时了，被迫做决定',
    wangcaiReactionL: '这种速度，我服。',
    wangcaiReactionH: '你需要一个「帮你做决定」的店！我去帮你找！',
  },
  {
    id: 12,
    dimension: 'D',
    text: '朋友让你定今晚吃什么，你的第一反应？',
    optionL: '好，我来，三秒给答案',
    optionH: '啊这个……让我想想……大家有没有偏好？',
    wangcaiReactionL: '龙虾里的领袖型！',
    wangcaiReactionH: '民主派龙虾！照顾所有人的感受。',
  },
];

// ── 16 种人格定义 ─────────────────────────────────────────────────

export const EATI_PERSONALITIES: EatiPersonality[] = [
  {
    code: 'LLLL',
    emoji: '🍚',
    name: '佛系食客',
    shortName: 'EAT-K',
    tagline: '清淡老店、随便一碗、秒下单',
    wangcaiVerdict:
      '你是岛上最省心的龙虾。不挑剔、不纠结、不折腾，给你端什么都能吃得香。有时候旺财觉得，你才是最接近「吃饭本质」的那种生物。今晚随便走，随便吃，保证不会踩雷。',
  },
  {
    code: 'LLLH',
    emoji: '🤔',
    name: '靠谱食堂侠',
    shortName: 'CANTN',
    tagline: '清淡老店、随便吃、但选哪家要想半天',
    wangcaiVerdict:
      '你有选择困难，但口味要求其实不高——清淡、熟悉、价格合适，这三个条件满足了，你就很开心。你需要的不是一家惊艳的店，而是一个帮你做决定的人。好消息：旺财今天愿意充当这个角色。',
  },
  {
    code: 'LLHL',
    emoji: '✨',
    name: '低调品鉴家',
    shortName: 'STRKT',
    tagline: '清淡老店、但必须精致、果断出手',
    wangcaiVerdict:
      '你不追新、不冒险，但你对品质很敏感。你知道自己喜欢什么，也知道哪些地方值得你掏钱。别人看你在吃「普通菜」，但你知道这道菜的火候差了半分钟。今晚旺财给你找的是那种低调但扎实的店。',
  },
  {
    code: 'LLHH',
    emoji: '🧐',
    name: '精致懒人',
    shortName: 'CHILL',
    tagline: '清淡老口味、要精致、还要纠结很久',
    wangcaiVerdict:
      '你要求不多，但每条都是刚需：清淡、精致、不想动脑选菜。如果有一家店帮你把这三件事都解决了，你愿意每周都去。旺财今天给你找的那家，招牌只有几个，但每个都是用心做的。',
  },
  {
    code: 'LHLL',
    emoji: '🗺️',
    name: '清新探险家',
    shortName: 'FOODI',
    tagline: '清淡新店、随便吃、秒决定',
    wangcaiVerdict:
      '你有探索欲，但不需要重口刺激——新奇、清新、轻松，这就够了。你是那种能在小众菜系里发现惊喜、还能让同行的朋友接受的人。岛上有几家稀缺品类的店，今晚为你而来。',
  },
  {
    code: 'LHLH',
    emoji: '🌿',
    name: '文艺犹豫症',
    shortName: 'XPLOR',
    tagline: '清淡新店、随便吃、但下不了决心',
    wangcaiVerdict:
      '你喜欢有意思的新店，口味上没太高要求，但下单这件事能让你纠结半小时。你需要的是一个「招牌明确」的新奇小店——不用选，就那一道，错不了。旺财今天帮你找到了。',
  },
  {
    code: 'LHHL',
    emoji: '💎',
    name: '隐藏美食猎人',
    shortName: 'HUNTR',
    tagline: '清淡新店、讲究品质、果断拿下',
    wangcaiVerdict:
      '你的标准很高——要新颖、要精致、要好吃，但你不爱重口。这个组合在岛上其实很稀缺。你是那种能提前半年订到预约制餐厅的龙虾。今晚旺财找到了一家你会喜欢的，去吧，机会难得。',
  },
  {
    code: 'LHHH',
    emoji: '🦄',
    name: '挑剔冒险王',
    shortName: 'QUEST',
    tagline: '清淡新店、讲究品质、还纠结',
    wangcaiVerdict:
      '你是最复杂的那种食客——要新奇、要精致、要清淡，但选到一家满意的店要花你很长时间。好消息是，当你真的遇到了那家店，你会对它极度忠诚。今晚旺财帮你省去了那段纠结的时间。',
  },
  {
    code: 'HLLL',
    emoji: '🌶️',
    name: '重口老炮',
    shortName: 'SPICY',
    tagline: '重口老店、随便吃、秒下单',
    wangcaiVerdict:
      '你是最简单的重口龙虾——给辣的，给熟悉的，给够爽的，就行了，不用废话。你不需要被推荐，你知道哪里好吃，但今晚旺财还是帮你划了重点，省得走弯路。',
  },
  {
    code: 'HLLH',
    emoji: '😩',
    name: '辣味选择恐惧',
    shortName: 'COMFT',
    tagline: '重口老店、随便吃、但选不出来',
    wangcaiVerdict:
      '你要的很明确：辣的、熟悉的，但在「到底哪家辣最好」这个问题上，你能纠结到天亮。今晚旺财替你做了决定，招牌突出、口碑有保障，去就好了，不用再想了。',
  },
  {
    code: 'HLHL',
    emoji: '👑',
    name: '硬核美食家',
    shortName: 'HOTPT',
    tagline: '重口老店、讲究品质、当机立断',
    wangcaiVerdict:
      '你是重口界的品质控。你不只要辣，你要的是「那种辣法」。老牌、扎实、有段位的重口，才能满足你。你出手果断，不啰嗦，今晚直接走就行了。',
  },
  {
    code: 'HLHH',
    emoji: '🔥',
    name: '精致辣妹',
    shortName: 'LUXSP',
    tagline: '重口老店、讲究品质、反复斟酌',
    wangcaiVerdict:
      '你有品位，你爱辣，你只是下单的时候会反复纠结「今天是这家还是那家」。你需要一家品质有保障、招牌突出到不用选的重口馆子。旺财今天帮你锁了，走吧。',
  },
  {
    code: 'HHLL',
    emoji: '🚀',
    name: '狂野冒险王',
    shortName: 'CHAOS',
    tagline: '重口新店、随便吃、说走就走',
    wangcaiVerdict:
      '你是岛上行动力最强的龙虾。重口、新奇、说走就走，这三个词就是你。你不需要别人推荐，你自己就会找到。但旺财还是帮你标了几个新开的重口店，今晚去冲。',
  },
  {
    code: 'HHLH',
    emoji: '🎲',
    name: '重口探险家',
    shortName: 'DARER',
    tagline: '重口新店、随便吃、想去又怕踩雷',
    wangcaiVerdict:
      '你什么都敢吃，但你在意的是「踩不踩雷」。新奇+重口的店你最感兴趣，但如果评价太少，你就会打退堂鼓。今晚旺财给你找了一家：新店、重口、但招牌够突出，进去就知道点什么。',
  },
  {
    code: 'HHHL',
    emoji: '🏆',
    name: '极致猎食者',
    shortName: 'REIGN',
    tagline: '重口新店、高品质、当场锁定',
    wangcaiVerdict:
      '你是岛上的美食标准定制者。重口、新奇、精致，这三件事缺一不可，但你一旦找到了，下手毫不犹豫。你的朋友都说你是「那个总能找到宝藏店」的那只虾。今晚不例外。',
  },
  {
    code: 'HHHH',
    emoji: '💀',
    name: '终极美食强迫症',
    shortName: 'ANRKY',
    tagline: '重口新店、高品质、还要纠结到崩溃',
    wangcaiVerdict:
      '你就是那个在群里发「今晚吃什么」然后自己否定所有方案的龙虾。你的标准是：重口、新奇、精致，但每一条都要最好，选不出来就算了明天再说。好消息：旺财今天帮你终结这个循环。',
  },
];

// ── 人格名称速查 Map ──────────────────────────────────────────────

export const PERSONALITY_MAP = new Map<EatiCode, EatiPersonality>(
  EATI_PERSONALITIES.map((p) => [p.code, p])
);

// ── 匹配等级配置 ──────────────────────────────────────────────────

const GRADE_CONFIG: Record<
  EatiMatchGrade,
  { label: string; emoji: string; sortBase: number }
> = {
  destiny:   { label: '天命之选',     emoji: '🔥🔥🔥', sortBase: 400 },
  great:     { label: '高度契合',     emoji: '🔥🔥',   sortBase: 300 },
  good:      { label: '值得一试',     emoji: '🔥',     sortBase: 200 },
  contrast:  { label: '反差体验',     emoji: '⚡',     sortBase: 100 },
  challenge: { label: '饭搭子带你去', emoji: '💀',     sortBase: 0   },
};

function scoreToGrade(score: number): EatiMatchGrade {
  if (score === 4) return 'destiny';
  if (score === 3) return 'great';
  if (score === 2) return 'good';
  if (score === 1) return 'contrast';
  return 'challenge';
}

// ── 核心匹配算法 ──────────────────────────────────────────────────

/**
 * 计算用户人格编码与单家商户编码的匹配分
 *
 * 规则：4个维度中，编码相同的维度数量即为匹配分（0-4）
 *
 * ⚠️  D 维度说明（反向映射）：
 *   用户 D=H（纠结型） → 偏好商家 D'=H（招牌突出）→ user[3]==='H' 匹配 shop[3]==='H' ✓
 *   用户 D=L（果断型） → 偏好商家 D'=L（菜单丰富）→ user[3]==='L' 匹配 shop[3]==='L' ✓
 *   结论：直接比较字符，无需翻转，商家编码已按「互补需求」打标，语义已对称。
 *
 * @param userCode  用户4-bit编码，如 'HHLH'
 * @param shopCode  商家4-bit编码，如 'HLHH'
 * @returns 匹配分 0-4
 */
export function calcMatchScore(userCode: EatiCode, shopCode: EatiCode): number {
  if (userCode.length !== 4 || shopCode.length !== 4) return 0;
  let score = 0;
  for (let i = 0; i < 4; i++) {
    if (userCode[i] === shopCode[i]) score++;
  }
  return score;
}

/**
 * 同分次级排序权重
 * 优先级：A > C > B > D（口味 > 品质 > 新奇 > 决策）
 * 维度匹配 A +8, C +4, B +2, D +1
 */
function calcSortKey(userCode: EatiCode, shopCode: EatiCode, score: number): number {
  const WEIGHT = [8, 2, 4, 1]; // A B C D 对应权重（索引 0=A,1=B,2=C,3=D）
  let key = score * 100; // 主排序保证 score 高的永远在前
  for (let i = 0; i < 4; i++) {
    if (userCode[i] === shopCode[i]) key += WEIGHT[i];
  }
  return key;
}

/**
 * 获取匹配维度列表
 */
function getMatchedDimensions(
  userCode: EatiCode,
  shopCode: EatiCode
): ('A' | 'B' | 'C' | 'D')[] {
  const dims = ['A', 'B', 'C', 'D'] as const;
  return dims.filter((_, i) => userCode[i] === shopCode[i]);
}

// ── 主推荐接口 ────────────────────────────────────────────────────

export interface ShopForMatch {
  id: string;
  name: string;
  eatiCode: string;
}

/**
 * 根据用户人格编码，对商户列表进行匹配排序
 *
 * @param userCode  用户4-bit编码
 * @param shops     商户列表（需含 id / name / eatiCode）
 * @returns 按匹配分从高到低排序的 ShopMatchResult[]
 */
export function matchShops(userCode: EatiCode, shops: ShopForMatch[]): ShopMatchResult[] {
  return shops
    .map((shop) => {
      const score = calcMatchScore(userCode, shop.eatiCode);
      const grade = scoreToGrade(score);
      const gradeInfo = GRADE_CONFIG[grade];
      return {
        shopId: shop.id,
        shopName: shop.name,
        shopEatiCode: shop.eatiCode,
        score,
        grade,
        gradeLabel: gradeInfo.label,
        gradeEmoji: gradeInfo.emoji,
        matchedDimensions: getMatchedDimensions(userCode, shop.eatiCode),
        sortKey: calcSortKey(userCode, shop.eatiCode, score),
      } satisfies ShopMatchResult;
    })
    .sort((a, b) => b.sortKey - a.sortKey);
}

// ── 计分逻辑：12题 → 4-bit 编码 ───────────────────────────────────

/**
 * 根据12道题的答案计算用户 EATI 编码
 *
 * 每维度 3 题，多数票决：≥2 题选 H → 该维度为 H，否则为 L
 * 跳过的题（null）由系统随机补值
 *
 * @param answers  长度为12的答案数组，索引对应 Q1-Q12
 * @returns { code, skippedCount }
 */
export function calcEatiCode(answers: (EatiAnswer)[]): { code: EatiCode; skippedCount: number } {
  // 随机补值（跳过题）
  let skippedCount = 0;
  const filled = answers.map((a) => {
    if (a === null) {
      skippedCount++;
      return Math.random() < 0.5 ? 'H' : 'L';
    }
    return a;
  });

  // 按维度分组：Q1-3=A, Q4-6=B, Q7-9=C, Q10-12=D
  const dimensions: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const code = dimensions.map((_, dimIdx) => {
    const start = dimIdx * 3;
    const hCount = filled.slice(start, start + 3).filter((v) => v === 'H').length;
    return hCount >= 2 ? 'H' : 'L';
  }).join('');

  return { code, skippedCount };
}

// ── 人格工具函数 ──────────────────────────────────────────────────

/**
 * 根据编码获取人格信息，找不到时返回「佛系食客」兜底
 */
export function getPersonality(code: EatiCode): EatiPersonality {
  return PERSONALITY_MAP.get(code) ?? PERSONALITY_MAP.get('LLLL')!;
}

/**
 * 解析4-bit编码为各维度值
 */
export function parseCode(code: EatiCode): { A: EatiBit; B: EatiBit; C: EatiBit; D: EatiBit } {
  return {
    A: (code[0] as EatiBit) ?? 'L',
    B: (code[1] as EatiBit) ?? 'L',
    C: (code[2] as EatiBit) ?? 'L',
    D: (code[3] as EatiBit) ?? 'L',
  };
}

// ── localStorage 键名 ─────────────────────────────────────────────

export const EATI_STORAGE_KEY = 'eati_result_v1';
export const EATI_QUIZ_VERSION = '2026-04-20';

export function saveEatiResult(result: EatiQuizResult): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EATI_STORAGE_KEY, JSON.stringify(result));
}

export function loadEatiResult(): EatiQuizResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(EATI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EatiQuizResult>;
    if (!parsed?.code || parsed.version !== EATI_QUIZ_VERSION) return null;
    return parsed as EatiQuizResult;
  } catch {
    return null;
  }
}

export function clearEatiResult(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(EATI_STORAGE_KEY);
}
