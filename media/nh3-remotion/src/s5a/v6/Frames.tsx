// S5-A 样张（第六版），依据 .trellis/tasks/11-22-new-index3-s5a-writing/style-v6.md。
// 亮场：纯白底、青色渐变大字、白色点阵卡、墨黑主墨。
// 暗场：近黑底一角渗进深青绿、纯白大字、深灰点阵卡、白色主墨。
// 两种场景的特征色都是青色：预测段、正在收细的笔锋段换成纯青色，青色段以圆头起笔盖在主墨的圆头上。
// 墨迹按软件 Draw3 的处理链路模拟（见 ../ink/draw3Ink.ts）。
// 点阵卡代表软件里的屏幕：有边界、不铺满画面，卡底挂软件真实主栏的原生导出图。
// 镜头不动，卡片自己倾斜；光标是 Inkeys 的“画笔（高亮）”光标，贴在卡面上随卡倾斜。

import type React from 'react'
import { AbsoluteFill, Img, staticFile } from 'remotion'
import { capsulePath, liveTipStart, modelStroke, sampleRaw, strokeAt, type InkPoint } from '../ink/draw3Ink'

const W = 2520
const H = 1080

type Scene = 'light' | 'dark'

// 场景令牌：每个场景只有底、主墨、特征色三样颜色。
const LOOK = {
  light: {
    ground: '#ffffff',
    card: '#ffffff',
    cardEdge: 'rgba(0, 0, 0, 0.07)',
    cardShadow: '0 40px 120px rgba(0, 0, 0, 0.10), 0 6px 18px rgba(0, 0, 0, 0.04)',
    dot: 'rgba(0, 0, 0, 0.18)',
    ink: '#15171a',
    accent: '#0a9c90',
    cursorFill: '#15171a',
  },
  dark: {
    ground: '#08090a',
    card: '#131517',
    cardEdge: 'rgba(255, 255, 255, 0.08)',
    cardShadow: '0 50px 140px rgba(0, 0, 0, 0.55)',
    dot: 'rgba(255, 255, 255, 0.18)',
    ink: '#f4f4f2',
    accent: '#58ffec',
    cursorFill: '#f4f4f2',
  },
} as const

// 网站的字体栈：西文 Segoe UI Variable Display，中文鸿蒙黑体，缺省回退微软雅黑。
const FONT = "'Segoe UI Variable Display', 'Segoe UI', 'HarmonyOS Sans SC', 'Microsoft YaHei UI', sans-serif"

