export const PHYSICS = { gravity: 1850, jumpVelocity: 640, releaseVelocity: 290, holdGravity: 1050, maxHold: .19, buffer: .12, coyote: .08, minSpeed: 300, maxSpeed: 570, acceleration: 3.8 } as const;
export type ObstacleKind = 'rock' | 'stump' | 'crystal';
export interface Obstacle { x: number; width: number; height: number; kind: ObstacleKind; variant: number }
export class Runner {
  y = 0; velocity = 0; held = false; buffered = 0; groundedFor = 0; holdTime = 0; land = 0; squash = 0;
  press() { this.held = true; this.buffered = PHYSICS.buffer; }
  release() { this.held = false; if (this.velocity > PHYSICS.releaseVelocity) this.velocity = PHYSICS.releaseVelocity; }
  reset() { this.y=0; this.velocity=0; this.held=false; this.buffered=0; this.groundedFor=0; this.holdTime=0; this.land=0; this.squash=0; }
  step(dt: number): 'jump' | 'land' | undefined {
    let event: 'jump' | 'land' | undefined;
    this.land = Math.max(0, this.land - dt * 5); this.squash = Math.max(0, this.squash - dt * 11);
    this.groundedFor = this.y === 0 ? 0 : this.groundedFor + dt;
    if (this.buffered > 0 && this.groundedFor <= PHYSICS.coyote && this.velocity <= 0) {
      this.velocity = this.held ? PHYSICS.jumpVelocity : 420; this.holdTime=0; this.buffered=0; this.groundedFor=1; this.squash=1; event='jump';
    }
    this.buffered = Math.max(0, this.buffered-dt);
    if (this.y > 0 || this.velocity > 0) {
      this.holdTime += dt;
      this.velocity -= (this.held && this.velocity > 0 && this.holdTime < PHYSICS.maxHold ? PHYSICS.holdGravity : PHYSICS.gravity) * dt;
      this.y += this.velocity * dt;
      if (this.y <= 0) { this.y=0; this.velocity=0; this.land=1; this.groundedFor=0; event='land'; }
    }
    return event;
  }
}
export function speedAt(seconds: number) { return Math.min(PHYSICS.maxSpeed, PHYSICS.minSpeed + seconds * PHYSICS.acceleration); }
// A full-height jump stays airborne for < .88s; preserve recovery and reaction time at the speed cap.
export function safeGap(speed: number, random: number) { return speed * (1.18 + random * .48) + 85; }
export function collides(runner: Runner, playerX: number, obstacle: Obstacle) {
  return playerX + 24 > obstacle.x + 9 && playerX - 16 < obstacle.x + obstacle.width - 9 && runner.y + 8 < obstacle.height - 7 && runner.y + 62 > 7;
}
export function readBest(storage?: Pick<Storage, 'getItem'>) {
  try { const n=Number(storage?.getItem('amber-run-best')); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; } catch { return 0; }
}
export function saveBest(best: number, storage?: Pick<Storage, 'setItem'>) { try { storage?.setItem('amber-run-best', String(best)); return true; } catch { return false; } }
