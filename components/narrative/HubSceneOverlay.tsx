/** 與夜市 hub 相同的暗角、掃描線與雜訊疊層（用於全螢幕劇情場景） */
export default function HubSceneOverlay() {
  return (
    <div className="story-scene-fx pointer-events-none" aria-hidden>
      <div className="hub-vignette" />
      <div className="story-scene-fx__scanlines" />
      <div className="story-scene-fx__noise" />
    </div>
  );
}
