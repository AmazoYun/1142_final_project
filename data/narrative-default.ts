import type { NarrativeBundle } from "@/lib/narrative/types";

export const narrativeDefault: NarrativeBundle = {
  intro: [
    { type: "visual", id: "intro-v1", visual: "market-friends" },
    { type: "caption", id: "intro-c1", text: "2005年6月，熙來攘往的夜市，和你童年的記憶模樣如出一徹。" },
    { type: "dialogue", id: "intro-d1", speaker: "友人A", text: "喂！發什麼呆？" },
    { type: "dialogue", id: "intro-d2", speaker: "主角", text: "嗯？幹抱歉，你們剛剛在說什麼？" },
    { type: "dialogue", id: "intro-d3", speaker: "友人B", text: "我們剛剛在說，要不要去玩夜市攤位，然後比賽看誰厲害。" },
    { type: "dialogue", id: "intro-d4", speaker: "友人A", text: "靠杯，好不容易來一趟畢業旅行，你不要耍白痴好不好。" },
    { type: "dialogue", id: "intro-d5", speaker: "主角", text: "好啦，欸我要先去尿尿。" },
    { type: "dialogue", id: "intro-d6", speaker: "友人A", text: "哪來那麼多尿，是不是怕輸啊" },
    { type: "dialogue", id: "intro-d7", speaker: "友人B", text: "我們在這裡等你喔，快去快回" },
    { type: "dialogue", id: "intro-d8", speaker: "主角", text: "又在嘴秋，沒有人打夜市遊戲能贏過我，菜就多練。" },
    { type: "dialogue", id: "intro-d9", speaker: "友人A", text: "快去啦，等一下輸的請客，媽的我快餓死了。" },
    {
      type: "buttons",
      id: "intro-b1",
      buttons: [{ id: "btn-toilet", label: "去廁所", action: "goto-toilet" }],
    },
    { type: "transition", id: "intro-t1", transition: "bathroom" },
    { type: "visual", id: "intro-v2", visual: "market-walk-shake" },
    { type: "dialogue", id: "intro-d10", speaker: "主角", text: "好爽，撒了一泡大的。" },
    { type: "visual", id: "intro-v3", visual: "market-desaturate" },
    { type: "dialogue", id: "intro-d11", speaker: "主角", text: "咦？突然頭好暈..." },
    { type: "dialogue", id: "intro-d12", speaker: "主角", text: "幹，發生什麼事？人都去哪了？" },
    { type: "dialogue", id: "intro-d13", speaker: "主角", text: "媽的不要嚇我，這該不是什麼整人環節吧？" },
    { type: "visual", id: "intro-v4", visual: "glowing-stall" },
    { type: "dialogue", id: "intro-d14", speaker: "主角", text: "誒前面攤位好像有人，他們是不是偷偷先跑去比賽了？" },
    {
      type: "buttons",
      id: "intro-b2",
      buttons: [{ id: "btn-investigate", label: "前往一探究竟", action: "goto-investigate" }],
    },
    { type: "dialogue", id: "intro-d15", speaker: "主角", text: "竟然給我偷跑，你們等等完了。" },
    { type: "visual", id: "intro-v5", visual: "title-card" },
    {
      type: "buttons",
      id: "intro-b3",
      buttons: [
        { id: "btn-play", label: "開始遊玩", action: "goto-market" },
      ],
    },
  ],
  marketOpening: [
    { type: "dialogue", id: "mkt-d1", speaker: "主角", text: "結果還是沒有人，他們到底跑哪去了？" },
    { type: "dialogue", id: "mkt-d2", speaker: "主角", text: "咦？這些機台怎麼都還開著？" },
    { type: "dialogue", id: "mkt-d3", speaker: "主角", text: "他們該不會躲在一旁想看我一枝獨秀吧" },
    { type: "dialogue", id: "mkt-d4", speaker: "主角", text: "好啊...既然如此，我就把遊戲贏遍給你們看" },
    { type: "dialogue", id: "mkt-d5", speaker: "主角", text: "你們就等著請客吧！" },
  ],
  moveHint: {
    id: "move-hint",
    text: "電腦版請按左右鍵移動，手機版請往左右拖曳移動",
  },
  boundaryLines: [
    { id: "bnd-d1", speaker: "主角", text: "後面好像過不去了" },
    { id: "bnd-d2", speaker: "主角", text: "啊...趕快離開這裡吧，我一靠近頭就好痛..." },
  ],
  stalls: {
    pinball: {
      stallId: "pinball",
      title: "彈珠台",
      href: "/pinball",
      glow: true,
      captions: [
        {
          id: "pin-c1",
          text: "夜市角落那排老舊彈珠臺，最內側的機台總是故障的，以前的人們沒有現在的記憶，所以他們一直停留在那裡。",
        },
      ],
      dialogues: [
        { id: "pin-d1", speaker: "主角", text: "哇！是彈珠臺誒，好懷念..." },
        { id: "pin-d2", speaker: "主角", text: "這遊戲我最小玩到大最拿手了" },
        { id: "pin-d3", speaker: "主角", text: "看我刷個最高分嚇死你們！" },
        { id: "pin-d4", speaker: "主角", text: "阿強最爛，他一定會請客" },
      ],
      enterLabel: "進入遊戲",
      howToPlay:
        "按住空白鍵蓄力（2 秒集滿），放開發射。共 5 顆彈珠，集滿時該次得分 ×1.2，未成功發射不消耗彈珠。碰撞圓形障礙物 +10 分；落入底部六條通道（由左至右）：+1 球、得分 ÷2、生鏽銅幣（已擁有則無效果）、+30 分、-10 分、得分 ×2。彈珠用完即結束，按 R 可重新開始。",
    },
    balloonshoot: {
      stallId: "balloonshoot",
      title: "射飛鏢",
      href: "/balloonshoot",
      glow: true,
      captions: [
        {
          id: "bal-c1",
          text: "飛鏢纏著手的方向延伸出去，準心的對面是脆弱的氣球，游離之中唯一的清晰，年輕的模樣總是令人垂涎。",
        },
      ],
      dialogues: [
        { id: "bal-d1", speaker: "主角", text: "玩一次只要50塊？老闆也太佛心了吧！" },
        { id: "bal-d2", speaker: "主角", text: "我還不玩爆他，牆上的禮物都是我的了哈哈哈哈哈" },
        { id: "bal-d3", speaker: "主角", text: "記得小時候玩一次也是50塊，跟夢裡一模一樣" },
        { id: "bal-d4", speaker: "主角", text: "話說，老闆人呢..." },
      ],
      enterLabel: "進入遊戲",
      howToPlay:
        "按住空白鍵進入瞄準，移動滑鼠對準氣球後點擊射擊。共 10 發子彈。任選左／中／右一區，射完該區旋轉環且同區 B 區至少四顆，即可獲得道具。中央區每顆 +10 分、旋轉環 +50；左右區每顆 +20 分、旋轉環 +100。",
    },
    ringtoss: {
      stallId: "ringtoss",
      title: "套圈圈",
      href: "/ringtoss",
      glow: true,
      captions: [
        {
          id: "ring-c1",
          text: "七彩繽紛的環，環與環與環，緊緊相扣，哈！套著了你就逃不開，為什麼總是繞不出去？",
        },
      ],
      dialogues: [
        { id: "ring-d1", speaker: "主角", text: "怎麼玩到現在都還沒有人出現？" },
        { id: "ring-d2", speaker: "主角", text: "這個地方越來越詭異了..." },
        { id: "ring-d3", speaker: "主角", text: "這裡是套圈圈攤位...來都來了，就玩一輪吧" },
        { id: "ring-d4", speaker: "主角", text: "誒不是，獎品也太舊了吧" },
      ],
      enterLabel: "進入遊戲",
      howToPlay:
        "先等 X 軸在 1→7 間循環，按空白鍵或點擊鎖定 X；再鎖定 Y 並投出套環。每局會隨機抽出 5 個發紅光的酒瓶，套中全部即可獲得道具。共 8 個套環，套中一個 +20 分；連中 3 個 ×1.3、4 個 ×1.4、5 個 ×1.5。",
    },
    catchfish: {
      stallId: "catchfish",
      title: "撈金魚",
      href: "/catchfish",
      glow: true,
      captions: [
        {
          id: "fish-c1",
          text: "金魚在網膜上掙扎，膜是一切的開始，讓光透進去、穿出來，沒有意識與痕跡，讓他包覆著你，就像一開始那樣，學會漂浮不等於學會離開。",
        },
      ],
      dialogues: [
        { id: "fish-d1", speaker: "主角", text: "撈金魚嗎..." },
        { id: "fish-d2", speaker: "主角", text: "我已經沒什麼興趣玩了..." },
        { id: "fish-d3", speaker: "主角", text: "我只想知道現在到底是什麼情況...我的朋友們都去哪了" },
      ],
      enterLabel: "進入遊戲",
      howToPlay:
        "移動滑鼠控制撈網。魚會逃跑，追上後按住空白鍵撈魚，大魚需按住更久。共 3 張撈網，耐久歸零換下一張。大魚 50 分、中魚 30 分、小魚 10 分；撈滿 3 條大魚額外 +100，撈超過 7 條魚額外 +50。",
    },
  },
};
