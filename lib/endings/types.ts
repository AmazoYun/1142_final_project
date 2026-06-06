import type { StoryLine } from "@/lib/narrative/types";

export type EndingId = "basic" | "loop" | "stuck" | "true";

export type EndingScript = {
  id: EndingId;
  title: string;
  lines: StoryLine[];
  /** loop 結局結束後回到夜市 */
  restartMarket?: boolean;
};

export type EndingsBundle = {
  endings: Record<EndingId, EndingScript>;
};
