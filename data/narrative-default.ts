import type { NarrativeBundle } from "@/lib/narrative/types";
import { STALL_HOW_TO } from "@/data/stall-howto";

export const narrativeDefault: NarrativeBundle = {
  intro: [
    { type: "blackout", id: "intro-open", ms: 3000 },
    { type: "visual", id: "intro-v1", visual: "night-market", fadeMs: 3000, dim: true },
    { type: "caption", id: "intro-c1", text: "2005年6月，熙來攘往的夜市，和你童年的記憶模樣如出一徹。" },
    { type: "dialogue", id: "intro-d1", speaker: "阿強", text: "喂！發什麼呆？" },
    { type: "dialogue", id: "intro-d2", speaker: "主角", text: "嗯？幹抱歉，你們剛剛在說什麼？" },
    { type: "dialogue", id: "intro-d3", speaker: "阿成", text: "我們剛剛在說，要不要去玩夜市攤位，然後比賽看誰厲害。" },
    { type: "dialogue", id: "intro-d4", speaker: "阿強", text: "靠杯，好不容易來一趟畢業旅行，你不要耍白痴好不好。" },
    { type: "dialogue", id: "intro-d5", speaker: "主角", text: "好啦，欸我要先去尿尿。" },
    { type: "dialogue", id: "intro-d6", speaker: "阿強", text: "哪來那麼多尿，是不是怕輸啊" },
    { type: "dialogue", id: "intro-d7", speaker: "阿成", text: "我們在這裡等你喔，快去快回" },
    { type: "dialogue", id: "intro-d8", speaker: "主角", text: "又在嘴秋，沒有人打夜市遊戲能贏過我，菜就多練。" },
    { type: "dialogue", id: "intro-d9", speaker: "阿強", text: "快去啦，等一下輸的請客，媽的我快餓死了。" },
    {
      type: "buttons",
      id: "intro-b1",
      buttons: [{ id: "btn-toilet", label: "去廁所", action: "goto-toilet" }],
    },
    { type: "blackout", id: "intro-bo1", ms: 2000 },
    { type: "visual", id: "intro-v2", visual: "toilet" },
    { type: "loading", id: "intro-load", text: "記憶載入中...", ms: 5000 },
    {
      type: "buttons",
      id: "intro-b-toilet",
      buttons: [
        { id: "btn-wash", label: "洗手", action: "wash-hands" },
        { id: "btn-leave", label: "直接離開", action: "leave-toilet" },
      ],
    },
    { type: "blackout", id: "intro-bo2", ms: 2000 },
    { type: "visual", id: "intro-v3", visual: "night-market", fadeMs: 3000 },
    { type: "dialogue", id: "intro-d10", speaker: "主角", text: "好爽，撒了一泡大的。" },
    { type: "backdrop-effect", id: "intro-e0", effect: "shake-blur-mild" },
    { type: "wait", id: "intro-w1", ms: 3000 },
    { type: "dialogue", id: "intro-d11", speaker: "主角", text: "咦？突然頭好暈..." },
    { type: "backdrop-effect", id: "intro-e1", effect: "shake-blur-mild" },
    { type: "wait", id: "intro-w2", ms: 2500 },
    { type: "transition", id: "intro-t-flash", transition: "flash-transition" },
    { type: "blackout", id: "intro-bo3", ms: 2000 },
    {
      type: "transition",
      id: "intro-t4",
      transition: "fade-reveal",
      reveals: "market-weird",
    },
    { type: "dialogue", id: "intro-d12", speaker: "主角", text: "幹，發生什麼事？人都去哪了？" },
    { type: "dialogue", id: "intro-d13", speaker: "主角", text: "媽的不要嚇我，這該不是什麼整人環節吧？" },
    {
      type: "transition",
      id: "intro-t5",
      transition: "fade-glowing",
      reveals: "glowing-stall",
    },
    { type: "dialogue", id: "intro-d14", speaker: "主角", text: "誒前面攤位好像有人，他們是不是偷偷先跑去比賽了？" },
    {
      type: "buttons",
      id: "intro-b2",
      buttons: [{ id: "btn-investigate", label: "前往一探究竟", action: "goto-investigate" }],
    },
    { type: "dialogue", id: "intro-d15", speaker: "主角", text: "竟然給我偷跑，你們等等完了。" },
    { type: "transition", id: "intro-t6", transition: "fade-dark" },
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
    text: "請按鍵盤左右鍵移動",
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
      howToPlay: STALL_HOW_TO.pinball,
    },
    balloonshoot: {
      stallId: "balloonshoot",
      title: "射氣球",
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
      howToPlay: STALL_HOW_TO.balloonshoot,
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
      howToPlay: STALL_HOW_TO.ringtoss,
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
      howToPlay: STALL_HOW_TO.catchfish,
    },
  },
};
