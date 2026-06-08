/**
 * Client 包裝：供 Server Component 的 layout 掛載全域收集系統 UI。
 * 【修改影響】僅新增對話 Host，不變更既有頁面 children 結構。
 */
"use client";

import CollectibleAcquireBlocker from "./CollectibleAcquireBlocker";
import CollectibleAcquireOverlay from "./CollectibleAcquireOverlay";
import CollectibleDialogueHost from "./CollectibleDialogueHost";

export default function CollectibleProviders() {
  return (
    <>
      <CollectibleAcquireBlocker />
      <CollectibleAcquireOverlay />
      <CollectibleDialogueHost />
    </>
  );
}
