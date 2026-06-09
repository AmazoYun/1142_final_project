"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCollectibleDef } from "@/data/collectibles-default";
import BackpackLotteryExchange from "./BackpackLotteryExchange";
import BackpackRedeemButton from "./BackpackRedeemButton";
import {
  buildBackpackGridEntries,
  lockedSpecialHint,
  SPECIAL_ITEM_STALL,
  type BackpackGridEntry,
} from "@/lib/collectibles/backpackGrid";
import {
  BACKPACK_BACKGROUND,
  BACKPACK_DETAIL_DESC,
  BACKPACK_DETAIL_IMAGE,
  BACKPACK_DETAIL_NAME,
  BACKPACK_ITEM_IMAGES,
  BACKPACK_ITEM_SIZE_RATIO,
  GRID_SLOTS,
  LOTTERY_TICKET_IMAGES,
  resolveCoverRect,
  slotStyleInCover,
} from "@/lib/collectibles/backpackLayout";
import { startHubBgm } from "@/lib/market/hubSounds";
import type { CollectibleId } from "@/lib/collectibles/types";
import { useCollectibleStore } from "@/store/collectibleStore";
import type { LotteryTicketType } from "@/store/tokenStore";
import { useTokenStore } from "@/store/tokenStore";

function toAbsoluteStyle(box: { left: number; top: number; width: number; height: number }) {
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  };
}

const LOTTERY_META: Record<
  LotteryTicketType,
  { name: string; desc: string; faceValue: number }
> = {
  ticket10: {
    name: "10 元彩票",
    desc: "夜市攤位常見的彩票，可兌換 10 枚遊戲代幣。",
    faceValue: 10,
  },
  ticket50: {
    name: "50 元彩票",
    desc: "較少見的彩票，可兌換 50 枚遊戲代幣。",
    faceValue: 50,
  },
};

