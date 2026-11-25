import { AbsoluteFill, CanvasImage, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import native from './native-assets.json'
import { AngleGraph, TeachingScene } from './TeachingScene'
import { assetFrame, ease, layoutFor, progress, timing } from './timeline'

const BrowserChrome = ({ width }: { width: number }) => (
  <svg width={width} height="54" viewBox={`0 0 ${width} 54`} style={{ position: 'absolute', top: 0, left: 0 }}>
    <path d={`M0 53.5 H${width}`} stroke="#dce4df" />
    <path d="M28 21 L22 27 L28 33 M48 21 L54 27 L48 33" fill="none" stroke="#899f95" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="80" y="13" width={width - 190} height="28" rx="8" fill="#f9fbf8" stroke="#dbe4dd" />
    <path d="M96 26 V23 a3 3 0 0 1 6 0 V26 M95 26 H103 V32 H95Z" fill="none" stroke="#7c978a" strokeWidth="1.2" />
    <path d={`M${width - 83} 27 h9 M${width - 55} 23 h8 v8 h-8 Z M${width - 27} 23 l8 8 m0 -8 l-8 8`} fill="none" stroke="#83998d" strokeWidth="1.2" />
  </svg>
)

const Pointer = ({ frame, mobile }: { frame: number; mobile: boolean }) => {
  const { toolbar, browser } = layoutFor(mobile)
  const ratio = toolbar.width / native.assets['toolbar-draw'].width
  const freeze = [toolbar.x + native.toolbar.freezeHotspot[0] * ratio, toolbar.y + native.toolbar.freezeHotspot[1] * ratio]
  const shape = [toolbar.x + native.toolbar.shapeHotspot[0] * ratio, toolbar.y + native.toolbar.shapeHotspot[1] * ratio]
  const start = [browser.x + browser.width - 70, browser.y + browser.height - 110]
  const approach = progress(frame, 45, 86)
  const changeTool = progress(frame, 150, 172)
  const leave = progress(frame, 220, 234)
  if (frame < 36 || frame >= 238) return null
  const x = start[0] + (freeze[0] - start[0]) * approach + (shape[0] - freeze[0]) * changeTool + leave * 40
  const y = start[1] + (freeze[1] - start[1]) * approach + (shape[1] - freeze[1]) * changeTool - Math.sin(approach * Math.PI) * 28 - Math.sin(changeTool * Math.PI) * 26 - leave * 34
  const pressed = frame >= timing.freezeDown && frame < timing.freeze || frame >= timing.shapeDown && frame < timing.shape
  return (
    <svg width="40" height="48" viewBox="0 0 40 48" style={{ position: 'absolute', left: x - 5, top: y - 3, scale: pressed ? 0.9 : 1, transformOrigin: '5px 3px', opacity: progress(frame, 36, 45) * (1 - leave), filter: 'drop-shadow(0 2px 3px #123f4724)' }}>
      <path d="M5 3 L5 31 Q5 34 8 31 L14 24 L21 39 Q22 42 25 41 L30 39 Q33 38 31 35 L24 21 L33 19 Q36 18 33 15 L9 3 Q5 1 5 3Z" fill="#123f47" stroke="#f1fff8" strokeWidth="1.5" />
    </svg>
  )
}

export const ScreenFreeze = () => {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const mobile = width === 720
  const layout = layoutFor(mobile)
  const { browser, world, toolbar, camera } = layout
  const toolbarFile = frame < timing.freezeHover ? native.assets['toolbar-draw'].file
    : frame < timing.shapeHover ? assetFrame('toolbar-freeze', frame - timing.freezeHover)
      : assetFrame('toolbar-shape', frame - timing.shapeHover)
  return (
    <AbsoluteFill style={{ backgroundColor: '#e5ebe9', overflow: 'hidden' }}>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: browser.x, top: browser.y, width: browser.width, height: browser.height, borderRadius: 18, backgroundColor: '#f8faf6', boxShadow: '0 16px 36px #1c463619, 0 2px 3px #203d3114', overflow: 'hidden', border: '1px solid #cbd8cf' }}>
          <div style={{ position: 'absolute', inset: '54px 0 0', backgroundColor: '#fbfcf8' }} />
          <BrowserChrome width={browser.width} />
        </div>
        <div style={{ position: 'absolute', left: mobile ? 62 : 1080, top: mobile ? 110 : 191, opacity: mobile ? 1 - progress(frame, timing.cameraIn, timing.cameraOut) : 1 }}>
          <AngleGraph frame={frame} mobile={mobile} />
        </div>
        {!mobile && <div style={{ position: 'absolute', left: 1022, top: 150, height: 274, width: 1, backgroundColor: '#d9e2da' }} />}
        {/* 后期取景仅作用于教学画面与原生墨迹，主栏保持真实比例和固定锚点。 */}
        <AbsoluteFill style={{ clipPath: `inset(${browser.y + 55}px ${mobile ? 19 : 422}px ${mobile ? 116 : 123}px ${browser.x + 1}px)` }}>
          <div style={{ position: 'absolute', width: 1440, height: 720, transformOrigin: '0 0',
            left: interpolate(frame, [timing.cameraIn, timing.cameraOut], [world.x, camera.x], ease),
            top: interpolate(frame, [timing.cameraIn, timing.cameraOut], [world.y, camera.y], ease),
            scale: interpolate(frame, [timing.cameraIn, timing.cameraOut], [world.scale, camera.scale], ease),
          }}>
            <TeachingScene frame={frame} />
          </div>
        </AbsoluteFill>
        <div style={{ position: 'absolute', left: mobile ? 74 : 1080, top: mobile ? 535 : 405, fontFamily: 'Georgia, Times New Roman, serif', fontStyle: 'italic', fontSize: mobile ? 27 : 28, color: '#856028', opacity: progress(frame, 624, 650), translate: `0 ${interpolate(frame, [624, 650], [9, 0], ease)}px` }}>
          F<sub style={{ fontSize: '60%' }}>t</sub> = mg sin θ
        </div>
        <CanvasImage src={staticFile(toolbarFile)} style={{ position: 'absolute', left: toolbar.x, top: toolbar.y, width: toolbar.width, height: toolbar.width * 286 / 2738 }} />
        <Pointer frame={frame} mobile={mobile} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
