import type { Theme } from '../theme/tokens'

export type CopyLanguage = 'none' | 'zh-CN' | 'en-US'

const COPY = {
  'zh-CN': { title: '屏幕批注', text: '在任何画面上直接书写。', lineHeight: 1.75 },
  'en-US': { title: 'Screen annotation', text: 'Write directly over anything on your screen.', lineHeight: 1.6 },
}

/**
 * 只用于预览：模拟网页叠在视频上的标题和一句话，用来检查画面有没有给文字留够位置。
 * 导出成片时 language 必须是 'none'，文字由网页自己叠加。
 */
export const CopyOverlay = ({ theme, language }: { readonly theme: Theme; readonly language: CopyLanguage }) => {
  if (language === 'none') return null
  const copy = COPY[language]
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, padding: 32 }}>
      <div style={{ color: theme.text, fontSize: 21, fontWeight: 600, lineHeight: 1.4 }}>{copy.title}</div>
      <div style={{ marginTop: 6, color: theme.text2, fontSize: 16, lineHeight: copy.lineHeight }}>{copy.text}</div>
    </div>
  )
}
