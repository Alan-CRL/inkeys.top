import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { CopyOverlay, type CopyLanguage } from '../../components/CopyOverlay'
import { ScreenFrame } from '../../components/ScreenFrame'
import { InkStroke } from '../../ink/InkStroke'
import { CLAMP } from '../../theme/motion'
import { track } from '../../theme/keys'
import { CARD, FONT, INK, THEMES, type ThemeName } from '../../theme/tokens'
import { cameraAt, stageTransform, WIDE, type Shot } from '../whiteboard/camera'
import { MATTE, PAGE_PITCH, SCREEN, UNIT } from '../whiteboard/layout'
import { SlidePage, TITLE } from './Deck'
import { arrowTip, LASER_TARGET, laserLoop, TIP_GAP, titleCircle, trendArrow } from './ink'
import { LaserStroke } from './Laser'

// S1“PPT 演示”卡片：约 9 秒循环，60 帧每秒。放映时讲的人有两种笔：
//   激光笔只是“看这里”，过一会儿自己消失；普通的笔写下的留在这一页上。
//   特写：激光笔圈住进度线的最后一步 → 镜头拉开，笔圈住标题，激光在这期间渐渐熄灭
//   → 拉到全景，按 Next，第 1 页带着它的圈滑走 → 第 2 页推近，沿柱顶画箭头
//   → 按 Previous，第 1 页带着圈滑回来（激光没有回来）→ 缓慢推向那个圈 → 墨迹淡出，接回开头。
// 软件翻页是立即切换；这里的横移是剪辑上的转场，页码按软件的方式在按下的那一帧更新。

export type SlideShowProps = {
  readonly theme: ThemeName
  /** 预览时叠上网页的标题文字；导出成片时用 'none'。 */
  readonly copy: CopyLanguage
}

const FPS = 60
const frames = (seconds: number) => Math.round(seconds * FPS)

// 激光笔的寿命照软件的默认值：最后一道激光抬笔后满亮保持 1 秒，再用 0.8 秒整条淡出。
const LASER_HOLD = 1.0
const LASER_FADE = 0.8
/** 激光笔默认中档粗细 5 个逻辑单位。 */
const LASER_WIDTH = 5 * UNIT
// 软件里切到别的笔的那一刻，还亮着的激光会被立即清掉，不会和笔迹同时出现；
// 这里按用户 2026-11-22 的要求让激光在笔写别处的时候渐渐熄灭（寿命仍用上面两个真实取值）。
// 要改回和软件完全一致，把 CIRCLE_AT 排到 LASER_GONE 之后即可。
// 激光笔和普通笔的默认颜色都是红色。这里让激光保持红色，笔换成调色板里的蓝，两种笔一眼分得开；
// 蓝色 #326ED9 在深色幻灯片上偏暗，深色版换成调色板里更亮的 #4EA1B7。
const PEN = { light: '#326ed9', dark: '#4ea1b7' } as const

// ── 时间线（帧）。前一段的结束决定后一段的开始。
const LASER_AT = 30
const LASER_END = LASER_AT + frames(laserLoop[laserLoop.length - 1].t)
// 激光圈完，手移到标题那边再落笔。
const CIRCLE_AT = LASER_END + 28
const CIRCLE_END = CIRCLE_AT + frames(titleCircle.duration)
const LASER_DIM = LASER_END + frames(LASER_HOLD)
const LASER_GONE = LASER_DIM + frames(LASER_FADE)
// 激光熄灭后才拉到全景翻页，让人看清它是自己消失的。
const PULL_1 = LASER_GONE - 20
const WIDE_1 = PULL_1 + 38
const FLIP = 26
const FLIP_1 = WIDE_1 + 12
const PUSH_AT = FLIP_1 + 6
const PUSH_END = PUSH_AT + 36
const ARROW_AT = PUSH_END - 2
const ARROW_END = ARROW_AT + frames(trendArrow.duration + TIP_GAP + arrowTip.duration)
const PULL_2 = ARROW_END + 26
const WIDE_2 = PULL_2 + 36
const FLIP_2 = WIDE_2 + 10
// 翻回来以后缓慢推向标题上的圈，这是全片停得最久的一个画面。
const RETURN_AT = FLIP_2 + 10
const RETURN_END = RETURN_AT + 64
const HOME_AT = RETURN_END + 34
const HOME_END = HOME_AT + 38
export const SLIDE_SHOW_FRAMES = HOME_END + 4
/** 各段的起止帧，给抽帧和文档用。 */
export const SLIDE_SHOW_TIMELINE = { LASER_AT, LASER_END, CIRCLE_AT, CIRCLE_END, LASER_DIM, LASER_GONE, WIDE_1, FLIP_1, PUSH_END, ARROW_AT, ARROW_END, WIDE_2, FLIP_2, RETURN_END, HOME_AT, HOME_END }

