"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StorySequencePlayer from "@/components/narrative/StorySequencePlayer";
import { narrativeDefault } from "@/data/narrative-default";
import { useNarrativeStore } from "@/store/narrativeStore";

export default function IntroFlow() {
  const router = useRouter();
  const hydrate = useNarrativeStore((s) => s.hydrate);
  const completeIntro = useNarrativeStore((s) => s.completeIntro);
  const setEditMode = useNarrativeStore((s) => s.setEditMode);
  const [jumpTo, setJumpTo] = useState<number | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleAction = (action: string) => {
    if (action === "goto-toilet") {
      const idx = narrativeDefault.intro.findIndex((l) => l.id === "intro-t1");
      if (idx >= 0) setJumpTo(idx);
    } else if (action === "goto-investigate") {
      const idx = narrativeDefault.intro.findIndex((l) => l.id === "intro-d15");
      if (idx >= 0) setJumpTo(idx);
    } else if (action === "goto-market") {
      completeIntro();
      setEditMode(false);
      router.push("/market");
    } else if (action === "edit-mode") {
      setEditMode(true);
      completeIntro();
      router.push("/market");
      return;
    } else if (action === "skip-intro") {
      completeIntro();
      router.push("/market");
    }
  };

  const lines =
    jumpTo != null ? narrativeDefault.intro.slice(jumpTo) : narrativeDefault.intro;

  return (
    <StorySequencePlayer
      key={jumpTo ?? "start"}
      lines={lines}
      showSkip
      onSkip={() => handleAction("skip-intro")}
      onAction={(a) => handleAction(a)}
      onComplete={() => {
        completeIntro();
        router.push("/market");
      }}
    />
  );
}
