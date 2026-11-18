import type React from 'react'
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { CLAMP, EASE_OUT } from '../../theme/motion'
import type { ThemeName } from '../../theme/tokens'
import { SCREEN, UNIT } from './layout'

// 白板模式下屏幕底边的界面：左下角的分页栏，右边接着主按钮和主栏（主栏伸出卡片）。
// 两者都是软件原生离屏导出的图层（public/whiteboard/<主题>/…，由 native-whiteboard/ 导出，尺寸见同目录的 layout.json）。
// 每个逻辑单位 3 像素，主体四周各留约 20 个逻辑单位放阴影和边缘光。
const PAGER = { image: { width: 1035 / 3, height: 360 / 3 }, margin: 60 / 3, width: 305, addPage: { x: 155, y: 5, size: 70 } }
const TOOLBAR = { image: { width: 2206 / 3, height: 361 / 3 }, margin: 60.5 / 3 }
const BAR_HEIGHT = 80
/** 分页栏和主按钮之间的间隔（逻辑单位）。真实屏幕上两者离得很远；这里的假屏幕很小，所以挨在一起。 */
const GAP = 10

/** 界面骑在屏幕的底边上：主体的顶边位置，以及分页栏主体的左边位置（卡片坐标）。 */
export const CHROME_TOP = SCREEN.y + SCREEN.height - (BAR_HEIGHT * UNIT) / 2
const PAGER_LEFT = 16
const TOOLBAR_LEFT = PAGER_LEFT + (PAGER.width + GAP) * UNIT

const PRESS_IN = 8
const PRESS_OUT = 14
const RIPPLE = 27

type Props = {
  readonly theme: ThemeName
  /** 按下“Add page”的那一帧：页码在这一帧从 1/1 变成 2/2（软件里页码立即更新）。 */
  readonly addPageAt: number
  readonly accent: string
}

export const Chrome = ({ theme, addPageAt, accent }: Props) => {
  const frame = useCurrentFrame()
  const layer = (name: string, spec: { image: { width: number; height: number }; margin: number }, left: number): React.CSSProperties & { src: string } => ({
    src: staticFile(`whiteboard/${theme}/${name}.png`),
    position: 'absolute',
    left: left - spec.margin * UNIT,
    top: CHROME_TOP - spec.margin * UNIT,
    width: spec.image.width * UNIT,
    height: spec.image.height * UNIT,
    maxWidth: 'none',
  })
  const pager = ({ src, ...style }: ReturnType<typeof layer>, visible: boolean) => <Img src={src} style={{ ...style, opacity: visible ? 1 : 0 }} />
  const { src: toolbarSrc, ...toolbarStyle } = layer('toolbar', TOOLBAR, TOOLBAR_LEFT)
  // “Add page”那一格。按下：这一格压暗一下；松开：扩出一圈水波。不缩放按钮，镜头在动时缩放的边缘会出现接缝。
  const cell = { left: PAGER_LEFT + PAGER.addPage.x * UNIT, top: CHROME_TOP + PAGER.addPage.y * UNIT, width: PAGER.addPage.size * UNIT, height: PAGER.addPage.size * UNIT }
  const pressed = frame < addPageAt ? interpolate(frame, [addPageAt - PRESS_IN, addPageAt], [0, 1], { ...CLAMP, easing: EASE_OUT }) : interpolate(frame, [addPageAt, addPageAt + PRESS_OUT], [1, 0], CLAMP)
  const rippling = frame >= addPageAt && frame < addPageAt + RIPPLE
  return (
    <>
      {/* 两张页码图都常驻，只切换显隐，避免换图时闪一下。 */}
      {pager(layer('pager-1of1', PAGER, PAGER_LEFT), frame < addPageAt)}
      {pager(layer('pager-2of2', PAGER, PAGER_LEFT), frame >= addPageAt)}
      <Img src={toolbarSrc} style={toolbarStyle} />
      <div style={{ position: 'absolute', ...cell, borderRadius: 4 * UNIT, backgroundColor: theme === 'dark' ? '#ffffff' : '#000000', opacity: pressed * (theme === 'dark' ? 0.14 : 0.09) }} />
      {rippling ? (
        <div
          style={{
            position: 'absolute',
            ...cell,
            boxSizing: 'border-box',
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            opacity: interpolate(frame, [addPageAt, addPageAt + RIPPLE], [0.7, 0], CLAMP),
            scale: String(interpolate(frame, [addPageAt, addPageAt + RIPPLE], [0.55, 1.5], { ...CLAMP, easing: EASE_OUT })),
          }}
        />
      ) : null}
    </>
  )
}
