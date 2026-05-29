import GameShell from "@/components/game/GameShell";
import CatchFishGame from "./CatchFishGame";
import { narrativeDefault } from "@/data/narrative-default";

export default function CatchFishPage() {
  const script = narrativeDefault.stalls.catchfish;
  return (
    <GameShell title={script.title}>
      <CatchFishGame />
    </GameShell>
  );
}
