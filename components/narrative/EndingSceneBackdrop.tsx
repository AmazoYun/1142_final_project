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
  crossfadeMs?: number;
};

export default function EndingSceneBackdrop({
  endingId,
  slide,
  crossfadeMs = 1200,
}: Props) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const prevSlideRef = useRef<number | null>(null);

  useEffect(() => {
    const src = endingSlideSrc(endingId, slide);
    if (!src) return;

    const prev = prevSlideRef.current;
    prevSlideRef.current = slide;
    if (prev === slide) return;

    setLayers((current) => [
      ...current.map((layer) => ({ ...layer, opacity: 0 })),
      { key: `${endingId}-${slide}-${Date.now()}`, src, opacity: 0 },
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
  }, [endingId, slide, crossfadeMs]);

  const src = endingSlideSrc(endingId, slide);
  if (!src) {
    return <div className="absolute inset-0 bg-black" />;
  }

  if (layers.length === 0) {
    return (
      <div className="intro-scene-backdrop">
        <div className="intro-scene-backdrop__layer intro-scene-backdrop__layer--in">
          <Image
            src={src}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      </div>
    );
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
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}
    </div>
  );
}