// 亮场大字：网站品牌青从深到浅的横向渐变。
const LIGHT_TYPE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(90deg, #006a63 0%, #0fa396 55%, #4cc6d6 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}
// 暗场大字：纯白，下缘略收一点灰，像被顶光照着；不向外发光。
const DARK_TYPE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #ffffff 58%, #cfdcda 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}

const Ground = ({ scene, children }: { readonly scene: Scene; readonly children: React.ReactNode }) => (
  <AbsoluteFill
    style={{
      overflow: 'hidden',
      background:
        scene === 'light'
          ? LOOK.light.ground
          : // 暗场：右下角渗进一大片深青绿，左上角一点点回应；大部分仍是黑。
            `radial-gradient(ellipse 62% 95% at 96% 100%, rgba(16, 72, 66, 0.92) 0%, rgba(14, 58, 54, 0.45) 42%, rgba(8, 9, 10, 0) 78%),
             radial-gradient(ellipse 40% 60% at 0% 0%, rgba(14, 46, 44, 0.45) 0%, rgba(8, 9, 10, 0) 70%),
             ${LOOK.dark.ground}`,
    }}
  >
    {children}
  </AbsoluteFill>
)

// ---------- 大字 ----------

const Type = ({ scene, lines, size, left, top, align = 'left' }: { readonly scene: Scene; readonly lines: readonly string[]; readonly size: number; readonly left: number; readonly top: number; readonly align?: 'left' | 'center' }) => (
  <div style={{ position: 'absolute', left, top, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.08, letterSpacing: '0.02em', textAlign: align, whiteSpace: 'nowrap' }}>
    {lines.map((line) => (
      <div key={line} style={{ ...(scene === 'light' ? LIGHT_TYPE : DARK_TYPE), paddingBottom: size * 0.04 }}>
        {line}
      </div>
    ))}
  </div>
)

// ---------- 点阵卡 ----------

type CardProps = {
  readonly scene: Scene
  /** 卡片中心在画面上的位置，以及卡片尺寸。 */
  readonly cx: number
  readonly cy: number
  readonly w: number
  readonly h: number
  /** 卡片自身的 3D 摆法（镜头不动）。 */
  readonly tilt?: string
  readonly radius?: number
  /** 点阵间距与点半径；放大看细节时一起放大。 */
  readonly gap: number
  readonly dotR: number
  /** 主栏宽度（不含导出图四周的留白）；不给就不挂主栏。 */
  readonly bar?: number
  readonly id: string
  readonly children?: React.ReactNode
}

const Card = ({ scene, cx, cy, w, h, tilt = 'none', radius = 44, gap, dotR, bar, id, children }: CardProps) => {
  const look = LOOK[scene]
  // 主栏导出图 2431×361，主体占 2310×240，四周 60 像素留白里是投影。
  const barImage = bar ? (bar * 2431) / 2310 : 0
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        transform: tilt === 'none' ? undefined : `perspective(3000px) ${tilt}`,
        transformOrigin: '50% 50%',
        borderRadius: radius,
        background: look.card,
        boxShadow: `${look.cardShadow}, inset 0 0 0 1.5px ${look.cardEdge}${scene === 'dark' ? ', inset 0 1.5px 0 rgba(255,255,255,0.06)' : ''}`,
        overflow: 'hidden',
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={`${id}-dots`} width={gap} height={gap} patternUnits="userSpaceOnUse" x={(w / 2) % gap} y={(h / 2) % gap}>
            <circle cx={gap / 2} cy={gap / 2} r={dotR} fill={look.dot} />
          </pattern>
        </defs>
        <rect width={w} height={h} fill={`url(#${id}-dots)`} />
        {children}
      </svg>
      {bar ? <Img src={staticFile(`toolbar/${scene}/soft.png`)} style={{ position: 'absolute', width: barImage, left: (w - barImage) / 2, bottom: h * 0.02 }} /> : null}
    </div>
  )
}

// ---------- 光标：Inkeys 的“画笔（高亮）”，左上尖端是落笔点 ----------

const PEN = [
  [0, 0],
  [1 / 3, 1 / 12],
  [1, 0.75],
  [0.75, 1],
  [1 / 12, 1 / 3],
] as const

/** 五边形：尖端保持尖，其余四个角做内切圆角（24 DIP 的图标取 3 DIP）。 */
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

/** 高亮样式：外圈黑边、内圈白边、中间填画笔颜色（半透明）。放在卡片的 <svg> 里。 */
const Cursor = ({ scene, at, size }: { readonly scene: Scene; readonly at: { readonly x: number; readonly y: number }; readonly size: number }) => {
  const { x, y } = at
  const d = penPath(size)
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={d} fill="none" stroke="#000" strokeWidth={size / 6} strokeLinejoin="round" />
      <path d={d} fill="#fff" stroke="#fff" strokeWidth={size / 10} strokeLinejoin="round" />
      <path d={d} fill={LOOK[scene].cursorFill} fillOpacity={0.5} />
    </g>
  )
}

// ======================================================================
// 1 · 暗场开幕字：三个词依次弹出后并排停住（此帧为并排停住的一拍）
// ======================================================================

export const V6Title = () => (
  <Ground scene="dark">
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 96 }}>
      {['C++', 'Direct3D', 'HLSL'].map((t) => (
        <span key={t} style={{ ...DARK_TYPE, fontFamily: FONT, fontWeight: 700, fontSize: 210, letterSpacing: '-0.01em', lineHeight: 1.1, paddingBottom: 8 }}>
          {t}
        </span>
      ))}
    </div>
  </Ground>
)

// ---------- 墨迹 ----------

