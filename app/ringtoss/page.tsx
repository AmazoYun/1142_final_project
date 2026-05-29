import GameShell from "@/components/game/GameShell";
import RingTossGame from "./RingTossGame";
import { narrativeDefault } from "@/data/narrative-default";

export default function RingTossPage() {
  const script = narrativeDefault.stalls.ringtoss;
  return (
    <GameShell title={script.title}>
      <RingTossGame />
    </GameShell>
  );
}
