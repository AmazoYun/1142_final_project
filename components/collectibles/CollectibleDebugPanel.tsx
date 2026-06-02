/**
 * =============================================================================
 * CollectibleDebugPanel — 背包頁 Debug：即時改取得狀態與文案
 * =============================================================================
 *
 * 僅在背包頁顯示，不影響正式遊玩流程。
 * 覆寫文字會寫入 localStorage（與 narrative 的 overrides 分開儲存）。
 */

"use client";

import { useCollectibleStore } from "@/store/collectibleStore";

export default function CollectibleDebugPanel() {
  const items = useCollectibleStore((s) => s.getAllDefs());
  const acquired = useCollectibleStore((s) => s.acquired);
  const debugSetAcquired = useCollectibleStore((s) => s.debugSetAcquired);
  const debugSetDescription = useCollectibleStore((s) => s.debugSetDescription);
  const debugSetDialogueLine = useCollectibleStore((s) => s.debugSetDialogueLine);
  const debugResetOverrides = useCollectibleStore((s) => s.debugResetOverrides);
  const debugClearAllAcquired = useCollectibleStore((s) => s.debugClearAllAcquired);
  const getDescription = useCollectibleStore((s) => s.getDescription);
  const tryAcquire = useCollectibleStore((s) => s.tryAcquire);

  return (
    <aside className="backpack-debug border-2 border-black bg-white p-3 text-black text-xs max-h-[40vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-2 mb-2 border-b-2 border-black pb-2">
        <strong className="tracking-widest">DEBUG · 收集系統</strong>
        <div className="flex gap-1 flex-wrap">
          <button
            type="button"
            className="backpack-wire-btn px-2 py-0.5"
            onClick={() => debugResetOverrides()}
          >
            清除文案覆寫
          </button>
          <button
            type="button"
            className="backpack-wire-btn px-2 py-0.5"
            onClick={() => debugClearAllAcquired()}
          >
            清空已取得
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((def) => {
          const owned = acquired.includes(def.id);
          return (
            <li key={def.id} className="border border-black p-2">
              <div className="flex items-center gap-2 mb-1">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={owned}
                    onChange={(e) => debugSetAcquired(def.id, e.target.checked)}
                  />
                  <span className="font-bold">{def.name}</span>
                  <span className="opacity-60">({def.id})</span>
                </label>
                <button
                  type="button"
                  className="backpack-wire-btn px-1 py-0.5 ml-auto"
                  onClick={() => tryAcquire(def.id)}
                  title="模擬外部 acquireCollectible 呼叫（含對話）"
                >
                  模擬取得
                </button>
              </div>

              <label className="block mt-1">
                描述覆寫
                <textarea
                  className="w-full mt-0.5 border border-black p-1 min-h-[48px] bg-white"
                  defaultValue={getDescription(def)}
                  onBlur={(e) => debugSetDescription(def.id, e.target.value)}
                />
              </label>

              {def.acquireDialogue.map((line) => (
                <label key={line.id} className="block mt-1">
                  對話 {line.id}
                  <textarea
                    className="w-full mt-0.5 border border-black p-1 min-h-[36px] bg-white"
                    defaultValue={line.text}
                    onBlur={(e) => debugSetDialogueLine(line.id, e.target.value)}
                  />
                </label>
              ))}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
