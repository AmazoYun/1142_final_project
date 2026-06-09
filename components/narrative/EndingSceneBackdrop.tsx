"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { endingSlideSrc } from "@/lib/endings/endingAssets";
import type { EndingId } from "@/lib/endings/types";

type Layer = {
  key: string;
  src: string;
  opacity: number;
};

type Props = {
  endingId: EndingId;
  slide: number;
  visualKey: string;
  crossfadeMs?: number;
};

export default function EndingSceneBackdrop({
  endingId,
  slide,
  visualKey,
  crossfadeMs = 2000,
}: Props) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const prevKeyRef = useRef<string | null>(null);
  const prevSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visualKey) return;

    const src = endingSlideSrc(endingId, slide);
    if (!src) return;

    const prevKey = prevKeyRef.current;
    prevKeyRef.current = visualKey;
    if (prevKey === visualKey) return;

    if (prevSrcRef.current === src) {
      return;
    }
    prevSrcRef.current = src;

    setLayers((current) => [
      ...current.map((layer) => ({ ...layer, opacity: 0 })),
      { key: visualKey, src, opacity: 0 },
    ]);

    const fadeIn = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLayers((current) =>
          current.map((layer, index) => ({
            ...layer,
            opacity: index === current.length - 1 ? 1 : 0,
          })),
        );
      });
    });

    const cleanup = window.setTimeout(() => {
      setLayers((current) => (current.length > 0 ? [current[current.length - 1]!] : current));
    }, crossfadeMs + 120);

    return () => {
      cancelAnimationFrame(fadeIn);
      clearTimeout(cleanup);
    };
  }, [endingId, slide, visualKey, crossfadeMs]);

  if (!visualKey) {
    return <div className="absolute inset-0 bg-black" />;
  }

  if (layers.length === 0) {
    return <div className="absolute inset-0 bg-black" />;
  }

  return (
    <div className="intro-scene-backdrop">
      {layers.map((layer) => (
        <div
          key={layer.key}
          className="intro-scene-backdrop__layer"
          style={{
            opacity: layer.opacity,
            transition: `opacity ${crossfadeMs}ms ease-in-out`,
          }}
        >
          <Image
            src={layer.src}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}
    </div>
  );
}
