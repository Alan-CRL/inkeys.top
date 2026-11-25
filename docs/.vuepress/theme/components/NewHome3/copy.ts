import { computed } from 'vue'
import type { Locale } from '../../../i18n/locales'
import { useLocale } from '../../../i18n/useLocale'

export type { Locale }

// S2 三张场景卡片的锚点，顺序与 s1.cards、s2.scenes 一致。
export const SCENE_IDS = ['nh3-scene-screen', 'nh3-scene-slides', 'nh3-scene-board'] as const

const zhCN = {
  nav: {
    download: '立即下载',
    theme: '切换深浅色',
    more: '更多链接',
    language: '切换语言',
    links: { github: 'GitHub', gitcode: 'GitCode', forum: '智教联盟论坛', bilibili: '哔哩哔哩', qq: 'QQ 群' },
  },
  hero: {
    // 每个分句单独成段，换行只发生在分句之间。
    tagline: ['让屏幕上的书写行云流水，', '让每一次操作都赏心悦目。'],
    download: '立即下载',
    star: '为 GitHub 点亮 Star',
    stylePanel: '书写样式',
    openStylePanel: '调整书写样式',
    penGroup: '笔类型',
    colorGroup: '颜色',
    sizeGroup: '粗细',
    pause: '暂停动画',
    resume: '继续动画',
    pens: { eraser: '橡皮', hard: '硬笔', soft: '软笔', highlighter: '荧光笔', laser: '激光笔', brush: '刷子' },
    colors: { rainbow: '彩虹色', neutral: '中性色', red: '红色', amber: '琥珀色', green: '绿色', cyan: '青色', blue: '蓝色', purple: '紫色' },
    sizes: { thin: '细', medium: '中', thick: '粗' },
  },
  s1: {
    // 居中排版的标题和导语不带句末句号。
    title: '在屏幕上随时书写、标注与讲解',
    lead: '桌面批注、自由白板、PPT 演示，一个软件就够了',
    cards: [
      { name: '屏幕批注', text: '在任何画面上直接书写。', media: '屏幕批注的小尺寸轮播' },
      { name: 'PPT 演示', text: '放映时自动跟上，边讲边写。', media: 'PPT 演示的小尺寸轮播' },
      { name: '自由白板', text: '推导与板书，空间足够。', media: '自由白板的小尺寸轮播' },
    ],
  },
  s2: {
    title: '从屏幕到讲台，处处都能写。',
    lead: '电脑前讲解、会议室演示、教室里板书，智绘教Inkeys 都能从容应对。',
    scenes: [
      {
        name: '屏幕演示',
        media: '屏幕演示的轮播画面',
        tagline: ['抓住每一个想法，', '在任何画面上写下来。'],
        text: '从 PDF、Word 文档到网页，随手圈画标注，笔锋自然流畅。画面在动？按下定格，背景立刻停住，用荧光笔、激光笔从容讲解；取消定格后切回选择，墨迹原地不动，背景照常操作。',
        note: '',
      },
      {
        name: '会议与演讲',
        media: '会议与演讲的轮播画面',
        tagline: ['批注配合演讲，', '让表达更清晰。'],
        text: '放映时直接在幻灯片上书写。翻到下一页，墨迹自动切换；翻回来，上一页的批注还在。底栏和屏幕两侧都有翻页按钮，书写时也能随手翻页，闲置时自动淡化，不挡住内容。',
        note: '',
      },
      {
        name: '教室与白板',
        media: '教室与白板的轮播画面',
        tagline: ['板书、推导、讲题，', '一块白板就够了。'],
        text: '大尺寸底栏配上文字，操作更加便捷。丰富的几何形状，正方形、三角形和棱锥轻松绘制，配上辅助线讲解立体几何题。双人模式下，一人用手掌擦除，另一人照样书写。开启教学安全模式，即使软件出现意外，也会自动重新回来。*',
        note: '* 自动恢复笔记将在后续版本中支持。',
      },
    ],
  },
  // 居中排版，标题和导语不带句末句号；导语的两句各占一行。
  s5a: {
    title: '每一笔，都跟得上思路',
    lead: ['全新绘图引擎，由 C++ 与 Direct3D 强劲驱动', '快速勾画不断线，细致书写有笔锋'],
    media: '书写演示',
    play: '播放',
    pause: '暂停',
  },
  s5b: {
    title: ['精心打磨的界面，', '在任何设备上都顺手。'],
    text: '主栏轻巧灵动，按下有回弹，光影随指针流动；设置界面通透简洁，20 种语言随时切换。鼠标、触摸、屏幕笔、数位板，从笔记本到教室大屏，新老 Windows 都能流畅使用。',
    window: '设置界面',
    bar: '主栏',
  },
  s6: {
    title: '现在，就在你的屏幕上写下第一笔',
    lead: '免费、开源，下载即可开始',
    download: '立即下载',
    requirement: '支持 Windows 7 SP1 及以上',
  },
  // 媒体制作完成前显示在占位区域里的说明。
  placeholder: {
    carousel: '轮播占位，素材按 4:5 制作',
    ink: '书写演示占位，21:9，底色与板面一致',
    window: '设置界面截图占位（带背景模糊，深浅色各一张）',
    bar: '主栏占位',
    backdrop: '背景图占位：深浅色各一张，左侧画面平缓',
  },
}

