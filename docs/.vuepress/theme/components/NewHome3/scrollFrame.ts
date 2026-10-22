export interface FrameRanges {
  enter: number
  exit: number
  end: number
  short: boolean
}

export interface ScrollFrameState {
  y: number
  direction: -1 | 0 | 1
  travel: number
  recalled: boolean
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function frameRanges(viewport: number, maximum: number): FrameRanges {
  const max = Math.max(0, maximum)
  const view = Math.max(1, viewport)
  // 极短页面没有足够路程容纳三个阶段，只加深导航，不制造额外滚动空间。
  if (max <= 32) return { enter: 32, exit: 32, end: 32, short: true }
  const enter = Math.max(17, Math.min(view * 0.14, max * 0.22))
  const exit = Math.max(enter, Math.min(view * 0.38, max * 0.55))
  const end = Math.min(max, Math.max(exit + 1, exit + Math.min(view * 0.18, max * 0.25)))
  return { enter, exit, end, short: false }
}

export function initialFrameState(y: number): ScrollFrameState {
  return { y: Math.max(0, y), direction: 0, travel: 0, recalled: false }
}

export function advanceFrame(state: ScrollFrameState, y: number, ranges: FrameRanges): ScrollFrameState {
  const next = Math.max(0, y)
  if (next <= 16 || next < ranges.exit || ranges.short) return initialFrameState(next)
  const delta = next - state.y
  // 保留上次有效位置，让亚像素真实滚动能累计，同时忽略来回抖动。
  if (Math.abs(delta) < 1) return state
  const direction = delta > 0 ? 1 : -1
  const travel = (direction === state.direction ? state.travel : 0) + Math.abs(delta)
  const recalled = direction === -1 && travel >= 24 ? true
    : direction === 1 && travel >= 36 ? false : state.recalled
  return { y: next, direction, travel, recalled }
}

export function frameView(state: ScrollFrameState, ranges: FrameRanges, locked = false) {
  const entering = clamp((state.y - 16) / (ranges.enter - 16))
  const leaving = ranges.short ? 0 : clamp((state.y - ranges.exit) / (ranges.end - ranges.exit))
  const recalled = state.recalled && state.y >= ranges.exit
  const pinned = locked || recalled
  return {
    amount: ranges.short ? 0 : pinned && state.y > 16 ? 1 : entering * (1 - leaving),
    visible: pinned ? 1 : 1 - leaving,
    fill: locked ? 1 : entering,
    phase: recalled ? 'recalled' : state.y <= 16 ? 'opening'
      : leaving === 1 && !locked ? 'expanded' : 'framed',
  }
}
