"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TURN_DURATION_MS = 180;

// The last page shown, kept across client navigations so a new page can slide in from the
// side the reader turned towards.
let lastPage: number | null = null;

// Mushaf pages turn right-to-left: dragging the page to the right (or pressing ←) brings in the
// next page, dragging it to the left (or pressing →) goes back, like a printed Mushaf.
export function PageSwipe({
  pageNumber,
  nextHref,
  prevHref,
  children,
}: {
  pageNumber: number;
  nextHref: string | null;
  prevHref: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const gesture = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [turning, setTurning] = useState(false);
  const [enterFrom] = useState(() =>
    lastPage === null || lastPage === pageNumber ? null : pageNumber > lastPage ? "left" : "right",
  );

  useEffect(() => {
    lastPage = pageNumber;
  }, [pageNumber]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && nextHref) router.push(nextHref);
      if (e.key === "ArrowRight" && prevHref) router.push(prevHref);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, nextHref, prevHref]);

  function targetFor(dx: number) {
    return dx > 0 ? nextHref : prevHref;
  }

  function onTouchStart(e: React.TouchEvent) {
    if (turning) return;
    const t = e.touches[0];
    gesture.current = { x: t.clientX, y: t.clientY, axis: null };
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gesture.current;
    if (!g) return;
    const t = e.touches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;

    // Decide once per gesture whether it's a page turn or a vertical scroll.
    if (!g.axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (g.axis === "x") setDragging(true);
    }
    if (g.axis === "x") {
      // Resist when there's no page in that direction (before page 1 or after page 604).
      setOffset(targetFor(dx) ? dx : dx * 0.2);
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (g?.axis !== "x") return;
    setDragging(false);

    const dx = e.changedTouches[0].clientX - g.x;
    const width = window.innerWidth;
    const target = targetFor(dx);
    if (target && Math.abs(dx) > Math.max(60, width * 0.2)) {
      setTurning(true);
      setOffset(Math.sign(dx) * width);
      setTimeout(() => router.push(target), TURN_DURATION_MS);
    } else {
      setOffset(0);
    }
  }

  return (
    <div
      className="flex flex-1 touch-pan-y flex-col overflow-x-clip"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        className={`flex flex-1 flex-col ${enterFrom ? `page-enter-from-${enterFrom}` : ""}`}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          opacity: turning ? 0 : 1,
          transition: dragging
            ? "none"
            : `transform ${TURN_DURATION_MS}ms ease-out, opacity ${TURN_DURATION_MS}ms ease-in`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
