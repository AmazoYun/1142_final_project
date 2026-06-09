export type Speaker = "主角" | "友人A" | "友人B" | "阿強" | "阿成" | "旁白";

export type BackdropEffect = "none" | "shake-blur-mild" | "shake-blur";

export type StoryLine =
  | { type: "caption"; id: string; text: string }
  | { type: "dialogue"; id: string; speaker: Speaker; text: string }
  | { type: "visual"; id: string; visual: VisualKind; fadeMs?: number; dim?: boolean }
  | { type: "blackout"; id: string; ms: number }
  | { type: "ending-visual"; id: string; slide: number }
  | { type: "backdrop-effect"; id: string; effect: BackdropEffect }
  | { type: "transition"; id: string; transition: TransitionKind; reveals?: VisualKind }
  | { type: "wait"; id: string; ms: number }
  | { type: "loading"; id: string; text: string; ms: number }
  | { type: "buttons"; id: string; buttons: StoryButton[] };

export type StoryButton = {
  id: string;
  label: string;
  action:
    | "next"
    | "skip-intro"
    | "goto-market"
    | "edit-mode"
    | "goto-toilet"
    | "goto-investigate"
    | "wash-hands"
    | "leave-toilet";
};

export type VisualKind =
  | "market-friends"
  | "toilet"
  | "night-market"
  | "market-weird"
  | "glowing-stall"
  | "title-card";

export type TransitionKind =
  | "flash-transition"
  | "fade-reveal"
  | "fade-glowing"
  | "fade-dark"
  | "game-hint";

export type StallId = "pinball" | "balloonshoot" | "ringtoss" | "catchfish";

export type StallHowToSection = {
  title: string;
  items: string[];
};

export type StallIntroScript = {
  stallId: StallId;
  title: string;
  href: string;
  glow: boolean;
  captions: { id: string; text: string }[];
  dialogues: { id: string; speaker: Speaker; text: string }[];
  enterLabel: string;
  howToPlay: StallHowToSection[];
};

export type NarrativeBundle = {
  intro: StoryLine[];
  marketOpening: StoryLine[];
  boundaryLines: { id: string; speaker: Speaker; text: string }[];
  moveHint: { id: string; text: string };
  stalls: Record<StallId, StallIntroScript>;
};
