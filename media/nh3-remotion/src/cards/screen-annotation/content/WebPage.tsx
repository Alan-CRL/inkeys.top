import { FONT, type Theme } from '../../../theme/tokens'
import { SCREEN, WEB } from '../layout'

/** 第一拍的示例内容：一篇讲火星的网页。 */
export const WebPage = ({ theme, dark }: { readonly theme: Theme; readonly dark: boolean }) => (
  <div style={{ padding: `${WEB.paddingY}px ${WEB.paddingX}px`, fontFamily: FONT.sans }}>
    <div style={{ height: WEB.headline.height, color: theme.text, fontSize: WEB.headline.fontSize, fontWeight: 600, lineHeight: `${WEB.headline.height}px`, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>The red planet</div>
    <div style={{ marginTop: 42, width: 270, color: theme.text2, fontSize: 13, lineHeight: 1.6 }}>Iron-rich dust covers the surface of Mars. Sunlight scattered by that dust gives the planet its rusty colour.</div>
    <div style={{ position: 'relative', marginTop: 18, width: SCREEN.width, height: 240, overflow: 'hidden', borderRadius: 12, backgroundColor: theme.block }}>
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 24,
          width: 190,
          height: 190,
          borderRadius: '50%',
          background: dark ? 'radial-gradient(circle at 34% 30%, #8c8c8c, #565656 58%, #333333)' : 'radial-gradient(circle at 34% 30%, #cfcfcf, #8e8e8e 58%, #5d5d5d)',
        }}
      />
    </div>
  </div>
)
