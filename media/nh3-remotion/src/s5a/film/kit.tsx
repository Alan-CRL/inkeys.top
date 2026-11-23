// S5-A 成片的共用件：场景底、大字、点阵卡（白板视口）、墨迹、光标。
// 画风依据 .trellis/tasks/11-22-new-index3-s5a-writing/style-v6.md，与 ../v6/Frames.tsx 的样张一致。
//
// 点阵卡 = 软件白板的一个视口：
// - 卡框（位置、尺寸、倾斜）与卡内视图（白板的缩放 zoom 和平移 pan）分开：特写是白板在卡里放大，
//   卡片本身不铺满画面，大字留在卡外的底色上；
// - 卡上的内容用“屏幕逻辑像素”表示，墨迹模型也在这个坐标里算，速度阈值与软件一致；
// - 放大通过 SVG viewBox 实现，按卡片的布局尺寸栅格化，不会发虚；主栏属于卡框，不随白板缩放。

import type React from 'react'
import { AbsoluteFill, Img, staticFile } from 'remotion'
import { capsulePath, type InkPoint } from '../ink/draw3Ink'

export const W = 2520
export const H = 1080
export const SCREEN = { w: 1920, h: 1200 }

export type Scene = 'light' | 'dark'

// 场景令牌：每个场景只有底、主墨、特征色三样颜色。
export const LOOK = {
  light: {
    ground: '#ffffff',
    card: '#ffffff',
    cardEdge: 'rgba(0, 0, 0, 0.07)',
    cardShadow: '0 40px 120px rgba(0, 0, 0, 0.10), 0 6px 18px rgba(0, 0, 0, 0.04)',
    dot: 'rgba(0, 0, 0, 0.18)',
    ink: '#15171a',
    accent: '#0a9c90',
    faint: 'rgba(21, 23, 26, 0.28)',
  },
  dark: {
    ground: '#08090a',
    card: '#131517',
    cardEdge: 'rgba(255, 255, 255, 0.08)',
    cardShadow: '0 50px 140px rgba(0, 0, 0, 0.55)',
    dot: 'rgba(255, 255, 255, 0.18)',
    ink: '#f4f4f2',
    accent: '#58ffec',
    faint: 'rgba(244, 244, 242, 0.42)',
  },
} as const

// 暗场底：右下角渗进一大片深青绿，左上角一点点回应；大部分仍是黑。
export const DARK_GROUND = `radial-gradient(ellipse 62% 95% at 96% 100%, rgba(16, 72, 66, 0.92) 0%, rgba(14, 58, 54, 0.45) 42%, rgba(8, 9, 10, 0) 78%),
  radial-gradient(ellipse 40% 60% at 0% 0%, rgba(14, 46, 44, 0.45) 0%, rgba(8, 9, 10, 0) 70%),
  ${LOOK.dark.ground}`

export const groundOf = (scene: Scene) => (scene === 'light' ? LOOK.light.ground : DARK_GROUND)

// 网站的字体栈：西文 Segoe UI Variable Display，中文鸿蒙黑体，缺省回退微软雅黑。
export const FONT = "'Segoe UI Variable Display', 'Segoe UI', 'HarmonyOS Sans SC', 'Microsoft JhengHei UI', 'Microsoft YaHei UI', sans-serif"

// 亮场大字：网站品牌青从深到浅的横向渐变。暗场大字：纯白，下缘略收一点灰，像被顶光照着；不向外发光。
export const typeFill = (scene: Scene): React.CSSProperties => ({
  backgroundImage: scene === 'light' ? 'linear-gradient(90deg, #006a63 0%, #0fa396 55%, #4cc6d6 100%)' : 'linear-gradient(180deg, #ffffff 0%, #ffffff 58%, #cfdcda 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
})

// ---------- 缓动与插值 ----------

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** 三次贝塞尔缓动（与 video-shotcraft 的 _fixtures/Polish 同实现思路）。 */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t
  const sy = (t: number) => ((ay * t + by) * t + cy) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number) => {
    const u = clamp01(x)
    let t = u
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - u
      const d = dx(t)
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break
      t -= e / d
    }
    return sy(clamp01(t))
  }
}

export const EASE = {
  snappy: bezier(0.16, 1, 0.3, 1),
  out: bezier(0.22, 1, 0.36, 1),
  smooth: bezier(0.65, 0, 0.35, 1),
  swift: bezier(0.4, 0, 0.2, 1),
  exit: bezier(0.7, 0, 0.84, 0),
  overshoot: bezier(0.34, 1.45, 0.64, 1),
  demote: bezier(0.6, 0, 0.18, 1), // title-demote-to-label：起步果断、落点很软
  portal: bezier(0.7, 0, 0.3, 1), // shot-transitions · mask-wipe：先慢后快
}

