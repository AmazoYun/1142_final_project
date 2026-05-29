import GameShell from "@/components/game/GameShell";
import BalloonShootGame from "./BalloonShootGame";
import { narrativeDefault } from "@/data/narrative-default";

export default function BalloonShootPage() {
  const script = narrativeDefault.stalls.balloonshoot;
  return (
    <GameShell title={script.title}>
      <BalloonShootGame />
    </GameShell>
  );
}
