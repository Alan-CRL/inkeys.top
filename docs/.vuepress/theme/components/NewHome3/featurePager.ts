export const PAGE_STEP = 0.72
export const PAGE_SWITCH = 0.3
export const MIN_ZOOM = 0.72
/** 滚轮事件间隔不小于此值（ms）即视为新的手势。 */
export const WHEEL_GESTURE_GAP = 140
/** 一次手势累计滚动达到此值（px）才翻页；鼠标滚轮单格即达到，触控板轻触不会误翻。 */
export const WHEEL_TRIGGER = 36
/** 触屏竖向滑动达到此距离（px）即翻页。 */
export const TOUCH_TRIGGER = 40
/** 触屏滑动判定方向前允许的抖动（px）。 */
export const TOUCH_SLOP = 8

export interface PagerLayout {
  /** 翻页区顶部对齐时的滚动位置（第 1 页），此前为首屏及其下方的过渡区。 */
  top: number
  viewport: number
  step: number
  count: number
}

export function pagerLayout(top: number, viewport: number, count: number): PagerLayout {
  const view = Math.max(1, viewport)
  return { top, viewport: view, step: Math.round(view * PAGE_STEP), count }
}

/** 粘性视口固定的总路程：首页对齐后每页一个步长，末页对齐后即随文档离开。 */
export function pagerHeight(layout: PagerLayout) {
  return layout.viewport + (layout.count - 1) * layout.step
}

export function anchorOf(layout: PagerLayout, index: number) {
  return layout.top + index * layout.step
}

/**
 * 滚动位置 → 当前页。翻页区之前（首屏与过渡区，第 1 页随文档滑入）始终是第 1 页，与末页之后始终是末页对称。
 * 页间越过 30% 步长才切换，只与出发页比较，停在边界时不会来回抖动。
 */
export function pageAt(layout: PagerLayout, y: number, current: number) {
  const { top, step, count } = layout
  if (y <= top) return 0
  const progress = (y - top) / step
  const page = Math.max(0, Math.min(count - 1, current))
  if (progress >= page + PAGE_SWITCH) return Math.min(count - 1, Math.floor(progress - PAGE_SWITCH) + 1)
  if (progress <= page - PAGE_SWITCH) return Math.max(0, Math.ceil(progress + PAGE_SWITCH) - 1)
  return page
}

/** 停止滚动后的对齐目标；翻页区之前与末页之后均为自由滚动。 */
export function settleTarget(layout: PagerLayout, y: number, current: number): number | null {
  if (y < layout.top || y > anchorOf(layout, layout.count - 1) + 1) return null
  return anchorOf(layout, current)
}

/**
 * 翻页目标：仅在已对齐某页时生效。
 * 第 1 页向上与末页向下都交还原生滚动，进出翻页区完全对称。
 */
export function wheelTarget(layout: PagerLayout, y: number, current: number, direction: number): number | null {
  if (!direction) return null
  if (y < layout.top - 2 || y > anchorOf(layout, layout.count - 1) + 2) return null
  if (direction > 0 ? current >= layout.count - 1 : current <= 0) return null
  return direction > 0 ? current + 1 : current - 1
}

/**
 * 自首屏向下滚动将越过翻页区顶部时，在顶部停住（返回对齐位置），让第 1 页完整呈现，
 * 再继续滚动才开始翻页；其余情况返回 null，保持原生滚动。
 */
export function entryTarget(layout: PagerLayout, y: number, delta: number): number | null {
  return delta > 0 && y < layout.top - 2 && y + delta >= layout.top - 2 ? layout.top : null
}

export interface WheelGesture {
  /** 当前手势已累计的滚动量。 */
  total: number
  /** 手势方向。 */
  direction: number
  /** 手势已经触发（翻页或停靠），其后的事件包括触控板惯性一律吞掉，直到新手势出现。 */
  locked: boolean
  /** 上一个事件的时间与幅度。 */
  time: number
  size: number
}

export function createWheelGesture(): WheelGesture {
  return { total: 0, direction: 0, locked: false, time: -Infinity, size: 0 }
}

/** 手势被动作接管（如停靠到翻页区顶部）时直接上锁。 */
export function lockWheelGesture(gesture: WheelGesture, now: number, delta: number) {
  gesture.locked = true
  gesture.total = 0
  gesture.direction = Math.sign(delta)
  gesture.time = now
  gesture.size = Math.abs(delta)
}

/**
 * 滚轮手势判定：
 * - 'fire'：累计达到触发量，调用方执行一次翻页，手势随即上锁；
 * - 'hold'：属于已触发的手势（含惯性尾巴）或仍在累计，调用方吞掉事件；
 * - 'pass'：当前无动作可执行，交还原生滚动。
 * 已上锁的手势在事件中断、方向反转，或幅度在惯性衰减后重新上升（新一轮滑动）时解锁；
 * 翻页动画进行中不解锁，避免同一次滑动的加速段触发两次。
 */
export function feedWheel(gesture: WheelGesture, now: number, delta: number, animating: boolean, armed: boolean): 'fire' | 'hold' | 'pass' {
  const size = Math.abs(delta)
  const direction = Math.sign(delta)
  const gap = now - gesture.time
  const previous = gesture.size
  gesture.time = now
  gesture.size = size
  if (gesture.locked) {
    const fresh = gap >= WHEEL_GESTURE_GAP
      || (!animating && ((direction !== gesture.direction && size >= 10) || (size >= 8 && size > previous * 1.6)))
    if (!fresh || animating) return 'hold'
    gesture.locked = false
    gesture.total = 0
  }
  else if (gap >= WHEEL_GESTURE_GAP || direction !== gesture.direction) gesture.total = 0
  gesture.direction = direction
  if (!armed) {
    gesture.total = 0
    return 'pass'
  }
  gesture.total += delta
  if (Math.abs(gesture.total) < WHEEL_TRIGGER) return 'hold'
  gesture.locked = true
  gesture.total = 0
  return 'fire'
}

export function scrollDuration(distance: number) {
  return Math.max(420, Math.min(820, 380 + Math.abs(distance) * 0.28))
}

export function easeInOut(progress: number) {
  const value = Math.max(0, Math.min(1, progress))
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
}

/** 页码点放大：只按与指针的纵向距离平滑衰减，幅度比系统程序坞克制。 */
export function dockScale(distance: number, reach = 56, amount = 0.6) {
  return 1 + amount * Math.max(0, 1 - Math.abs(distance) / reach) ** 2
}

export interface PageFitInput {
  width: number
  height: number
  copy: number
  gap: number
  ratio: number
  maxWidth: number
  minStage: number
  /** 舞台高度占可用高度的上限，保证四周留白。 */
  maxShare: number
}

/**
 * 文字优先完整：舞台占用文字之外的剩余高度并保持比例；
 * 剩余高度不足最小舞台时整体等比缩小，最低 MIN_ZOOM，仍不足则舞台继续让位。
 */
export function fitPage({ width, height, copy, gap, ratio, maxWidth, minStage, maxShare }: PageFitInput) {
  const wanted = Math.min(Math.min(maxWidth, width) / ratio, height * maxShare)
  const needed = copy + gap + Math.min(minStage, wanted)
  const zoom = needed <= height ? 1 : Math.max(MIN_ZOOM, height / needed)
  const room = height / zoom - copy - gap
  const stage = Math.max(Math.min(wanted, room), Math.min(wanted, minStage * 0.6))
  return { zoom: Math.round(zoom * 1000) / 1000, stageWidth: Math.floor(stage * ratio) }
}
