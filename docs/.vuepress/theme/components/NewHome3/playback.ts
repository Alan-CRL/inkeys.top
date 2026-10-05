import type { AnimationState } from './softPen'
import { ERASE_SECONDS } from './eraser'
import { DEFAULT_STYLE, PEN_ORDER } from './styles'
import type { ColorChoice, PenKind, RenderStyle, StrokeSize } from './styles'

export interface PlaybackSettings {
  pens: PenKind[]
  color: ColorChoice
  size: StrokeSize
  eraser?: boolean
}

export interface PlaybackFrame {
  view: 'ink' | 'art'
  state: AnimationState
  style: RenderStyle
  artColor: ColorChoice
  previousColor: ColorChoice
  colorMix: number
  shimmer: number
  eraseProgress: number
  eraseOpacity: number
}

type Stage = 'intro-in' | 'intro-hold' | 'intro-out' | 'raw' | 'raw-hold' | 'ink' | 'hold' | 'fade' | 'erase' | 'erase-hold' | 'erase-out' | 'erase-gap' | 'art-in' | 'art-hold' | 'art' | 'art-out' | 'pause-out' | 'pause-in' | 'paused' | 'resume'
const duration: Record<Stage, number> = {
  'intro-in': 0.5, 'intro-hold': 3, 'intro-out': 0.7,
  raw: 4.2, 'raw-hold': 0.35, ink: 4.2, hold: 3, fade: 0.7,
  erase: ERASE_SECONDS, 'erase-hold': 0.2, 'erase-out': 0.3, 'erase-gap': 0.35,
  'art-in': 0.3, 'art-hold': 3, art: Infinity, 'art-out': 0.7, 'pause-out': 0.22, 'pause-in': 0.3, paused: Infinity, resume: 0.7,
}
const solids: Exclude<ColorChoice, 'rainbow'>[] = ['neutral', 'red', 'amber', 'green', 'cyan', 'blue', 'purple']
const ease = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t) }
const normalize = (s: PlaybackSettings): PlaybackSettings => ({ ...s, eraser: !!s.eraser, pens: PEN_ORDER.filter(p => s.pens.includes(p)) })
const full = (): AnimationState => ({ phase: 'static', rawTime: -1, inkTime: 4.2, opacity: 1 })
const inkFrame = (style: RenderStyle): PlaybackFrame => ({ view: 'ink', state: full(), style, artColor: 'rainbow', previousColor: 'rainbow', colorMix: 1, shimmer: -1, eraseProgress: -1, eraseOpacity: 0 })

