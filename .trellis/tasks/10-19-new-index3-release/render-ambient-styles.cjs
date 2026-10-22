// 离屏调用真实生产 painter；仅网格与文字标签属于验证产物。
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { load, canvasRuntime } = require('../10-04-new-index3-wordmark/harness.cjs')
const { createCanvas, Path2D, DOMMatrix, ImageData, loadImage } = canvasRuntime()
Object.assign(global, { Path2D, DOMMatrix, ImageData, document: { createElement: () => createCanvas(1, 1) } })
const { createAmbientPainter } = load('ambientPainter')
const { createAmbientPreview, ambientGeometry, ambientFrame } = load('ambientScene')
const out = process.argv[2] || path.join(require('node:os').tmpdir(), 'inkeys-ambient-styles')
fs.mkdirSync(out, { recursive: true })
const sheets = []
const pens = ['hard', 'soft', 'highlighter', 'laser', 'brush']
const labels = ['硬笔 Hard', '软笔 Soft', '荧光笔 Highlighter', '激光笔 Laser', '毛笔 Brush']
function base(theme, height, title) {
  const canvas = createCanvas(1980, height), ctx = canvas.getContext('2d')
  const labels = []
  ctx.fillText = (text, x, y) => labels.push({ text, x, y, font: ctx.font, color: ctx.fillStyle })
  sheets.push({ canvas, labels })
  ctx.fillStyle = theme === 'dark' ? '#121a25' : '#f6f8fa'; ctx.fillRect(0, 0, canvas.width, height)
  ctx.fillStyle = theme === 'dark' ? '#e3e7ef' : '#30343d'; ctx.font = 'bold 28px "Microsoft YaHei"'; ctx.fillText(title, 30, 48)
  ctx.font = '20px "Microsoft YaHei"'; ctx.fillText('生产渲染器 · 每格 300×90 CSS px · DPR 2（2×放大展示）· 原始透明度，无增强', 30, 88)
  return { canvas, ctx }
}
function draw(ctx, scene, time, x, y, theme) {
  const tile = createCanvas(1, 1), painter = createAmbientPainter(tile)
  painter.render(scene, time, 300, 90, false, theme, 2)
  ctx.drawImage(tile, x, y)
  assert.ok(tile.getContext('2d').getImageData(0, 0, tile.width, tile.height).data.some((v, i) => i % 4 === 3 && v > 0))
  painter.dispose()
}
async function main() {
  for (const theme of ['light', 'dark']) {
    const { canvas, ctx } = base(theme, 1110, `背景绘制五种笔型 / ${theme === 'dark' ? '深色' : '浅色'}`)
    ;['平滑数字 + 荧光标记', '平滑波浪', '短横线'].forEach((s, i) => ctx.fillText(s, 200 + i * 590, 132))
    pens.forEach((pen, row) => {
      ctx.font = '20px "Microsoft YaHei"'; ctx.fillText(labels[row], 22, 215 + row * 185)
      for (let column = 0; column < 3; column++) {
        const scene = createAmbientPreview(column === 0 ? 'digits' : 'pen', pen)
        if (column > 0) scene.strokes = ambientGeometry('pen', () => column === 1 ? 0.4 : 0.2)
        draw(ctx, scene, scene.draw + .05, 180 + column * 590, 150 + row * 185, theme)
      }
    })
    fs.writeFileSync(path.join(out, `ambient-all-pens-${theme}.png`), canvas.toBuffer('image/png'))
    const examples = base(theme, 770, `图形识别与小橡皮 / ${theme === 'dark' ? '深色' : '浅色'}`)
    ;['识别前 / 原笔迹', '识别后 / 规整形状', '擦除进行中'].forEach((s, i) => examples.ctx.fillText(s, 200 + i * 590, 132))
    const source = fs.readFileSync('docs/.vuepress/theme/components/NewHome3/AmbientInk.vue', 'utf8')
    const circle = source.match(/<circle r="1"[^>]*\/>/)[0]
    const rect = source.match(/<rect v-for="side in \[-1, 1\]"[^>]*\/>/)[0]
    for (let row = 0; row < 3; row++) {
      const scene = createAmbientPreview(row === 2 ? 'digits' : 'shape', 'hard')
      if (row < 2) scene.strokes = ambientGeometry('shape', () => row === 0 ? 0.4 : 0.8)
      examples.ctx.fillText(['矩形', '圆形', '数字'][row], 25, 220 + row * 185)
      for (let col = 0; col < 3; col++) {
        const time = col === 0 ? scene.draw + .05 : col === 1 ? scene.draw + 1 : scene.draw + scene.hold + scene.erase * .32
        const x = 180 + col * 590, y = 150 + row * 185
        draw(examples.ctx, scene, time, x, y, theme)
        const cursor = ambientFrame(scene, time).cursor
        if (cursor) {
          // 直接读取生产组件的橡皮 SVG 标记，保持同一轮廓和比例。
          const rects = [-1, 1].map(side => rect.replace(/v-for="[^"]*"|:key="[^"]*"/g, '').replace(/:x="[^"]*"/, `x="${side * .24 - .1}"`)).join('')
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180" viewBox="0 0 300 90"><g opacity=".75" transform="translate(${cursor.x} ${cursor.y}) scale(9)">${circle}${rects}</g></svg>`
          examples.ctx.drawImage(await loadImage(Buffer.from(svg)), x, y)
        }
      }
    }
    fs.writeFileSync(path.join(out, `ambient-shapes-eraser-${theme}.png`), examples.canvas.toBuffer('image/png'))
  }
  // 本机 napi Canvas 缺少 ICU，文字标签由无窗口浏览器排版，不改动笔迹像素。
  const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const names = ['ambient-all-pens-light', 'ambient-shapes-eraser-light', 'ambient-all-pens-dark', 'ambient-shapes-eraser-dark']
    for (let i = 0; i < sheets.length; i++) {
      const { canvas, labels } = sheets[i]
      const page = await browser.newPage({ viewport: { width: canvas.width, height: canvas.height } })
      await page.setContent(`<body style="margin:0"><img style="position:absolute" src="data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}">${labels.map(l => `<div style="position:absolute;left:${l.x}px;top:${l.y - (l.font.includes('28px') ? 30 : 23)}px;color:${l.color};font:${l.font};white-space:nowrap">${l.text}</div>`).join('')}</body>`)
      await page.screenshot({ path: path.join(out, `${names[i]}.png`) })
      await page.close()
    }
  } finally { await browser.close() }
  console.log(JSON.stringify({ passed: true, output: out, images: 4 }))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
