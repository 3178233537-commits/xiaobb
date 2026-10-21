/* ============================================================
 * 星选 Nova — 商品数据
 * 图片统一由文生图服务生成（懒加载），保证首屏性能
 * ============================================================ */
'use strict';

const IMG = (prompt, size = 'square') =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

const CATEGORIES = [
  { id: 'all',    label: '全部' },
  { id: 'phone',  label: '手机' },
  { id: 'laptop', label: '笔记本电脑' },
  { id: 'tablet', label: '平板' },
  { id: 'audio',  label: '耳机音频' },
  { id: 'watch',  label: '手表' },
  { id: 'acc',    label: '配件' },
];

const HERO_IMG = IMG(
  'wide premium tech hero banner, titanium smartphone and ultra thin silver laptop and smartwatch arranged elegantly on soft light gray gradient studio background, generous negative space, minimalist Apple style product photography, soft diffused lighting, photorealistic, no text, no watermark',
  'landscape_16_9'
);

const HOT_SEARCHES = ['Nova X Pro', '降噪耳机', '智能手表', '笔记本电脑', '平板', '充电器'];

const PRODUCTS = [
  {
    id: 'p1', name: 'Nova X Pro', category: 'phone',
    tagline: '钛金属机身，A18 级仿生芯片，全天候续航。',
    price: 7999, was: 8999, rating: 4.9, sales: 12846, badge: '新品',
    colors: ['曜石黑', '原色钛', '冰川蓝'],
    keywords: '5g 旗舰 拍照 游戏 钛金属',
    img: IMG('premium flagship smartphone product photography, black titanium smartphone standing upright at slight angle on clean light gray seamless studio background, soft diffused studio lighting, minimalist Apple style, photorealistic, ultra detailed, no text, no watermark'),
    specs: [
      ['芯片', 'A18 级仿生'],
      ['显示屏', '6.8 英寸超视网膜 XDR'],
      ['续航', '最长 29 小时视频播放'],
      ['摄像头', '4800 万像素三摄系统'],
      ['材质', '航天级钛金属边框'],
    ],
  },
  {
    id: 'p2', name: 'Nova X', category: 'phone',
    tagline: '双摄系统，灵动岛设计，出色性能。',
    price: 5999, was: 0, rating: 4.8, sales: 24530, badge: '',
    colors: ['午夜色', '星光色', '远峰蓝'],
    keywords: '5g 双摄 性能',
    img: IMG('modern deep blue glass smartphone lying flat at slight angle on clean light gray seamless studio background, soft studio lighting, minimalist Apple style commercial product photo, photorealistic, no text, no watermark'),
    specs: [
      ['芯片', 'A16 级仿生'],
      ['显示屏', '6.1 英寸超视网膜 XDR'],
      ['续航', '最长 20 小时视频播放'],
      ['摄像头', '4800 万像素双摄系统'],
      ['设计', '航空级铝金属边框'],
    ],
  },
  {
    id: 'p3', name: 'Nova Book Air 13', category: 'laptop',
    tagline: '轻盈登场，实力满格。',
    price: 8999, was: 9499, rating: 4.9, sales: 8211, badge: '',
    colors: ['星光色', '午夜色'],
    keywords: '轻薄 办公 学生 续航 m系列',
    img: IMG('ultra thin silver laptop slightly open floating on clean light gray seamless studio background, minimalist Apple style product photography, soft diffused lighting, photorealistic, ultra detailed, no text, no watermark'),
    specs: [
      ['芯片', 'Nova M3 芯片'],
      ['显示屏', '13.6 英寸 Liquid 视网膜屏'],
      ['续航', '最长 18 小时'],
      ['重量', '约 1.24 千克'],
      ['接口', '雷雳 4 × 2'],
    ],
  },
  {
    id: 'p4', name: 'Nova Book Pro 16', category: 'laptop',
    tagline: 'Pro 级性能，为专业而生。',
    price: 15999, was: 0, rating: 4.9, sales: 3982, badge: '性能怪兽',
    colors: ['深空黑', '银色'],
    keywords: '专业 剪辑 设计 高性能 工作站',
    img: IMG('space black professional laptop open with dark abstract gradient wallpaper on screen, on clean light gray seamless studio background, minimalist Apple style product photography, dramatic soft lighting, photorealistic, no text, no watermark'),
    specs: [
      ['芯片', 'Nova M3 Max 芯片'],
      ['显示屏', '16.2 英寸 XDR 迷你发光屏'],
      ['续航', '最长 22 小时'],
      ['内存', '最高 96GB 统一内存'],
      ['接口', '雷雳 4 × 3，HDMI，SD'],
    ],
  },
  {
    id: 'p5', name: 'Nova Pad Air', category: 'tablet',
    tagline: '轻若无物，强得离谱。',
    price: 4799, was: 0, rating: 4.8, sales: 9633, badge: '新品',
    colors: ['星光色', '天蓝色', '紫色'],
    keywords: '手写笔 网课 娱乐 轻薄',
    img: IMG('slim modern tablet standing with smart folio cover, colorful gradient wallpaper on screen, on clean light gray seamless studio background, minimalist Apple style product photography, soft lighting, photorealistic, no text, no watermark'),
    specs: [
      ['芯片', 'Nova M2 芯片'],
      ['显示屏', '11 英寸 Liquid 视网膜屏'],
      ['续航', '最长 10 小时'],
      ['重量', '约 462 克'],
      ['兼容', '支持 Nova Pencil Pro'],
    ],
  },
  {
    id: 'p6', name: 'Nova Pad Pro 11', category: 'tablet',
    tagline: '这块屏幕，重新定义平板。',
    price: 6999, was: 7499, rating: 4.9, sales: 12001, badge: '热卖',
    colors: ['深空黑', '银色'],
    keywords: '专业 绘图 剪辑oled',
    img: IMG('pro tablet with slim stylus pencil lying beside it, dark abstract wallpaper on screen, on clean light gray seamless studio background, minimalist Apple style product photography, photorealistic, no text, no watermark'),
    specs: [
      ['芯片', 'Nova M3 芯片'],
      ['显示屏', '11 英寸超视网膜 XDR'],
      ['刷新率', '自适应 120Hz ProMotion'],
      ['摄像头', '1200 万像素广角'],
      ['兼容', '支持 Nova Pencil Pro'],
    ],
  },
  {
    id: 'p7', name: 'Aurora Buds Pro', category: 'audio',
    tagline: '主动降噪，声声入耳。',
    price: 1899, was: 1999, rating: 4.8, sales: 31055, badge: '热卖',
    colors: ['白色', '星光色'],
    keywords: '降噪 通话 空间音频 无线',
    img: IMG('white wireless earbuds with charging case open on clean light gray seamless studio background, minimalist Apple style product photography, soft diffused lighting, photorealistic, ultra detailed, no text, no watermark'),
    specs: [
      ['降噪', '主动降噪，通透模式'],
      ['音频', '空间音频，自适应均衡'],
      ['续航', '最长 30 小时（含充电盒）'],
      ['防护', 'IPX4 抗汗抗水'],
      ['芯片', 'H2 级音频芯片'],
    ],
  },
  {
    id: 'p8', name: 'Aurora Buds', category: 'audio',
    tagline: '轻巧便携，悦耳登场。',
    price: 999, was: 0, rating: 4.7, sales: 42098, badge: '',
    colors: ['天蓝色', '粉红色'],
    keywords: '无线 蓝牙 入门 便携',
    img: IMG('pastel blue wireless earbuds with compact charging case on clean light gray seamless studio background, minimalist Apple style product photography, soft lighting, photorealistic, no text, no watermark'),
    specs: [
      ['音频', '自适应均衡'],
      ['续航', '最长 24 小时（含充电盒）'],
      ['连接', '蓝牙 5.3，一碰即连'],
      ['防护', 'IPX4 抗汗抗水'],
      ['重量', '单只约 4.3 克'],
    ],
  },
  {
    id: 'p9', name: 'Nova Watch S2', category: 'watch',
    tagline: '健康的守卫，运动的伙伴。',
    price: 2999, was: 0, rating: 4.9, sales: 6720, badge: '新品',
    colors: ['午夜色', '星光色', '银色'],
    keywords: '运动 健康 心率 防水',
    img: IMG('modern smartwatch with black milanese band, watch face showing minimal colorful activity rings, on clean light gray seamless studio background, minimalist Apple style product photography, photorealistic, ultra detailed, no text, no watermark'),
    specs: [
      ['显示屏', '全天候视网膜显示屏'],
      ['健康', '心率、血氧、睡眠监测'],
      ['防水', '50 米防水'],
      ['续航', '最长 18 小时'],
      ['表壳', '45 毫米铝金属'],
    ],
  },
  {
    id: 'p10', name: 'Nova Watch SE', category: 'watch',
    tagline: '亮点满满，轻装上阵。',
    price: 1999, was: 0, rating: 4.7, sales: 18776, badge: '',
    colors: ['午夜色', '银色'],
    keywords: '运动 健康 入门',
    img: IMG('aluminum smartwatch with bright blue sport band on clean light gray seamless studio background, minimalist Apple style product photography, soft lighting, photorealistic, no text, no watermark'),
    specs: [
      ['显示屏', '视网膜显示屏'],
      ['健康', '心率监测，睡眠追踪'],
      ['防水', '50 米防水'],
      ['续航', '最长 18 小时'],
      ['表壳', '40 / 44 毫米可选'],
    ],
  },
  {
    id: 'p11', name: 'Nova Pencil Pro', category: 'acc',
    tagline: '落笔如有神，压感随心变。',
    price: 999, was: 0, rating: 4.8, sales: 5344, badge: '',
    colors: ['深空黑', '白色'],
    keywords: '手写 绘画 触控笔',
    img: IMG('slim premium stylus pen product photography on clean light gray seamless studio background, minimalist Apple style, soft diffused lighting, photorealistic, ultra detailed, no text, no watermark'),
    specs: [
      ['压感', '旋转手势，压力感应'],
      ['触感', '触觉反馈引擎'],
      ['续航', '磁吸充电，全天续航'],
      ['兼容', 'Nova Pad 全系列'],
      ['重量', '约 20.5 克'],
    ],
  },
  {
    id: 'p12', name: 'Aurora 快充充电器 65W', category: 'acc',
    tagline: '小身材，大功率，一口充三机。',
    price: 399, was: 449, rating: 4.9, sales: 26300, badge: '',
    colors: ['白色'],
    keywords: '充电器 快充 gan 便携 出差',
    img: IMG('compact white gan fast charger cube product photography on clean light gray seamless studio background, minimalist Apple style, soft lighting, photorealistic, no text, no watermark'),
    specs: [
      ['功率', '65W GaN II'],
      ['接口', '2 × USB-C，1 × USB-A'],
      ['兼容', '手机、平板、笔记本'],
      ['体积', '比原装充电器小 40%'],
      ['安全', '多重温控保护'],
    ],
  },
];
