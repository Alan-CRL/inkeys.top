import { FONT, type Theme } from '../../../theme/tokens'
import { PDF, SCREEN } from '../layout'

const LINES = ['Mars travels around the Sun once every', '687 Earth days, almost twice as long as', 'our year. Its axis is tilted by about 25', 'degrees, so Mars has seasons like Earth.', '', 'A day on Mars lasts 24 hours and 37', 'minutes, only a little longer than ours.']

/** 第二拍的示例内容：一页 PDF。 */
export const PdfPage = ({ theme }: { readonly theme: Theme }) => (
  <div style={{ height: '100%', padding: `${PDF.margin}px 0 0 ${PDF.margin}px`, backgroundColor: theme.canvas }}>
    <div style={{ width: SCREEN.width, height: 420, padding: PDF.padding, backgroundColor: theme.paper, fontFamily: FONT.serif }}>
      <div style={{ height: PDF.headingHeight, marginBottom: PDF.headingGap, color: theme.text, fontSize: 18, fontWeight: 700, lineHeight: `${PDF.headingHeight}px`, whiteSpace: 'nowrap' }}>2.3&ensp;Orbit and seasons</div>
      {LINES.map((line, index) => (
        <div key={index} style={{ height: PDF.lineHeight, color: theme.text2, fontSize: 14.5, lineHeight: `${PDF.lineHeight}px`, whiteSpace: 'nowrap' }}>
          {line}
        </div>
      ))}
    </div>
  </div>
)
