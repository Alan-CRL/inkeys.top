import { createInk, createPainter } from './softPen'
import type { Painter, PainterTheme, Scene } from './softPen'
import type { AmbientScene } from './ambientScene'
import { ambientEnd } from './ambientScene'

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const SCALE = 5

/** 只适配轨迹与尺寸：硬/软/荧光/激光/毛笔材质全部来自首屏真实 painter。 */
export function createAmbientPainter(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')!
  const maskCanvas = document.createElement('canvas')
  const maskContext = maskCanvas.getContext('2d')!
  const layers: Array<{ canvas: HTMLCanvasElement, painter: Painter, key: string }> = []
  function clearLayers() {
    for (const layer of layers) layer.painter.dispose()
    layers.length = 0
  }
  return {
    dispose() { clearLayers(); canvas.width = canvas.height = maskCanvas.width = maskCanvas.height = 1 },
    render(scene: AmbientScene, now: number, width: number, height: number, mobile = false, theme: PainterTheme = 'light', dpr = 1) {
      dpr = Math.max(1, Math.min(2, dpr))
      const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight }
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, pixelWidth, pixelHeight)
      if (now < scene.start || now >= ambientEnd(scene)) return
      const age = now - scene.start
      const draw = clamp(age / scene.draw)
      const erase = clamp((age - scene.draw - scene.hold) / scene.erase)
      const morph = clamp((age - scene.draw - 0.35) / 0.6)
      const smooth = morph * morph * (3 - 2 * morph)
      scene.strokes.forEach((stroke, index) => {
        const points = stroke.regular ? stroke.points.map((p, i) => ({
          x: p.x + (stroke.regular![i].x - p.x) * smooth,
          y: p.y + (stroke.regular![i].y - p.y) * smooth,
        })) : stroke.points
        const key = `${scene.id}:${index}:${stroke.regular ? smooth : 0}`
        let layer = layers[index]
        if (!layer || layer.key !== key) {
          layer?.painter.dispose()
          const target = document.createElement('canvas')
          const scaled = points.map(p => ({ x: p.x * SCALE, y: p.y * SCALE }))
          const times = scaled.map((_, i) => i / (scaled.length - 1))
          const ink = createInk(scaled, times, 0, 1, 0)
          const geometry: Scene = { strokes: [{ name: `ambient-${index}`, raw: [], ink, start: 0, end: 1 }],
            bounds: { minX: 0, minY: 0, maxX: 300 * SCALE, maxY: 90 * SCALE }, aspect: 300 / 90, duration: 1,
            length: ink[ink.length - 1].s }
          layer = { canvas: target, painter: createPainter(geometry, target), key }
          layers[index] = layer
        }
        const laser = scene.kind === 'laser' || scene.pen === 'laser'
        const to = clamp(draw * scene.strokes.length - index)
        const from = clamp(erase * scene.strokes.length - index)
        layer.painter.render({ phase: 'ink', rawTime: -1, inkTime: to, opacity: 1 }, width, height, dpr, theme,
          { pen: stroke.highlight ? 'highlighter' : laser ? 'laser' : scene.pen, color: stroke.highlight ? 'amber' : scene.color, size: 'thin' })
        // 在独立小缓冲上擦除，不能污染 painter 的完整缓存；暂停重绘/主题切换仍可重建。
        if (maskCanvas.width !== pixelWidth || maskCanvas.height !== pixelHeight) { maskCanvas.width = pixelWidth; maskCanvas.height = pixelHeight }
        maskContext.setTransform(1, 0, 0, 1, 0, 0)
        maskContext.clearRect(0, 0, pixelWidth, pixelHeight)
        maskContext.drawImage(layer.canvas, 0, 0)
        const ink = maskContext
        ink.save()
        ink.setTransform(pixelWidth / 300, 0, 0, pixelHeight / 90, 0, 0)
        // 擦除只作用于当前小笔画；首屏全幅橡皮路径与播放状态不参与背景。
        if (!laser && from > 0) {
          ink.globalCompositeOperation = 'destination-out'
          ink.strokeStyle = '#000'
          ink.lineWidth = (mobile ? 12 : 18) * 300 / width
          ink.lineCap = 'round'; ink.lineJoin = 'round'
          ink.beginPath(); ink.moveTo(points[0].x, points[0].y)
          const end = from * (points.length - 1)
          for (let i = 1; i <= Math.floor(end); i++) ink.lineTo(points[i].x, points[i].y)
          const a = points[Math.floor(end)], b = points[Math.min(points.length - 1, Math.ceil(end))]
          ink.lineTo(a.x + (b.x - a.x) * (end % 1), a.y + (b.y - a.y) * (end % 1)); ink.stroke()
        }
        ink.restore()
        if (laser) {
          // x 随写入时间单调增加，分段淡出不修改首屏 painter 的材质缓存。
          for (let part = 0; part < 24; part++) {
            const fade = clamp(1 - (age - part / 24 * scene.draw) / (scene.hold + scene.erase))
            context.save(); context.beginPath()
            const left = part === 0 ? 0 : (8 + part / 24 * 284) / 300 * pixelWidth
            const right = part === 23 ? pixelWidth : (8 + (part + 1) / 24 * 284) / 300 * pixelWidth
            context.rect(left, 0, right - left, pixelHeight); context.clip()
            context.globalAlpha = 0.48 * fade
            context.drawImage(layer.canvas, 0, 0); context.restore()
          }
        } else {
          context.globalAlpha = 0.48
          context.drawImage(maskCanvas, 0, 0)
        }
      })
      context.globalAlpha = 1
    },
  }
}
