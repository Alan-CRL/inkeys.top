// 颜色、圆角等令牌，取自官网 docs/.vuepress/theme/components/NewHome3/home.css 的 --nh3-*。
// 视频背景等于卡片底色，这样视频看起来是页面的一部分。

export type ThemeName = 'light' | 'dark'

export type Theme = {
  surface: string
  text: string
  text2: string
  text3: string
  accent: string
  screen: string
  screenLine: string
  screenShadow: string
  block: string
  canvas: string
  paper: string
  video: string
}

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    surface: '#f5f5f5',
    text: '#121212',
    text2: '#5c5c5c',
    text3: '#757575',
    accent: '#006a63',
    screen: '#ffffff',
    screenLine: 'rgba(0, 0, 0, 0.06)',
    screenShadow: '0 10px 30px rgba(0, 0, 0, 0.07)',
    block: '#ececec',
    canvas: '#e9e9e9',
    paper: '#ffffff',
    video: '#141414',
  },
  dark: {
    surface: '#1b1b1b',
    text: '#f2f2f2',
    text2: '#a6a6a6',
    text3: '#8a8a8a',
    accent: '#58ffec',
    screen: '#262626',
    screenLine: 'rgba(255, 255, 255, 0.07)',
    screenShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
    block: '#303030',
    canvas: '#202020',
    paper: '#2c2c2c',
    video: '#0a0a0a',
  },
}

// 墨迹颜色都来自软件的默认调色板。
export const INK = {
  softPen: '#ff1000',
  highlighter: '#ffc510',
  highlighterOpacity: 0.35,
}

export const FONT = {
  sans: "'Segoe UI Variable Display', 'Segoe UI', 'Microsoft YaHei UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
}

// 卡片的 1 倍尺寸；成片按 2 倍渲染。
export const CARD = { width: 384, height: 576, scale: 2 }
