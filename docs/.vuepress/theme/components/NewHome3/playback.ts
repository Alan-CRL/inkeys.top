import type { AnimationState } from './softPen'
import { DEFAULT_STYLE, PEN_ORDER } from './styles'
import type { ColorChoice, PenKind, RenderStyle, StrokeSize } from './styles'

export interface PlaybackSettings {
  pens: PenKind[]
  color: ColorChoice
  size: StrokeSize
}

export interface PlaybackFrame {
  view: 'ink' | 'art'
  state: AnimationState
  style: RenderStyle
  artColor: ColorChoice
  previousColor: ColorChoice
  colorMix: number
  shimmer: number
}

type Stage = 'intro-in' | 'intro-hold' | 'intro-out' | 'raw' | 'raw-hold' | 'ink' | 'hold' | 'fade' | 'art-in' | 'art' | 'art-out' | 'pause-out' | 'pause-in' | 'paused' | 'resume'
const duration: Record<Stage, number> = {
  'intro-in': 0.5, 'intro-hold': 3, 'intro-out': 0.7,
  raw: 4.2, 'raw-hold': 0.35, ink: 4.2, hold: 3, fade: 0.7,
  'art-in': 0.3, art: Infinity, 'art-out': 0.7, 'pause-out': 0.22, 'pause-in': 0.3, paused: Infinity, resume: 0.7,
}
const solids: Exclude<ColorChoice, 'rainbow'>[] = ['neutral', 'red', 'amber', 'green', 'cyan', 'blue', 'purple']
const ease = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t) }
const normalize = (s: PlaybackSettings): PlaybackSettings => ({ ...s, pens: PEN_ORDER.filter(p => s.pens.includes(p)) })
const full = (): AnimationState => ({ phase: 'static', rawTime: -1, inkTime: 4.2, opacity: 1 })
const inkFrame = (style: RenderStyle): PlaybackFrame => ({ view: 'ink', state: full(), style, artColor: 'rainbow', previousColor: 'rainbow', colorMix: 1, shimmer: -1 })

/** 只消费可见页面的活跃时间。选项先排队，到当前笔渐隐结束才提交。 */
export function createPlayback(random: () => number = Math.random) {
  let selected: PlaybackSettings = { pens: ['hard'], color: 'rainbow', size: 'medium' }
  let active = normalize(selected)
  let stage: Stage = 'intro-in'
  let started = 0
  let index = 0
  let style = { ...DEFAULT_STYLE }
  let paused = false
  let snapshot = inkFrame(DEFAULT_STYLE)
  let previousColor: ColorChoice = 'rainbow'
  let colorStarted = -1
  const enter = (next: Stage, at: number) => { stage = next; started = at }
  const hasRaw = () => active.pens.length === 1 && (active.pens[0] === 'hard' || active.pens[0] === 'soft')

  function begin(at: number, restart: boolean) {
    const changed = active.pens.join() !== selected.pens.join()
    active = normalize(selected)
    index = restart || changed ? 0 : (index + 1) % Math.max(1, active.pens.length)
    if (!active.pens.length) {
      previousColor = active.color
      colorStarted = at - 1
      enter('art-in', at)
      return
    }
    const pen = active.pens[index]
    const color = active.color === 'rainbow' && pen !== 'hard' && pen !== 'soft'
      ? solids[Math.min(solids.length - 1, Math.max(0, Math.floor(random() * solids.length)))] : active.color
    style = { pen, color, size: active.size }
    enter(hasRaw() ? 'raw' : 'ink', at)
  }

  function advance(time: number) {
    // 纳秒归一化让十进制阶段边界不会停在前一帧；一次低帧率更新可跨多个阶段。
    while (Math.round((time - started) * 1e9) / 1e9 >= duration[stage]) {
      const end = started + duration[stage]
      switch (stage) {
        case 'intro-in': enter('intro-hold', end); break
        case 'intro-hold': enter('intro-out', end); break
        case 'art-in': enter('art', end); break
        case 'intro-out': case 'art-out': case 'resume': begin(end, true); break
        case 'raw': enter('raw-hold', end); break
        case 'raw-hold': enter('ink', end); break
        case 'ink': enter('hold', end); break
        case 'hold': enter('fade', end); break
        case 'fade': begin(end, false); break
        case 'pause-out': enter('pause-in', end); break
        case 'pause-in': enter(paused ? 'paused' : 'resume', end); break
      }
    }
  }

  function read(time: number, reduced = false): PlaybackFrame {
    if (reduced) {
      if (paused || stage.startsWith('intro') || stage.startsWith('pause') || stage === 'resume') return inkFrame(DEFAULT_STYLE)
      if (!selected.pens.length) return { ...inkFrame(DEFAULT_STYLE), view: 'art', artColor: selected.color, previousColor: selected.color }
      return inkFrame(style)
    }
    advance(time)
    const elapsed = Math.max(0, Math.round((time - started) * 1e9) / 1e9)
    if (stage === 'pause-out' || stage === 'art-out') {
      return { ...snapshot, state: { ...snapshot.state, opacity: snapshot.state.opacity * (1 - ease(elapsed / duration[stage])) } }
    }
    if (stage === 'art' || stage === 'art-in') {
      return { ...inkFrame(DEFAULT_STYLE), view: 'art', artColor: active.color, previousColor,
        state: { ...full(), opacity: stage === 'art-in' ? ease(elapsed / 0.3) : 1 },
        colorMix: ease((time - colorStarted) / 0.25), shimmer: stage === 'art' && elapsed % 6 < 1.8 ? (elapsed % 6) / 1.8 : -1 }
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
      if (stage === 'art-in') enter('art', time)
    },
    configure(next: PlaybackSettings, time: number, reduced = false) {
      const current = read(time, reduced)
      selected = normalize(next)
      if (paused || stage === 'pause-out' || stage === 'pause-in' || stage === 'resume') return
      if (reduced) {
        begin(time, true)
        // 新选样式已经完整静态显示，恢复动态效果应从成品保持期继续。
        enter(active.pens.length ? 'hold' : 'art', time)
      }
      else if (stage === 'art' || stage === 'art-in') {
        if (selected.pens.length) {
          snapshot = current
          enter('art-out', time)
        }
        else {
          if (active.color !== selected.color) { previousColor = active.color; colorStarted = time }
          active = normalize(selected)
        }
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
