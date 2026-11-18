import type React from 'react'
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { CLAMP, EASE_OUT } from '../theme/motion'
import type { ThemeName } from '../theme/tokens'

// 主栏用软件原生离屏导出的图层（public/toolbar/<主题>/<状态>.png），这里只做三件事：
// 状态图之间的交叉淡化、整条横向滑动、某个按钮的“按下＋水波”。
//
// 尺寸以软件的逻辑单位表示：主按钮 80×80，间隔 10，主栏 680×80；按钮 70×70，间距 5，圆角 4。
// 图层由 native/crop.py 裁出：主体四周各留 60 像素（每单位 3 像素），放阴影和边缘光；见 public/toolbar/layout.json。

export type ToolbarState = 'soft' | 'highlight' | 'soft-freeze'
const STATES: ToolbarState[] = ['soft', 'highlight', 'soft-freeze']

const MARGIN = 60.5 / 3
const IMAGE = { width: 2431 / 3, height: 361 / 3 }

// 从导出的图里读到的取值：主栏底色及其不透明度、按钮选中时的底色。
const BAR: Record<ThemeName, { color: string; opacity: number; selected: string }> = {
  light: { color: 'rgb(251, 251, 251)', opacity: 0.922, selected: 'rgb(223, 235, 233)' },
  dark: { color: 'rgb(25, 24, 24)', opacity: 0.8, selected: 'rgb(39, 79, 74)' },
}
// 把图层的 alpha 提到 1 的滤镜，见下面“按下的那一格”。
const OPAQUE = 'nh3-toolbar-opaque'

export type ToolbarPress = {
  /** 第几个按钮：0 Select、1 笔、2 Shapes、3 Erase、4 Undo、5 Clear、6 More、7 Board、8 Freeze。 */
  readonly button: number
  /** 按到最深的那一帧，也是松开、起水波的那一帧。 */
  readonly at: number
  /** 按下缩到多少。软件原本是 0.95，在小卡片里只有 3 个像素，看不见，所以放大幅度。 */
  readonly depth: number
  /**
   * 按钮一直是选中的、只是换了图标和文字（Soft Pen → Highlight）时填写。
   * 按软件真实的换内容动画：旧内容缩小淡出，at 那一帧换图，新内容放大淡入；选中底色保持不动。
   */
  readonly swap?: { readonly from: ToolbarState; readonly to: ToolbarState }
}

type Props = {
  readonly theme: ThemeName
  /** 一个逻辑单位对应多少卡片像素。 */
  readonly unit: number
  /** 主体（主按钮左上角）在屏幕框里的位置。 */
  readonly x: number
  readonly y: number
  /** 屏幕框在卡片里的位置和渲染倍率，用来把按钮那一格的边缘对齐到整像素，避免接缝。 */
  readonly origin: { readonly x: number; readonly y: number; readonly scale: number }
  /** 各状态图的权重，三者之和为 1。 */
  readonly weights: Record<ToolbarState, number>
  readonly presses: readonly ToolbarPress[]
  readonly accent: string
}

const PRESS_IN = 8
const PRESS_OUT = 20
const RIPPLE = 27