export const ramp = (frame: number, start: number, dur: number, ease: (t: number) => number = EASE.snappy) => ease(clamp01((frame - start) / dur))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** 欠阻尼弹簧的解析解（从 0 走到 1），用于错峰弹出。 */
export const springAt = (frame: number, start: number, { damping = 15, stiffness = 150, mass = 1 } = {}, fps = 60) => {
  const t = (frame - start) / fps
  if (t <= 0) return 0
  const w0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  if (zeta >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const wd = w0 * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
}

// ---------- 场景底 ----------

export const Ground = ({ scene, children }: { readonly scene: Scene; readonly children?: React.ReactNode }) => (
  <AbsoluteFill style={{ overflow: 'hidden', background: groundOf(scene) }}>{children}</AbsoluteFill>
)

// ---------- 点阵卡 ----------

export type BoardState = {
  /** 卡框：中心在画面上的位置与尺寸（画面像素），以及卡片自身的 3D 倾斜（绕卡片中心）。 */
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly rx: number
  readonly ry: number
  readonly rz: number
  /** 卡内视图：每个屏幕逻辑像素对应多少画面像素（白板缩放），以及卡片中心看到的内容点（白板平移）。 */
  readonly zoom: number
  readonly pan: { readonly x: number; readonly y: number }
  readonly opacity?: number
}

export const mixBoard = (a: BoardState, b: BoardState, t: number): BoardState => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  w: mix(a.w, b.w, t),
  h: mix(a.h, b.h, t),
  rx: mix(a.rx, b.rx, t),
  ry: mix(a.ry, b.ry, t),
  rz: mix(a.rz, b.rz, t),
  // 缩放按对数插值，推近时速度感均匀。
  zoom: Math.exp(mix(Math.log(a.zoom), Math.log(b.zoom), t)),
  pan: { x: mix(a.pan.x, b.pan.x, t), y: mix(a.pan.y, b.pan.y, t) },
  opacity: mix(a.opacity ?? 1, b.opacity ?? 1, t),
})

/** 让内容点 c 落在卡片局部坐标 (lx, ly)（画面像素，卡片左上为原点）所需的 pan。 */
export const panFor = (c: { x: number; y: number }, lx: number, ly: number, w: number, h: number, zoom: number) => ({ x: c.x + (w / 2 - lx) / zoom, y: c.y + (h / 2 - ly) / zoom })

type BoardProps = {
  readonly scene: Scene
  readonly state: BoardState
  readonly id: string
  /** 第 0 层画在卡面上；第 1、2 层是独立的透明层，split 不为 0 时沿纵深错开（多层画布）。内容用白板坐标。 */
  readonly layers: readonly React.ReactNode[]
  readonly split?: readonly number[]
  /** 分层时每一层的错开量（画面像素，乘以层号与 split 值）：纵深 z、右移 dx、上移 dy。 */
  readonly spread?: { readonly z: number; readonly dx: number; readonly dy: number }
  /** 卡面上的一团柔光（局部刷新），白板坐标与强度。 */
  readonly glow?: { readonly x: number; readonly y: number; readonly r: number; readonly k: number }
  readonly bar?: boolean
  /** 主栏的透明度（换镜头时淡入用）。 */
  readonly barOpacity?: number
  /**
   * 给出时主栏改为“钉在白板上”：按它在 barRef 这个视图里的样子换算到白板坐标，
   * 之后随白板缩放、平移，推近时会放大并移出卡片（被卡片裁掉）。不给时主栏属于卡框，位置固定。
   */
  readonly barRef?: BoardState
}

