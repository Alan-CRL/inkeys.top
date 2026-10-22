import type { ColorChoice, PenKind } from './styles'

export type AmbientKind = 'pen' | 'laser' | 'digits' | 'shape'
export interface Point { x: number, y: number }
interface Stroke { points: Point[], regular?: Point[], highlight?: boolean }
export interface AmbientScene {
  id: number
  kind: AmbientKind
  side: number
  pen: PenKind
  color: Exclude<ColorChoice, 'rainbow'>
  start: number
  draw: number
  hold: number
  erase: number
  strokes: Stroke[]
}
export interface InkPath { d: string, highlight: boolean, opacity: number }
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const kinds: AmbientKind[] = ['pen', 'laser', 'digits', 'shape']
const colors: AmbientScene['color'][] = ['green', 'cyan', 'blue', 'purple', 'amber']
const pointAt = (points: Point[], t: number) => {
  const index = clamp(t) * (points.length - 1)
  const a = points[Math.floor(index)]
  const b = points[Math.min(points.length - 1, Math.floor(index) + 1)]
  return { x: mix(a.x, b.x, index % 1), y: mix(a.y, b.y, index % 1) }
}
const sample = (fn: (t: number) => Point, count = 240) => Array.from({ length: count + 1 }, (_, i) => fn(i / count))

export function ambientGeometry(kind: AmbientKind, random: () => number): Stroke[] {
  const wave = random() > 0.35
  if (kind === 'pen' || kind === 'laser') {
    const phase = random() * 2
    return [{ points: sample(t => ({ x: 8 + t * 284, y: 45 + (wave ? Math.sin(t * Math.PI * (kind === 'laser' ? 1 : 3) + phase) * 13 : Math.sin(t * 5 + phase) * 2) })) }]
  }
  if (kind === 'shape') {
    const circle = random() > 0.5
    const corners = [{ x: 72, y: 18 }, { x: 228, y: 18 }, { x: 228, y: 72 }, { x: 72, y: 72 }, { x: 72, y: 18 }]
    const regular = sample(t => circle ? { x: 150 + Math.cos(t * Math.PI * 2) * 30, y: 45 + Math.sin(t * Math.PI * 2) * 30 } : pointAt(corners, t))
    return [{ regular, points: regular.map((p, i) => ({ x: p.x + Math.sin(i / (regular.length - 1) * Math.PI * 5) * 2.6, y: p.y + Math.sin(i / (regular.length - 1) * Math.PI * 4 + 0.4) * 2.2 })) }]
  }
  // 手写数字先用三次曲线重建，再密集采样；加密原折线本身不能消除转折角。
  const digits = [
    [[8, 15], [18, 6], [18, 54]],
    [[3, 15], [9, 6], [23, 6], [29, 15], [26, 25], [4, 53], [31, 53]],
    [[3, 7], [28, 7], [15, 27], [28, 33], [29, 46], [20, 54], [4, 51]],
  ]
  const count = 1 + Math.floor(random() * 3)
  const strokes: Stroke[] = Array.from({ length: count }, (_, i) => {
    const points = digits[Math.floor(random() * digits.length)].map(([x, y]) => ({ x: 150 - count * 25 + i * 50 + x, y: y + 12 }))
    return { points: smoothAmbientPoints(points) }
  })
  strokes.push({ highlight: true, points: sample(t => ({ x: 146 - count * 25 + t * count * 50, y: 59 + Math.sin(t * 3) * 2 }), 160) })
  return strokes
}

/** Catmull–Rom 三次曲线经过手写控制点，端点重复保证落笔和收笔不外插。 */
export function smoothAmbientPoints(points: Point[]): Point[] {
  return sample(t => {
    const position = t * (points.length - 1)
    const i = Math.min(points.length - 2, Math.floor(position))
    const u = position - i
    const a = points[Math.max(0, i - 1)], b = points[i]
    const c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)]
    const coordinate = (key: 'x' | 'y') => 0.5 * ((2 * b[key]) + (-a[key] + c[key]) * u
      + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * u * u
      + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * u * u * u)
    return { x: coordinate('x'), y: coordinate('y') }
  }, 320)
}

export function createAmbientPreview(kind: AmbientKind, pen: PenKind): AmbientScene {
  return { id: 1, kind, pen, side: 0, color: 'cyan', start: 0, draw: 1.6, hold: 3, erase: 1.5,
    strokes: ambientGeometry(kind, () => 0.4) }
}

export const ambientEnd = (scene: AmbientScene) => scene.start + scene.draw + scene.hold + scene.erase

