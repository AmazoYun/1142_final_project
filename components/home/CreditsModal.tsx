"use client";

import HomeModalShell from "@/components/home/HomeModalShell";

const CREDITS: { role: string; members: string | readonly string[] }[] = [
  { role: "故事設計", members: "心理三  鄧伯希" },
  { role: "美術與介面設計", members: "廣電四  許兆豐  法律四  呂芃慧" },
  { role: "主畫面動畫", members: "心理三  鄧伯希" },
  { role: "前導動畫", members: "廣電四  許兆豐" },
  { role: "結局動畫", members: "法律四  呂芃慧" },
  { role: "遊戲音效", members: "廣電四  許兆豐" },
  {
    role: "遊戲機制設計",
    members: ["套圈圈：心理三  鄧伯希", "撈金魚：歷史四  吳尚鴻", "彈珠台：廣電四  許兆豐","射氣球：法律四  呂芃慧"],
  },
  { role: "前端架設", members: "歷史四  吳尚鴻  廣電四  許兆豐" },
  { role: "後端架設", members: "廣電四  許兆豐" },
  {
    role: "音樂素材",
    members: [
      "主畫面：Silent Hill 2 OST - White Noiz",
      "夜市場景音樂：Yume Nikki OST - Numbers World",
      "彈珠臺攤位音樂：豬哥亮的歌廳秀",
      "射氣球攤位音樂：沈文程 - 漂泊七逃人",
      "套圈圈攤位音樂：阿吉仔 - 命運的吉他",
      "撈金魚攤位音樂：林強 - 春風少年兄",
    ],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreditsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <HomeModalShell className="w-full max-w-lg">
      <div className="home-modal__header space-y-2">
        <h2 className="game-title text-center text-lg">Credits</h2>
      </div>

      <dl className="home-modal__credits space-y-4">
        {CREDITS.map(({ role, members }) => (
          <div key={role} className="home-modal__credits-row">
            <dt className="home-modal__credits-role">{role}</dt>
            {Array.isArray(members) ? (
              members.map((line) => (
                <dd key={line} className="home-modal__credits-members">
                  {line}
                </dd>
              ))
            ) : (
              <dd className="home-modal__credits-members">{members}</dd>
            )}
          </div>
        ))}
      </dl>

      <div className="home-modal__actions">
        <button type="button" className="game-btn-ghost" onClick={onClose}>
          關閉
        </button>
      </div>
    </HomeModalShell>
  );
}
