import { Composition, Folder } from 'remotion'
import { ScreenAnnotationCard } from './cards/screen-annotation/Card'
import { InkTest } from './cards/screen-annotation/InkTest'
import { WhiteboardCard, WHITEBOARD_FRAMES } from './cards/whiteboard/Card'
import { GlyphTest } from './cards/whiteboard/GlyphTest'
import { SlideShowCard, SLIDE_SHOW_FRAMES } from './cards/slide-show/Card'
import { V5Predict, V5Redraw, V5Reveal, V5Taper, V5Title } from './s5a/v5/Frames'
import { V6Latency, V6Opener, V6Predict, V6Taper, V6Title } from './s5a/v6/Frames'
import { S5AFilm } from './s5a/film/Film'
import { DURATION as S5A_DURATION } from './s5a/film/timeline'

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
      <Folder name="S1-Slide-Show">
        <Composition id="S1-SlideShow-Light" component={SlideShowCard} durationInFrames={SLIDE_SHOW_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'none' }} />
        <Composition id="S1-SlideShow-Dark" component={SlideShowCard} durationInFrames={SLIDE_SHOW_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'none' }} />
      </Folder>
      {/* 预览：叠上网页的标题，检查文字和画面的关系；不用于导出。 */}
      <Folder name="Preview-With-Copy">
        <Composition id="Preview-Light-zh" component={ScreenAnnotationCard} durationInFrames={482} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'zh-CN' }} />
        <Composition id="Preview-Dark-en" component={ScreenAnnotationCard} durationInFrames={482} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'en-US' }} />
        <Composition id="Preview-Whiteboard-Light-zh" component={WhiteboardCard} durationInFrames={WHITEBOARD_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'zh-CN' }} />
        <Composition id="Preview-Whiteboard-Dark-en" component={WhiteboardCard} durationInFrames={WHITEBOARD_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'en-US' }} />
        <Composition id="Preview-SlideShow-Light-zh" component={SlideShowCard} durationInFrames={SLIDE_SHOW_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'light', copy: 'zh-CN' }} />
        <Composition id="Preview-SlideShow-Dark-en" component={SlideShowCard} durationInFrames={SLIDE_SHOW_FRAMES} fps={60} width={768} height={1152} defaultProps={{ theme: 'dark', copy: 'en-US' }} />
      </Folder>
      {/* 墨迹测试：软笔放大 3 倍、四分之一速。 */}
      <Folder name="Ink-Test">
        <Composition id="InkTest-Light" component={InkTest} durationInFrames={360} fps={60} width={1280} height={720} defaultProps={{ theme: 'light' }} />
        <Composition id="InkTest-Dark" component={InkTest} durationInFrames={360} fps={60} width={1280} height={720} defaultProps={{ theme: 'dark' }} />
        <Composition id="GlyphTest-Light" component={GlyphTest} durationInFrames={360} fps={60} width={1280} height={720} defaultProps={{ theme: 'light' }} />
      </Folder>
      {/* S5-A 书写体验成片：30 秒循环，三种语言各一版。 */}
      <Folder name="S5A-Film">
        <Composition id="S5A-Film-zh-CN" component={S5AFilm} durationInFrames={S5A_DURATION} fps={60} width={2520} height={1080} defaultProps={{ lang: 'zh-CN' as const }} />
        <Composition id="S5A-Film-zh-TW" component={S5AFilm} durationInFrames={S5A_DURATION} fps={60} width={2520} height={1080} defaultProps={{ lang: 'zh-TW' as const }} />
        <Composition id="S5A-Film-en-US" component={S5AFilm} durationInFrames={S5A_DURATION} fps={60} width={2520} height={1080} defaultProps={{ lang: 'en-US' as const }} />
      </Folder>
      {/* S5-A 书写体验：静态样张，确认画风用。 */}
      <Folder name="S5A-Styleframes">
        <Composition id="S5A-V5-Title" component={V5Title} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V5-Reveal" component={V5Reveal} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V5-Redraw" component={V5Redraw} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V5-Predict" component={V5Predict} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V5-Taper" component={V5Taper} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V6-Title" component={V6Title} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V6-Opener" component={V6Opener} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V6-Latency" component={V6Latency} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V6-Predict" component={V6Predict} durationInFrames={1} fps={60} width={2520} height={1080} />
        <Composition id="S5A-V6-Taper" component={V6Taper} durationInFrames={1} fps={60} width={2520} height={1080} />
      </Folder>
    </>
  )
}
