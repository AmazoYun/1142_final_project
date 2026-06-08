type Props = {
  facing: "left" | "right";
  walking: boolean;
};

/** 去背壓縮後的三幀素材（統一畫布，腳底對齊） */
const VIEW_W = 880;
const VIEW_H = 880;
const FRAME = { w: VIEW_W, h: VIEW_H };
const STANDSTILL = { ...FRAME, src: "/character/character_standstill.webp" };
const STEPOUT = { ...FRAME, src: "/character/character_stepout.webp" };
const STEPOUT_2 = { ...FRAME, src: "/character/character_stepout_2.webp" };

/** 四段走路 SVG 動畫（still → stepout → still → stepout_2） */
export default function HubPlayer({ facing, walking }: Props) {
  return (
    <div
      className={`hub-player-sprite-wrap ${walking ? "hub-player-sprite-wrap--walk" : ""} ${
        facing === "left" ? "hub-player-sprite-wrap--left" : ""
      }`}
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="hub-player-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="hub-player-frame hub-player-frame--1">
          <image
            href={STANDSTILL.src}
            width={STANDSTILL.w}
            height={STANDSTILL.h}
            preserveAspectRatio="xMidYMax meet"
          />
        </g>
        <g className="hub-player-frame hub-player-frame--2">
          <image
            href={STEPOUT.src}
            width={STEPOUT.w}
            height={STEPOUT.h}
            preserveAspectRatio="xMidYMax meet"
          />
        </g>
        <g className="hub-player-frame hub-player-frame--3">
          <image
            href={STEPOUT_2.src}
            width={STEPOUT_2.w}
            height={STEPOUT_2.h}
            preserveAspectRatio="xMidYMax meet"
          />
        </g>
      </svg>
    </div>
  );
}