export type Copy = typeof zhCN

// 繁中、英文译文的术语以软件语言包（Inkeys/src/i18n）为准；品牌名均写作 Inkeys。
const zhTW: Copy = {
  nav: {
    download: '立即下載',
    theme: '切換深淺色',
    more: '更多連結',
    language: '切換語言',
    links: { github: 'GitHub', gitcode: 'GitCode', forum: '智教聯盟論壇', bilibili: '嗶哩嗶哩', qq: 'QQ 群' },
  },
  hero: {
    tagline: ['讓螢幕上的書寫行雲流水，', '讓每一次操作都賞心悅目。'],
    download: '立即下載',
    star: '為 GitHub 點亮 Star',
    stylePanel: '書寫樣式',
    openStylePanel: '調整書寫樣式',
    penGroup: '筆類型',
    colorGroup: '顏色',
    sizeGroup: '粗細',
    pause: '暫停動畫',
    resume: '繼續動畫',
    pens: { eraser: '橡皮擦', hard: '硬筆', soft: '軟筆', highlighter: '螢光筆', laser: '雷射筆', brush: '筆刷' },
    colors: { rainbow: '彩虹色', neutral: '中性色', red: '紅色', amber: '琥珀色', green: '綠色', cyan: '青色', blue: '藍色', purple: '紫色' },
    sizes: { thin: '細', medium: '中', thick: '粗' },
  },
  s1: {
    title: '在螢幕上隨時書寫、標註與講解',
    lead: '桌面批註、自由白板、PPT 簡報，一個軟體就夠了',
    cards: [
      { name: '螢幕批註', text: '在任何畫面上直接書寫。', media: '螢幕批註的小尺寸輪播' },
      { name: 'PPT 簡報', text: '放映時自動跟上，邊講邊寫。', media: 'PPT 簡報的小尺寸輪播' },
      { name: '自由白板', text: '推導與板書，空間足夠。', media: '自由白板的小尺寸輪播' },
    ],
  },
  s2: {
    title: '從螢幕到講台，處處都能寫。',
    lead: '電腦前講解、會議室簡報、教室裡板書，Inkeys 都能從容應對。',
    scenes: [
      {
        name: '螢幕示範',
        media: '螢幕示範的輪播畫面',
        tagline: ['抓住每一個想法，', '在任何畫面上寫下來。'],
        text: '從 PDF、Word 文件到網頁，隨手圈畫標註，筆鋒自然流暢。畫面在動？按下定格，背景立刻停住，用螢光筆、雷射筆從容講解；解除定格並切回「選擇」後，就能照常操作背景，墨跡仍留在原位。',
        note: '',
      },
      {
        name: '會議與演講',
        media: '會議與演講的輪播畫面',
        tagline: ['批註配合演講，', '讓表達更清晰。'],
        text: '放映時直接在投影片上書寫。翻到下一頁，墨跡自動切換；翻回來，上一頁的批註還在。底欄和螢幕兩側都有翻頁按鈕，書寫時也能隨手翻頁，閒置時自動淡化，不擋住內容。',
        note: '',
      },
      {
        name: '教室與白板',
        media: '教室與白板的輪播畫面',
        tagline: ['板書、推導、講題，', '一塊白板就夠了。'],
        text: '大尺寸底欄配上文字，操作更加便捷。豐富的幾何形狀，正方形、三角形和稜錐輕鬆繪製，配上輔助線講解立體幾何題。雙人模式下，一人用手掌擦除，另一人照樣書寫。開啟教學安全模式，即使軟體出現意外，也會自動重新回來。*',
        note: '* 自動恢復筆記將在後續版本中支援。',
      },
    ],
  },
  s5a: {
    title: '每一筆，都跟得上思路',
    lead: ['全新繪圖引擎，由 C++ 與 Direct3D 強勁驅動', '快速勾畫不斷線，細緻書寫有筆鋒'],
    media: '書寫示範',
    play: '播放',
    pause: '暫停',
  },
  s5b: {
    title: ['精心打磨的介面，', '在任何裝置上都順手。'],
    text: '主欄輕巧靈動，按下有回彈，光影隨游標流動；設定介面通透簡潔，20 種語言隨時切換。滑鼠、觸控、螢幕筆、數位板，從筆電到教室大螢幕，新舊 Windows 都能流暢使用。',
    window: '設定介面',
    bar: '主欄',
  },
  s6: {
    title: '現在，就在你的螢幕上寫下第一筆',
    lead: '免費、開源，下載即可開始',
    download: '立即下載',
    requirement: '支援 Windows 7 SP1 及以上',
  },
  placeholder: zhCN.placeholder,
}

