// S5-A 样张（第五版）：按文字描述做。
// 墨蓝底上一张很大的画布，书写时画布自己向后倾斜（镜头不动）；每幕以大字开场，
// 每个功能先出功能名、再出画面。不加框、不加圈、不出现实体的笔：
// 局部刷新 = 刚画出的那一段更亮、有湿墨的反光；预测和笔锋 = 那一段换一种颜色。
// 光标用 Inkeys 自己的“画笔（高亮）”光标，形状取自软件的 inkPixelShader.hlsl。

import type React from 'react'
import { AbsoluteFill } from 'remotion'
import { writePath } from '../../ink/path'
import { buildSoftStroke, dotsToPaths, softStrokeAt, type Dot, type SoftStroke } from '../../ink/softPen'
import { FONT } from '../../theme/tokens'

const W = 2520
const H = 1080
const GROUND = '#070c16'
const PLANE = '#13203a'
const PAPER = '#f3f1ea'
const INK_BLUE = '#0b1526'
const WHITE = '#f5f6f8'
const RED = '#ff1000'
const PREDICT = '#6fe3ff'
const TAPER = '#ffb21e'

const sans: React.CSSProperties = { fontFamily: FONT.sans, lineHeight: 1, whiteSpace: 'nowrap' }

// ---------- 画布：一张大平面，自己在 3D 里倾斜 ----------

const PW = 3800
const PH = 2400

/** 画布的摆法，以及画布上一点落在画面上的位置（光标是平贴屏幕的，要用它定位）。 */
const makePlane = (transform: string, cx = W / 2, cy = H / 2) => {
  const matrix = new DOMMatrix(transform)
  return {
    transform,
    cx,
    cy,
    project: (x: number, y: number): [number, number] => {
      const p = matrix.transformPoint(new DOMPoint(x, y, 0, 1))
      return [cx + p.x / p.w, cy + p.y / p.w]
    },
  }
}
type PlaneSpec = ReturnType<typeof makePlane>

const Plane = ({ plane, opacity = 1, children }: { readonly plane: PlaneSpec; readonly opacity?: number; readonly children?: React.ReactNode }) => (
  <div
    style={{
      position: 'absolute',
      left: plane.cx - PW / 2,
      top: plane.cy - PH / 2,
      width: PW,
      height: PH,
      transform: plane.transform,
      transformOrigin: '50% 50%',
      borderRadius: 90,
      background: `linear-gradient(180deg, #16243f 0%, ${PLANE} 50%, #1c3059 100%)`,
      boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.09), 0 80px 160px rgba(0,0,0,0.5)',
      opacity,
    }}
  >
    <svg viewBox={`${-PW / 2} ${-PH / 2} ${PW} ${PH}`} width={PW} height={PH} style={{ position: 'absolute', inset: 0 }}>
      {children}
    </svg>
  </div>
)

// ---------- 墨迹 ----------

const Ink = ({ dots, color = RED, opacity = 1 }: { readonly dots: readonly Dot[]; readonly color?: string; readonly opacity?: number }) => {
  if (dots.length === 0) return null
  const { circles, joints } = dotsToPaths(dots)
  return (
    <g opacity={opacity}>
      <path d={joints} fill={color} />
      <path d={circles} fill={color} />
    </g>
  )
}

/** 从 from 到末端，颜色沿笔迹方向由 a 平滑过渡到 b（ramp 是完成过渡所占的长度比例）。 */
const Graded = ({ id, dots, from, a, b, ramp = 1 }: { readonly id: string; readonly dots: readonly Dot[]; readonly from: number; readonly a: string; readonly b: string; readonly ramp?: number }) => {
  const part = dots.slice(from)
  if (part.length < 2) return null
  const head = part[0]
  const tail = part[part.length - 1]
  const { circles, joints } = dotsToPaths(part)
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={head.x} y1={head.y} x2={tail.x} y2={tail.y}>
          <stop offset="0" stopColor={a} />
          <stop offset={ramp} stopColor={b} />
        </linearGradient>
      </defs>
      <path d={joints + circles} fill={`url(#${id})`} />
    </>
  )
}

const indexAt = (stroke: SoftStroke, time: number) => Math.max(0, stroke.samples.findIndex((s) => s.t > time) - 1)

// ---------- 光标：Inkeys 的“画笔（高亮）”——左上尖端是热点，笔身伸向右下 ----------

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

const Cursor = ({ at, size = 84 }: { readonly at: readonly [number, number]; readonly size?: number }) => (
  <svg width={size + 40} height={size + 40} viewBox={`-12 -12 ${size + 40} ${size + 40}`} style={{ position: 'absolute', left: at[0] - 12, top: at[1] - 12, overflow: 'visible', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.45))' }}>
    <path d={penPath(size)} fill={RED} fillOpacity={0.6} stroke="#000" strokeWidth={size / 5} strokeLinejoin="round" paintOrder="stroke" />
    <path d={penPath(size)} fill="none" stroke="#fff" strokeWidth={size / 9} strokeLinejoin="round" />
    <path d={penPath(size)} fill={RED} fillOpacity={0.55} />
  </svg>
)