export const ToolbarStrip = ({ theme, unit, x, y, origin, weights, presses, accent }: Props) => {
  const frame = useCurrentFrame()
  const width = IMAGE.width * unit
  const height = IMAGE.height * unit
  const left = x - MARGIN * unit
  const top = y - MARGIN * unit
  const image = (state: ToolbarState, style: React.CSSProperties) => <Img key={state} src={staticFile(`toolbar/${theme}/${state}.png`)} style={{ position: 'absolute', left: 0, top: 0, width, height, maxWidth: 'none', ...style }} />

  // 把几张状态图按权重叠成一张。半透明的图直接叠会让底色变浓，
  // 所以放进独立的合成组里用相加混合，得到的是严格的线性交叉淡化。
  const mix = (style: React.CSSProperties) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width, height, isolation: 'isolate', ...style }}>{STATES.map(state => image(state, { opacity: weights[state], mixBlendMode: 'plus-lighter' }))}</div>
  )

  // 按钮那一格，四条边对齐到渲染后的整像素。
  const cell = (button: number) => {
    const snap = (value: number, start: number) => Math.round((start + value) * origin.scale) / origin.scale - start
    const l = snap((MARGIN + 95 + 75 * button) * unit, origin.x + left)
    const t = snap((MARGIN + 5) * unit, origin.y + top)
    const r = snap((MARGIN + 165 + 75 * button) * unit, origin.x + left)
    const b = snap((MARGIN + 75) * unit, origin.y + top)
    return { left: l, top: t, width: r - l, height: b - t }
  }

  const active = presses.find(press => frame >= press.at - PRESS_IN && frame < press.at + PRESS_OUT)
  const ripple = presses.find(press => frame >= press.at && frame < press.at + RIPPLE)
  const hole = active ? cell(active.button) : undefined
  const waves = ripple ? cell(ripple.button) : undefined

  return (
    <div style={{ position: 'absolute', left, top, width, height }}>
      {/* 整条主栏；有按钮正在按下时，把那一格挖掉，由下面两层代替。 */}
      {mix(hole ? { clipPath: `path(evenodd, "M0 0H${width}V${height}H0Z M${hole.left} ${hole.top}h${hole.width}v${hole.height}h${-hole.width}Z")` } : {})}
      {active && hole ? (
        // 按下的那一格。主栏是半透明的：缩小的按钮自带一层底色，直接叠在垫底的色块上会变浓。
        // 所以这一格内部全部按不透明来画（滤镜把图层的 alpha 提到 1），再整体套用主栏的不透明度。
        <div style={{ position: 'absolute', ...hole, isolation: 'isolate', opacity: BAR[theme].opacity, backgroundColor: BAR[theme].color }}>
          <svg width={0} height={0} style={{ position: 'absolute' }}>
            <filter id={OPAQUE} colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncA type="discrete" tableValues="1 1" />
              </feComponentTransfer>
            </filter>
          </svg>
          {/* 按钮本身：缩下去，松开时略微回弹过头再归位。 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              scale:
                frame < active.at
                  ? interpolate(frame, [active.at - PRESS_IN, active.at], [1, active.depth], { ...CLAMP, easing: EASE_OUT })
                  : interpolate(frame, [active.at, active.at + PRESS_OUT], [active.depth, 1], { ...CLAMP, easing: Easing.out(Easing.back(1.6)) }),
            }}
          >
            {active.swap ? (
              <>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 4 * unit, backgroundColor: BAR[theme].selected }} />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    borderRadius: 4 * unit,
                    opacity: frame < active.at ? interpolate(frame, [active.at - 5, active.at], [1, 0], CLAMP) : interpolate(frame, [active.at, active.at + 8], [0, 1], CLAMP),
                    scale:
                      frame < active.at
                        ? interpolate(frame, [active.at - 5, active.at], [1, 0.8], { ...CLAMP, easing: Easing.in(Easing.cubic) })
                        : interpolate(frame, [active.at, active.at + 14], [0.8, 1], { ...CLAMP, easing: Easing.out(Easing.back(1.4)) }),
                  }}
                >
                  {image(frame < active.at ? active.swap.from : active.swap.to, { translate: `${-hole.left}px ${-hole.top}px`, filter: `url(#${OPAQUE})` })}
                </div>
              </>
            ) : (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{mix({ translate: `${-hole.left}px ${-hole.top}px`, filter: `url(#${OPAQUE})` })}</div>
            )}
          </div>
        </div>
      ) : null}
      {ripple && waves ? (
        // 水波：松开的瞬间从按钮中心向外扩出一圈。
        <div
          style={{
            position: 'absolute',
            ...waves,
            boxSizing: 'border-box',
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            opacity: interpolate(frame, [ripple.at, ripple.at + RIPPLE], [0.7, 0], CLAMP),
            scale: interpolate(frame, [ripple.at, ripple.at + RIPPLE], [0.55, 1.5], { ...CLAMP, easing: EASE_OUT }),
          }}
        />
      ) : null}
    </div>
  )
}
