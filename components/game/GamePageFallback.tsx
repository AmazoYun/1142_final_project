/** 遊戲頁 lazy 載入時的共用佔位 */
export default function GamePageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center hub-shell">
      <p className="text-sm opacity-70 intro-loading-text">遊戲載入中…</p>
    </div>
  );
}
