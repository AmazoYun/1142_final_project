"use client";

import HomeModalShell from "./HomeModalShell";

type Props = {
  open: boolean;
  nickname: string;
  onNicknameChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function LoginModal({
  open,
  nickname,
  onNicknameChange,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <HomeModalShell className="w-full max-w-md">
      <div className="home-modal__header space-y-2">
        <h2 className="game-title text-center text-lg">登入玩家</h2>
        <p className="home-modal__subtitle text-center">請輸入暱稱以查看存檔並開始遊戲。</p>
      </div>

      <input
        type="text"
        value={nickname}
        onChange={(e) => onNicknameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
        }}
        className="home-modal__input"
        placeholder="請輸入暱稱"
        maxLength={20}
        autoFocus
      />

      <div className="home-modal__actions">
        <button type="button" className="game-btn-ghost" onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className="game-btn-primary"
          disabled={!nickname.trim()}
          onClick={onConfirm}
        >
          登入
        </button>
      </div>
    </HomeModalShell>
  );
}
