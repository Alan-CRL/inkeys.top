// 形状工具放置的棱柱，按软件的规则重画（源码 shape_presets.inl 的 SolidProjection / ObliquePoint，
// 调查记录见任务目录 research/codex-whiteboard-survey-result.md 第 4 节）：
// - 斜投影：底面上的点 (x, y) 画在 中心 + (x + k·y, −k·y)，k = 0.3535533906；高度直接加在竖直方向上。
// - 只有描边，等宽，颜色等于笔色；两个相邻的面都背向观察者的棱画成虚线：实段 4 倍线宽、间隔 6 倍线宽、圆头。
// - 放置分两次拖动：第一次定底面（实时预览底面），第二次定高度（实时预览整个立体）。

const K = 0.3535533906

type Props = {
  readonly center: { readonly x: number; readonly y: number }
  /** 底面外接圆半径；第一次拖动时从 0 变大。 */
  readonly radius: number
  /** 高；第二次拖动时从 0 变大。为 0 时只画底面。 */
  readonly height: number
  readonly sides: number
  readonly width: number
  readonly color: string
}

export const Prism = ({ center, radius, height, sides, width, color }: Props) => {
  if (radius <= 0.01) return null
  const f = (n: number) => n.toFixed(2)
  const base = Array.from({ length: sides }, (_, i) => {
    const a = (2 * Math.PI * i) / sides
    const x = radius * Math.cos(a)
    const y = radius * Math.sin(a)
    return { x: center.x + x + K * y, y: center.y - K * y }
  })
  const at = (i: number) => base[(i + sides) % sides]
  const line = (points: readonly { x: number; y: number }[]) => 'M' + points.map(p => `${f(p.x)} ${f(p.y)}`).join('L')
  const style = { fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

  // 只有底面：整圈实线。
  if (height <= 0.01) return <path d={line(base) + 'Z'} {...style} />

  // 第 i 个侧面（顶点 i 到 i+1）的外法线方向是 (cos φ, sin φ)，φ 取这条边的中点；sin φ > k·cos φ 时背向观察者。
  const back = (i: number) => {
    const phi = (2 * Math.PI * (((i % sides) + sides) % sides + 0.5)) / sides
    return Math.sin(phi) > K * Math.cos(phi)
  }
  const top = base.map(p => ({ x: p.x, y: p.y - height }))
  let solid = line(top) + 'Z'
  let dashed = ''
  for (let i = 0; i < sides; i++) {
    // 底面的棱：底面本身背向观察者，所以侧面也背向时这条棱被挡住。
    const edge = line([at(i), at(i + 1)])
    if (back(i)) dashed += edge
    else solid += edge
    // 竖直的棱：两侧的面都背向时被挡住。从底面往上画，虚线的相位固定在底面一端。
    const upright = line([at(i), top[i]])
    if (back(i - 1) && back(i)) dashed += upright
    else solid += upright
  }
  return (
    <>
      <path d={dashed} {...style} strokeDasharray={`${f(4 * width)} ${f(6 * width)}`} />
      <path d={solid} {...style} />
    </>
  )
}
