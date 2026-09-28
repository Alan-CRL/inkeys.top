declare module '*.vue' {
  import type { ComponentOptions } from 'vue'

  const comp: ComponentOptions
  export default comp
}

declare module '*.svg?raw' {
  const content: string
  export default content
}