const enUS: Copy = {
  nav: {
    download: 'Download',
    theme: 'Switch between light and dark',
    more: 'More links',
    language: 'Change language',
    links: { github: 'GitHub', gitcode: 'GitCode', forum: 'Community forum', bilibili: 'Bilibili', qq: 'QQ group' },
  },
  hero: {
    tagline: ['Fluid ink. Beautiful motion.', 'Screen annotation that feels as good as it looks.'],
    download: 'Download',
    star: 'Star on GitHub',
    stylePanel: 'Writing style',
    openStylePanel: 'Change writing style',
    penGroup: 'Pen type',
    colorGroup: 'Color',
    sizeGroup: 'Thickness',
    pause: 'Pause animation',
    resume: 'Resume animation',
    pens: { eraser: 'Eraser', hard: 'Hard Pen', soft: 'Soft Pen', highlighter: 'Highlighter', laser: 'Laser pointer', brush: 'Brush' },
    colors: { rainbow: 'Rainbow', neutral: 'Neutral', red: 'Red', amber: 'Amber', green: 'Green', cyan: 'Cyan', blue: 'Blue', purple: 'Purple' },
    sizes: { thin: 'Thin', medium: 'Medium', thick: 'Thick' },
  },
  s1: {
    title: 'Write, mark up and explain, right on your screen',
    lead: 'Screen annotation, a whiteboard and PPT slideshows, all in one app',
    cards: [
      { name: 'Screen annotation', text: 'Write directly over anything on your screen.', media: 'Short loop showing screen annotation' },
      { name: 'PPT slideshows', text: 'Follows your slides, so you can write as you present.', media: 'Short loop showing slideshow annotation' },
      { name: 'Whiteboard', text: 'Plenty of room to work things out.', media: 'Short loop showing the whiteboard' },
    ],
  },
  s2: {
    title: 'From your screen to the classroom, write anywhere.',
    lead: 'At your desk, in a meeting room or in front of a class, Inkeys keeps up.',
    scenes: [
      {
        name: 'Screen demos',
        media: 'Looping demo of annotating the screen',
        tagline: ['Capture every idea,', 'right on your screen.'],
        text: 'From PDFs and Word documents to web pages, circle and mark up as you go, with strokes that taper naturally. Need to pause what’s on screen? Press Freeze and the background stops at once, so you can explain with the highlighter and the laser pointer. Turn off Freeze and switch back to Select: your ink stays in place while you use the app underneath.',
        note: '',
      },
      {
        name: 'Meetings and talks',
        media: 'Looping demo of annotating a slideshow',
        tagline: ['Annotate as you present,', 'and make your point clearer.'],
        text: 'Write straight on your slides during a slideshow. Move to the next slide and the ink switches with it; go back and your earlier notes are still there. Use the page buttons on the bottom bar or on either side of the screen to turn pages while writing. They fade when idle to stay out of the way.',
        note: '',
      },
      {
        name: 'Classroom and whiteboard',
        media: 'Looping demo of teaching on the whiteboard',
        tagline: ['Notes, step-by-step working and examples,', 'all on one whiteboard.'],
        text: 'A large bottom bar with text labels makes every action easier. Draw squares, triangles and pyramids with ease, then add guide lines to explain 3D geometry. When two people write together, one can erase with a palm while the other keeps writing. Turn on Safe Teaching mode and the app comes back by itself even if something goes wrong.*',
        note: '* Automatic note recovery will arrive in a later version.',
      },
    ],
  },
  s5a: {
    title: 'Ink that keeps up with you',
    lead: ['A new drawing engine, powered by C++ and Direct3D', 'Smooth lines for quick sketches, tapered strokes for careful writing'],
    media: 'Handwriting demo',
    play: 'Play',
    pause: 'Pause',
  },
  s5b: {
    title: ['A carefully crafted interface,', 'at home on any device.'],
    text: 'The main toolbar is light and lively: it springs back when pressed, and its lighting follows your pointer. Settings are clear and uncluttered, with 20 languages to switch between at any time. Use a mouse, touch, a screen pen or a pen tablet, on anything from a laptop to a classroom display. Inkeys runs smoothly on Windows old and new.',
    window: 'Settings window',
    bar: 'Main toolbar',
  },
  s6: {
    title: 'Make your first stroke right on your screen',
    lead: 'Free and open source. Download to get started',
    download: 'Download',
    requirement: 'Requires Windows 7 SP1 or later',
  },
  placeholder: zhCN.placeholder,
}

const dictionaries: Record<Locale, Copy> = { 'zh-CN': zhCN, 'zh-TW': zhTW, 'en-US': enUS }

/** 语言由当前路由所在的 locale 决定（/、/zh-tw/、/en-us/），服务端渲染直接输出对应语言。须在 setup 中调用。 */
export function useCopy() {
  const locale = useLocale()
  const copy = computed(() => dictionaries[locale.value])
  return { locale, copy }
}