/** 一段墨：点用屏幕逻辑像素，scale/offset 把它放到卡面上。 */
type Placement = { readonly s: number; readonly ox: number; readonly oy: number }
const place = (p: Placement, at: { x: number; y: number }) => ({ x: p.ox + at.x * p.s, y: p.oy + at.y * p.s })

const Ink = ({ points, color, at }: { readonly points: readonly InkPoint[]; readonly color: string; readonly at: Placement }) =>
  points.length === 0 ? null : (
    <g transform={`translate(${at.ox} ${at.oy}) scale(${at.s})`}>
      <path d={capsulePath(points)} fill={color} />
    </g>
  )

/**
 * 同一笔两种颜色：主墨画到 from 为止（带圆头），特征色从 from 开始画到末端，
 * 以自己的圆头起笔、盖在主墨的圆头上，分界因此是一段顺着笔迹的圆弧，而不是硬切。
 */
const TwoTone = ({ points, from, a, b, at }: { readonly points: readonly InkPoint[]; readonly from: number; readonly a: string; readonly b: string; readonly at: Placement }) => (
  <>
    <Ink points={points.slice(0, from + 1)} color={a} at={at} />
    <Ink points={points.slice(from)} color={b} at={at} />
  </>
)

/**
 * 在同一处快速连画几圈：每圈略微错开（圈心缓慢漂移并带一点绕动），半径也有起伏，像手画的。
 * 角速度在起笔 0.25 秒内加速到位，起笔因此较粗。
 */
const circling = (cx: number, cy: number, radius: number, turnsPerSecond: number) => (t: number) => {
  const ramp = 0.25
  // 角度 = 角速度的积分；加速段用 smoothstep 的积分，避免角速度突变。
  const u = Math.min(t, ramp) / ramp
  const accel = ramp * (u * u * u - 0.5 * u * u * u * u)
  const angle = 2 * Math.PI * turnsPerSecond * (t < ramp ? accel : ramp * 0.5 + (t - ramp))
  const r = radius * (1 + 0.035 * Math.sin(angle * 0.43 + 0.6))
  const ox = cx + 60 * t + 16 * Math.cos(2 * Math.PI * 0.7 * t)
  const oy = cy - 14 * t + 12 * Math.sin(2 * Math.PI * 0.7 * t)
  const a = 0.9 * Math.PI - angle // 逆时针，从左下起笔
  return [ox + r * Math.cos(a), oy + 0.9 * r * Math.sin(a)] as const
}

// 第二幕共用的这一笔：快速连画几圈（约每秒 2.4 圈，约 3800 逻辑像素每秒）。
const LOOPS = modelStroke(sampleRaw(circling(920, 540, 300, 2.3), 1.9), 14)
const LOOPS_NOW = 1.42

// ======================================================================
// 2 · 亮场功能开场（超低延迟）：卡片倾斜，卡上正在快速画圈，光标与墨尖重合
// ======================================================================

export const V6Opener = () => {
  const at: Placement = { s: 0.78, ox: 0, oy: 0 }
  const { points } = strokeAt(LOOPS, LOOPS_NOW)
  return (
    <Ground scene="light">
      <Card scene="light" id="open" cx={880} cy={548} w={1500} h={940} tilt="rotateY(16deg) rotateX(7deg) rotateZ(-1.5deg)" gap={30} dotR={1.6} bar={720}>
        <Ink points={points} color={LOOK.light.ink} at={at} />
        <Cursor scene="light" at={place(at, points[points.length - 1])} size={34} />
      </Card>
      <Type scene="light" lines={['超低', '延迟']} size={200} left={1700} top={318} />
    </Ground>
  )
}

// ======================================================================
// 3 · 亮场特写（超低延迟）：卡片转正放大，几圈连笔圆滑，光标仍贴着墨尖
// ======================================================================

