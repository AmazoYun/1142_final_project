"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import IntroFlow from "@/components/intro/IntroFlow";
import { useNarrativeStore } from "@/store/narrativeStore";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replayIntro = searchParams.get("replayIntro") === "1";

  const hydrate = useNarrativeStore((s) => s.hydrate);
  const replayIntroAction = useNarrativeStore((s) => s.replayIntro);
  const introDone = useNarrativeStore((s) => s.introDone);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    if (replayIntro) {
      replayIntroAction();
    }
    setReady(true);
  }, [hydrate, replayIntro, replayIntroAction]);

  useEffect(() => {
    if (!ready) return;
    if (introDone) {
      router.replace("/market");
    }
  }, [ready, introDone, router]);

  if (!ready) return null;
  if (introDone) return null;

  return <IntroFlow />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
