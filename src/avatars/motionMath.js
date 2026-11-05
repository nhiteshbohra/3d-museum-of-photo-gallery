/** Deterministic avatar locomotion calculations. No DOM/Three dependency.
 * World convention: yaw=0 faces -Z; +X is right. 
 * Orbit mode: W follows the *visible* camera heading; not the hidden base yaw.
 */
export function computeDesiredMovement({ inputX = 0, inputZ = 0, yaw = 0, cameraYawOffset = 0, cameraMode = 'follow', sprint = false, walkSpeed = 2.4, sprintMultiplier = 2 }) {
  const x = Number.isFinite(inputX) ? inputX : 0
  const z = Number.isFinite(inputZ) ? inputZ : 0
  const len = Math.hypot(x, z)
  const nx = len > 1 ? x / len : x
  const nz = len > 1 ? z / len : z
  const viewYaw = yaw + (cameraMode === 'orbit' ? cameraYawOffset : 0)
  const speed = walkSpeed * (sprint ? sprintMultiplier : 1)
  const sin = Math.sin(viewYaw)
  const cos = Math.cos(viewYaw)
  return {
    vx: (cos * nx - sin * nz) * speed,
    vz: (-sin * nx - cos * nz) * speed,
    speed: len > 0 ? speed * Math.min(1, len) : 0,
    viewYaw,
    normalizedX: nx,
    normalizedZ: nz,
  }
}

export function calculateFacingYaw({ previousYaw = 0, viewYaw = 0, vx = 0, vz = 0, forwardInput = 0, moving = false }) {
  // Preserve heading on idle. S/backward should not whip the avatar around 180°.
  if (!moving) return previousYaw
  if (forwardInput < -0.05) return viewYaw
  if (Math.hypot(vx, vz) < 0.05) return previousYaw
  return Math.atan2(-vx, -vz)
}

export function smoothAngle(previous, target, dt, response = 10) {
  const delta = Math.atan2(Math.sin(target - previous), Math.cos(target - previous))
  return previous + delta * Math.min(1, Math.max(0, dt) * response)
}