// ── 机位（屏幕坐标）。
// 几个推近的机位都把屏幕底边的分页栏完全留在画面外，不露半截。
const POINTING = { zoom: 1.8, x: LASER_TARGET.x - 18, y: LASER_TARGET.y - 31 }
// 这个机位同时装得下标题和激光圈：笔在上面写，下面的激光在同一个画面里熄灭。
const BOTH = { zoom: 1.34, x: 157, y: 141 }
const CHART_SHOT = { zoom: 1.34, x: 160, y: 140 }
const KEPT = { zoom: 1.55, x: TITLE.x + TITLE.width / 2 + 2, y: TITLE.baseline + 10 }
const SHOTS: Shot[] = [
  { at: 6, ...WIDE },
  { at: LASER_AT + 8, ...POINTING },
  { at: LASER_END, ...POINTING },
  { at: CIRCLE_AT + 14, ...BOTH },
  { at: PULL_1, ...BOTH },
  { at: WIDE_1, ...WIDE },
  { at: PUSH_AT, ...WIDE },
  { at: PUSH_END, ...CHART_SHOT },
  { at: PULL_2, zoom: 1.37, x: CHART_SHOT.x, y: CHART_SHOT.y, easing: Easing.linear },
  { at: WIDE_2, ...WIDE },
  { at: RETURN_AT, ...WIDE },
  { at: RETURN_END, ...KEPT, easing: Easing.bezier(0.3, 0, 0.1, 1) },
  { at: HOME_AT, zoom: 1.58, x: KEPT.x, y: KEPT.y, easing: Easing.linear },
  { at: HOME_END, ...WIDE },
]

// 第几页在正中：0 是第 1 页，1 是第 2 页。
const pageAt = (frame: number) =>
  track(frame, [
    [FLIP_1, 0],
    [FLIP_1 + FLIP, 1],
    [FLIP_2, 1],
    [FLIP_2 + FLIP, 0],
  ])

// 分页栏原生图（public/slide-show/<主题>/pager-*.png，由 native-slideshow/ 导出）：
// 每个逻辑单位 3 像素，主体 240×80，四周各留 20 个逻辑单位放阴影。按钮格的位置是主体内的逻辑坐标。
const PAGER = { margin: 20, width: 240, height: 80, left: 14, previous: 15, next: 165, top: 5, cell: 70 }
const PRESS_IN = 8
const PRESS_OUT = 16

const Pager = ({ theme }: { readonly theme: ThemeName }) => {
  const frame = useCurrentFrame()
  const page = frame >= FLIP_1 && frame < FLIP_2 ? 2 : 1
  const press = (at: number) => (frame < at ? interpolate(frame, [at - PRESS_IN, at], [0, 1], CLAMP) : interpolate(frame, [at, at + PRESS_OUT], [1, 0], CLAMP))
  const cells = [
    { x: PAGER.next, pressed: press(FLIP_1) },
    { x: PAGER.previous, pressed: press(FLIP_2) },
  ]
  return (
    <div style={{ position: 'absolute', left: SCREEN.x + PAGER.left, top: SCREEN.y + SCREEN.height - (PAGER.height * UNIT) / 2 }}>
      {/* 两张页码图都常驻，只切换显隐，换图时不会闪。 */}
      {([1, 2] as const).map((number) => (
        <Img
          key={number}
          src={staticFile(`slide-show/${theme}/pager-${number}of2.png`)}
          style={{
            position: 'absolute',
            left: -PAGER.margin * UNIT,
            top: -PAGER.margin * UNIT,
            width: (PAGER.width + PAGER.margin * 2) * UNIT,
            height: (PAGER.height + PAGER.margin * 2) * UNIT,
            maxWidth: 'none',
            opacity: page === number ? 1 : 0,
          }}
        />
      ))}
      {/* 按下：这一格压暗。软件里还会把按钮缩到 0.95，这里不缩，镜头在动时缩放的边缘会出现接缝。 */}
      {cells.map(({ x, pressed }) => (
        <div
          key={x}
          style={{
            position: 'absolute',
            left: x * UNIT,
            top: PAGER.top * UNIT,
            width: PAGER.cell * UNIT,
            height: PAGER.cell * UNIT,
            borderRadius: 4 * UNIT,
            backgroundColor: theme === 'dark' ? '#ffffff' : '#000000',
            opacity: pressed * (theme === 'dark' ? 0.16 : 0.1),
          }}
        />
      ))}
    </div>
  )
}

