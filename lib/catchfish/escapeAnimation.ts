export type EscapeAnimation = {
  spriteIndex: number;
  r: number;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  alpha: number;
  progress: number;
  duration: number;
};

export const ESCAPE_ANIM_DURATION = 0.55;

export function createEscapeAnimation(fish: {
  x: number;
  y: number;
  r: number;
  angle: number;
  spriteIndex: number;
}): EscapeAnimation {
  const speed = 220;
  return {
    spriteIndex: fish.spriteIndex,
    r: fish.r,
    x: fish.x,
    y: fish.y,
    angle: fish.angle,
    vx: Math.cos(fish.angle) * speed,
    vy: Math.sin(fish.angle) * speed,
    alpha: 1,
    progress: 0,
    duration: ESCAPE_ANIM_DURATION,
  };
}

export function escapeAnimPose(anim: EscapeAnimation) {
  const t = Math.min(1, anim.progress);
  return {
    x: anim.x,
    y: anim.y,
    angle: anim.angle,
    alpha: 1 - t * 0.85,
    scaleMul: 1 + t * 0.08,
  };
}
