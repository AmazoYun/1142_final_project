"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import StorySequencePlayer from "@/components/narrative/StorySequencePlayer";
import { narrativeDefault } from "@/data/narrative-default";
import { stopIntroSounds } from "@/lib/narrative/introSounds";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { useNarrativeStore } from "@/store/narrativeStore";

type Props = {
  onComplete?: () => void;
};

export default function IntroFlow({ onComplete }: Props) {
  const router = useRouter();
  const hydrate = useNarrativeStore((s) => s.hydrate);
  const completeIntro = useNarrativeStore((s) => s.completeIntro);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const finishIntro = async () => {
    await stopIntroSounds();
    completeIntro();
    if (onComplete) {
      onComplete();
      return;
    }
    await navigateWithFade(router, "/market");
  };

  const handleAction = (action: string) => {
    if (action === "goto-market" || action === "skip-intro") {
      void finishIntro();
    }
  };

  return (
    <StorySequencePlayer
      lines={narrativeDefault.intro}
      showSkip
      onSkip={() => void finishIntro()}
      onAction={(a) => handleAction(a)}
      onComplete={() => void finishIntro()}
    />
  );
}
