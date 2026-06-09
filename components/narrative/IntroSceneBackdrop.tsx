"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { introSceneSrc } from "@/lib/narrative/introAssets";
import type { BackdropEffect, VisualKind } from "@/lib/narrative/types";

type Layer = {
  key: string;
  src: string;
  opacity: number;
};

type Props = {
  visual: VisualKind;
  effect?: BackdropEffect;
  crossfadeMs?: number;
  dim?: boolean;
};

export default function IntroSceneBackdrop({
  visual,
  effect = "none",
  crossfadeMs = 1200,
  dim = false,
}: Props) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const prevVisualRef = useRef<VisualKind | null>(null);

  useEffect(() => {
    const src = introSceneSrc(visual);
    if (!src) return;

    const prev = prevVisualRef.current;
    if (prev === visual) return;
    prevVisualRef.current = visual;

    const instant = crossfadeMs <= 0;

    const fadeInLayer = () => {
      if (instant) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLayers((current) =>
            current.map((layer, index) => ({
              ...layer,
              opacity: index === current.length - 1 ? 1 : 0,
            })),
          );
        });
      });
    };

    if (prev === null) {
      if (instant) {
        setLayers([{ key: visual, src, opacity: 1 }]);
        return;
      }
      setLayers([{ key: `${visual}-initial`, src, opacity: 0 }]);
      fadeInLayer();
      const cleanup = window.setTimeout(() => {
        setLayers([{ key: visual, src, opacity: 1 }]);
      }, crossfadeMs + 80);
      return () => clearTimeout(cleanup);
    }

    if (instant) {
      setLayers([{ key: `${visual}-instant`, src, opacity: 1 }]);
      return;
    }

    setLayers((current) => [
      ...current.map((layer) => ({ ...layer, opacity: 0 })),
      { key: `${visual}-${Date.now()}`, src, opacity: 0 },
    ]);
    fadeInLayer();

    const cleanup = window.setTimeout(() => {
      setLayers((current) => {
        const last = current[current.length - 1];
        if (!last) return current;
        return [{ ...last, opacity: 1 }];
      });
    }, crossfadeMs + 80);

    return () => clearTimeout(cleanup);
  }, [visual, crossfadeMs]);

  if (visual === "title-card") {
    return (
      <div className="absolute inset-0 overflow-hidden hub-shell flex flex-col items-center justify-center gap-4">
        <div className="absolute inset-0 hub-world-sky" />
        <h1 className="relative game-panel px-8 py-4 text-3xl md:text-4xl tracking-[0.3em] text-ink">
          無人夜市
        </h1>
        <p className="relative game-caption text-xs tracking-[0.2em]">Night Market · 2005</p>
      </div>
    );
  }

  const src = introSceneSrc(visual);
  if (!src) {
    return <div className="absolute inset-0 bg-black" />;
  }

  if (layers.length === 0) {
    if (crossfadeMs <= 0) {
      const instantSrc = introSceneSrc(visual);
      if (instantSrc) {
        return (
          <div className="intro-scene-backdrop hub-world-bg">
            <div className="intro-scene-backdrop__layer" style={{ opacity: 1, zIndex: 0 }}>
              <Image
                src={instantSrc}
                alt=""
                fill
                unoptimized
                priority
                className="object-cover object-center hub-world-bg-image"
                sizes="100vw"
              />
            </div>
          </div>
        );
      }
    }
    return <div className="intro-scene-backdrop hub-world-bg bg-black" />;
  }

  const effectClass =
    effect === "shake-blur"
      ? "intro-scene-backdrop__layer--shake-blur"
      : effect === "shake-blur-mild"
        ? "intro-scene-backdrop__layer--shake-blur-mild"
        : "";

  return (
    <div className="intro-scene-backdrop hub-world-bg">
      {layers.map((layer, index) => {
        const isTop = index === layers.length - 1;
        return (
          <div
            key={layer.key}
            className={[
              "intro-scene-backdrop__layer",
              isTop && dim ? "intro-scene-backdrop__layer--dim" : "",
              isTop ? effectClass : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              opacity: layer.opacity,
              transition: `opacity ${crossfadeMs}ms ease-in-out`,
              zIndex: index,
            }}
          >
            <Image
              src={layer.src}
              alt=""
              fill
              unoptimized
              priority={isTop}
              className="object-cover object-center hub-world-bg-image"
              sizes="100vw"
            />
          </div>
        );
      })}
    </div>
  );
}
