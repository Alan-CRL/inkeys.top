import { Composition, Folder } from 'remotion'
import { ScreenAnnotationCard } from './cards/screen-annotation/Card'
import { InkTest } from './cards/screen-annotation/InkTest'
import { WhiteboardCard, WHITEBOARD_FRAMES } from './cards/whiteboard/Card'
import { GlyphTest } from './cards/whiteboard/GlyphTest'

export const RemotionRoot = () => {
  return (
    <>
      {/* 成片：不带文字，网页自己叠加标题。 */}
      <Folder name="S1-Screen-Annotation">
        <Composition id="S1-ScreenAnnotation-Light" component={ScreenAnnotationCard} durationInFrames={482} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'none' }} />
        <Composition id="S1-ScreenAnnotation-Dark" component={ScreenAnnotationCard} durationInFrames={482} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'none' }} />
      </Folder>
      <Folder name="S1-Whiteboard">
        <Composition id="S1-Whiteboard-Light" component={WhiteboardCard} durationInFrames={WHITEBOARD_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'none' }} />
        <Composition id="S1-Whiteboard-Dark" component={WhiteboardCard} durationInFrames={WHITEBOARD_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'none' }} />
      </Folder>
      {/* 预览：叠上网页的标题，检查文字和画面的关系；不用于导出。 */}
      <Folder name="Preview-With-Copy">
        <Composition id="Preview-Light-zh" component={ScreenAnnotationCard} durationInFrames={482} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'zh-CN' }} />
        <Composition id="Preview-Dark-en" component={ScreenAnnotationCard} durationInFrames={482} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'en-US' }} />
        <Composition id="Preview-Whiteboard-Light-zh" component={WhiteboardCard} durationInFrames={WHITEBOARD_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'zh-CN' }} />
        <Composition id="Preview-Whiteboard-Dark-en" component={WhiteboardCard} durationInFrames={WHITEBOARD_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'en-US' }} />
      </Folder>
      {/* 墨迹测试：软笔放大 3 倍、四分之一速。 */}
      <Folder name="Ink-Test">
        <Composition id="InkTest-Light" component={InkTest} durationInFrames={360} fps={60} width={1280} height={720} defaultProps={{ theme: 'light' }} />
        <Composition id="InkTest-Dark" component={InkTest} durationInFrames={360} fps={60} width={1280} height={720} defaultProps={{ theme: 'dark' }} />
        <Composition id="GlyphTest-Light" component={GlyphTest} durationInFrames={360} fps={60} width={1280} height={720} defaultProps={{ theme: 'light' }} />
      </Folder>
    </>
  )
}
