import test from 'node:test'
import assert from 'node:assert/strict'
import { computeDesiredMovement, calculateFacingYaw, smoothAngle } from '../src/avatars/motionMath.js'
const eq = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `Expected ${a} ≈ ${b}`)
test('W forward / S backward; A left / D right, camera yaw=0', () => {
  const w=computeDesiredMovement({inputZ:1}); const s=computeDesiredMovement({inputZ:-1});
  const a=computeDesiredMovement({inputX:-1}); const d=computeDesiredMovement({inputX:1});
  eq(w.vz,-2.4); eq(s.vz,2.4); eq(a.vx,-2.4); eq(d.vx,2.4)
})
test('diagonal W+D does not automatically sprint',()=>{
  const d=computeDesiredMovement({inputX:1,inputZ:1})
  eq(Math.hypot(d.vx,d.vz),2.4)
  const s=computeDesiredMovement({inputX:1,inputZ:1,sprint:true})
  eq(Math.hypot(s.vx,s.vz),4.8)
})
test('shift sprint doubles speed',()=>{
  eq(computeDesiredMovement({inputZ:1,sprint:true}).vz,-4.8)
})
test('front/orbit camera turns W relative to visible screen, not hidden yaw',()=>{
  const d=computeDesiredMovement({inputZ:1,yaw:0,cameraMode:'orbit',cameraYawOffset:Math.PI})
  eq(d.vz,2.4)
  const follow=computeDesiredMovement({inputZ:1,yaw:0,cameraMode:'follow',cameraYawOffset:Math.PI})
  eq(follow.vz,-2.4)
})
test('follow mode ignores orbit yaw offset',()=>{
  eq(computeDesiredMovement({inputZ:1,cameraMode:'follow',cameraYawOffset:Math.PI}).vz,-2.4)
})
test('idle does not make 180 degree reversal',()=>{
  const last=0.45;eq(calculateFacingYaw({previousYaw:last,viewYaw:Math.PI,moving:false}),last)
})
test('S does not turn the avatar to face backward while walking backward',()=>{
  eq(calculateFacingYaw({previousYaw:0,viewYaw:0,vx:0,vz:2.4,forwardInput:-1,moving:true}),0)
})
test('forward chooses world velocity direction',()=>{
  eq(calculateFacingYaw({previousYaw:2,viewYaw:0,vx:0,vz:-2.4,forwardInput:1,moving:true}),0)
})
test('yaw angles interpolate across wrapping boundary by shortest route',()=>{
  const old=Math.PI-0.01;const next=-Math.PI+0.01
  assert.ok(Math.abs(smoothAngle(old,next,0.016)-old)<0.1)
})
test('zero input has zero speed',()=>{
  const a=computeDesiredMovement({inputX:0,inputZ:0});eq(a.speed,0);eq(a.vx,0);eq(a.vz,0)
})
