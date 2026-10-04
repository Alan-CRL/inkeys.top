export type PenKind = 'hard' | 'soft' | 'highlighter' | 'laser' | 'brush'
export type ColorChoice = 'rainbow' | 'neutral' | 'red' | 'amber' | 'green' | 'cyan' | 'blue' | 'purple'
export type StrokeSize = 'thin' | 'medium' | 'thick'

export interface RenderStyle {
  pen: PenKind
  color: ColorChoice
  size: StrokeSize
}

export const PEN_ORDER: PenKind[] = ['hard', 'soft', 'highlighter', 'laser', 'brush']
export const DEFAULT_STYLE: RenderStyle = { pen: 'hard', color: 'rainbow', size: 'medium' }
export const SIZE_SCALE: Record<StrokeSize, number> = { thin: 0.7, medium: 1, thick: 1.4 }

const solidColors: Record<Exclude<ColorChoice, 'rainbow'>, [string, string]> = {
  neutral: ['#30343d', '#e3e7ef'],
  red: ['#e95765', '#f18f9e'],
  amber: ['#e3a520', '#f2c662'],
  green: ['#39a77e', '#84d6b0'],
  cyan: ['#159fb2', '#4cc6c3'],
  blue: ['#428bce', '#6fb6e2'],
  purple: ['#9368be', '#c095d8'],
}

export function resolveSolidColor(color: Exclude<ColorChoice, 'rainbow'>, theme: 'light' | 'dark') {
  return solidColors[color][theme === 'dark' ? 1 : 0]
}
