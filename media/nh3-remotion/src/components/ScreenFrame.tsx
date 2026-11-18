import type React from 'react'
import type { Theme } from '../theme/tokens'

/** 假屏幕：界面都留在这个框里，被它的圆角裁切；墨迹画在框外的另一层。 */
export const ScreenFrame = ({ theme, rect, children }: { readonly theme: Theme; readonly rect: { x: number; y: number; width: number; height: number; radius: number }; readonly children: React.ReactNode }) => (
  <div
    style={{
      position: 'absolute',
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      overflow: 'hidden',
      borderRadius: rect.radius,
      backgroundColor: theme.screen,
      boxShadow: `0 0 0 1px ${theme.screenLine}, ${theme.screenShadow}`,
    }}
  >
    {children}
  </div>
)
