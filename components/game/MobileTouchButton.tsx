"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** 左 / 右 / 底部操作區 */
  placement?: "left" | "right" | "bottom-left" | "bottom-right" | "bottom-center";
  /** 較大的圓形方向鍵樣式 */
  variant?: "arrow" | "action";
  active?: boolean;
};

const PLACEMENT_CLASS: Record<NonNullable<Props["placement"]>, string> = {
  left: "mobile-touch-btn--left",
  right: "mobile-touch-btn--right",
  "bottom-left": "mobile-touch-btn--bottom-left",
  "bottom-right": "mobile-touch-btn--bottom-right",
  "bottom-center": "mobile-touch-btn--bottom-center",
};

/** 手機橫屏觸控按鈕：半透明、不遮擋主要畫面 */
export default function MobileTouchButton({
  children,
  placement = "bottom-center",
  variant = "action",
  active = false,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[
        "mobile-touch-btn",
        PLACEMENT_CLASS[placement],
        variant === "arrow" ? "mobile-touch-btn--arrow" : "mobile-touch-btn--action",
        active ? "mobile-touch-btn--active" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span className="mobile-touch-btn__label">{children}</span>
    </button>
  );
}
