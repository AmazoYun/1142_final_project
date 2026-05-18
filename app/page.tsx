import Link from "next/link";
import { FaCrown } from "react-icons/fa";

export default function Home() {
  return (
    <div className="h-screen flex justify-center items-center">
      <div className="w-[400px] bg-black rounded-2xl flex flex-col justify-center items-center p-10 pb-12">
        <div className="text-white text-center font-bold text-4xl">第三組</div>
        <div className="flex text-white text-center font-bold text-3xl mt-5 gap-2 justify-center">
          <FaCrown color="yellow" size="35px" />
          <>鄧柏希</>
        </div>
        <div className="text-white text-center font-bold text-3xl mt-3">吳尚鴻</div>
        <div className="text-white text-center font-bold text-3xl mt-3">許兆豐</div>
        <div className="text-white text-center font-bold text-3xl mt-3">呂芃慧</div>

        <div className="mt-10 w-full flex flex-col gap-3">
          <Link
            href="/ringtoss"
            className="block w-full rounded-xl bg-amber-500 py-3 text-center text-lg font-bold text-zinc-900 transition hover:bg-amber-400"
          >
            套圈圈遊戲
          </Link>
          <Link
            href="/pinball"
            className="block w-full rounded-xl bg-cyan-500 py-3 text-center text-lg font-bold text-zinc-900 transition hover:bg-cyan-400"
          >
            彈珠台遊戲
          </Link>
          <Link
            href="/catchfish"
            className="block w-full rounded-xl bg-cyan-500 py-3 text-center text-lg font-bold text-zinc-900 transition hover:bg-cyan-400"
          >
            撈金魚遊戲
          </Link>
        </div>
      </div>
    </div>
  );
}
