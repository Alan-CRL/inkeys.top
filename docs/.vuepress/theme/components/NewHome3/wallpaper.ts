export interface WallpaperState {
  palettes: [number, number]
  current: number
  fading: boolean
}

export const initialWallpaper = (): WallpaperState => ({ palettes: [0, 0], current: 0, fading: false })

/** 使用活跃秒数，隐藏期间由调用方停钟；不追赶错过的配色轮次。 */
export function createWallpaperSchedule(random: () => number = Math.random) {
  let state = initialWallpaper()
  let interval = 20 + random() * 10
  let deadline = interval
  return {
    advance(now: number): WallpaperState {
      if (now >= deadline) {
        if (state.fading) {
          state = { ...state, current: 1 - state.current, fading: false }
          deadline = now + interval - 6
        }
        else {
          const palettes: [number, number] = [...state.palettes]
          palettes[1 - state.current] = (palettes[state.current] + 1 + Math.min(1, Math.floor(random() * 2))) % 3
          state = { ...state, palettes, fading: true }
          interval = 20 + random() * 10
          deadline = now + 6
        }
      }
      return state
    },
    remaining(now: number) { return Math.max(0, deadline - now) },
  }
}
