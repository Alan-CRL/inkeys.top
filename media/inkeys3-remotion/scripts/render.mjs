import { bundle } from '@remotion/bundler'
import { openBrowser, selectComposition, renderStill, renderMedia } from '@remotion/renderer'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const browserExecutable = process.env.REMOTION_BROWSER || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined)
const stills = process.argv.includes('--stills')
const mobileOnly = process.argv.includes('--mobile')
const ids = mobileOnly ? ['ScreenFreezeMobile'] : ['ScreenFreeze', 'ScreenFreezeMobile']
const selectedFrames = process.argv.find(arg => arg.startsWith('--frames='))?.split('=')[1].split(',').map(Number)
const require = createRequire(import.meta.url)
const rendererRequire = createRequire(require.resolve('@remotion/renderer'))
const ffmpeg = process.env.FFMPEG_BIN || (process.platform === 'win32' ? path.join(path.dirname(rendererRequire.resolve('@remotion/compositor-win32-x64-msvc')), 'ffmpeg.exe') : undefined)
mkdirSync(path.join(root, 'build'), { recursive: true })
mkdirSync(path.join(root, 'out'), { recursive: true })
if (!existsSync(path.join(root, 'src/native-assets.json'))) throw new Error('Run prepare:assets first')

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), outDir: path.join(root, 'build/bundle'), webpackOverride: config => config })
const browser = await openBrowser('chrome', { browserExecutable, chromiumOptions: { headless: true }, logLevel: 'warn' })
try {
  for (const id of ids) {
    const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser })
    if (stills) {
      for (const frame of selectedFrames || [0, 72, 125, 126, 210, 270, 336, 384, 432, 540, 582, 700, 839]) {
        await renderStill({ serveUrl, composition, frame, puppeteerInstance: browser, output: path.join(root, `build/${id}-${String(frame).padStart(4, '0')}.png`), imageFormat: 'png', logLevel: 'warn' })
        console.log(`${id}: rendered frame ${frame}`)
      }
    } else {
      let lastPercent = -1
      const master = path.join(root, `build/${id}-2x.mp4`)
      const output = path.join(root, `out/${id === 'ScreenFreeze' ? 'screen-freeze' : 'screen-freeze-mobile'}.mp4`)
      await renderMedia({ serveUrl, composition, puppeteerInstance: browser, outputLocation: master, codec: 'h264', crf: 12, pixelFormat: 'yuv420p', imageFormat: 'png', scale: 2, concurrency: 3, logLevel: 'warn', onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 10) * 10
        if (percent !== lastPercent) { console.log(`${id}: ${percent}%`); lastPercent = percent }
      } })
      // 2 倍渲染后统一缩采样；网页保持既有尺寸，避免增加播放带宽。
      const encoded = spawnSync(ffmpeg || 'ffmpeg', ['-y', '-v', 'error', '-i', master, '-vf', `scale=${composition.width}:${composition.height}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', output], { windowsHide: true, timeout: 300000, encoding: 'utf8' })
      if (encoded.status !== 0) throw new Error(encoded.stderr || String(encoded.error))
      console.log(`${id}: completed ${output}`)
    }
  }
} finally {
  await browser.close({ silent: true })
}
