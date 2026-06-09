export const LOADING_TIPS = [
  "路邊會有道具可拾取，請隨時注意腳邊",
  "籤詩是解開謎題的重要道具",
  "每次遊戲都將消耗代幣，請認真遊玩",
  "遊戲分數會轉換成彩券，記得在道具頁轉換成遊戲代幣",
  "蒐集所有道具可以解開一切謎題...",
  "上完廁所請務必洗手，保持個人衛生整潔。",
  "謎底藏在畫面細節中，注意每次遊戲畫面的變動...",
  "有人打破過酒瓶嗎？",
  "可不是只有彈珠臺裡面有彈珠呢。",
] as const;

export function pickRandomLoadingTip(): string {
  const index = Math.floor(Math.random() * LOADING_TIPS.length);
  return LOADING_TIPS[index] ?? LOADING_TIPS[0];
}
