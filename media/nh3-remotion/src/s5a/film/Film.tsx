// S5-A 书写体验成片：约 30 秒循环，21:9，三种语言各一版（深浅色网页共用一支）。
// 分镜：.trellis/tasks/11-22-new-index3-s5a-writing/storyboard-v6.md；第七版改动：同目录 revision-v7-plan.md。

import { useCurrentFrame } from 'remotion'
import { Act1, Act2, Act3, Switch } from './Acts'
import { COPY, type Lang } from './copy'
import { T } from './timeline'

export const S5AFilm = ({ lang }: { readonly lang: Lang }) => {
  const f = useCurrentFrame()
  const copy = COPY[lang]
  // 每一幕在自己的时段里画；明暗切换时上一幕继续播放，新主题的卡从下方升起盖住它。
  // 第三幕与第一幕同为暗场：第三幕的卡片沉回画面下方，留下空暗场，接回第 0 帧。
  if (f < T.x1[1])
    return (
      <>
        <Act1 f={f} copy={copy} />
        <Switch f={f} from={T.x1[0]} to={T.x1[1]} scene="light" />
      </>
    )
  if (f < T.x2[1])
    return (
      <>
        <Act2 f={f} copy={copy} />
        <Switch f={f} from={T.x2[0]} to={T.x2[1]} scene="dark" />
      </>
    )
  return <Act3 f={f} copy={copy} />
}