export const Board = ({ scene, state, id, layers, split = [], spread = { z: 190, dx: 46, dy: -26 }, glow, bar = true, barOpacity = 1, barRef }: BoardProps) => {
  const look = LOOK[scene]
  const { w, h, zoom } = state
  const anySplit = split.some((d) => d > 0.0005)
  const tilted = Math.abs(state.rx) + Math.abs(state.ry) + Math.abs(state.rz) > 0.01 || anySplit
  const radius = 34 + 0.016 * w
  // 卡内视图：viewBox 直接用白板坐标，SVG 按卡片的布局尺寸栅格化，放大时不发虚。
  const vw = w / zoom
  const vh = h / zoom
  const vx = state.pan.x - vw / 2
  const vy = state.pan.y - vh / 2
  const viewBox = `${vx} ${vy} ${vw} ${vh}`
  // 点阵：间距随白板缩放；点半径只按缩放的平方根变大，放大镜头里不至于变成大圆点。
  const gap = 32
  const dotR = (1.6 * Math.sqrt(zoom / 0.78)) / zoom
  const svg = (node: React.ReactNode, extra?: React.ReactNode) => (
    <svg width={w} height={h} viewBox={viewBox} style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: radius }}>
      {extra}
      {node}
    </svg>
  )
  // 主栏导出图 2431×361（3 倍图），主体 2310×240；主栏属于卡框（软件界面），不随白板缩放。
  const frameScale = w / SCREEN.w
  const barImg = 810 * frameScale * (2431 / 2310)
  const barBox = (() => {
    if (!barRef) return { left: (w - barImg) / 2, top: h - 22 * frameScale - (barImg * 361) / 2431, width: barImg }
    // 先求主栏在参照视图里的卡面位置，再换成白板坐标，最后按当前视图投回卡面。
    const rs = barRef.w / SCREEN.w
    const rw = 810 * rs * (2431 / 2310)
    const rl = (barRef.w - rw) / 2
    const rt = barRef.h - 22 * rs - (rw * 361) / 2431
    const cx = barRef.pan.x + (rl - barRef.w / 2) / barRef.zoom
    const cy = barRef.pan.y + (rt - barRef.h / 2) / barRef.zoom
    return { left: (cx - state.pan.x) * zoom + w / 2, top: (cy - state.pan.y) * zoom + h / 2, width: (rw / barRef.zoom) * zoom }
  })()
  return (
    <div
      style={{
        position: 'absolute',
        left: state.x - w / 2,
        top: state.y - h / 2,
        width: w,
        height: h,
        transform: tilted ? `perspective(3000px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) rotateZ(${state.rz}deg)` : undefined,
        transformStyle: anySplit ? 'preserve-3d' : undefined,
        opacity: state.opacity ?? 1,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, borderRadius: radius, background: look.card, overflow: 'hidden', boxShadow: `${look.cardShadow}, inset 0 0 0 1.5px ${look.cardEdge}${scene === 'dark' ? ', inset 0 1.5px 0 rgba(255,255,255,0.06)' : ''}` }}>
        {svg(
          layers[0],
          <>
            <defs>
              <pattern id={`${id}-dots`} width={gap} height={gap} patternUnits="userSpaceOnUse" x={-gap / 2} y={-gap / 2}>
                <circle cx={gap / 2} cy={gap / 2} r={dotR} fill={look.dot} />
              </pattern>
              {glow ? (
                <>
                  <radialGradient id={`${id}-glow`} gradientUnits="userSpaceOnUse" cx={glow.x} cy={glow.y} r={glow.r}>
                    <stop offset="0" stopColor={scene === 'dark' ? '#ffffff' : '#0a9c90'} stopOpacity={0.085 * glow.k} />
                    <stop offset="0.55" stopColor={scene === 'dark' ? '#ffffff' : '#0a9c90'} stopOpacity={0.035 * glow.k} />
                    <stop offset="1" stopColor={scene === 'dark' ? '#ffffff' : '#0a9c90'} stopOpacity={0} />
                  </radialGradient>
                  <radialGradient id={`${id}-glowfade`} gradientUnits="userSpaceOnUse" cx={glow.x} cy={glow.y} r={glow.r}>
                    <stop offset="0" stopColor="#fff" stopOpacity={glow.k} />
                    <stop offset="1" stopColor="#fff" stopOpacity={0} />
                  </radialGradient>
                  {/* 光团里的点阵更亮：局部刷新的那块区域被“照亮”了。 */}
                  <mask id={`${id}-glowmask`} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
                    <circle cx={glow.x} cy={glow.y} r={glow.r} fill={`url(#${id}-glowfade)`} />
                  </mask>
                </>
              ) : null}
            </defs>
            <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#${id}-dots)`} />
            {glow ? <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#${id}-glow)`} /> : null}
            {glow ? (
              <g mask={`url(#${id}-glowmask)`}>
                <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#${id}-dots)`} />
                <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#${id}-dots)`} />
              </g>
            ) : null}
          </>,
        )}
        {bar && barOpacity > 0.01 ? <Img src={staticFile(`toolbar/${scene}/soft.png`)} style={{ position: 'absolute', width: barBox.width, left: barBox.left, top: barBox.top, opacity: barOpacity }} /> : null}
      </div>
      {layers.slice(1).map((node, i) => {
        const k = i + 1
        const d = split[i] ?? 0
        // cloner-depth-echo 的排法改为三层：越往上的层越靠近观众，并向右上错开。
        // 分开时每层显出一圈青色细边和极淡的面，读得出是一张张独立的层。
        const z = spread.z * k * d
        const dx = spread.dx * k * d
        const dy = spread.dy * k * d
        const edge = Math.min(1, Math.max(0, d) * 1.5)
        return (
          <div key={k} style={{ position: 'absolute', inset: 0, transform: d > 0.0005 ? `translate3d(${dx}px, ${dy}px, ${z}px)` : undefined, borderRadius: radius, boxShadow: edge > 0.02 ? `inset 0 0 0 1.5px ${scene === 'dark' ? `rgba(88,255,236,${0.5 * edge})` : `rgba(10,156,144,${0.45 * edge})`}` : undefined, background: edge > 0.02 ? (scene === 'dark' ? `rgba(255,255,255,${0.03 * edge})` : `rgba(255,255,255,${0.35 * edge})`) : undefined }}>
            {svg(node)}
          </div>
        )
      })}
    </div>
  )
}

