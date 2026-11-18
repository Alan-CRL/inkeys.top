import { AbsoluteFill } from 'remotion'
import { SoftPenStroke } from '../../ink/Strokes'
import { INK, THEMES, type ThemeName } from '../../theme/tokens'
import { headlineLoop } from './strokes'

/** 墨迹测试：只有第一拍的软笔，放大 3 倍、四分之一速，用来审阅实时笔锋和粗细变化。 */
export const InkTest = ({ theme }: { readonly theme: ThemeName }) => (
  <AbsoluteFill style={{ backgroundColor: THEMES[theme].screen }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, scale: '3', transformOrigin: '0 0', translate: '157px -363px' }}>
      <SoftPenStroke stroke={headlineLoop} color={INK.softPen} fadeFrom={100000} speed={0.25} />
    </div>
  </AbsoluteFill>
)
