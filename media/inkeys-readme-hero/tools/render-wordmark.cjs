// README 头图用：复制自 inkeys3-hero/tools/render-wordmark.cjs，仅改输出到本目录并按主题分文件，不覆盖原素材。
// 坐标与原生导出一致：画面 = offset + 字标单位 × scale（scene.json layout.inkeys）。2 倍超采样后由 compose.py 缩回。
// 用法：node media/inkeys3-hero/tools/render-wordmark.cjs [--pen hard|soft] [--theme light|dark]（默认与首屏一致：硬笔、浅色）
const fs = require('node:fs')
const path = require('node:path')
const esbuild = require('esbuild')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const here = path.resolve(__dirname, '..')
const heroRoot = path.resolve(here, '../inkeys3-hero')
const root = path.resolve(here, '../..')
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index > 0 ? process.argv[index + 1] : fallback
}
const pen = arg('pen', 'hard')
const theme = arg('theme', 'light')
const supersample = 2
const scene = JSON.parse(fs.readFileSync(path.join(heroRoot, 'scene.json'), 'utf8'))
const spec = scene.layout.inkeys

const entry = `
import { createPainter, createScene } from './softPen'
window.renderWordmark = (scale, dpr, pen, theme) => {
  const scene = createScene()
  const { minX, minY, maxX, maxY } = scene.bounds
  const canvas = document.createElement('canvas')
  const painter = createPainter(scene, canvas)
  // 完整书写结束后的静态帧：无示意折线、不透明、无擦除。
  painter.render({ phase: 'static', rawTime: -1, inkTime: scene.duration, opacity: 1 },
    (maxX - minX) * scale, (maxY - minY) * scale, dpr, theme, { pen, color: 'rainbow', size: 'medium' }, -1)
  return { png: canvas.toDataURL('image/png'), bounds: scene.bounds }
}
`

async function main() {
  const bundle = await esbuild.build({
    stdin: { contents: entry, resolveDir: path.join(root, 'docs/.vuepress/theme/components/NewHome3'), loader: 'ts' },
    bundle: true, write: false, format: 'iife', target: 'es2022',
  })
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><html><body></body></html>')
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    // painter 内部把 dpr 限制在 1–2，超采样通过放大 CSS 尺寸实现。
    const result = await page.evaluate(([s, p, t]) => window.renderWordmark(s, 1, p, t), [spec.scale * supersample, pen, theme])
    const target = path.join(here, 'sources', `wordmark-${theme}.png`)
    fs.writeFileSync(target, Buffer.from(result.png.split(',')[1], 'base64'))
    // 与 tools/scene_native.py 相同的横向居中：以中心线最左右点居中到 centerX。
    const { minX, minY } = result.bounds
    const glyphs = JSON.parse(fs.readFileSync(path.join(heroRoot, 'data/inkeys-glyphs.json'), 'utf8'))
    const gx = glyphs.strokes.flatMap(stroke => stroke.points.map(point => point[0]))
    const offset = spec.centerX - (Math.min(...gx) + Math.max(...gx)) / 2 * spec.scale
    const meta = { source: 'docs/.vuepress/theme/components/NewHome3/softPen.ts createPainter', pen, theme, color: 'rainbow', supersample,
      x: offset + minX * spec.scale, y: spec.baselineY + minY * spec.scale }
    fs.writeFileSync(path.join(here, 'sources', `wordmark-${theme}.json`), JSON.stringify(meta, null, 2) + '\n')
    console.log('wrote', target, meta)
  }
  finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
