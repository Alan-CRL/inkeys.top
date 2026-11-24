const fs = require('node:fs')
const path = require('node:path')
const { load, canvasRuntime } = require('./harness.cjs')
const { createCanvas, Path2D, DOMMatrix, ImageData } = canvasRuntime()
global.Path2D = Path2D
global.DOMMatrix = DOMMatrix
global.ImageData = ImageData
global.window = { devicePixelRatio: 1 }
global.document = { createElement: name => {
  if (name !== 'canvas') throw new Error(`Unexpected DOM access: ${name}`)
  return createCanvas(1, 1)
} }
const { createScene, createPainter, timelineAt } = load('softPen')
const scene = createScene()
const out = path.join(__dirname, 'frames')
fs.mkdirSync(out, { recursive: true })
const width = 1000
const height = Math.ceil(width / scene.aspect)
const times = [0, 0.5, 1.1, 2, 3, 4.2, 7.55, 9.9, 12.1, 14.45, 16.65, 20]
for (const time of times) {
  const canvas = createCanvas(1, 1)
  const painter = createPainter(scene, canvas)
  painter.render(timelineAt(time), width, height, 1)
  const composite = createCanvas(width + 80, height + 110)
  const ctx = composite.getContext('2d')
  ctx.fillStyle = '#fafbfc'
  ctx.fillRect(0, 0, composite.width, composite.height)
  ctx.drawImage(canvas, 40, 60)
  fs.writeFileSync(path.join(out, `${time}.png`), composite.toBuffer('image/png'))
  if (time === 4.2) {
    const ink = canvas.getContext('2d')
    ink.globalCompositeOperation = 'source-in'
    ink.fillStyle = '#24272d'
    ink.fillRect(0, 0, width, height)
    ctx.fillStyle = '#fafbfc'
    ctx.fillRect(0, 0, composite.width, composite.height)
    ctx.drawImage(canvas, 40, 60)
    fs.writeFileSync(path.join(out, 'monochrome.png'), composite.toBuffer('image/png'))
  }
}
fs.writeFileSync(path.join(out, 'scene.json'), JSON.stringify(scene))
console.log(`Rendered ${times.length} actual Canvas snapshots at ${out}`)
