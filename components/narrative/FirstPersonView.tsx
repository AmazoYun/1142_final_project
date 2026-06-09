"use client";

import type { BackdropEffect, VisualKind } from "@/lib/narrative/types";
import IntroSceneBackdrop from "./IntroSceneBackdrop";

type Props = {
  visual: VisualKind;
  effect?: BackdropEffect;
  crossfadeMs?: number;
  dim?: boolean;
};

export default function FirstPersonView({
  visual,
  effect = "none",
  crossfadeMs,
  dim = false,
}: Props) {
  return (
    <IntroSceneBackdrop
      visual={visual}
      effect={effect}
      crossfadeMs={crossfadeMs}
      dim={dim}
    />
  );
}
