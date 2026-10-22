interface PlaneBounds {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

/** 始终对未变换的外层测距，两个展示区共用首屏的 120px 平滑衰减。 */
export function pointerTarget(box: PlaneBounds, clientX: number, clientY: number) {
  if (!box.width || !box.height) return { x: 0, y: 0 }
  const outsideX = Math.max(box.left - clientX, 0, clientX - box.right)
  const outsideY = Math.max(box.top - clientY, 0, clientY - box.bottom)
  const proximity = Math.max(0, 1 - Math.hypot(outsideX, outsideY) / 120)
  const strength = proximity * proximity * (3 - 2 * proximity)
  const x = Math.max(-1, Math.min(1, (clientX - box.left - box.width / 2) / (box.width / 2)))
  const y = Math.max(-1, Math.min(1, (clientY - box.top - box.height / 2) / (box.height / 2)))
  return { x: x * strength, y: y * strength }
}
