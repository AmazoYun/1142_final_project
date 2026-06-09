import type { EndingsBundle } from "@/lib/endings/types";

export const endingsDefault: EndingsBundle = {
  endings: {
    basic: {
      id: "basic",
      title: "基礎結局",
      lines: [
        { type: "ending-visual", id: "end-basic-v1", slide: 1 },
        {
          type: "caption",
          id: "end-basic-1",
          text: "四個遊戲都玩完了。看著背包裡這些奇奇怪怪的舊玩具……我突然不覺得害怕了。",
        },
        {
          type: "dialogue",
          id: "end-basic-2",
          speaker: "主角",
          text: "雖然阿強和學長還是沒出現，雖然這座夜市依然安靜得奇怪。但我總覺得，自己好像在這裡卸下了什麼很沉重的包袱。",
        },
        { type: "ending-visual", id: "end-basic-v2", slide: 2 },
        {
          type: "dialogue",
          id: "end-basic-3",
          speaker: "友人A",
          text: "欸！你上個廁所上到哪裡去了？我們在攤位等了你半小時，差點以為你被妖怪抓走了！",
        },
        {
          type: "dialogue",
          id: "end-basic-4",
          speaker: "友人B",
          text: "對啊，打你手機也沒訊號。你看，天都亮了，遊覽車要開了啦，快上車！",
        },
        {
          type: "dialogue",
          id: "end-basic-5",
          speaker: "主角",
          text: "……抱歉抱歉，可能昨晚太累，在巷子裡恍神了一下。走吧，上車。",
        },
        { type: "ending-visual", id: "end-basic-v3", slide: 3 },
        {
          type: "caption",
          id: "end-basic-6",
          text: "我坐在靠窗的位置，看著陽光穿透雲層，照亮了這個剛醒來的小鎮。",
        },
        {
          type: "caption",
          id: "end-basic-7",
          text: "我揉了揉太陽穴，昨晚那場空無一人的夜市冒險，現在想起來就像一場荒誕的夢。",
        },
        {
          type: "caption",
          id: "end-basic-8",
          text: "我下意識地摸了摸口袋，那四件在夢裡贏到的舊玩具已經不見了。但奇怪的是，我原本對未來的迷惘、對畢業後的焦慮，竟然奇蹟似地消失了。",
        },
        { type: "ending-visual", id: "end-basic-v5", slide: 4 },
        {
          type: "caption",
          id: "end-basic-9",
          text: "『喂，畢業快樂啊。』我對著窗外輕聲說道。雖然不知道是在對誰說，但我知道，我已經可以放手，走向屬於我的未來了。",
        },
      ],
    },
    loop: {
      id: "loop",
      title: "不明所以結局",
      restartMarket: true,
      lines: [
        { type: "ending-visual", id: "end-loop-v1", slide: 1 },
        {
          type: "dialogue",
          id: "end-loop-1",
          speaker: "主角",
          text: "不……不要過來！那條巷子太黑了……好痛……真的好痛！",
        },
        { type: "ending-visual", id: "end-loop-v2", slide: 1 },
        {
          type: "dialogue",
          id: "end-loop-2",
          speaker: "主角",
          text: "我不要過去！阿強、學長……你們在哪裡？快來救我！這不是真的！",
        },
        {
          type: "dialogue",
          id: "end-loop-3",
          speaker: "主角",
          text: "我考上大學了……我正在參加畢業旅行……我已經十九歲了！我沒有死！！",
        },
        { type: "ending-visual", id: "end-loop-v3", slide: 3 },
        {
          type: "caption",
          id: "end-loop-4",
          text: "【社會新聞速報 / 2005年6月】震驚社會的 1990 年夜市男童失蹤案，今日因「歸墟夜市」舊址土地開發進行整地，檢警在荒廢多年的暗巷廢墟內，尋獲當年失蹤男童『林小宇』之遺骸。",
        },
        { type: "ending-visual", id: "end-loop-v4", slide: 4 },
        {
          type: "caption",
          id: "end-loop-5",
          text: "令人費解的是，現場並未發現任何掙扎或求救痕跡。男童乾枯的遺骨靜靜地躺在一台早已報廢、鏽蝕嚴重的老舊彈珠台下方夾縫中。",
        },
        {
          type: "caption",
          id: "end-loop-6",
          text: "警方表示，現場並未找到男童當年配戴的母親編織手環，該案已正式以無人認領之懸案結案。",
        },
        { type: "ending-visual", id: "end-loop-v6", slide: 5 },
        {
          type: "dialogue",
          id: "end-loop-7",
          speaker: "主角",
          text: "歡迎光臨！這遊戲我從小玩到大最拿手了……看我刷個最高分嚇死你們……",
        },
      ],
    },
    stuck: {
      id: "stuck",
      title: "夾縫結局",
      lines: [
        { type: "ending-visual", id: "end-stuck-v1", slide: 0 },
        {
          type: "caption",
          id: "end-stuck-1",
          text: "遊戲結束了，但我手裡只有同學阿強跟學長隨手塞給我的戰利品……一幅破面具，還有一張過期的爛紙卡。",
        },
        { type: "ending-visual", id: "end-stuck-v2", slide: 1 },
        {
          type: "dialogue",
          id: "end-stuck-2",
          speaker: "主角",
          text: "奇怪，通往出口的路還是被擋住。大家到底躲在哪裡？這個玩笑一點都不好玩……我開始覺得冷了。",
        },
        { type: "ending-visual", id: "end-stuck-v3", slide: 2 },
        {
          type: "caption",
          id: "end-stuck-3",
          text: "我沒有逃出去，我也沒有死在巷子裡。我只是……被卡在了這兩個年份的夾縫中。",
        },
        { type: "ending-visual", id: "end-stuck-v4", slide: 3 },
        {
          type: "caption",
          id: "end-stuck-4",
          text: "【社會新聞速報 / 2005年6月】昨日於本市「歸墟夜市」舊址改建工地旁，發生一起離奇的大學生失蹤案。",
        },
        {
          type: "caption",
          id: "end-stuck-5",
          text: "就讀北部某大學的林姓大四生（失蹤時19歲），於畢業旅行中途宣稱前往小路如廁後便下落不明。",
        },
        { type: "ending-visual", id: "end-stuck-v6", slide: 4 },
        {
          type: "caption",
          id: "end-stuck-6",
          text: "暗巷深處被挖出一台 1990 年報廢的舊彈珠台，下方藏有蓋滿 1990 年印章的過期集點卡，以及一個裂了一角的超人塑膠面具。",
        },
        { type: "ending-visual", id: "end-stuck-v7", slide: 6 },
        {
          type: "caption",
          id: "end-stuck-7",
          text: "遊覽車開走了，爸媽哭喊著我的名字……我其實一直都站在這條街上，看著 1990 年的自己，也看著 2005 年的自己。我哪裡都去不了。",
        },
      ],
    },
    true: {
      id: "true",
      title: "真實結局",
      lines: [
        { type: "ending-visual", id: "end-true-v1", slide: 0 },
        {
          type: "dialogue",
          id: "end-true-1",
          speaker: "主角",
          text: "阿強……學長……？不，這個世界上根本沒有這些人。",
        },
        { type: "ending-visual", id: "end-true-v2", slide: 1 },
        {
          type: "dialogue",
          id: "end-true-2",
          speaker: "主角",
          text: "我沒有考上大學，我沒有參加畢業旅行……我甚至，從來沒有長大過。",
        },
        { type: "ending-visual", id: "end-true-v3", slide: 1 },
        {
          type: "dialogue",
          id: "end-true-3",
          speaker: "主角",
          text: "2005 年 6 月是假的。我的時間，早就死在了 1990 年的那個夏天。",
        },
        { type: "ending-visual", id: "end-true-v4", slide: 2 },
        {
          type: "dialogue",
          id: "end-true-4",
          speaker: "主角",
          text: "那晚，爸爸媽媽吵得很兇。我好害怕，所以我鬆開了爸爸的手。",
        },
        { type: "ending-visual", id: "end-true-v4", slide: 4 },
        {
          type: "dialogue",
          id: "end-true-5",
          speaker: "主角",
          text: "我以為只要我打中那台紫色機器的地鼠，他們就會和好……",
        },
        { type: "ending-visual", id: "end-true-v5", slide: 3 },
        {
          type: "dialogue",
          id: "end-true-6",
          speaker: "主角",
          text: "直到那個叔叔拿著手電筒照向我。我逃進這條巷子，就再也沒走出去了。",
        },
        { type: "ending-visual", id: "end-true-v6", slide: 5 },
        {
          type: "caption",
          id: "end-true-7",
          text: "【社會新聞速報 / 2005年6月】震驚社會的 1990 年夜市男童失蹤案，今日因無人夜市舊址改建，警方於暗巷夾縫中尋獲遇害男童『林小宇』之遺骸。",
        },
        { type: "ending-visual", id: "end-true-v7", slide: 6 },
        {
          type: "caption",
          id: "end-true-8",
          text: "奇特的是，遺骸雙手合十，懷中緊緊抱著當年失蹤時的四樣夜市獎品。法醫表示，遺體手腕上戴著的母親手編紅線，歷經十五年歲月，依舊完好未褪色。",
        },
        { type: "ending-visual", id: "end-true-v8", slide: 7 },
        {
          type: "dialogue",
          id: "end-true-9",
          speaker: "旁白",
          text: "小宇！小宇你在哪裡——！（那是媽媽撕心裂肺的哭喊聲，這次不再是幻聽，非常清晰。）",
        },
        { type: "ending-visual", id: "end-true-v9", slide: 8 },
        {
          type: "caption",
          id: "end-true-10",
          text: "睜開眼，巷子盡頭沒有怪物，也沒有冰冷的手。我看到爸爸媽媽滿臉是淚地衝過來，把我緊緊抱進懷裡。",
        },
        {
          type: "caption",
          id: "end-true-11",
          text: "這一次，我死死地抓住了爸爸汗濕的衣角，再也沒有鬆開。迷失了十五年的靈魂，在今日，終於找到了回家的路。",
        },
      ],
    },
  },
};

export function getEndingScript(id: string) {
  return endingsDefault.endings[id as keyof typeof endingsDefault.endings];
}
