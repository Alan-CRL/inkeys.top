import type { Theme } from '../theme/tokens'

export type CopyLanguage = 'none' | 'zh-CN' | 'en-US'

export type CopyCard = 'screen-annotation' | 'whiteboard' | 'slide-show'

const COPY = {
  'screen-annotation': {
    'zh-CN': { title: '屏幕批注', text: '在任何画面上直接书写。', lineHeight: 1.75 },
    'en-US': { title: 'Screen annotation', text: 'Write directly over anything on your screen.', lineHeight: 1.6 },
  },
  whiteboard: {
    'zh-CN': { title: '自由白板', text: '推导与板书，空间足够。', lineHeight: 1.75 },
    'en-US': { title: 'Whiteboard', text: 'Room to work things out, page after page.', lineHeight: 1.6 },
  },
  'slide-show': {
    'zh-CN': { title: 'PPT 演示', text: '放映时自动跟上，边讲边写。', lineHeight: 1.75 },
    'en-US': { title: 'Slide shows', text: 'Follows your slides, so you can write as you present.', lineHeight: 1.6 },
  },
}

/**
 * 只用于预览：模拟网页叠在视频上的标题和一句话，用来检查画面有没有给文字留够位置。
 * 导出成片时 language 必须是 'none'，文字由网页自己叠加。
 */
export const CopyOverlay = ({ theme, language, card = 'screen-annotation' }: { readonly theme: Theme; readonly language: CopyLanguage; readonly card?: CopyCard }) => {
  if (language === 'none') return null
  const copy = COPY[card][language]
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, padding: 32 }}>
      <div style={{ color: theme.text, fontSize: 21, fontWeight: 600, lineHeight: 1.4 }}>{copy.title}</div>
      <div style={{ marginTop: 6, color: theme.text2, fontSize: 16, lineHeight: copy.lineHeight }}>{copy.text}</div>
    </div>
  )
}
