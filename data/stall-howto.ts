import type { StallHowToSection, StallId } from "@/lib/narrative/types";

export const STALL_HOW_TO: Record<StallId, StallHowToSection[]> = {
  pinball: [
    { title: "玩法", items: ["空白鍵蓄力放開發射，5 顆彈珠"] },
    {
      title: "得分",
      items: [
        "碰圓形障礙 +5",
        "通道（左→右）：彈珠+1 ÷2 ??? +20 -8 ×2",
        "集滿蓄力 ×1.2",
      ],
    },
  ],
  balloonshoot: [
    { title: "玩法", items: ["空白鍵瞄準，滑鼠點擊射擊，10 發"] },
    { title: "得分", items: ["中央每顆 +10、環 +50", "左右每顆 +20、環 +100"] },
  ],
  ringtoss: [
    { title: "玩法", items: ["鎖定 X 再鎖定 Y 投環，8 個套環"] },
    { title: "得分", items: ["套中 +20", "連中 3／4／5：×1.3／×1.4／×1.5"] },
  ],
  catchfish: [
    { title: "玩法", items: ["滑鼠移撈網，追上按住空白鍵撈魚，3 張網"] },
    { title: "得分", items: ["大 50、中 30、小 10", "累計 7 條 +50"] },
  ],
};
