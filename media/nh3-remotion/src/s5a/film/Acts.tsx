// S5-A 成片的三幕。时间来自 ./timeline.ts，笔迹来自 ./strokes.ts。
// 摄影机不动：动的是点阵卡（倾斜、转正、放大、平移白板、分层）和大字。
// 第七版：多层缓冲按软件的 L2 / L1 / L0 三层呈现（同一条长墨迹，三张 → 两张 → 一张）；超低延迟推近一镜到底接墨迹预测；
// 新增“边擦边写”；第三幕去掉幕标题与抬笔修正；结尾不再写 Inkeys，第三幕的卡片退场后接回开头。

import type React from 'react'
import { liveTipStart, strokeAt, type InkPoint, type ModeledStroke } from '../ink/draw3Ink'
import type { Copy } from './copy'
import { Board, Cursor, cursorSize, EASE, Ground, groundOf, Ink, LOOK, mix, mixBoard, panFor, ramp, springAt, TwoTone, W, H, type BoardState, type Scene } from './kit'
import {
  A1_BG,
  A1_LONG,
  ARC,
  C_FORMULA,
  ERASER_R,
  ERASER_SECONDS,
  ERASER_TRAIL,
  eraserAt,
  FIX_PEN,
  JITTER_INK,
  JITTER_RAW,
  LIVE_PENS,
  LOOPCHAIN,
  LOOPS,
  PAGE_CENTER,
  PAGE_ERASABLE,
  PAGE_STATIC,
  REGION,
  TAPER,
  type Timed,
} from './strokes'
import { T } from './timeline'
import { ActTitle, ActTitle1, Label, RIGHT } from './Type'

// ---------- 工具 ----------

type Key = { readonly at: number; readonly state: BoardState | ((f: number) => BoardState); readonly ease?: (t: number) => number }

/** 卡片状态的关键帧：相邻两帧之间按后一帧的缓动补间；状态可以随时间变化（跟拍笔尖）。 */
const track = (f: number, keys: readonly Key[]): BoardState => {
  const get = (k: Key) => (typeof k.state === 'function' ? k.state(f) : k.state)
  if (f <= keys[0].at) return get(keys[0])
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]
    const b = keys[i]
    if (f <= b.at) {
      const t = (f - a.at) / Math.max(1e-6, b.at - a.at)
      return mixBoard(get(a), get(b), (b.ease ?? EASE.smooth)(t))
    }
  }
  return get(keys[keys.length - 1])
}

/**
 * 变速时钟（speed-ramp-freeze 只借变速）：从 start 帧起计时（秒），
 * 在 [a,b] 内速率平滑降到 rate，[b,c] 保持，[c,d] 平滑回到 1。不定格。
 */
const clock = (start: number, [a, b, c, d]: readonly [number, number, number, number], rate = 0.25) => (f: number) => {
  if (f <= start) return (f - start) / 60
  const w = (x: number) => (x < a ? 0 : x < b ? EASE.smooth((x - a) / (b - a)) : x < c ? 1 : x < d ? 1 - EASE.smooth((x - c) / (d - c)) : 0)
  let tau = 0
  const step = 0.25
  for (let x = start; x < f; x += step) tau += (1 - (1 - rate) * w(x + step / 2)) * Math.min(step, f - x)
  return tau / 60
}

/** 变速时钟走到 target 秒时是第几帧。 */
const frameWhen = (c: (f: number) => number, target: number, from: number) => {
  for (let x = from; x < from + 600; x++) if (c(x) >= target) return x
  return from + 600
}

const doneCache = new WeakMap<ModeledStroke, InkPoint[]>()
/** 写完后的样子（缓存）。 */
const done = (stroke: ModeledStroke) => {
  let pts = doneCache.get(stroke)
  if (!pts) {
    pts = strokeAt(stroke, stroke.duration + 1).points
    doneCache.set(stroke, pts)
  }
  return pts
}
const tipOf = (stroke: ModeledStroke, time: number) => {
  const { points } = strokeAt(stroke, Math.max(0.001, Math.min(time, stroke.duration)))
  return points[points.length - 1]
}

