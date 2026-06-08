export type Speaker = "主角" | "友人A" | "友人B" | "旁白";

export type StoryLine =
  | { type: "caption"; id: string; text: string }
  | { type: "dialogue"; id: string; speaker: Speaker; text: string }
  | { type: "visual"; id: string; visual: VisualKind }
  | { type: "transition"; id: string; transition: TransitionKind }
  | { type: "wait"; id: string; ms: number }
  | { type: "buttons"; id: string; buttons: StoryButton[] };

export type StoryButton = {
  id: string;
  label: string;
  action: "next" | "skip-intro" | "goto-market" | "edit-mode" | "goto-toilet" | "goto-investigate";
};

export type VisualKind =
  | "market-walk"
  | "market-friends"
  | "market-walk-shake"
  | "market-desaturate"
  | "glowing-stall"
  | "title-card"
  | "bathroom";

export type TransitionKind = "bathroom" | "fade-dark" | "game-hint";

export type StallId = "pinball" | "balloonshoot" | "ringtoss" | "catchfish";

export type StallIntroScript = {
  stallId: StallId;
  title: string;
  href: string;
  glow: boolean;
  captions: { id: string; text: string }[];
  dialogues: { id: string; speaker: Speaker; text: string }[];
  enterLabel: string;
  howToPlay: string;
};

export type NarrativeBundle = {
  intro: StoryLine[];
  marketOpening: StoryLine[];
  boundaryLines: { id: string; speaker: Speaker; text: string }[];
  moveHint: { id: string; text: string };
  stalls: Record<StallId, StallIntroScript>;
};
