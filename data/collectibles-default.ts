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
      id: "rust-coin",
      name: "生鏽的銅幣",
      icon: "/backpack/coin.webp",
      image: "/backpack/coin.webp",
      description:
        "一枚看起來像舊時代的代幣，邊緣參差不齊。",
      acquireDialogue: [
        {
          id: "col-rust-coin-d1",
          speaker: "主角",
          text: "這什麼古董代幣？這家攤販老闆也太隨便了吧，隨便塞個鐵片給我當紀念？",
        },
        {
          id: "col-rust-coin-d2",
          speaker: "主角",
          text: "算了，反正比賽贏了，阿強晚上請客跑不掉。",
        },
      ],
    },
    {
      id: "whistle",
      name: "塑膠哨子",
      icon: "/backpack/whistler.webp",
      image: "/backpack/whistler.webp",
      description:
        "一個亮紅色、邊緣粗糙的廉價塑膠哨子，聽起來聲音很尖銳。",
      acquireDialogue: [
        {
          id: "col-whistle-d1",
          speaker: "主角",
          text: "這哨子聲音有夠難聽，完全就是小學生會買的玩具。",
        },
        {
          id: "col-whistle-d2",
          speaker: "主角",
          text: "射氣球射到最後居然給我這玩意，學長他們看到一定會笑死我。",
        },
        {
          id: "col-whistle-d3",
          speaker: "主角",
          text: "但奇怪，拿著它總覺得心跳好快，像是隨時會被叫名字一樣。",
        },
      ],
    },
    {
      id: "keychain",
      name: "復古手電筒鑰匙圈",
      icon: "/backpack/flashlight.webp",
      image: "/backpack/flashlight.webp",
      description:
        "一支金屬製、外殼冰冷且厚重的復古手電筒，開關已經鬆脫了。",
      acquireDialogue: [
        {
          id: "col-keychain-d1",
          speaker: "主角",
          text: "這玩意兒質感意外地重，看起來還像是有點年紀的古董，掛在包包上其實還蠻潮的。",
        },
        {
          id: "col-keychain-d2",
          speaker: "主角",
          text: "不過這開關好像壞了，怎麼按都不會亮？算了，這趟畢旅反正就是要拿點奇怪的東西回憶一下。",
        },
      ],
    },
    {
      id: "bracelet",
      name: "褪色的姓名手環",
      icon: "/backpack/handlace.webp",
      image: "/backpack/handlace.webp",
      description:
        "一條編織的手環，邊緣磨損，上面掛著一個刻有「宇」字的小玻璃珠。",
      acquireDialogue: [
        {
          id: "col-bracelet-d1",
          speaker: "主角",
          text: "撈到這條東西的時候，手居然抖了一下，是因為水太冰了嗎？為什麼上面刻著一個『宇』？",
        },
        {
          id: "col-bracelet-d2",
          speaker: "主角",
          text: "這不是我的名字嗎？怎麼會有人把這東西放在金魚店的池底？",
        },
        {
          id: "col-bracelet-d3",
          speaker: "主角",
          text: "這真的是整人遊戲嗎？越玩越覺得...這裡安靜得讓我害怕。",
        },
      ],
    },
    {
      id: "point-card",
      name: "過期的夜市集點卡",
      icon: "/backpack/card.webp",
      image: "/backpack/card.webp",
      description:
        "一張邊緣捲曲、蓋滿紅色印章的紙卡，上面的店名已經褪色看不清了，最後一個印章日期停留在 1990 年 6 月。",
      acquireDialogue: [
        {
          id: "col-point-card-d1",
          speaker: "主角",
          text: "這是哪家店的集點卡啊？怎麼滿了還沒換獎品？",
        },
        {
          id: "col-point-card-d2",
          speaker: "主角",
          text: "看日期都十幾年前了，這種垃圾怎麼還會留在這裡？",
        },
        {
          id: "col-point-card-d3",
          speaker: "主角",
          text: "真受不了，這裡連垃圾桶都沒有嗎？",
        },
      ],
    },
    {
      id: "plastic-mask",
      name: "裂了一角的「超人」塑膠面具",
      icon: "/backpack/mask.webp",
      image: "/backpack/mask.webp",
      description:
        "一個廉價的塑膠面具，表情是一個僵硬的笑臉。面具的一角已經碎裂，露出後方漆黑的塑膠邊緣。",
      acquireDialogue: [
        {
          id: "col-plastic-mask-d1",
          speaker: "主角",
          text: "這面具也太詭異了吧，笑得這麼僵硬。丟在這種地方看起來超恐怖的...誰會買這種東西給小孩玩？",
        },
        {
          id: "col-plastic-mask-d2",
          speaker: "主角",
          text: "等等，為什麼我總覺得這面具上的眼睛好像在看著我？",
        },
      ],
    },
  ],
};

/** 依 id 查詢定義；找不到回傳 undefined */
export function getCollectibleDef(id: string) {
  return collectiblesDefault.items.find((item) => item.id === id);
}
