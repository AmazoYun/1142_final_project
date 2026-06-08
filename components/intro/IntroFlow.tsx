"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StorySequencePlayer from "@/components/narrative/StorySequencePlayer";
import { narrativeDefault } from "@/data/narrative-default";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { useNarrativeStore } from "@/store/narrativeStore";

type Props = {
  onComplete?: () => void;
};

export default function IntroFlow({ onComplete }: Props) {
  const router = useRouter();
  const hydrate = useNarrativeStore((s) => s.hydrate);
  const completeIntro = useNarrativeStore((s) => s.completeIntro);
  const [jumpTo, setJumpTo] = useState<number | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const finishIntro = async () => {
    completeIntro();
    if (onComplete) {
      onComplete();
      return;
    }
    await navigateWithFade(router, "/market");
  };

  const handleAction = (action: string) => {
    if (action === "goto-toilet") {
      const idx = narrativeDefault.intro.findIndex((l) => l.id === "intro-t1");
      if (idx >= 0) setJumpTo(idx);
    } else if (action === "goto-investigate") {
      const idx = narrativeDefault.intro.findIndex((l) => l.id === "intro-d15");
      if (idx >= 0) setJumpTo(idx);
    } else if (action === "goto-market" || action === "skip-intro") {
      void finishIntro();
    }
  };

  const lines =
    jumpTo != null ? narrativeDefault.intro.slice(jumpTo) : narrativeDefault.intro;

  return (
    <StorySequencePlayer
      key={jumpTo ?? "start"}
      lines={lines}
      showSkip
      onSkip={() => void finishIntro()}
      onAction={(a) => handleAction(a)}
      onComplete={() => void finishIntro()}
    />
  );
}