/** 调度器只消费活动秒数；后台停顿不会积压补播，等待期间由组件使用单个 timeout。 */
export function createAmbientScheduler(random: () => number = Math.random) {
  let next = 2 + random() * 2
  let serial = 0
  let scenes: AmbientScene[] = []
  const create = (now: number, side: number): AmbientScene => {
    const kind = kinds[Math.floor(random() * kinds.length)]
    return { id: ++serial, kind, side, start: now, draw: 1 + random(), hold: 2 + random() * 2,
      erase: 1 + random(), color: colors[Math.floor(random() * colors.length)], strokes: ambientGeometry(kind, random), pen: (['hard', 'soft', 'brush'] as const)[Math.floor(random() * 3)] }
  }
  return {
    update(now: number, mobile: boolean) {
      scenes = scenes.filter(scene => ambientEnd(scene) > now)
      if (mobile && scenes.length > 1) scenes = scenes.slice(0, 1)
      if (!scenes.length && now >= next) {
        const side = random() < 0.5 ? 0 : 1
        scenes = [create(now, side)]
        if (!mobile && random() < 0.15) scenes.push(create(now + 0.9, 1 - side))
        next = Math.max(...scenes.map(ambientEnd)) + (mobile ? 12 + random() * 8 : 8 + random() * 6)
      }
      return { scenes, wait: scenes.length ? 0 : Math.max(0, next - now) }
    },
  }
}

function segment(points: Point[], from: number, to: number) {
  if (to <= from) return ''
  const selected = [pointAt(points, from), ...points.slice(Math.floor(from * (points.length - 1)) + 1, Math.ceil(to * (points.length - 1))), pointAt(points, to)]
  return selected.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
}

export function ambientFrame(scene: AmbientScene, now: number) {
  const age = now - scene.start
  const draw = clamp(age / scene.draw)
  const erase = clamp((age - scene.draw - scene.hold) / scene.erase)
  const paths: InkPath[] = []
  let cursor: Point | undefined
  if (age < 0 || erase >= 1) return { paths, cursor }
  if (scene.kind === 'laser') {
    // 各小段按写入时间淡出，避免整条激光线同时消失。
    const points = scene.strokes[0].points
    for (let i = 0; i < 24; i++) {
      const from = i / 24
      const to = Math.min(draw, (i + 1) / 24)
      const opacity = clamp(1 - (age - from * scene.draw) / (scene.hold + scene.erase))
      if (to > from && opacity > 0) paths.push({ d: segment(points, from, to), highlight: false, opacity })
    }
    return { paths, cursor }
  }
  const morph = clamp((age - scene.draw - 0.35) / 0.6)
  const smoothMorph = morph * morph * (3 - 2 * morph)
  scene.strokes.forEach((stroke, index) => {
    const points = stroke.regular ? stroke.points.map((p, i) => ({ x: mix(p.x, stroke.regular![i].x, smoothMorph), y: mix(p.y, stroke.regular![i].y, smoothMorph) })) : stroke.points
    const from = clamp(erase * scene.strokes.length - index)
    const to = clamp(draw * scene.strokes.length - index)
    const d = segment(points, from, to)
    if (d) paths.push({ d, highlight: !!stroke.highlight, opacity: 1 })
    if (erase > 0 && erase * scene.strokes.length >= index && erase * scene.strokes.length < index + 1) cursor = pointAt(points, from)
  })
  return { paths, cursor }
}

export interface AmbientBox { x: number, y: number, width: number, height: number }

/** 坐标写入后固定在文档内；只在新一轮选择位置，不跟随滚动漂移。 */
export function placeAmbient(width: number, height: number, visibleTop: number, visibleBottom: number, side: number, random: () => number, exclusions: AmbientBox[] = [], inkBounds?: AmbientBox): AmbientBox {
  const tileWidth = Math.min(520, Math.max(104, width / 3), width)
  const tileHeight = tileWidth * 0.3
  // 按实际笔迹范围避让；SVG 的透明留白可以经过卡片，但笔迹不能藏进壁纸或穿过标题。
  const ink = inkBounds ?? { x: 0, y: 0, width: 1, height: 1 }
  const footprint = { x: ink.x * tileWidth, y: ink.y * tileHeight, width: ink.width * tileWidth, height: ink.height * tileHeight }
  const x = side ? Math.max(0, width - tileWidth - width * 0.04) : width * 0.04
  const low = Math.max(0, visibleTop) - footprint.y
  const high = Math.max(low, Math.min(height, visibleBottom) - footprint.y - footprint.height)
  const candidates = [mix(low, high, random()), low, high, ...exclusions.flatMap(box => [box.y + box.height + 18 - footprint.y, box.y - footprint.height - footprint.y - 18])]
  const fits = (y: number) => y + footprint.y >= 0 && y + footprint.y + footprint.height <= height
    && exclusions.every(box => x + footprint.x + footprint.width < box.x - 16 || x + footprint.x > box.x + box.width + 16
      || y + footprint.y + footprint.height < box.y - 16 || y + footprint.y > box.y + box.height + 16)
  const y = candidates.find(y => y >= low && y <= high && fits(y)) ?? candidates.find(fits) ?? high
  return { x, y, width: tileWidth, height: tileHeight }
}