const Caption = ({ text }: { readonly text: string }) => <div style={{ ...sans, position: 'absolute', left: 0, right: 0, bottom: 88, textAlign: 'center', fontSize: 66, fontWeight: 600, color: WHITE, letterSpacing: 8, textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>{text}</div>

const Stage = ({ children, light = false }: { readonly children: React.ReactNode; readonly light?: boolean }) => <AbsoluteFill style={{ background: light ? PAPER : GROUND, overflow: 'hidden' }}>{children}</AbsoluteFill>

// ---------- 1 · 幕标题：浅底黑字，三个词依次蹦出来后并排停住 ----------

export const V5Title = () => (
  <Stage light>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 78 }}>
      {['C++', 'Direct3D', 'HLSL'].map((t) => (
        <span key={t} style={{ ...sans, fontSize: 218, fontWeight: 700, color: INK_BLUE, letterSpacing: -5 }}>
          {t}
        </span>
      ))}
    </div>
  </Stage>
)

// ---------- 2 · 功能小标题：功能名在正中，画布正从它后面升上来 ----------

export const V5Reveal = () => {
  const plane = makePlane('perspective(2400px) translateY(520px) rotateX(64deg) rotateZ(-10deg)')
  return (
    <Stage>
      <Plane plane={plane} opacity={0.75} />
      <div style={{ ...sans, position: 'absolute', left: 0, right: 0, top: 372, textAlign: 'center', fontSize: 300, fontWeight: 700, color: WHITE, letterSpacing: 14 }}>局部刷新</div>
    </Stage>
  )
}

// ---------- 3 · 局部刷新：刚画出的那一段更亮，像湿墨的反光 ----------

const longLine = buildSoftStroke(
  writePath(
    [
      [-1500, -620],
      [-1120, -760],
      [-760, -560],
      [-520, -260],
      [-180, -180],
      [140, -330],
      [420, -120],
      [520, 220],
      [820, 400],
      [1150, 300],
    ],
    { duration: 1.1, startSpeed: 0.8, endSpeed: 0.9 },
  ),
  { base: 62, expectedSpeed: 3000 },
)

export const V5Redraw = () => {
  const plane = makePlane('perspective(2600px) translateY(40px) rotateX(54deg) rotateZ(-16deg) scale(0.66)')
  const now = 0.93
  const dots = softStrokeAt(longLine, now)
  const from = indexAt(longLine, now - 0.2)
  const tip = dots[dots.length - 1]
  const fresh = dots.slice(from)
  return (
    <Stage>
      <Plane plane={plane}>
        <defs>
          <filter id="v5-bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id="v5-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <Ink dots={dots.slice(0, from + 1)} color="#d40f02" />
        <g filter="url(#v5-bloom)" opacity={0.55}>
          <Graded id="v5-g1" dots={dots} from={from} a="#d40f02" b="#ff6a4a" />
        </g>
        <Graded id="v5-g2" dots={dots} from={from} a="#d40f02" b="#ff5136" />
        {/* 湿墨的反光：贴着笔迹上缘的一道细亮线 */}
        <g filter="url(#v5-soft)" opacity={0.75}>
          <Graded id="v5-g3" dots={fresh.map((d) => ({ x: d.x - d.r * 0.22, y: d.y - d.r * 0.34, r: d.r * 0.26 }))} from={0} a="#ff3a22" b="#ffe3d6" />
        </g>
      </Plane>
      <Cursor at={plane.project(tip.x, tip.y)} />
      <Caption text="局部刷新" />
    </Stage>
  )
}

// ---------- 4 · 墨迹预测：光标前面那一段是另一种颜色 ----------

const turn = buildSoftStroke(
  writePath(
    [
      [1450, -700],
      [1050, -820],
      [620, -640],
      [330, -330],
      [-40, -210],
      [-380, -360],
      [-640, -120],
      [-700, 240],
      [-420, 470],
      [-20, 430],
    ],
    { duration: 1.0, startSpeed: 0.8, endSpeed: 0.9 },
  ),
  { base: 62, expectedSpeed: 3000 },
)

export const V5Predict = () => {
  const plane = makePlane('perspective(2600px) translateY(30px) rotateX(52deg) rotateZ(17deg) scale(0.66)')
  const REAL = 0.7
  const AHEAD = 0.085
  const all = softStrokeAt(turn, REAL + AHEAD)
  const count = indexAt(turn, REAL) + 1
  const tip = all[count - 1]
  return (
    <Stage>
      <Plane plane={plane}>
        <Ink dots={all.slice(0, count)} />
        <Graded id="v5-g4" dots={all} from={count - 1} a="#bff3ff" b={PREDICT} ramp={0.5} />
      </Plane>
      <Cursor at={plane.project(tip.x, tip.y)} />
      <Caption text="墨迹预测" />
    </Stage>
  )
}

// ---------- 5 · 实时笔锋：画布转正放大，最前端还在变细的那一段是另一种颜色 ----------

const thick = buildSoftStroke(
  writePath(
    [
      [-2000, 120],
      [-1450, -10],
      [-900, 90],
      [-380, -70],
      [120, 40],
      [560, -40],
      [900, 20],
    ],
    { duration: 0.62, startSpeed: 1, endSpeed: 1, straightRadius: 900 },
  ),
  { base: 120, expectedSpeed: 5200 },
)

export const V5Taper = () => {
  const plane = makePlane('perspective(3000px) translateY(-40px) rotateX(20deg) rotateZ(-5deg) scale(0.8)')
  const now = 0.52
  const dots = softStrokeAt(thick, now)
  const from = indexAt(thick, now - 0.075)
  const tip = dots[dots.length - 1]
  return (
    <Stage>
      <Plane plane={plane}>
        <Ink dots={dots.slice(0, from + 1)} />
        <Graded id="v5-g5" dots={dots} from={from} a={RED} b={TAPER} ramp={0.45} />
      </Plane>
      <Cursor at={plane.project(tip.x, tip.y)} />
      <Caption text="实时笔锋" />
    </Stage>
  )
}
