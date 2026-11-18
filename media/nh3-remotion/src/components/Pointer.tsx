import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Sample } from '../ink/path'
import { CLAMP } from '../theme/motion'

// 指针：串起整个循环的那条线。
// 在画布上是软件自己的“画笔指针（高亮）”——笔尖在左上角的五边形小笔，半透明地填着当前笔色；
// 荧光笔时是它的矩形笔尖光标；移到主栏上变成鼠标箭头。
// 书写时指针的笔尖就是墨迹的最前端。

export type Position = { readonly x: number; readonly y: number }

export type PointerSegment =
  | { readonly kind: 'hold'; readonly from: number; readonly to: number; readonly at: Position }
  /** 从 a 走到 b：走一条略弯的弧线，先快后慢，到位前有很小的过冲。bend 是弧线鼓出去的比例，正负决定朝哪边弯。 */
  | { readonly kind: 'travel'; readonly from: number; readonly to: number; readonly a: Position; readonly b: Position; readonly bend?: number }
  /** 跟着一道笔迹的最前端走。 */
  | { readonly kind: 'write'; readonly from: number; readonly to: number; readonly samples: readonly Sample[] }

export type PointerProps = {
  readonly segments: readonly PointerSegment[]
  /** 主栏的顶边；指针越过这条线就从画笔光标变成鼠标箭头。 */
  readonly toolbarTop: number
  /** 在这两帧之间，画布上的光标是荧光笔的矩形笔尖，其余时间是画笔。 */
  readonly nib: { readonly from: number; readonly to: number; readonly height: number; readonly width: number; readonly color: string }
  readonly penColor: string
  /** 点击发生的帧：箭头在这一帧压到最深。 */
  readonly clicks: readonly number[]
}

const PEN_SIZE = 22
// 软件里画笔光标的五边形（24 单位的显示盒内的归一化坐标），笔尖在左上角。
const PEN = [
  [0, 0],
  [1 / 3, 1 / 12],
  [1, 3 / 4],
  [3 / 4, 1],
  [1 / 12, 1 / 3],
]
  .map(([x, y]) => `${(x * PEN_SIZE).toFixed(2)} ${(y * PEN_SIZE).toFixed(2)}`)
  .join('L')
const ARROW = 'M0 0V17L4.4 13L7.3 19.8L10 18.6L7.2 12H12.6Z'
const EDGE = 'rgb(245, 245, 245)'
const OUTER = 'rgba(0, 0, 0, 0.32)'

// 指针移动的缓动：起步快、收得慢，终点前略微过冲。
const TRAVEL = Easing.bezier(0.45, 0, 0.15, 1.04)

const smooth = (u: number) => {
  const v = Math.min(1, Math.max(0, u))
  return v * v * (3 - 2 * v)
}

function headAt(samples: readonly Sample[], time: number): Position {
  if (time <= samples[0].t) return samples[0]
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].t < time) continue
    const p = samples[i - 1]
    const s = samples[i]
    const k = (time - p.t) / (s.t - p.t)
    return { x: p.x + (s.x - p.x) * k, y: p.y + (s.y - p.y) * k }
  }
  return samples[samples.length - 1]
}

function positionAt(segments: readonly PointerSegment[], frame: number, fps: number): Position {
  const segment = segments.find(item => frame >= item.from && frame < item.to) ?? segments[segments.length - 1]
  if (segment.kind === 'hold') return segment.at
  if (segment.kind === 'write') return headAt(segment.samples, (frame - segment.from) / fps)
  // 起步快、收得慢，末尾略微过冲再落定。
  const u = interpolate(frame, [segment.from, segment.to], [0, 1], { ...CLAMP, easing: TRAVEL })
  const { a, b, bend = 0.16 } = segment
  const dx = b.x - a.x
  const dy = b.y - a.y
  // 二次贝塞尔：控制点在连线中点的垂直方向上鼓出去。
  const cx = (a.x + b.x) / 2 - dy * bend
  const cy = (a.y + b.y) / 2 + dx * bend
  const v = 1 - u
  return { x: v * v * a.x + 2 * v * u * cx + u * u * b.x, y: v * v * a.y + 2 * v * u * cy + u * u * b.y }
}

export const Pointer = ({ segments, toolbarTop, nib, penColor, clicks }: PointerProps) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { x, y } = positionAt(segments, frame, fps)
  // 越过主栏顶边前后 12 的范围内，两种光标交叉过渡。
  const arrow = smooth((y - (toolbarTop - 12)) / 12)
  const useNib = frame >= nib.from && frame < nib.to
  const click = clicks.find(at => frame >= at - 6 && frame < at + 12)
  const press = click === undefined ? 1 : frame < click ? interpolate(frame, [click - 6, click], [1, 0.8], CLAMP) : interpolate(frame, [click, click + 12], [0.8, 1], CLAMP)
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
      {/* 画布上的光标 */}
      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - arrow, scale: String(0.7 + 0.3 * (1 - arrow)), transformOrigin: '0 0' }}>
        {useNib ? (
          <g>
            <rect x={-nib.width / 2 - 1.1} y={-nib.height / 2 - 1.1} width={nib.width + 2.2} height={nib.height + 2.2} rx={1.4} fill={OUTER} />
            <rect x={-nib.width / 2 - 0.6} y={-nib.height / 2 - 0.6} width={nib.width + 1.2} height={nib.height + 1.2} rx={1} fill={EDGE} />
            <rect x={-nib.width / 2} y={-nib.height / 2} width={nib.width} height={nib.height} rx={0.5} fill={nib.color} />
          </g>
        ) : (
          <g strokeLinejoin="round">
            <path d={`M${PEN}Z`} fill="none" stroke={OUTER} strokeWidth={2.6} />
            <path d={`M${PEN}Z`} fill={penColor} fillOpacity={0.5} />
            <path d={`M${PEN}Z`} fill="none" stroke={EDGE} strokeWidth={1.3} />
          </g>
        )}
      </svg>
      {/* 主栏上的鼠标箭头；点击时向笔尖方向压一下。 */}
      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: arrow, scale: String((0.7 + 0.3 * arrow) * press), transformOrigin: '0 0', filter: 'drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.28))' }}>
        <path d={ARROW} fill="#111111" stroke="#ffffff" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </div>
  )
}
