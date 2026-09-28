import brush1 from './icons/barBrush1.svg?raw'
import brush2 from './icons/barBrush2.svg?raw'
import clean from './icons/barClean.svg?raw'
import eraser from './icons/barEraser.svg?raw'
import freeze from './icons/barFreeze.svg?raw'
import geometry from './icons/barGeometry.svg?raw'
import highlighter from './icons/barHighlighter1.svg?raw'
import laser from './icons/barLaser.svg?raw'
import logo from './icons/logoMark.svg?raw'
import more from './icons/barMore.svg?raw'
import paintBrush from './icons/barPaintBrush.svg?raw'
import recall from './icons/barRecall.svg?raw'
import select from './icons/barSelect.svg?raw'
import setting from './icons/barSetting.svg?raw'
import whiteboard from './icons/barWhiteboard.svg?raw'

export const barIcons = {
  brush1,
  brush2,
  clean,
  eraser,
  freeze,
  geometry,
  highlighter,
  laser,
  logo,
  more,
  paintBrush,
  recall,
  select,
  setting,
  whiteboard,
} as const

export type BarIconName = keyof typeof barIcons
