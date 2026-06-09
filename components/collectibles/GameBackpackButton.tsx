"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCollectibleDef } from "@/data/collectibles-default";
import {
  buildBackpackGridEntries,
  lockedSpecialHint,
  SPECIAL_ITEM_STALL,
  type BackpackGridEntry,
} from "@/lib/collectibles/backpackGrid";
import {
  BACKPACK_ITEM_IMAGES,
  BACKPACK_ITEM_SIZE_RATIO,
  BACKPACK_SMALL_BACKGROUND,
  BACKPACK_SMALL_GRID_SLOTS,
  BACKPACK_SMALL_GRID_VIEWPORT,
  BACKPACK_SMALL_IMAGE_HEIGHT,
  BACKPACK_SMALL_IMAGE_WIDTH,
  LOTTERY_TICKET_IMAGES,
  resolveViewportCover,
  slotStyleInCover,
} from "@/lib/collectibles/backpackLayout";
import type { CollectibleId } from "@/lib/collectibles/types";
import { useCollectibleStore } from "@/store/collectibleStore";
import type { LotteryTicketType } from "@/store/tokenStore";
import { useTokenStore } from "@/store/tokenStore";

const LOTTERY_META: Record<LotteryTicketType, { name: string; desc: string }> = {
  ticket10: { name: "10 元彩票", desc: "夜市攤位常見的彩票。" },
  ticket50: { name: "50 元彩票", desc: "較少見的彩票。" },
};

type Props = {
  draggableItemIds?: CollectibleId[];
  onDragStartItem?: (id: CollectibleId) => void;
  onDragEndItem?: () => void;
};

function toPercentStyle(box: { left: number; top: number; width: number; height: number }) {
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  };
}