/** 光标是真实指针，略领先于平滑后的墨：取预测段的八成处（预测帮墨追上光标，并略微超出一点）。 */
const pointerOf = (points: readonly InkPoint[], realEnd: number) => {
  // 按弧长取预测段的八成处并插值，光标连续前进，不在相邻点之间跳。
  let total = 0
  for (let i = realEnd + 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  let left = 0.8 * total
  for (let i = realEnd + 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (d >= left && d > 0) return { ...a, x: mix(a.x, b.x, left / d), y: mix(a.y, b.y, left / d) }
    left -= d
  }
  return points[points.length - 1]
}

/** 一组笔画里笔（光标）在 time 时的位置：写字时贴着笔尖，两笔之间在空中平滑移动。 */
const penAt = (list: readonly Timed[], time: number, ahead = 0): { x: number; y: number } => {
  for (let i = 0; i < list.length; i++) {
    const { stroke, at } = list[i]
    const local = time - at
    if (local < 0) {
      if (i === 0) return tipOf(stroke, 0.001)
      const prev = list[i - 1]
      const from = done(prev.stroke).slice(-1)[0]
      const to = tipOf(stroke, 0.001)
      const span = at - (prev.at + prev.stroke.duration)
      const u = span > 0 ? EASE.smooth(Math.min(1, Math.max(0, (time - prev.at - prev.stroke.duration) / span))) : 1
      return { x: mix(from.x, to.x, u), y: mix(from.y, to.y, u) }
    }
    if (local < stroke.duration) {
      const s = strokeAt(stroke, local, ahead)
      return ahead > 0 ? pointerOf(s.points, s.realEnd) : s.points[s.realEnd]
    }
  }
  return done(list[list.length - 1].stroke).slice(-1)[0]
}

/** 光标：写的时候贴着笔尖；写完后停在末端并淡出。 */
const PenCursor = ({ scene, at, s, opacity = 1 }: { readonly scene: Scene; readonly at?: { x: number; y: number }; readonly s: number; readonly opacity?: number }) =>
  at && opacity > 0.01 ? <Cursor scene={scene} at={at} size={cursorSize(s)} s={s} opacity={opacity} /> : null

const StaticInk = ({ d, color }: { readonly d: string; readonly color: string }) => <path d={d} fill={color} />

// 倾斜的卡（与样张一致）：1500×938，白板缩放 0.78，正好是一整屏。
const TILT_CARD: BoardState = { x: 880, y: 548, w: 1500, h: 938, rx: 7, ry: 16, rz: -1.5, zoom: 0.78, pan: { x: 960, y: 600 } }
const riseOf = (s: BoardState, rx = 24): BoardState => ({ ...s, y: s.y + 760, rx, opacity: 0 })

/** 每幕第一个功能：功能名在正中排成一行，随卡片升起滑到一侧排成两行（title-demote-to-label）。 */
const demote = (start: number) => (f: number) => 1 - ramp(f, start, 36, EASE.demote)

// ======================================================================
// 第一幕 · 暗场：C++ · Direct3D · HLSL / 强劲驱动 → 多层缓冲 → 局部刷新
// 软件每帧只处理一块脏区：把 L2 拷进这块区域，再把 L1（这一笔已烘干的前缀）与 L0（笔尖：实时笔锋 + 预测）
// 合并盖上（Draw3.DrawingController.cpp 的 CompositeLayersToBackBuffer）。
// 镜头：同一条长墨迹一直不抬笔；三张（L2、L1、L0）→ 两张（L2、L1+L0，高光在 L1+L0 上）→ 一张，高光再跟一段。
// ======================================================================

/** 整个镜头卡片不动（用户：视角不用调整）；比通用的倾斜卡略低，给向右上错开的两层留出上沿。 */
const A1_CARD: BoardState = { ...TILT_CARD, y: 612 }
const A1_RISE = riseOf(A1_CARD)
/** 层间距：用户反馈第一版太远看不懂关系，减为一半。 */
const A1_SPREAD = { z: 75, dx: 47, dy: -39 }
const LONG_AT = 232 // 落笔，之后一直不抬
const SPLIT_AT = 252 // 三张
const MERGE_L0_AT = T.redraw[0] // L0 并入 L1：两张
const FLAT_AT = 446 // 两张合成一张
const A1_AHEAD = 0.02

export const Act1 = ({ f, copy }: { readonly f: number; readonly copy: Copy }) => {
  const scene: Scene = 'dark'
  const look = LOOK[scene]
  const time = (f - LONG_AT) / 60
  const live = time > 0 ? strokeAt(A1_LONG, time, A1_AHEAD) : { points: [] as InkPoint[], realEnd: 0 }
  const tip = time > 0 ? live.points[live.realEnd] : tipOf(A1_LONG, 0.001)
  const from = live.points.length ? Math.min(liveTipStart(live.points), live.realEnd) : 0
  const l1 = live.points.slice(0, from + 1)
  const l0 = live.points.slice(from)

  const st0 = track(f, [
    { at: T.layers[0], state: A1_RISE },
    { at: T.layers[0] + 36, state: A1_CARD, ease: EASE.out },
  ])
  // 合成一张时 1.03 倍单脉冲回弹（cloner-depth-echo 的落定）。
  const landAt = FLAT_AT + 22
  const popT = Math.min(1, Math.max(0, (f - landAt) / 30))
  const pop = f >= landAt ? Math.sin(popT * Math.PI) * Math.pow(1 - popT, 0.6) : 0
  const k = 1 + 0.03 * pop
  const st: BoardState = { ...st0, w: st0.w * k, h: st0.h * k, zoom: st0.zoom * k }

  // 分层：L1（第 1 层）与 L0（第 2 层）向右上错开；局部刷新时 L0 降到 L1 的高度合成一张；最后与 L2 合成一张。
  const spring = { damping: 15, stiffness: 150, mass: 0.9 }
  const flat = ramp(f, FLAT_AT, 22, EASE.exit)
  const d1 = springAt(f, SPLIT_AT, spring) * (1 - flat)
  const d0Open = springAt(f, SPLIT_AT + 4.4, spring) * (1 - flat)
  const mergeL0 = ramp(f, MERGE_L0_AT, 22, EASE.smooth)
  const d0 = mix(d0Open, d1 / 2, mergeL0) // 第 2 层的偏移是 2·d0，与 L1 的 d1 对齐

  // 局部刷新：高光在 L1+L0 这一张上跟着笔尖（这块脏区被重新合成），刚写出的一小段墨更亮；合成一张后继续跟一段。
  const glowK = ramp(f, MERGE_L0_AT + 12, 18, EASE.out)
  const fresh = (() => {
    const pts = live.points.slice(0, live.realEnd + 1)
    if (!pts.length) return [] as InkPoint[]
    const end = pts[pts.length - 1].t
    return pts.filter((p) => p.t > end - 0.22)
  })()
  const penK = ramp(f, LONG_AT - 14, 10, EASE.out)
  const pen = time > 0 ? pointerOf(live.points, live.realEnd) : tip

  const layerL2 = (
    <>
      {A1_BG.map(({ stroke }, i) => (
        <Ink key={i} points={done(stroke)} color={look.ink} />
      ))}
    </>
  )
  const layerL1 = (
    <>
      {glowK > 0.01 ? (
        <>
          <defs>
            <radialGradient id="a1-dirty" gradientUnits="userSpaceOnUse" cx={tip.x} cy={tip.y} r={200}>
              <stop offset="0" stopColor="#ffffff" stopOpacity={0.12 * glowK} />
              <stop offset="0.55" stopColor="#ffffff" stopOpacity={0.05 * glowK} />
              <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </radialGradient>
            <filter id="a1-fresh" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <circle cx={tip.x} cy={tip.y} r={200} fill="url(#a1-dirty)" />
        </>
      ) : null}
      <Ink points={l1} color={look.ink} />
      {glowK > 0.01 && fresh.length > 2 ? (
        <g filter="url(#a1-fresh)" opacity={0.5 * glowK}>
          <Ink points={fresh} color="#ffffff" />
        </g>
      ) : null}
    </>
  )
  const layerL0 = (
    <>
      <Ink points={l0} color={look.accent} />
      <PenCursor scene={scene} at={pen} s={st.zoom} opacity={penK} />
    </>
  )

  return (
    <Ground scene={scene}>
      {f < T.title1[1] + 6 ? <ActTitle1 f={f} drive={copy.drive} /> : null}
      {f >= T.layers[0] ? <Board scene={scene} id="a1" state={st} layers={[layerL2, layerL1, layerL0]} split={[d1, d0]} spread={A1_SPREAD} /> : null}
      <Label f={f} scene={scene} lines={copy.layers} size={copy.labelSize} at={T.open1[0]} out={T.redraw[0]} anchor={() => RIGHT} single={demote(T.layers[0])} />
      <Label f={f} scene={scene} lines={copy.redraw} size={copy.labelSize} at={T.redraw[0] + 6} anchor={() => RIGHT} />
    </Ground>
  )
}

// ======================================================================
// 第二幕 · 亮场：120+ FPS → 超低延迟 → 墨迹预测（一镜推近到底）→ 多指书写 / 边擦边写
// ======================================================================

const A2_RISE = riseOf(TILT_CARD)
// 特写的卡：左侧和下侧伸出画面，右边留给大字（大字不再换边）。
const CLOSE_FRAME = { x: 1500 - 850, y: 130 + 575, w: 1700, h: 1150, rx: 0, ry: 0, rz: 0 }
const CLOSE_TIP = { x: 1180, y: 430 } // 预测特写里真实墨尖落在卡面上的位置
const A2_PAGE: BoardState = { x: 880, y: 548, w: 1500, h: 938, rx: 6, ry: 14, rz: -1.2, zoom: 0.78, pan: PAGE_CENTER }
const LOOPS_AT = 676
const ZOOM_AT = 752 // 开始推近，一直推到预测特写
const ARC_AT = 846
const arcClock = clock(ARC_AT, [860, 876, 914, 930])
const ARC_END = frameWhen(arcClock, ARC.duration, ARC_AT)
const AHEAD = 0.025 // 预测：片子里夸大到看得清
const PENS_AT = [1004, 1016] // 两支笔错峰落笔
const ERASE_AT = 1062 // 橡皮与两支笔同时工作
const FIX_AT = 1190 // 第二支笔写完自己那行后，到擦掉的地方写改正的式子
/** 两支笔各自的全部笔画（第二支笔接着写改正的式子；两段之间光标在空中滑过去）。 */
const PEN_LISTS: Timed[][] = [LIVE_PENS[0], [...LIVE_PENS[1], ...FIX_PEN.map((s) => ({ ...s, at: s.at + (FIX_AT - PENS_AT[1]) / 60 }))]]

const EraserCursor = ({ at, r, opacity }: { readonly at: readonly [number, number]; readonly r: number; readonly opacity: number }) => {
  // 软件的圆形橡皮光标：白色实体、浅灰描边（外径 4%）、两道竖向握纹（Assets/EraserGripVisual.h）。
  const d = 2 * r
  const ring = 0.04 * d
  const stripeR = 0.05 * d
  const half = 0.24 * d
  return opacity > 0.01 ? (
    <g transform={`translate(${at[0]} ${at[1]})`} opacity={opacity}>
      <circle r={r + 1.5} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={3} />
      <circle r={r - ring / 2} fill="#ffffff" stroke="rgb(207,207,207)" strokeWidth={ring} />
      {[-1, 1].map((s) => (
        <rect key={s} x={s * 0.12 * d - stripeR} y={-half} width={2 * stripeR} height={2 * half} rx={stripeR} fill="rgb(207,207,207)" fillOpacity={0.5} />
      ))}
    </g>
  ) : null
}

export const Act2 = ({ f, copy }: { readonly f: number; readonly copy: Copy }) => {
  const scene: Scene = 'light'
  const look = LOOK[scene]
  const arcTime = arcClock(f)
  const arcWriting = arcTime > 0 && arcTime < ARC.duration
  const arc = arcTime > 0 ? strokeAt(ARC, arcTime, arcWriting ? AHEAD : 0) : { points: [] as InkPoint[], realEnd: 0 }
  const arcTip = arcTime > 0 ? arc.points[arc.realEnd] : tipOf(ARC, 0.001)
  // 预测特写：白板放大，视图跟着笔尖走，真实墨尖保持在卡面 CLOSE_TIP。
  const trackTip = (): BoardState => ({ ...CLOSE_FRAME, zoom: 2.6, pan: panFor(arcTip, CLOSE_TIP.x, CLOSE_TIP.y, CLOSE_FRAME.w, CLOSE_FRAME.h, 2.6) })
  const st = track(f, [
    { at: T.latency[0], state: A2_RISE },
    { at: T.latency[0] + 36, state: TILT_CARD, ease: EASE.out },
    { at: ZOOM_AT, state: TILT_CARD },
    { at: 884, state: trackTip, ease: EASE.smooth }, // 超低延迟 → 墨迹预测：一次连续的推近
    { at: T.multi[0], state: trackTip },
    { at: T.multi[0] + 44, state: A2_PAGE, ease: EASE.smooth },
  ])

  // 快速画圈
  const loopsTime = (f - LOOPS_AT) / 60
  const loops = loopsTime > 0 ? strokeAt(LOOPS, loopsTime).points : []
  const loopsTip = loops.length ? loops[loops.length - 1] : tipOf(LOOPS, 0.001)
  // 笔从画圈的终点移到外圈的起点
  const arcStart = tipOf(ARC, 0.001)
  const loopsEnd = LOOPS_AT + LOOPS.duration * 60
  const glide = ramp(f, loopsEnd + 2, ARC_AT - loopsEnd - 2, EASE.swift)
  let cursorAt = loopsTime < LOOPS.duration ? loopsTip : { x: mix(loopsTip.x, arcStart.x, glide), y: mix(loopsTip.y, arcStart.y, glide) }
  if (arcTime > 0) cursorAt = arcWriting ? pointerOf(arc.points, arc.realEnd) : arc.points[arc.points.length - 1]
  const mainCursorOpacity = ramp(f, LOOPS_AT - 14, 10, EASE.out) * (1 - ramp(f, ARC_END + 10, 12, EASE.smooth))

  // 两支笔续写左列最后两行；光标错峰从卡片外飞入落笔点（collab-cursor-moves 的入场）。
  const pens = PEN_LISTS.map((list, i) => {
    const at = PENS_AT[i]
    const time = (f - at) / 60
    const first = tipOf(list[0].stroke, 0.001)
    const enter = springAt(f, at - 26, { damping: 15, stiffness: 80 })
    const from = i === 0 ? { x: first.x - 520, y: first.y - 420 } : { x: first.x - 560, y: first.y + 380 }
    const last = list[list.length - 1]
    const end = at + (last.at + last.stroke.duration) * 60
    // 板书小字不加实时笔锋，粗细与写完后的静态板书一致。
    const inks = list.map(({ stroke, at: s }) => (time - s > 0 ? strokeAt(stroke, time - s, 0, false).points : null))
    const pos = time > 0 ? penAt(list, time) : { x: mix(from.x, first.x, enter), y: mix(from.y, first.y, enter) }
    return { inks, pos, opacity: ramp(f, at - 26, 8, EASE.out) * (1 - ramp(f, end + 6, 14, EASE.smooth)) }
  })

  // 橡皮：从右侧滑入，来回擦掉右列两行；擦过的地方墨迹消失（遮罩）。
  const eTime = (f - ERASE_AT) / 60
  const eEnter = springAt(f, ERASE_AT - 24, { damping: 15, stiffness: 80 })
  const e0 = eraserAt(0)
  const ePos: readonly [number, number] = eTime > 0 ? eraserAt(eTime) : [mix(e0[0] + 700, e0[0], eEnter), mix(e0[1] - 200, e0[1], eEnter)]
  const trail = eTime > 0 ? ERASER_TRAIL.slice(0, Math.max(1, Math.round(Math.min(eTime, ERASER_SECONDS) * 120)) + 1).map(([x, y], i) => ({ x, y, r: ERASER_R, t: i / 120 })) : []
  const eOpacity = ramp(f, ERASE_AT - 24, 8, EASE.out) * (1 - ramp(f, ERASE_AT + ERASER_SECONDS * 60 + 4, 14, EASE.smooth))

  const content = (
    <>
      <Ink points={loops} color={look.ink} />
      {arc.points.length ? <TwoTone points={arc.points} from={arc.realEnd} a={look.ink} b={look.accent} bOpacity={arcWriting ? 1 : 0} /> : null}
      <StaticInk d={PAGE_STATIC} color={look.ink} />
      {trail.length ? (
        <defs>
          <mask id="a2-erase" maskUnits="userSpaceOnUse" x={PAGE_CENTER.x - 2000} y={PAGE_CENTER.y - 1400} width={4000} height={2800}>
            <rect x={PAGE_CENTER.x - 2000} y={PAGE_CENTER.y - 1400} width={4000} height={2800} fill="#fff" />
            <Ink points={trail} color="#000" />
          </mask>
        </defs>
      ) : null}
      <g mask={trail.length ? 'url(#a2-erase)' : undefined}>
        <StaticInk d={PAGE_ERASABLE} color={look.ink} />
      </g>
      {pens.map((p, i) => p.inks.map((pts, k) => (pts ? <Ink key={`${i}-${k}`} points={pts} color={look.ink} /> : null)))}
      <PenCursor scene={scene} at={cursorAt} s={st.zoom} opacity={mainCursorOpacity} />
      {pens.map((p, i) => (
        <PenCursor key={i} scene={scene} at={p.pos} s={st.zoom} opacity={p.opacity} />
      ))}
      <EraserCursor at={ePos} r={ERASER_R} opacity={eOpacity} />
    </>
  )
  return (
    <Ground scene={scene}>
      {f < T.title2[1] + 6 ? <ActTitle f={f} scene={scene} words={['120+', 'FPS']} at={T.title2[0] + 2} size={250} out={T.title2[1] - 8} /> : null}
      {f >= T.latency[0] ? (
        // 推近时主栏钉在白板上，跟着放大、移出画面后隐去（之后放大得更多会从底边再露出来）；到写满的一页时主栏回到卡框上淡入。
        <Board scene={scene} id="a2" state={st} layers={[content]} barRef={f < T.multi[0] ? TILT_CARD : undefined} barOpacity={f < T.multi[0] ? 1 - ramp(f, ZOOM_AT + 66, 8, (t) => t) : ramp(f, T.multi[0] + 24, 18, EASE.out)} />
      ) : null}
      <Label f={f} scene={scene} lines={copy.latency} size={copy.labelSize} at={T.open2[0] - 4} out={T.predict[0]} anchor={() => RIGHT} single={demote(T.latency[0])} />
      <Label f={f} scene={scene} lines={copy.predict} size={copy.labelSize} at={T.predict[0] + 6} out={T.multi[0]} anchor={() => RIGHT} />
      <Label f={f} scene={scene} lines={copy.multi} size={copy.labelSize} at={T.multi[0] + 6} out={ERASE_AT - 10} anchor={() => RIGHT} />
      <Label f={f} scene={scene} lines={copy.erase} size={copy.labelSize} at={ERASE_AT - 4} anchor={() => RIGHT} />
    </Ground>
  )
}

// ======================================================================
// 第三幕 · 暗场：实时笔锋 → 模拟压感 · 快细慢粗 → 手抖修正 → 卡片退场接回开头
// ======================================================================

// 实时笔锋：细笔、视图放大约 2.2 倍（用户建议：细笔加放大，笔锋才自然）。
const A3_TAPER: BoardState = { x: 790, y: 540, w: 1700, h: 1000, rx: 5, ry: -12, rz: 1, zoom: 1.95, pan: { x: REGION.A.x + 25, y: REGION.A.y + 10 } }
const A3_RISE = riseOf(A3_TAPER, 22)
const A3_SPEED: BoardState = { x: 820, y: 550, w: 1640, h: 1000, rx: 3, ry: -8, rz: 0.5, zoom: 1.15, pan: { x: REGION.B.x - 116, y: REGION.B.y + 20 } }
const A3_JITTER: BoardState = { x: 820, y: 540, w: 1640, h: 1000, rx: 2, ry: 7, rz: -0.5, zoom: 1.15, pan: { x: REGION.C.x, y: REGION.C.y + 10 } }
const TAPER_AT = 1392
const taperClock = clock(TAPER_AT, [1404, 1414, 1440, 1452])
const TAPER_LIFT_F = frameWhen(taperClock, TAPER.duration, TAPER_AT)
const LOOP_AT = 1540
const SPEED_SWAP = 1600 // 模拟压感 → 快细慢粗
const JITTER_AT = 1740

export const Act3 = ({ f, copy }: { readonly f: number; readonly copy: Copy }) => {
  const scene: Scene = 'dark'
  const look = LOOK[scene]
  const st = track(f, [
    { at: T.taper[0], state: A3_RISE },
    { at: T.taper[0] + 36, state: A3_TAPER, ease: EASE.out },
    { at: T.speed[0], state: A3_TAPER },
    { at: T.speed[0] + 40, state: A3_SPEED, ease: EASE.smooth },
    { at: T.jitter[0], state: A3_SPEED },
    { at: T.jitter[0] + 40, state: A3_JITTER, ease: EASE.smooth },
    { at: T.out3[0], state: A3_JITTER },
    { at: T.out3[1], state: riseOf(A3_JITTER, 22), ease: EASE.exit }, // 沉回画面下方
  ])

  // A 实时笔锋：后段放慢，最前端正在收细的那段是青色；抬笔后青色退回白色。
  const taperTime = taperClock(f)
  const taper = taperTime > 0 ? strokeAt(TAPER, taperTime).points : []
  const taperWriting = taperTime > 0 && taperTime < TAPER.duration
  const tealK = taperWriting ? 1 : 1 - ramp(f, TAPER_LIFT_F, 18, EASE.smooth)
  const taperTip = taper.length ? taper[taper.length - 1] : tipOf(TAPER, 0.001)

  // B 模拟压感 · 快细慢粗
  const lTime = (f - LOOP_AT) / 60
  const loop = lTime > 0 ? strokeAt(LOOPCHAIN, lTime).points : []
  const loopTip = loop.length ? loop[loop.length - 1] : tipOf(LOOPCHAIN, 0.001)

  // C 手抖修正：浅灰的原始输入（光标的真实轨迹）在抖，墨是顺的；光标跟着原始输入抖。
  const jTime = (f - JITTER_AT) / 60
  const jInk = jTime > 0 ? strokeAt(JITTER_INK, jTime).points : []
  const jRaw = JITTER_RAW.filter((p) => p.t <= Math.max(0, jTime))
  const jCursor = jRaw.length ? jRaw[jRaw.length - 1] : JITTER_RAW[0]
  const jWriting = jTime > 0 && jTime < JITTER_INK.duration

  // 光标：同一支笔依次写各个区域；区域之间平移时隐去。
  const cursor = (() => {
    if (f < T.speed[0]) return { at: taperTip, k: ramp(f, TAPER_AT - 14, 10, EASE.out) * (taperWriting || taperTime <= 0 ? 1 : 1 - ramp(f, TAPER_LIFT_F + 4, 12, EASE.smooth)) }
    if (f < T.jitter[0]) return { at: loopTip, k: ramp(f, LOOP_AT - 14, 10, EASE.out) * (lTime < LOOPCHAIN.duration ? 1 : 1 - ramp(lTime, LOOPCHAIN.duration + 0.05, 0.2, EASE.smooth)) }
    return { at: jCursor, k: ramp(f, JITTER_AT - 14, 10, EASE.out) * (jWriting || jTime <= 0 ? 1 : 1 - ramp(jTime, JITTER_INK.duration + 0.1, 0.2, EASE.smooth)) }
  })()

  const taperFrom = taper.length > 1 ? liveTipStart(taper) : 0
  const content = (
    <>
      {taper.length ? <TwoTone points={taper} from={taperFrom} a={look.ink} b={look.accent} bOpacity={tealK} /> : null}
      <Ink points={loop} color={look.ink} />
      <StaticInk d={C_FORMULA} color={look.ink} />
      {jRaw.length > 1 ? <polyline points={jRaw.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke={look.faint} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
      <Ink points={jInk} color={look.ink} />
      <PenCursor scene={scene} at={cursor.at} s={st.zoom} opacity={cursor.k} />
    </>
  )
  return (
    <Ground scene={scene}>
      {f >= T.taper[0] ? <Board scene={scene} id="a3" state={st} layers={[content]} /> : null}
      <Label f={f} scene={scene} lines={copy.taper} size={copy.labelSize} at={T.open3[0] + 2} out={T.speed[0]} anchor={() => RIGHT} single={demote(T.taper[0])} />
      <Label f={f} scene={scene} lines={copy.pressure} size={copy.labelSize} at={T.speed[0] + 6} out={SPEED_SWAP - 8} anchor={() => RIGHT} />
      <Label f={f} scene={scene} lines={copy.speed} size={copy.labelSize} at={SPEED_SWAP} out={T.jitter[0]} anchor={() => RIGHT} />
      <Label f={f} scene={scene} lines={copy.jitter} size={copy.labelSize} at={T.jitter[0] + 6} out={T.out3[0] - 6} anchor={() => RIGHT} />
    </Ground>
  )
}

// ======================================================================
// 明暗切换：新主题色的卡从下方升起、放大铺满（shot-transitions · mask-wipe）
// ======================================================================

export const Switch = ({ f, from, to, scene }: { readonly f: number; readonly from: number; readonly to: number; readonly scene: Scene }) => {
  if (f < from || f >= to) return null
  const t = (f - from) / (to - from)
  const rise = EASE.out(Math.min(1, t / 0.42))
  const grow = EASE.portal(Math.max(0, (t - 0.3) / 0.7))
  const w = mix(860, W + 40, grow)
  const h = mix(520, H + 40, grow)
  const cx = W / 2
  const cy = mix(H + 380, H / 2, rise)
  const left = cx - w / 2
  const top = cy - h / 2
  const style: React.CSSProperties = {
    position: 'absolute',
    left,
    top,
    width: w,
    height: h,
    borderRadius: mix(44, 0, grow),
    background: groundOf(scene),
    // 背景按整幅画面对齐：铺满时与下一幕的底完全一致，不跳。
    backgroundSize: `${W}px ${H}px`,
    backgroundPosition: `${-left}px ${-top}px`,
    boxShadow: scene === 'light' ? '0 40px 120px rgba(0,0,0,0.35)' : '0 40px 120px rgba(0,0,0,0.25)',
  }
  return <div style={style} />
}
