import { Composition } from 'remotion'
import { ScreenFreeze } from './ScreenFreeze'

export const RemotionRoot = () => (
  <>
    <Composition id="ScreenFreeze" component={ScreenFreeze} durationInFrames={840} fps={60} width={1440} height={640} />
    <Composition id="ScreenFreezeMobile" component={ScreenFreeze} durationInFrames={840} fps={60} width={720} height={720} />
  </>
)