export default function GameBackpackButton({
  draggableItemIds = [],
  onDragStartItem,
  onDragEndItem,
}: Props) {
  const hydrate = useCollectibleStore((s) => s.hydrate);
  const hydrated = useCollectibleStore((s) => s.hydrated);
  const acquired = useCollectibleStore((s) => s.acquired);
  const getDescription = useCollectibleStore((s) => s.getDescription);
  const hydrateTokens = useTokenStore((s) => s.hydrate);
  const tokensHydrated = useTokenStore((s) => s.hydrated);
  const ticket10 = useTokenStore((s) => s.ticket10);
  const ticket50 = useTokenStore((s) => s.ticket50);

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<CollectibleId | null>(null);
  const [selectedLottery, setSelectedLottery] = useState<LotteryTicketType | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    hydrate();
    hydrateTokens();
  }, [hydrate, hydrateTokens]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !open) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const gridEntries = useMemo(
    () => buildBackpackGridEntries(acquired, ticket10, ticket50),
    [acquired, ticket10, ticket50],
  );

  const cover = useMemo(
    () =>
      stageSize.w > 0
        ? resolveViewportCover(
            stageSize.w,
            stageSize.h,
            BACKPACK_SMALL_GRID_VIEWPORT,
            BACKPACK_SMALL_IMAGE_WIDTH,
            BACKPACK_SMALL_IMAGE_HEIGHT,
          )
        : null,
    [stageSize.w, stageSize.h],
  );

  const selectedDef = selectedId ? getCollectibleDef(selectedId) : undefined;
  const selectedLotteryCount =
    selectedLottery === "ticket10" ? ticket10 : selectedLottery === "ticket50" ? ticket50 : 0;

  const selectCollectible = (id: CollectibleId) => {
    setSelectedLottery(null);
    setSelectedId(id);
  };

  const selectLottery = (type: LotteryTicketType) => {
    setSelectedId(null);
    setSelectedLottery(type);
  };

  const renderSlot = (entry: BackpackGridEntry) => {
    const slot = BACKPACK_SMALL_GRID_SLOTS[entry.slotIndex];
    if (!slot || !cover) return null;
    const box = slotStyleInCover(slot, cover);
    const itemSize = Math.min(box.width, box.height) * BACKPACK_ITEM_SIZE_RATIO;

    if (entry.kind === "special") {
      const def = getCollectibleDef(entry.id);
      if (!def) return null;
      const isSelected = selectedId === entry.id && !selectedLottery;
      const imgSrc = BACKPACK_ITEM_IMAGES[entry.id] ?? def.icon;
      return (
        <button
          key={`special-${entry.id}`}
          type="button"
          className={`backpack-item-slot absolute ${isSelected ? "backpack-item-slot--selected" : ""}`}
          style={toPercentStyle(box)}
          onClick={() => selectCollectible(entry.id)}
          aria-label={entry.acquired ? def.name : "???"}
        >
          {entry.acquired ? (
            <Image
              src={imgSrc}
              alt=""
              width={Math.round(itemSize)}
              height={Math.round(itemSize)}
              className="backpack-item-slot__icon"
              style={{ width: itemSize, height: itemSize }}
              unoptimized
            />
          ) : (
            <Image
              src={imgSrc}
              alt=""
              width={Math.round(itemSize)}
              height={Math.round(itemSize)}
              className="backpack-item-slot__icon backpack-item-slot__icon--silhouette"
              style={{ width: itemSize, height: itemSize }}
              unoptimized
            />
          )}
        </button>
      );
    }

    if (entry.kind === "collectible") {
      const def = getCollectibleDef(entry.id);
      if (!def) return null;
      const isSelected = selectedId === entry.id && !selectedLottery;
      const draggable = draggableItemIds.includes(entry.id);
      const slotClass = `backpack-item-slot absolute ${isSelected ? "backpack-item-slot--selected" : ""} ${draggable ? "backpack-item-slot--draggable" : ""}`;
      const icon = (
        <Image
          src={BACKPACK_ITEM_IMAGES[entry.id] ?? def.icon}
          alt=""
          width={Math.round(itemSize)}
          height={Math.round(itemSize)}
          className="backpack-item-slot__icon"
          style={{ width: itemSize, height: itemSize }}
          draggable={false}
          unoptimized
        />
      );

      if (draggable) {
        return (
          <div
            key={`item-${entry.id}`}
            role="button"
            tabIndex={0}
            className={slotClass}
            style={toPercentStyle(box)}
            onClick={() => selectCollectible(entry.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectCollectible(entry.id);
              }
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/collectible-id", entry.id);
              e.dataTransfer.setData("text/plain", entry.id);
              e.dataTransfer.effectAllowed = "copy";
              onDragStartItem?.(entry.id);
            }}
            onDragEnd={() => {
              setOpen(false);
              onDragEndItem?.();
            }}
            aria-label={def.name}
          >
            {icon}
          </div>
        );
      }

      return (
        <button
          key={`item-${entry.id}`}
          type="button"
          className={slotClass}
          style={toPercentStyle(box)}
          onClick={() => selectCollectible(entry.id)}
          aria-label={def.name}
        >
          {icon}
        </button>
      );
    }

    const meta = LOTTERY_META[entry.ticketType];
    const isSelected = selectedLottery === entry.ticketType;
    return (
      <button
        key={`lottery-${entry.ticketType}`}
        type="button"
        className={`backpack-item-slot absolute ${isSelected ? "backpack-item-slot--selected" : ""}`}
        style={toPercentStyle(box)}
        onClick={() => selectLottery(entry.ticketType)}
        aria-label={meta.name}
      >
        <Image
          src={LOTTERY_TICKET_IMAGES[entry.ticketType]}
          alt=""
          width={Math.round(itemSize * 0.88)}
          height={Math.round(itemSize * 0.62)}
          className="backpack-lottery-ticket__image"
          style={{ width: itemSize * 0.88, height: itemSize * 0.62 }}
          unoptimized
        />
        <span className="backpack-item-slot__count">{entry.count}</span>
      </button>
    );
  };

  const detailContent = () => {
    if (selectedLottery && selectedLotteryCount > 0) {
      const meta = LOTTERY_META[selectedLottery];
      return (
        <>
          <Image
            src={LOTTERY_TICKET_IMAGES[selectedLottery]}
            alt=""
            width={56}
            height={40}
            className="game-backpack-popup__detail-img"
            unoptimized
          />
          <p className="game-backpack-popup__detail-name">{meta.name}</p>
          <p className="game-backpack-popup__detail-desc">{meta.desc}</p>
        </>
      );
    }

    if (selectedDef) {
      const isSpecial = selectedId && SPECIAL_ITEM_STALL[selectedId];
      const owned = acquired.includes(selectedDef.id);
      if (isSpecial && !owned) {
        const stallId = SPECIAL_ITEM_STALL[selectedDef.id]!;
        return (
          <>
            <Image
              src={BACKPACK_ITEM_IMAGES[selectedDef.id] ?? selectedDef.image}
              alt=""
              width={56}
              height={56}
              className="game-backpack-popup__detail-img backpack-item-slot__icon--silhouette"
              unoptimized
            />
            <p className="game-backpack-popup__detail-name">???</p>
            <p className="game-backpack-popup__detail-desc">{lockedSpecialHint(stallId)}</p>
          </>
        );
      }
      if (owned) {
        return (
          <>
            <Image
              src={BACKPACK_ITEM_IMAGES[selectedDef.id] ?? selectedDef.image}
              alt=""
              width={56}
              height={56}
              className="game-backpack-popup__detail-img"
              unoptimized
            />
            <p className="game-backpack-popup__detail-name">{selectedDef.name}</p>
            <p className="game-backpack-popup__detail-desc">{getDescription(selectedDef)}</p>
          </>
        );
      }
    }

    return <p className="game-backpack-popup__detail-desc">點選道具查看說明</p>;
  };

  if (!hydrated || !tokensHydrated) return null;

  return (
    <div className="game-backpack-anchor">
      <button
        type="button"
        className="game-backpack-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="道具"
      >
        道具
      </button>

      {open ? (
        <div className="game-backpack-popup" role="dialog" aria-label="道具">
          <div
            ref={stageRef}
            className="game-backpack-popup__stage"
            style={{
              aspectRatio: `${BACKPACK_SMALL_IMAGE_WIDTH} / ${BACKPACK_SMALL_IMAGE_HEIGHT}`,
            }}
          >
            {cover ? (
              <div
                className="game-backpack-popup__stage-inner"
                style={{
                  width: cover.width,
                  height: cover.height,
                  left: cover.offsetX,
                  top: cover.offsetY,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BACKPACK_SMALL_BACKGROUND}
                  alt=""
                  className="game-backpack-popup__stage-bg"
                  draggable={false}
                />
                {gridEntries.map(renderSlot)}
              </div>
            ) : null}
          </div>
          <div className="game-backpack-popup__detail">{detailContent()}</div>
        </div>
      ) : null}
    </div>
  );
}
