export type Ripple = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
};

export type SplashDrop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

export type NetBreakAnim = {
  x: number;
  y: number;
  progress: number;
  duration: number;
};

export class CatchFishEffects {
  ripples: Ripple[] = [];
  splashes: SplashDrop[] = [];
  netBreak: NetBreakAnim | null = null;

  addRipple(x: number, y: number, maxRadius = 28) {
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius,
      alpha: 0.55,
      lineWidth: 1.5,
    });
  }

  addSplash(x: number, y: number, count = 14) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 60 + Math.random() * 120;
      this.splashes.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        size: 2 + Math.random() * 3,
      });
    }
  }

  startNetBreak(x: number, y: number) {
    this.netBreak = { x, y, progress: 0, duration: 1.1 };
    this.addSplash(x, y, 16);
  }

  isNetBreaking() {
    return this.netBreak !== null;
  }

  update(dt: number) {
    for (const ripple of this.ripples) {
      ripple.radius += dt * 42;
      ripple.alpha -= dt * 0.95;
      ripple.lineWidth = Math.max(0.5, ripple.lineWidth - dt * 0.8);
    }
    this.ripples = this.ripples.filter((r) => r.alpha > 0.02 && r.radius < r.maxRadius);

    for (const drop of this.splashes) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.vy += 180 * dt;
      drop.life -= dt;
    }
    this.splashes = this.splashes.filter((d) => d.life > 0);

    if (this.netBreak) {
      this.netBreak.progress += dt / this.netBreak.duration;
      if (this.netBreak.progress >= 1) {
        this.netBreak = null;
      }
    }
  }

  drawRipples(ctx: CanvasRenderingContext2D) {
    for (const ripple of this.ripples) {
      ctx.save();
      ctx.globalAlpha = ripple.alpha;
      ctx.strokeStyle = "rgba(210, 230, 245, 0.85)";
      ctx.lineWidth = ripple.lineWidth;
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawOverlays(ctx: CanvasRenderingContext2D) {
    for (const drop of this.splashes) {
      const t = drop.life / drop.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t) * 0.85;
      ctx.fillStyle = "rgba(190, 220, 245, 0.9)";
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.size * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

  }
}