/** 只消费可见页面的活跃时间；退场前锁定下一项，退场中的修改留给下一次边界。 */
export function createPlayback(random: () => number = Math.random) {
  let selected: PlaybackSettings = { pens: ['hard'], color: 'rainbow', size: 'medium' }
  let active = normalize(selected)
  let stage: Stage = 'intro-in'
  let started = 0
  let style = { ...DEFAULT_STYLE }
  let paused = false
  let snapshot = inkFrame(DEFAULT_STYLE)
  let previousColor: ColorChoice = 'rainbow'
  let colorStarted = -1
  let exitPlan: { settings: PlaybackSettings, pen?: PenKind } | null = null
  const enter = (next: Stage, at: number) => { stage = next; started = at }
  const hasRaw = () => active.pens.length === 1 && (active.pens[0] === 'hard' || active.pens[0] === 'soft')

  function begin(at: number, settings = selected, pen = settings.pens[0]) {
    active = normalize(settings)
    exitPlan = null
    if (!active.pens.length) {
      previousColor = active.color
      colorStarted = at - 1
      enter('art-in', at)
      return
    }
    const color = active.color === 'rainbow' && pen !== 'hard' && pen !== 'soft'
      ? solids[Math.min(solids.length - 1, Math.max(0, Math.floor(random() * solids.length)))] : active.color
    style = { pen, color, size: active.size }
    enter(hasRaw() ? 'raw' : 'ink', at)
  }

  function artFrame(time: number): PlaybackFrame {
    return { ...inkFrame(DEFAULT_STYLE), view: 'art', artColor: active.color, previousColor,
      colorMix: ease((time - colorStarted) / 0.25) }
  }

  function lockExit(at: number, current: PlaybackFrame, allowErase = true) {
    const settings = normalize(selected)
    // 当前笔即使已取消，也按它在固定笔顺中的位置往后找；橡皮只在本轮末尾执行。
    const later = current.view === 'ink'
      ? settings.pens.find(pen => PEN_ORDER.indexOf(pen) > PEN_ORDER.indexOf(style.pen)) : undefined
    exitPlan = { settings, pen: later ?? settings.pens[0] }
    snapshot = { ...current, shimmer: -1 }
    enter(allowErase && settings.eraser && !later ? 'erase' : current.view === 'art' ? 'art-out' : 'fade', at)
  }

  function finishExit(at: number) {
    const plan = exitPlan!
    begin(at, plan.settings, plan.pen)
  }

  function updatePersistentArt(at: number, current: PlaybackFrame) {
    if (selected.pens.length) lockExit(at, current, false)
    else {
      if (active.color !== selected.color) { previousColor = active.color; colorStarted = at }
      active = normalize(selected)
      if (stage === 'art' && active.eraser) enter('art-hold', at)
    }
  }

  function advance(time: number) {
    // 纳秒归一化让十进制阶段边界不会停在前一帧；一次低帧率更新可跨多个阶段。
    while (Math.round((time - started) * 1e9) / 1e9 >= duration[stage]) {
      const end = started + duration[stage]
      switch (stage) {
        case 'intro-in': enter('intro-hold', end); break
        case 'intro-hold': enter('intro-out', end); break
        case 'art-in':
          enter(active.eraser ? 'art-hold' : 'art', end)
          // 前次退场中排队的修改要在艺术字出现后处理，否则无限保持阶段没有下一边界。
          if (!active.eraser) updatePersistentArt(end, artFrame(end))
          break
        case 'intro-out': case 'resume': begin(end); break
        case 'raw': enter('raw-hold', end); break
        case 'raw-hold': enter('ink', end); break
        case 'ink': enter('hold', end); break
        case 'hold': lockExit(end, inkFrame(style)); break
        case 'art-hold':
          if (!selected.pens.length && !selected.eraser) {
            if (active.color !== selected.color) { previousColor = active.color; colorStarted = end }
            active = normalize(selected)
            enter('art', end)
          }
          else lockExit(end, artFrame(end))
          break
        case 'erase': enter('erase-hold', end); break
        case 'erase-hold': enter('erase-out', end); break
        case 'erase-out': enter('erase-gap', end); break
        case 'fade': case 'art-out': case 'erase-gap': finishExit(end); break
        case 'pause-out': enter('pause-in', end); break
        case 'pause-in': enter(paused ? 'paused' : 'resume', end); break
      }
    }
  }

  function read(time: number, reduced = false): PlaybackFrame {
    if (reduced) {
      if (paused || stage.startsWith('intro') || stage.startsWith('pause') || stage === 'resume') return inkFrame(DEFAULT_STYLE)
      if (!active.pens.length) return { ...inkFrame(DEFAULT_STYLE), view: 'art', artColor: active.color, previousColor: active.color }
      return inkFrame(style)
    }
    advance(time)
    const elapsed = Math.max(0, Math.round((time - started) * 1e9) / 1e9)
    if (stage === 'pause-out' || stage === 'art-out') {
      return { ...snapshot, state: { ...snapshot.state, opacity: snapshot.state.opacity * (1 - ease(elapsed / duration[stage])) } }
    }
    if (stage.startsWith('erase')) {
      // 显现的同时就开始移动和擦除，不插入静止准备阶段；结束后保持已擦空画面。
      const eraseProgress = stage === 'erase' ? Math.min(1, elapsed / duration.erase) : 1
      const eraseOpacity = stage === 'erase' ? ease(elapsed / 0.18)
        : stage === 'erase-out' ? 1 - ease(elapsed / duration['erase-out']) : stage === 'erase-gap' ? 0 : 1
      return { ...snapshot, eraseProgress, eraseOpacity }
    }
    if (stage === 'art' || stage === 'art-in' || stage === 'art-hold') {
      return { ...artFrame(time),
        state: { ...full(), opacity: stage === 'art-in' ? ease(elapsed / 0.3) : 1 },
        shimmer: stage === 'art' && elapsed % 6 < 1.8 ? (elapsed % 6) / 1.8 : -1 }
    }
    const result = inkFrame(stage.startsWith('intro') || stage.startsWith('pause') || stage === 'resume' ? DEFAULT_STYLE : style)
    switch (stage) {
      case 'intro-in': result.state.opacity = ease(elapsed / 0.5); break
      case 'intro-out': case 'resume': result.state = { ...full(), phase: 'fade', opacity: 1 - ease(elapsed / 0.7) }; break
      case 'pause-in': result.state.opacity = ease(elapsed / 0.3); break
      case 'raw': result.state = { phase: 'raw', rawTime: elapsed, inkTime: -1, opacity: 1 }; break
      case 'raw-hold': result.state = { phase: 'raw-hold', rawTime: 4.2, inkTime: -1, opacity: 1 }; break
      case 'ink': result.state = { phase: 'ink', rawTime: hasRaw() ? 4.2 : -1, inkTime: elapsed, opacity: 1 }; break
      case 'hold': result.state.phase = 'hold'; break
      case 'fade': result.state = { ...full(), phase: 'fade', opacity: 1 - ease(elapsed / 0.7) }; break
    }
    return result
  }

  return {
    read,
    get paused() { return paused },
    get animating() { return stage !== 'paused' },
    settleReduced(time: number) {
      // 开启减少动态效果时完成暂停意图，恢复偏好后不会让旧半截墨迹重新出现。
      if (stage === 'pause-out' || stage === 'pause-in') enter(paused ? 'paused' : 'resume', time)
      // 入场已按减少动态效果显示为完整文字，恢复时不能退回半透明的入场帧。
      if (stage === 'intro-in') enter('intro-hold', time)
      if (stage === 'art-in') enter(active.eraser ? 'art-hold' : 'art', time)
      // 减少动态效果已呈现完整字，恢复时先停留，不能突然回到半擦除状态。
      if (stage.startsWith('erase')) enter(snapshot.view === 'art' ? 'art-hold' : 'hold', time)
    },
    configure(next: PlaybackSettings, time: number, reduced = false) {
      const current = read(time, reduced)
      selected = normalize(next)
      if (paused || stage === 'pause-out' || stage === 'pause-in' || stage === 'resume') return
      if (reduced) {
        begin(time)
        // 新选样式已经完整静态显示，恢复动态效果应从成品保持期继续。
        enter(active.pens.length ? 'hold' : active.eraser ? 'art-hold' : 'art', time)
      }
      else if (stage === 'art' || stage === 'art-in') {
        updatePersistentArt(time, current)
      }
    },
    toggle(time: number) {
      const current = read(time)
      paused = !paused
      if (stage === 'pause-out' || stage === 'pause-in') return
      if (paused) { snapshot = current; enter('pause-out', time) }
      else enter('resume', time)
    },
  }
}