export const V6Latency = () => {
  const { points } = strokeAt(LOOPS, LOOPS_NOW)
  const center = { x: 920 + 60 * LOOPS_NOW, y: 540 - 14 * LOOPS_NOW }
  // 画圈的中心落在卡面上的 (760, 560)。
  const at: Placement = { s: 1.28, ox: 760 - center.x * 1.28, oy: 500 - center.y * 1.28 }
  return (
    <Ground scene="light">
      <Card scene="light" id="latency" cx={980 + 1700 / 2} cy={130 + 1150 / 2} w={1700} h={1150} radius={60} gap={52} dotR={2.6}>
        <Ink points={points} color={LOOK.light.ink} at={at} />
        <Cursor scene="light" at={place(at, points[points.length - 1])} size={60} />
      </Card>
      <Type scene="light" lines={['超低', '延迟']} size={200} left={430} top={318} />
    </Ground>
  )
}

// ======================================================================
// 4 · 亮场墨迹预测特写：再推近笔尖，光标前面那一段是青色
// ======================================================================

export const V6Predict = () => {
  const AHEAD = 0.025 // 软件约提前 1/60 秒；片子里夸大到看得清
  // 取第一圈还没和其他圈重叠的时刻，笔尖附近只有这一道墨。
  const { points, realEnd } = strokeAt(LOOPS, 0.45, AHEAD)
  // 光标是真实指针，本来就领先于平滑后的墨；预测段（青色）帮墨追上光标，
  // 并略微超出一点（约为预测段的最后两成），表示“帮着追上”，而不是跑到光标前面很远。
  const tip = points[realEnd + Math.round(0.8 * (points.length - 1 - realEnd))]
  const boundary = points[realEnd]
  // 分界落在卡面上的 (880, 430)：右边留出一大段主墨，左边是青色段和光标。
  const s = 2.6
  const at: Placement = { s, ox: 880 - boundary.x * s, oy: 430 - boundary.y * s }
  return (
    <Ground scene="light">
      <Card scene="light" id="predict" cx={980 + 1700 / 2} cy={130 + 1150 / 2} w={1700} h={1150} radius={60} gap={78} dotR={3.4}>
        <TwoTone points={points} from={realEnd} a={LOOK.light.ink} b={LOOK.light.accent} at={at} />
        <Cursor scene="light" at={place(at, tip)} size={96} />
      </Card>
      <Type scene="light" lines={['墨迹', '预测']} size={200} left={430} top={318} />
    </Ground>
  )
}

// ======================================================================
// 5 · 暗场实时笔锋：一笔又长又快的粗笔，起笔圆润、越写越细，最前端正在收细的那段是青色
// ======================================================================

type P2 = readonly [number, number]

/** 三次贝塞尔上按进度取点；进度 1.6u² − 0.6u³：起笔慢（所以粗），收笔仍在加速（笔锋留得住）。 */
const sweep = (p0: P2, p1: P2, p2: P2, p3: P2, duration: number) => (t: number) => {
  const u = Math.min(1, t / duration)
  const k = 1.6 * u * u - 0.6 * u * u * u
  const m = 1 - k
  return [
    m * m * m * p0[0] + 3 * m * m * k * p1[0] + 3 * m * k * k * p2[0] + k * k * k * p3[0],
    m * m * m * p0[1] + 3 * m * m * k * p1[1] + 3 * m * k * k * p2[1] + k * k * k * p3[1],
  ] as const
}

const BRUSH = modelStroke(sampleRaw(sweep([110, 200], [520, 260], [820, 470], [1420, 560], 0.6), 0.6), 54)

export const V6Taper = () => {
  const { points } = strokeAt(BRUSH, 0.5)
  const from = liveTipStart(points)
  const at: Placement = { s: 1.3, ox: -40, oy: 30 }
  return (
    <Ground scene="dark">
      <Card scene="dark" id="taper" cx={-60 + 1700 / 2} cy={540} w={1700} h={1000} radius={56} gap={44} dotR={2.1} tilt="rotateY(-12deg) rotateX(5deg) rotateZ(1deg)">
        <TwoTone points={points} from={from} a={LOOK.dark.ink} b={LOOK.dark.accent} at={at} />
        <Cursor scene="dark" at={place(at, points[points.length - 1])} size={54} />
      </Card>
      <Type scene="dark" lines={['实时', '笔锋']} size={200} left={1720} top={318} />
    </Ground>
  )
}
