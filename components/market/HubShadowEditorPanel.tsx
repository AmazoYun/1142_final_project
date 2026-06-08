"use client";

import {
  HUB_SHADOW_IMAGES,
  type HubShadowPlacement,
} from "@/lib/market/hubSceneLayers";

type Props = {
  placements: HubShadowPlacement[];
  selected: HubShadowPlacement | null;
  saving: boolean;
  status: string | null;
  onAdd: () => void;
  onDelete: () => void;
  onScale: (factor: number) => void;
  onSetImage: (image: HubShadowPlacement["image"]) => void;
  onSave: () => void;
  onCopyJson: () => void;
  onExit: () => void;
};

export default function HubShadowEditorPanel({
  placements,
  selected,
  saving,
  status,
  onAdd,
  onDelete,
  onScale,
  onSetImage,
  onSave,
  onCopyJson,
  onExit,
}: Props) {
  return (
    <div className="hub-shadow-editor-panel">
      <p className="hub-shadow-editor-panel__title">陰影編輯模式</p>
      <div className="hub-shadow-editor-panel__actions">
        <button type="button" className="hub-shadow-editor-btn" onClick={onAdd}>
          ＋ 新增
        </button>
        <button
          type="button"
          className="hub-shadow-editor-btn"
          onClick={onDelete}
          disabled={!selected}
        >
          刪除
        </button>
        <button
          type="button"
          className="hub-shadow-editor-btn"
          onClick={() => onScale(0.92)}
          disabled={!selected}
        >
          縮小
        </button>
        <button
          type="button"
          className="hub-shadow-editor-btn"
          onClick={() => onScale(1.08)}
          disabled={!selected}
        >
          放大
        </button>
      </div>
      <div className="hub-shadow-editor-panel__actions">
        {HUB_SHADOW_IMAGES.map((src, i) => (
          <button
            key={src}
            type="button"
            className={`hub-shadow-editor-btn hub-shadow-editor-btn--img${selected?.image === src ? " hub-shadow-editor-btn--active" : ""}`}
            onClick={() => onSetImage(src)}
            disabled={!selected}
          >
            圖{i + 1}
          </button>
        ))}
      </div>
      <div className="hub-shadow-editor-panel__actions">
        <button
          type="button"
          className="hub-shadow-editor-btn hub-shadow-editor-btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "儲存中…" : "儲存"}
        </button>
        <button type="button" className="hub-shadow-editor-btn" onClick={onCopyJson}>
          複製 JSON
        </button>
        <button type="button" className="hub-shadow-editor-btn" onClick={onExit}>
          離開
        </button>
      </div>
      {selected ? (
        <p className="hub-shadow-editor-panel__meta">
          {selected.id} · x={(selected.worldRatio + selected.worldJitter).toFixed(3)} ·
          低={selected.floorOffset.toFixed(3)} · 縮放={selected.scale.toFixed(2)}
        </p>
      ) : (
        <p className="hub-shadow-editor-panel__meta">點選陰影後拖曳移動</p>
      )}
      {status ? <p className="hub-shadow-editor-panel__status">{status}</p> : null}
      <p className="hub-shadow-editor-panel__hint">網址加 ?shadowEdit=1 可直達編輯模式</p>
    </div>
  );
}
