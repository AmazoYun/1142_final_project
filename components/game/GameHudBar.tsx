import type { ReactNode } from "react";

type GameHudBarProps = {
  score: number;
  resource: number;
  resourceLabel: string;
  resourceMax?: number;
  scoreFlash?: "up" | "down" | null;
  extra?: ReactNode;
  className?: string;
};

export default function GameHudBar({
  score,
  resource,
  resourceLabel,
  resourceMax,
  scoreFlash,
  extra,
  className = "",
}: GameHudBarProps) {
  const scoreClass =
    scoreFlash === "up"
      ? "game-hud-stat--flash-up"
      : scoreFlash === "down"
        ? "game-hud-stat--flash-down"
        : "";

  return (
    <div className={`game-hud-bar ${className}`.trim()} aria-label="遊戲資訊">
      <div className={`game-hud-stat ${scoreClass}`.trim()}>
        <span className="game-hud-stat__label">得分</span>
        <span className="game-hud-stat__value tabular-nums">{score}</span>
      </div>

      {extra}

      <div className="game-hud-stat">
        <span className="game-hud-stat__label">{resourceLabel}</span>
        <span className="game-hud-stat__value tabular-nums">
          {resourceMax != null ? `${resource} / ${resourceMax}` : resource}
        </span>
      </div>
    </div>
  );
}

export function GameHudExtraStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`game-hud-stat ${accent ? "game-hud-stat--accent" : ""}`.trim()}
    >
      <span className="game-hud-stat__label">{label}</span>
      <span className="game-hud-stat__value tabular-nums">{value}</span>
    </div>
  );
}
