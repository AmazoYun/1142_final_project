type Props = {
  facing: "left" | "right";
  walking: boolean;
};

function PlayerDefs() {
  return (
    <defs>
      <linearGradient id="hub-player-skin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f5dcc8" />
        <stop offset="100%" stopColor="#e8c4a8" />
      </linearGradient>
      <linearGradient id="hub-player-hoodie" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4a6fa5" />
        <stop offset="100%" stopColor="#355580" />
      </linearGradient>
      <linearGradient id="hub-player-jeans" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3d4f63" />
        <stop offset="100%" stopColor="#2a3644" />
      </linearGradient>
    </defs>
  );
}

function WalkFrame1() {
  return (
    <g>
      {/* 背包 */}
      <rect x="30" y="20" width="9" height="14" rx="2" fill="#6b5344" />
      <rect x="31.5" y="22" width="6" height="9" rx="1" fill="#7a6352" />

      {/* 頭 */}
      <ellipse cx="24" cy="12" rx="7" ry="8" fill="url(#hub-player-skin)" />
      <path
        d="M17 9 C18 5 21 4 24 4 C27 4 30 5 31 9 C30.5 11 28 12 24 12 C20 12 17.5 11 17 9 Z"
        fill="#2a2420"
      />
      <ellipse cx="21" cy="12" rx="1.4" ry="1.8" fill="#2a2420" />
      <ellipse cx="27" cy="12" rx="1.4" ry="1.8" fill="#2a2420" />
      <circle cx="21.4" cy="12.2" r="0.55" fill="#f8f4ee" />
      <circle cx="27.4" cy="12.2" r="0.55" fill="#f8f4ee" />
      <ellipse cx="18.5" cy="14" rx="1.2" ry="0.7" fill="#efb8a8" opacity="0.45" />
      <ellipse cx="29.5" cy="14" rx="1.2" ry="0.7" fill="#efb8a8" opacity="0.45" />
      <path d="M22.5 15.5 Q24 16.2 25.5 15.5" stroke="#c8907a" strokeWidth="0.7" fill="none" />

      {/* 連帽衫 */}
      <path
        d="M13 19 C15 17 19 16 24 16.5 C29 16 33 17 35 19 L37 41 C36 47 31 51 24 51 C17 51 12 47 11 41 Z"
        fill="url(#hub-player-hoodie)"
      />
      <path d="M20 16.5 L24 22 L28 16.5" fill="#3a5880" />
      <ellipse cx="24" cy="28" rx="5" ry="6" fill="#f0ece4" opacity="0.85" />

      {/* 手臂 */}
      <path
        d="M12 22 C9 27 8 34 10 41"
        stroke="#355580"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36 22 C39 27 40 34 38 41"
        stroke="#355580"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="10" cy="41.5" r="2" fill="url(#hub-player-skin)" />

      {/* 牛仔褲 */}
      <path d="M19 51 L17 68 L15 76" stroke="url(#hub-player-jeans)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <path d="M29 51 L31 67 L33 75" stroke="url(#hub-player-jeans)" strokeWidth="3.6" strokeLinecap="round" fill="none" />

      {/* 球鞋 */}
      <ellipse cx="15" cy="76.5" rx="3.2" ry="1.7" fill="#f2f2f2" />
      <ellipse cx="33" cy="75.5" rx="3.2" ry="1.7" fill="#f2f2f2" />
      <ellipse cx="15" cy="77" rx="3.2" ry="0.8" fill="#6a7580" />
      <ellipse cx="33" cy="76" rx="3.2" ry="0.8" fill="#6a7580" />
    </g>
  );
}

function WalkFrame2() {
  return (
    <g>
      <rect x="30" y="20" width="9" height="14" rx="2" fill="#6b5344" />
      <rect x="31.5" y="22" width="6" height="9" rx="1" fill="#7a6352" />

      <ellipse cx="24" cy="12" rx="7" ry="8" fill="url(#hub-player-skin)" />
      <path
        d="M17 9 C18 5 21 4 24 4 C27 4 30 5 31 9 C30.5 11 28 12 24 12 C20 12 17.5 11 17 9 Z"
        fill="#2a2420"
      />
      <ellipse cx="21" cy="12" rx="1.4" ry="1.8" fill="#2a2420" />
      <ellipse cx="27" cy="12" rx="1.4" ry="1.8" fill="#2a2420" />
      <circle cx="21.4" cy="12.2" r="0.55" fill="#f8f4ee" />
      <circle cx="27.4" cy="12.2" r="0.55" fill="#f8f4ee" />
      <ellipse cx="18.5" cy="14" rx="1.2" ry="0.7" fill="#efb8a8" opacity="0.45" />
      <ellipse cx="29.5" cy="14" rx="1.2" ry="0.7" fill="#efb8a8" opacity="0.45" />
      <path d="M22.5 15.5 Q24 16 25.5 15.5" stroke="#c8907a" strokeWidth="0.7" fill="none" />

      <path
        d="M13 19 C15 17 19 16 24 16.5 C29 16 33 17 35 19 L37 41 C36 47 31 51 24 51 C17 51 12 47 11 41 Z"
        fill="url(#hub-player-hoodie)"
      />
      <path d="M20 16.5 L24 22 L28 16.5" fill="#3a5880" />
      <ellipse cx="24" cy="28" rx="5" ry="6" fill="#f0ece4" opacity="0.85" />

      <path
        d="M12 24 C10 29 9 36 12 43"
        stroke="#355580"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36 24 C38 29 39 36 36 42"
        stroke="#355580"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="43" r="2" fill="url(#hub-player-skin)" />

      <path d="M21 51 L23 68 L25 76" stroke="url(#hub-player-jeans)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <path d="M28 51 L26 66 L23 74" stroke="url(#hub-player-jeans)" strokeWidth="3.6" strokeLinecap="round" fill="none" />

      <ellipse cx="25" cy="76.5" rx="3.2" ry="1.7" fill="#f2f2f2" />
      <ellipse cx="23" cy="74.5" rx="3.2" ry="1.7" fill="#f2f2f2" />
      <ellipse cx="25" cy="77" rx="3.2" ry="0.8" fill="#6a7580" />
      <ellipse cx="23" cy="75" rx="3.2" ry="0.8" fill="#6a7580" />
    </g>
  );
}

/** 青澀大學生 — 雙幀走路 SVG 動畫 */
export default function HubPlayer({ facing, walking }: Props) {
  return (
    <div
      className={`hub-player-sprite-wrap ${walking ? "hub-player-sprite-wrap--walk" : ""} ${
        facing === "left" ? "hub-player-sprite-wrap--left" : ""
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 80"
        className="hub-player-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <PlayerDefs />
        <g className="hub-player-frame hub-player-frame--1">
          <WalkFrame1 />
        </g>
        <g className="hub-player-frame hub-player-frame--2">
          <WalkFrame2 />
        </g>
      </svg>
    </div>
  );
}