const Deck = ({ theme: themeName }: { readonly theme: ThemeName }) => {
  const theme = THEMES[themeName]
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const page = pageAt(frame)
  // 翻页时按横移的速度加一点水平方向的动态模糊。
  const speed = Math.abs(pageAt(frame + 0.5) - pageAt(frame - 0.5)) * PAGE_PITCH
  const blur = Math.min(16, speed * 0.3)
  const pen = PEN[themeName]
  // 循环的接缝：最后把墨迹淡掉，回到干净的第 1 页。
  const kept = interpolate(frame, [HOME_AT + 4, HOME_AT + 24], [1, 0], CLAMP)
  // 整条一起变淡，曲线照软件：1 − t²(3 − 2t)。
  const fading = interpolate(frame, [LASER_DIM, LASER_GONE], [0, 1], CLAMP)
  const laser = 1 - fading * fading * (3 - 2 * fading)
  return (
    <svg width={SCREEN.width} height={SCREEN.height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <filter id="deck-slide" filterUnits="userSpaceOnUse" x={-PAGE_PITCH} y={0} width={PAGE_PITCH * 3} height={SCREEN.height}>
          <feGaussianBlur stdDeviation={`${blur.toFixed(2)} 0`} />
        </filter>
      </defs>
      {/* 每一页和它自己的墨迹是一个整体，一起滑进滑出。 */}
      <g filter={blur > 0.05 ? 'url(#deck-slide)' : undefined}>
        {page < 1 ? (
          <g transform={`translate(${(-page * PAGE_PITCH).toFixed(3)} 0)`}>
            <rect width={SCREEN.width} height={SCREEN.height} fill={theme.paper} />
            <SlidePage page={1} theme={theme} />
            <g opacity={kept}>
              <InkStroke stroke={titleCircle} time={(frame - CIRCLE_AT) / fps} color={pen} />
            </g>
            <LaserStroke samples={laserLoop} time={(frame - LASER_AT) / fps} opacity={laser} color={INK.softPen} width={LASER_WIDTH} />
          </g>
        ) : null}
        {page > 0 ? (
          <g transform={`translate(${((1 - page) * PAGE_PITCH).toFixed(3)} 0)`}>
            <rect width={SCREEN.width} height={SCREEN.height} fill={theme.paper} />
            <SlidePage page={2} theme={theme} />
            <InkStroke stroke={trendArrow} time={(frame - ARROW_AT) / fps} color={pen} />
            <InkStroke stroke={arrowTip} time={(frame - ARROW_AT) / fps - trendArrow.duration - TIP_GAP} color={pen} />
          </g>
        ) : null}
      </g>
    </svg>
  )
}

export const SlideShowCard = ({ theme: themeName, copy }: SlideShowProps) => {
  const theme = THEMES[themeName]
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ backgroundColor: theme.surface }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: CARD.width, height: CARD.height, scale: String(CARD.scale), transformOrigin: '0 0', fontFamily: FONT.sans }}>
        {/* 文字区以下才是画面。 */}
        <div style={{ position: 'absolute', left: 0, top: MATTE, width: CARD.width, height: CARD.height - MATTE, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: -MATTE, width: CARD.width, height: CARD.height, transformOrigin: '0 0', transform: stageTransform(cameraAt(frame, SHOTS)) }}>
            <ScreenFrame theme={{ ...theme, screen: theme.canvas }} rect={SCREEN}>
              <Deck theme={themeName} />
            </ScreenFrame>
            {/* 分页栏骑在屏幕的底边上，翻页时不动。 */}
            <Pager theme={themeName} />
          </div>
        </div>
        <CopyOverlay theme={theme} language={copy} card="slide-show" />
      </div>
    </AbsoluteFill>
  )
}