// ---------- 墨迹 ----------

export const Ink = ({ points, color, opacity = 1 }: { readonly points: readonly InkPoint[]; readonly color: string; readonly opacity?: number }) =>
  points.length === 0 ? null : <path d={capsulePath(points)} fill={color} opacity={opacity} />

/**
 * 同一笔两种颜色：主墨画到 from 为止（带圆头），特征色从 from 开始画到末端，
 * 以自己的圆头起笔、盖在主墨的圆头上，分界因此是一段顺着笔迹的圆弧，而不是硬切。
 */
export const TwoTone = ({ points, from, a, b, bOpacity = 1 }: { readonly points: readonly InkPoint[]; readonly from: number; readonly a: string; readonly b: string; readonly bOpacity?: number }) => (
  <>
    <Ink points={points} color={a} />
    {bOpacity > 0.001 ? <Ink points={points.slice(Math.max(0, from))} color={b} opacity={bOpacity} /> : null}
  </>
)

// ---------- 光标：Inkeys 的“画笔（高亮）”，左上尖端是落笔点 ----------

const PEN = [
  [0, 0],
  [1 / 3, 1 / 12],
  [1, 0.75],
  [0.75, 1],
  [1 / 12, 1 / 3],
] as const

/** 五边形：尖端保持尖，其余四个角做内切圆角（24 DIP 的图标取 3 DIP）。形状取自软件 inkPixelShader.hlsl。 */
const penPath = (size: number) => {
  const pts = PEN.map(([x, y]) => [x * size, y * size] as const)
  const radius = size / 8
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    const prev = pts[i - 1]
    const next = pts[(i + 1) % pts.length]
    const la = Math.hypot(prev[0] - p[0], prev[1] - p[1])
    const lb = Math.hypot(next[0] - p[0], next[1] - p[1])
    const ua = [(prev[0] - p[0]) / la, (prev[1] - p[1]) / la]
    const ub = [(next[0] - p[0]) / lb, (next[1] - p[1]) / lb]
    const half = Math.acos(ua[0] * ub[0] + ua[1] * ub[1]) / 2
    const cut = Math.min(radius / Math.tan(half), Math.min(la, lb) * 0.4)
    const r = cut * Math.tan(half)
    d += `L${p[0] + ua[0] * cut} ${p[1] + ua[1] * cut}A${r} ${r} 0 0 1 ${p[0] + ub[0] * cut} ${p[1] + ub[1] * cut}`
  }
  return `${d}Z`
}

/**
 * 高亮样式：外圈黑边、内圈白边、中间填画笔颜色（半透明）。放在卡片内容坐标里。
 * size 是画面像素；s 是卡片当前缩放，用来换回内容坐标。
 */
export const Cursor = ({ scene, at, size, s = 1, opacity = 1 }: { readonly scene: Scene; readonly at: { readonly x: number; readonly y: number }; readonly size: number; readonly s?: number; readonly opacity?: number }) => {
  const d = penPath(size / s)
  const u = size / s
  return (
    <g transform={`translate(${at.x} ${at.y})`} opacity={opacity}>
      <path d={d} fill="none" stroke="#000" strokeWidth={u / 6} strokeLinejoin="round" />
      <path d={d} fill="#fff" stroke="#fff" strokeWidth={u / 10} strokeLinejoin="round" />
      <path d={d} fill={LOOK[scene].ink} fillOpacity={0.5} />
    </g>
  )
}

/** 光标在画面上的尺寸：随白板缩放变大，但比内容放大得慢（软件里光标本身不随画布缩放）。 */
export const cursorSize = (zoom: number) => 34 * Math.pow(zoom / 0.78, 0.75)