export default function BackpackView() {
  const hydrate = useCollectibleStore((s) => s.hydrate);
  const hydrated = useCollectibleStore((s) => s.hydrated);
  const selectedId = useCollectibleStore((s) => s.selectedId);
  const setSelectedId = useCollectibleStore((s) => s.setSelectedId);
  const acquired = useCollectibleStore((s) => s.acquired);
  const getDescription = useCollectibleStore((s) => s.getDescription);

  const hydrateTokens = useTokenStore((s) => s.hydrate);
  const tokensHydrated = useTokenStore((s) => s.hydrated);
  const ticket10 = useTokenStore((s) => s.ticket10);
  const ticket50 = useTokenStore((s) => s.ticket50);

  const [selectedLottery, setSelectedLottery] = useState<LotteryTicketType | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    hydrate();
    hydrateTokens();
    startHubBgm();
  }, [hydrate, hydrateTokens]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
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
  }, []);

  const cover = useMemo(
    () => (stageSize.w > 0 ? resolveCoverRect(stageSize.w, stageSize.h) : null),
    [stageSize.w, stageSize.h],
  );

  const gridEntries = useMemo(
    () => buildBackpackGridEntries(acquired, ticket10, ticket50),
    [acquired, ticket10, ticket50],
  );

  const selectedDef = selectedId ? getCollectibleDef(selectedId) : undefined;
  const selectedLotteryCount =
    selectedLottery === "ticket10" ? ticket10 : selectedLottery === "ticket50" ? ticket50 : 0;
  const selectedSpecialLocked =
    selectedId &&
    SPECIAL_ITEM_STALL[selectedId] &&
    !acquired.includes(selectedId);
  const showCollectibleDetail =
    selectedDef &&
    (acquired.includes(selectedDef.id) || selectedSpecialLocked) &&
    !selectedLottery;
  const showLotteryDetail = selectedLottery !== null && selectedLotteryCount > 0;

  useEffect(() => {
    if (selectedLottery !== null && selectedLotteryCount <= 0) {
      setSelectedLottery(null);
    }
  }, [selectedLottery, selectedLotteryCount]);

  if (!hydrated || !tokensHydrated) return null;

  const imageBox = cover ? slotStyleInCover(BACKPACK_DETAIL_IMAGE, cover) : null;
  const nameBox = cover ? slotStyleInCover(BACKPACK_DETAIL_NAME, cover) : null;
  const descBox = cover ? slotStyleInCover(BACKPACK_DETAIL_DESC, cover) : null;
  const detailImageMax = imageBox
    ? Math.min(imageBox.width * 0.82, imageBox.height * 0.9)
    : 120;

  const selectCollectible = (id: CollectibleId) => {
    setSelectedLottery(null);
    setSelectedId(id);
  };

  const selectLottery = (type: LotteryTicketType) => {
    setSelectedId(null);
    setSelectedLottery(type);
  };

  const renderSlot = (entry: BackpackGridEntry) => {
    const slot = GRID_SLOTS[entry.slotIndex];
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
          className={`backpack-item-slot absolute ${
            isSelected ? "backpack-item-slot--selected" : ""
          }`}
          style={toAbsoluteStyle(box)}
          onClick={() => selectCollectible(entry.id)}
          aria-label={entry.acquired ? def.name : "???"}
        >
          {entry.acquired ? (
            <>
              <span
                className="backpack-item-slot__shadow"
                style={{ width: itemSize * 0.72, height: itemSize * 0.14 }}
                aria-hidden
              />
              <Image
                src={imgSrc}
                alt=""
                width={Math.round(itemSize)}
                height={Math.round(itemSize)}
                className="backpack-item-slot__icon"
                style={{ width: itemSize, height: itemSize }}
                unoptimized
              />
            </>
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
      return (
        <button
          key={`item-${entry.id}`}
          type="button"
          className={`backpack-item-slot absolute ${
            isSelected ? "backpack-item-slot--selected" : ""
          }`}
          style={toAbsoluteStyle(box)}
          onClick={() => selectCollectible(entry.id)}
          aria-label={def.name}
        >
          <span
            className="backpack-item-slot__shadow"
            style={{ width: itemSize * 0.72, height: itemSize * 0.14 }}
            aria-hidden
          />
          <Image
            src={BACKPACK_ITEM_IMAGES[entry.id] ?? def.icon}
            alt=""
            width={Math.round(itemSize)}
            height={Math.round(itemSize)}
            className="backpack-item-slot__icon"
            style={{ width: itemSize, height: itemSize }}
            unoptimized
          />
        </button>
      );
    }

    const meta = LOTTERY_META[entry.ticketType];
    const isSelected = selectedLottery === entry.ticketType;
    return (
      <button
        key={`lottery-${entry.ticketType}`}
        type="button"
        className={`backpack-item-slot absolute ${
          isSelected ? "backpack-item-slot--selected" : ""
        }`}
        style={toAbsoluteStyle(box)}
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
        <span className="backpack-item-slot__count" aria-label={`數量 ${entry.count}`}>
          {entry.count}
        </span>
      </button>
    );
  };

  return (
    <div className="backpack-page fixed inset-0 overflow-hidden text-[#f5eed8]">
      <div ref={stageRef} className="backpack-stage absolute inset-0">
        <Image
          src={BACKPACK_BACKGROUND}
          alt="道具"
          fill
          className="backpack-stage__bg object-cover object-center"
          priority
          unoptimized
        />

        {cover ? (
          <>
            <BackpackRedeemButton cover={cover} />
            {gridEntries.map(renderSlot)}

            {showCollectibleDetail && selectedDef && imageBox && nameBox && descBox ? (
              <>
                <div
                  className="backpack-detail-image-zone absolute pointer-events-none flex items-center justify-center"
                  style={toAbsoluteStyle(imageBox)}
                >
                  <Image
                    src={BACKPACK_ITEM_IMAGES[selectedDef.id] ?? selectedDef.image}
                    alt={selectedSpecialLocked ? "???" : selectedDef.name}
                    width={Math.round(detailImageMax)}
                    height={Math.round(detailImageMax)}
                    className={`backpack-detail-overlay__image ${selectedSpecialLocked ? "backpack-item-slot__icon--silhouette" : ""}`}
                    unoptimized
                  />
                </div>
                <p
                  className="backpack-detail-overlay__name absolute pointer-events-none"
                  style={toAbsoluteStyle(nameBox)}
                >
                  {selectedSpecialLocked ? "???" : selectedDef.name}
                </p>
                <p
                  className="backpack-detail-overlay__desc absolute pointer-events-none"
                  style={toAbsoluteStyle(descBox)}
                >
                  {selectedSpecialLocked
                    ? lockedSpecialHint(SPECIAL_ITEM_STALL[selectedDef.id]!)
                    : getDescription(selectedDef)}
                </p>
              </>
            ) : null}

            {showLotteryDetail && selectedLottery && imageBox && nameBox && descBox ? (
              <>
                <div
                  className="backpack-detail-image-zone absolute pointer-events-none flex items-center justify-center"
                  style={toAbsoluteStyle(imageBox)}
                >
                  <Image
                    src={LOTTERY_TICKET_IMAGES[selectedLottery]}
                    alt={LOTTERY_META[selectedLottery].name}
                    width={Math.round(detailImageMax)}
                    height={Math.round(detailImageMax * 0.72)}
                    className="backpack-detail-overlay__image backpack-lottery-ticket__image"
                    style={{ width: detailImageMax, height: detailImageMax * 0.72 }}
                    unoptimized
                  />
                </div>
                <p
                  className="backpack-detail-overlay__name absolute pointer-events-none"
                  style={toAbsoluteStyle(nameBox)}
                >
                  {LOTTERY_META[selectedLottery].name}
                </p>
                <div
                  className="backpack-detail-overlay__desc backpack-detail-overlay__desc--lottery absolute flex flex-col items-center justify-center gap-3"
                  style={toAbsoluteStyle(descBox)}
                >
                  <p className="pointer-events-none">{LOTTERY_META[selectedLottery].desc}</p>
                  <BackpackLotteryExchange
                    type={selectedLottery}
                    count={selectedLotteryCount}
                  />
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <header className="backpack-header absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        <Link href="/market" className="backpack-back flex items-center gap-1 text-sm font-bold">
          <span aria-hidden>←</span>
          返回
        </Link>
        <h1 className="text-sm font-bold tracking-widest">道具</h1>
        <span className="backpack-back invisible pointer-events-none text-sm font-bold" aria-hidden>
          <span aria-hidden>←</span>
          返回
        </span>
      </header>
    </div>
  );
}
