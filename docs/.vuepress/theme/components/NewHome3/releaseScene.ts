import type { BarButtonItem } from '../NewHome/newHome.data'

export const RELEASE_SECONDS = 1.25
export const RELEASE_BAR_WIDTH = 682
export const RELEASE_BAR_HEIGHT = 80

export const releaseGroups: BarButtonItem[][] = [
  [
    { id: 'select', label: '选择', icon: 'select', size: 'twoTwo' },
    { id: 'draw', label: '绘制', icon: 'brush1', size: 'twoTwo' },
    { id: 'geometry', label: '图形', icon: 'geometry', size: 'twoTwo' },
    { id: 'eraser', label: '橡皮', icon: 'eraser', size: 'twoTwo' },
    { id: 'recall', label: '撤回', icon: 'recall', size: 'twoTwo' },
  ],
  [
    { id: 'whiteboard', label: '白板', icon: 'whiteboard', size: 'twoOne' },
    { id: 'freeze', label: '定格', icon: 'freeze', size: 'twoOne' },
  ],
]

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => 1 - (1 - clamp(value)) ** 3

export function releaseFrame(seconds: number) {
  const time = Math.min(RELEASE_SECONDS, Math.max(0, seconds))
  const entrance = (delay: number, duration: number) => {
    const progress = ease((time - delay) / duration)
    return { opacity: String(progress), transform: progress === 1 ? 'none' : `translateY(${20 * (1 - progress)}px)` }
  }
  return {
    complete: time >= RELEASE_SECONDS,
    title: entrance(0, 0.65),
    toolbar: entrance(0.18, 0.7),
    copy: entrance(0.55, 0.7),
  }
}

export function fitReleaseBar(available: number, natural = RELEASE_BAR_WIDTH) {
  // 预留两侧 32px，包含视差投影；整组一起缩小，不隐藏、换行或横滚工具。
  const scale = Math.min(1, Math.max(0, available - 64) / natural)
  return { scale, width: natural * scale, height: RELEASE_BAR_HEIGHT * scale }
}
