/**
 * =============================================================================
 * data/collectibles-default.ts — 可收集物品「靜態資料」單一來源
 * =============================================================================
 *
 * 【如何新增物品】
 * 1. 在 items 陣列追加一筆 CollectibleItemDef
 * 2. 將 icon / image 圖檔放到 public/collectibles/
 * 3. 在遊戲或劇情邏輯滿足條件時呼叫 acquireCollectible(item.id)
 *
 * 【注意】
 * - id 一旦發佈給玩家存檔後請勿隨意更改，否則 localStorage 會對不上
 * - acquireDialogue 為空陣列時，取得物品仍會成功，但不會彈出對話
 */

import type { CollectibleCatalog } from "@/lib/collectibles/types";

export const collectiblesDefault: CollectibleCatalog = {
  items: [
    {
      id: "rocking-horse",
      name: "搖搖馬",
      icon: "/collectibles/rocking-horse-icon.svg",
      image: "/collectibles/rocking-horse.svg",
      description:
        "夜市套圈圈攤常見的廉價獎品。木馬表面漆已剝落，搖起來會發出吱呀聲。你記得小時候也曾為了這種東西吵著要爸媽買。",
      acquireDialogue: [
        {
          id: "col-rocking-horse-d1",
          speaker: "主角",
          text: "……這不是套圈圈會中的那種搖搖馬嗎？",
        },
        {
          id: "col-rocking-horse-d2",
          speaker: "主角",
          text: "怎麼會出現在這裡。先收進背包好了。",
        },
      ],
    },
    {
      id: "mystery-note",
      name: "神秘紙條",
      icon: "/collectibles/note-icon.svg",
      image: "/collectibles/note.svg",
      description:
        "皺摺的紙條，字跡模糊，像是很久以前寫的。邊角沾著夜市攤位的油漬。",
      acquireDialogue: [
        {
          id: "col-note-d1",
          speaker: "主角",
          text: "這張紙條……字都糊了，誰留下的？",
        },
      ],
    },
    {
      id: "pinball-marble",
      name: "彈珠",
      icon: "/collectibles/marble-icon.svg",
      image: "/collectibles/marble.svg",
      description:
        "玻璃彈珠，在路燈下泛著暗紅光澤。彈珠台槽底撿到的，摸起來還帶著機台的餘溫。",
      acquireDialogue: [
        {
          id: "col-marble-d1",
          speaker: "主角",
          text: "從彈珠台掉出來的……欸，這顆好像特別沉。",
        },
      ],
    },
    {
      id: "goldfish-bowl",
      name: "迷你金魚碗",
      icon: "/collectibles/bowl-icon.svg",
      image: "/collectibles/bowl.svg",
      description:
        "塑膠小碗，裡頭沒有水也沒有魚，卻有淡淡的腥味。撈金魚攤的紀念品？",
      acquireDialogue: [
        {
          id: "col-bowl-d1",
          speaker: "主角",
          text: "空的魚碗……老闆人呢？",
        },
      ],
    },
  ],
};

/** 依 id 查詢定義；找不到回傳 undefined */
export function getCollectibleDef(id: string) {
  return collectiblesDefault.items.find((item) => item.id === id);
}
