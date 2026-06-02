/**
 * =============================================================================
 * BackpackView — 背包 UI（對應線框 7-背包.png）
 * =============================================================================
 *
 * 【版面】
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ← 返回                              [DEBUG 開關]            │
 * ├──────────────────────┬──────────────────────────────────────┤
 * │ 左：詳情（約 45%）    │ 右：物品網格（4 欄）                  │
 * │  ┌──────────────┐   │  [icon][icon][icon][ ]               │
 * │  │ 大圖（選中時） │   │  [  ][  ][  ][  ]                   │
 * │  └──────────────┘   │  ...                                 │
 * │  說明文字（選中時）   │  僅「已取得」顯示 icon；可點選已擁有物品  │
 * └──────────────────────┴──────────────────────────────────────┘
 *
 * 【互動】
 * - 未選中：左側空白
 * - 點右側已擁有物品：selectedId 更新，左側顯示 image + description
 * - 選中格：黃色光暈（backpack-slot--selected）
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CollectibleItemDef } from "@/lib/collectibles/types";
import { useCollectibleStore } from "@/store/collectibleStore";
import CollectibleDebugPanel from "./CollectibleDebugPanel";

const GRID_COLS = 4;

export default function BackpackView() {
  const hydrate = useCollectibleStore((s) => s.hydrate);
  const hydrated = useCollectibleStore((s) => s.hydrated);
  const items = useCollectibleStore((s) => s.getAllDefs());
  const acquired = useCollectibleStore((s) => s.acquired);
  const selectedId = useCollectibleStore((s) => s.selectedId);
  const setSelectedId = useCollectibleStore((s) => s.setSelectedId);
  const getDescription = useCollectibleStore((s) => s.getDescription);
  const hasAcquired = useCollectibleStore((s) => s.hasAcquired);

  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const selectedDef: CollectibleItemDef | undefined = selectedId
    ? items.find((i) => i.id === selectedId)
    : undefined;

  const showDetail = selectedDef && hasAcquired(selectedDef.id);

  // 補滿網格至 4 的倍數（線框視覺用空槽）
  const slotCount = Math.max(items.length, GRID_COLS * 3);
  const paddedSlots = Array.from({ length: slotCount }, (_, i) => items[i] ?? null);

  if (!hydrated) return null;

  return (
    <div className="backpack-page min-h-screen flex flex-col bg-white text-black">
      <header className="backpack-header shrink-0 flex items-center justify-between px-4 py-3 border-b-2 border-black">
        <Link href="/market" className="backpack-back flex items-center gap-1 text-sm font-bold">
          <span aria-hidden>←</span>
          返回
        </Link>
        <h1 className="text-sm font-bold tracking-widest">背包</h1>
        <button
          type="button"
          className="backpack-wire-btn text-xs px-2 py-1"
          onClick={() => setDebugOpen((o) => !o)}
        >
          {debugOpen ? "關閉 DEBUG" : "DEBUG"}
        </button>
      </header>

      {debugOpen && <CollectibleDebugPanel />}

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* 左欄：物品詳情 */}
        <section className="backpack-detail flex flex-col border-b-2 md:border-b-0 md:border-r-2 border-black md:w-[42%] min-h-[240px]">
          <div className="backpack-detail-image flex-1 flex items-center justify-center p-6 border-b-2 border-black min-h-[180px]">
            {showDetail && selectedDef ? (
              <Image
                src={selectedDef.image}
                alt={selectedDef.name}
                width={200}
                height={200}
                className="max-h-[200px] w-auto h-auto object-contain"
                unoptimized
              />
            ) : (
              <span className="text-black/30 text-sm tracking-widest">（未選取物品）</span>
            )}
          </div>
          <div className="backpack-detail-desc p-4 min-h-[120px] text-sm leading-relaxed whitespace-pre-wrap">
            {showDetail && selectedDef ? getDescription(selectedDef) : null}
          </div>
        </section>

        {/* 右欄：物品網格 */}
        <section className="backpack-grid-wrap flex-1 p-4 overflow-y-auto">
          <div
            className="backpack-grid grid gap-3"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          >
            {paddedSlots.map((def, index) => {
              if (!def) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="backpack-slot backpack-slot--empty aspect-square"
                    aria-hidden
                  />
                );
              }

              const owned = acquired.includes(def.id);
              const isSelected = selectedId === def.id && owned;

              return (
                <button
                  key={def.id}
                  type="button"
                  disabled={!owned}
                  className={`backpack-slot aspect-square relative flex items-center justify-center ${
                    isSelected ? "backpack-slot--selected" : ""
                  } ${!owned ? "backpack-slot--locked" : ""}`}
                  onClick={() => {
                    if (owned) setSelectedId(def.id);
                  }}
                  aria-label={owned ? def.name : `${def.name}（未取得）`}
                  title={owned ? def.name : "尚未取得"}
                >
                  {owned ? (
                    <Image
                      src={def.icon}
                      alt=""
                      width={48}
                      height={48}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                      unoptimized
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
