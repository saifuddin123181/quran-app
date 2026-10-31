"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  VolumeHighIcon,
  VolumeLowIcon,
} from "@hugeicons/core-free-icons";
import { juzOnPage, pageImageUrl, surahOnPage } from "@/lib/mushaf-pages";
import { readResume, saveResume } from "@/lib/resume";
import ElasticSlider from "./elastic-slider";

type PageAudio = {
  page: number | null;
  available: boolean;
  playing: boolean;
  /** Seconds played and total length of the current page's recording (0 until it loads). */
  currentTime: number;
  duration: number;
  volume: number;
  /** False where the browser ignores audio.volume (iPhone/iPad: hardware buttons only). */
  volumeSupported: boolean;
  prevPage: number | null;
  nextPage: number | null;
  toggle: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  goTo: (page: number) => void;
  setPage: (page: number) => void;
};

const PageAudioContext = createContext<PageAudio | null>(null);

// iPhone/iPad Safari keep audio.volume at 1 (volume is hardware-only), so test whether it sticks.
let volumeSettable: boolean | undefined;
function canSetVolume() {
  if (volumeSettable === undefined) {
    const probe = new Audio();
    probe.volume = 0.5;
    volumeSettable = probe.volume === 0.5;
  }
  return volumeSettable;
}
const subscribeNever = () => () => {};

function usePageAudio() {
  const value = use(PageAudioContext);
  if (!value) throw new Error("usePageAudio must be used within PageAudioProvider");
  return value;
}

// One <audio> element shared by all reader pages, so playback carries on across page turns.
// It always plays the recording of the page on screen: when a recording ends it turns to the
// next page (if that page has one) and keeps going, and turning pages by hand while playing
// switches to the new page's recording. The page on screen reports itself via <PageAudioSync>.
// `recordings` (page number -> audio URL) comes from storage; see lib/audio-store.ts.
export function PageAudioProvider({
  recordings,
  children,
}: {
  recordings: Record<number, string>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [page, setPage] = useState<number | null>(null);
  const src = page !== null ? recordings[page] : undefined;
  const available = src !== undefined;
  const nextPage = page !== null && recordings[page + 1] ? page + 1 : null;
  const prevPage = page !== null && recordings[page - 1] ? page - 1 : null;
  const nextSrc = nextPage ? recordings[nextPage] : undefined;

  const audioRef = useRef<HTMLAudioElement>(null);
  // Set when a recording finishes and we turn the page, so the next one starts by itself.
  const continueOnNextPage = useRef(false);
  // Saved position to jump to once the page's recording loads (see lib/resume.ts).
  const resumeAt = useRef<number | null>(null);
  const lastSavedAt = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const volumeSupported = useSyncExternalStore(subscribeNever, canSetVolume, () => false);

  useEffect(() => {
    const audio = audioRef.current!;
    const keepPlaying = !audio.paused || continueOnNextPage.current;
    continueOnNextPage.current = false;

    if (page === null) return;
    // Remember where the reader is. The saved position only carries over on the same page
    // (e.g. after a refresh or coming back later); a new page starts from the beginning.
    const saved = readResume();
    const resumeTime = saved?.page === page ? saved.time : 0;
    saveResume({ page, time: resumeTime });

    if (!src) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    if (audio.getAttribute("src") !== src) {
      audio.src = src;
      resumeAt.current = !keepPlaying && resumeTime > 0 ? resumeTime : null;
    }
    if (keepPlaying) audio.play().catch(() => {});

    // Save the exact position when the tab is closed, hidden or refreshed.
    const saveNow = () => {
      if (audio.getAttribute("src") === src) saveResume({ page, time: audio.currentTime });
    };
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", saveNow);

    // Lock screen / headphone controls on phones.
    if ("mediaSession" in navigator) {
      const surah = surahOnPage(page);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${surah.name} · Page ${page}`,
        artist: "Quran recitation",
        artwork: [{ src: pageImageUrl(1), sizes: "749x1125", type: "image/jpeg" }],
      });
      navigator.mediaSession.setActionHandler("nexttrack", nextPage ? () => router.push(`/page/${nextPage}`) : null);
      navigator.mediaSession.setActionHandler("previoustrack", prevPage ? () => router.push(`/page/${prevPage}`) : null);
    }

    return () => {
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", saveNow);
    };
  }, [page, src, nextPage, prevPage, router]);

  // While a recording plays, fetch the next page's recording in the background, so the page
  // turn and the next recitation start without waiting on the network.
  const preloadRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!playing || !nextSrc) return;
    preloadRef.current ??= new Audio();
    preloadRef.current.preload = "auto";
    preloadRef.current.src = nextSrc;
  }, [playing, nextSrc]);

  function toggle() {
    const audio = audioRef.current!;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  function seek(seconds: number) {
    audioRef.current!.currentTime = seconds;
    setCurrentTime(seconds);
    if (page !== null) saveResume({ page, time: seconds });
  }

  // Keep the saved position current while playing (about once a second) and exact on pause.
  function savePosition(audio: HTMLAudioElement, force: boolean) {
    if (page === null || audio.getAttribute("src") !== src) return;
    if (!force && Date.now() - lastSavedAt.current < 1000) return;
    lastSavedAt.current = Date.now();
    saveResume({ page, time: audio.currentTime });
  }

  function setVolume(next: number) {
    audioRef.current!.volume = next;
    setVolumeState(next);
  }

  return (
    <PageAudioContext
      value={{
        page,
        available,
        playing,
        currentTime,
        duration,
        volume,
        volumeSupported,
        prevPage,
        nextPage,
        toggle,
        seek,
        setVolume,
        goTo: (target) => router.push(`/page/${target}`),
        setPage,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          setPlaying(false);
          savePosition(e.currentTarget, true);
        }}
        onEmptied={() => {
          setCurrentTime(0);
          setDuration(0);
        }}
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          setDuration(audio.duration);
          // Continue where the reader stopped, unless that was right at the end.
          const time = resumeAt.current;
          resumeAt.current = null;
          if (time && time < audio.duration - 1) {
            audio.currentTime = time;
            setCurrentTime(time);
          }
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
          savePosition(e.currentTarget, false);
        }}
        onEnded={() => {
          if (!nextPage) return;
          continueOnNextPage.current = true;
          router.push(`/page/${nextPage}`);
        }}
      />
    </PageAudioContext>
  );
}

// Rendered by the reader page to tell the shared player which page is on screen.
export function PageAudioSync({ page }: { page: number }) {
  const { setPage } = usePageAudio();
  useEffect(() => setPage(page), [page, setPage]);
  return null;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const COLLAPSE_AFTER_MS = 4000;
const SWIPE_DISTANCE = 40;

// Floating mini player. Normally a small pill (play/pause inside a progress ring) sits above the
// bottom bar so the page keeps the screen. Tapping its arrow or swiping it up opens the full
// card, which floats over the page and shrinks back to the pill after a few seconds without
// interaction, on a tap outside it, swipe down, its collapse button, or Esc. Hidden on pages
// without a recording.
export function PageAudioPlayer() {
  const audio = usePageAudio();
  const [expanded, setExpanded] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchStartY = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // (Re)start the countdown that shrinks the card back to the pill.
  const keepOpen = useCallback(() => {
    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setExpanded(false), COLLAPSE_AFTER_MS);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    keepOpen();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    // A tap or click anywhere outside the card closes it. The tap still does its own thing too
    // (e.g. turning the page), so closing the player never costs an extra tap.
    const onPointerDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      clearTimeout(collapseTimer.current);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [expanded, keepOpen]);

  if (!audio.available || audio.page === null) return null;

  // Vertical swipe on the pill (up opens) or the card (down closes).
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const swipedBy = (e: React.TouchEvent) =>
    touchStartY.current === null ? 0 : e.changedTouches[0].clientY - touchStartY.current;

  return (
    <>
      <div
        className={`flex justify-end transition duration-200 ${
          expanded ? "pointer-events-none translate-y-2 scale-90 opacity-0" : ""
        }`}
      >
        <MiniPill
          onExpand={() => setExpanded(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => swipedBy(e) < -SWIPE_DISTANCE && setExpanded(true)}
        />
      </div>

      <div
        ref={cardRef}
        inert={!expanded}
        // A small card in the bottom-right corner that grows out of the pill.
        className={`absolute right-3 bottom-3 touch-none w-[min(22rem,calc(100%-1.5rem))] origin-bottom-right transition duration-200 ease-out sm:right-6 ${
          expanded ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
        }`}
        onPointerDownCapture={keepOpen}
        onPointerMoveCapture={(e) => e.buttons && keepOpen()}
        onKeyDownCapture={keepOpen}
        onTouchStart={onTouchStart}
        onTouchEnd={(e) => swipedBy(e) > SWIPE_DISTANCE && setExpanded(false)}
      >
        <PlayerCard onCollapse={() => setExpanded(false)} />
      </div>
    </>
  );
}

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function MiniPill({
  onExpand,
  onTouchStart,
  onTouchEnd,
}: {
  onExpand: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  const { page, playing, currentTime, duration, toggle } = usePageAudio();
  const progress = duration ? currentTime / duration : 0;

  return (
    <div
      className="pointer-events-auto flex touch-none items-center gap-0.5 rounded-full border border-white/10 bg-[#1c1a22]/95 p-1 pr-1.5 text-white shadow-[0_8px_24px_rgb(0_0_0/0.3)] backdrop-blur"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause recitation" : "Play recitation"}
        className="relative grid size-11 place-items-center rounded-full active:bg-white/10"
      >
        <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="22" cy="22" r={RING_RADIUS} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="2.5" />
          <circle
            cx="22"
            cy="22"
            r={RING_RADIUS}
            fill="none"
            stroke="rgb(255 255 255 / 0.85)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
          />
        </svg>
        <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onExpand}
        aria-label="Open player"
        className="flex h-11 items-center gap-1 rounded-full pr-1 pl-2 text-sm text-white/80 active:bg-white/10"
      >
        <span className="tabular-nums">
          Page {page}
          {!playing && currentTime > 0 && <span className="text-white/55"> · {formatTime(currentTime)}</span>}
        </span>
        <HugeiconsIcon icon={ArrowUp01Icon} size={18} strokeWidth={2} />
      </button>
    </div>
  );
}

// The compact card, in the style of the React Bits Elastic Slider demo: artwork, title, an
// elastic progress bar with elapsed/remaining time, previous/play/next, and an elastic volume slider.
function PlayerCard({ onCollapse }: { onCollapse: () => void }) {
  const audio = usePageAudio();
  const { playing, currentTime, duration, prevPage, nextPage } = audio;
  const page = audio.page!;
  // While dragging the progress bar, show where it will land and seek once on release, so the
  // audio's own time updates don't fight the drag.
  const [scrub, setScrub] = useState<number | null>(null);

  const surah = surahOnPage(page);
  const shown = scrub ?? currentTime;

  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#211f27] to-[#16151b] p-4 text-white shadow-[0_18px_50px_rgb(0_0_0/0.35)]">
      <button
        type="button"
        onClick={onCollapse}
        aria-label="Minimize player"
        className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full text-white/60 active:bg-white/10"
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={20} strokeWidth={2} />
      </button>

      <div className="flex flex-col">
        <div className="flex items-center gap-3 pr-10">
          {/* Artwork: the Mushaf's title-page medallion. */}
          <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pageImageUrl(1)} alt="" className="size-full scale-[1.9] object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {surah.name} <span className="font-normal text-white/60">{surah.arabic}</span>
            </p>
            <p className="truncate text-sm text-white/55">
              Page {page} · Juz {juzOnPage(page)}
            </p>
          </div>
        </div>

        <ElasticSlider
          className="mt-3 w-full"
          value={shown}
          maxValue={duration || 1}
          onChange={setScrub}
          onChangeEnd={(seconds) => {
            audio.seek(seconds);
            setScrub(null);
          }}
          disabled={!duration}
          ariaLabel="Recitation position"
          formatValue={formatTime}
          valuePosition="none"
          leftIcon={null}
          rightIcon={null}
          thickness={6}
          activeThickness={10}
          maxStretch={24}
          restOpacity={1}
          trackColor="rgb(255 255 255 / 0.14)"
          rangeColor="rgb(255 255 255 / 0.78)"
        />
        <div className="-mt-1.5 flex justify-between text-xs text-white/60 tabular-nums">
          <span>{formatTime(shown)}</span>
          <span>-{formatTime(Math.max(0, duration - shown))}</span>
        </div>

        <div className="mt-2 flex items-center justify-center gap-6">
          <IconButton label="Previous page" disabled={!prevPage} onClick={() => prevPage && audio.goTo(prevPage)}>
            <HugeiconsIcon icon={PreviousIcon} size={24} strokeWidth={1.75} />
          </IconButton>
          <button
            type="button"
            onClick={audio.toggle}
            aria-label={playing ? "Pause recitation" : "Play recitation"}
            className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 active:bg-white/15"
          >
            <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} size={26} strokeWidth={1.75} />
          </button>
          <IconButton label="Next page" disabled={!nextPage} onClick={() => nextPage && audio.goTo(nextPage)}>
            <HugeiconsIcon icon={NextIcon} size={24} strokeWidth={1.75} />
          </IconButton>
        </div>

        {audio.volumeSupported && (
          <div className="mt-2">
            <ElasticSlider
              className="w-full"
              value={audio.volume * 100}
              onChange={(v) => audio.setVolume(v / 100)}
              ariaLabel="Volume"
              valuePosition="none"
              leftIcon={<HugeiconsIcon icon={VolumeLowIcon} size={18} strokeWidth={1.75} />}
              rightIcon={<HugeiconsIcon icon={VolumeHighIcon} size={18} strokeWidth={1.75} />}
              thickness={6}
              activeThickness={10}
              maxStretch={20}
              restOpacity={1}
              iconColor="rgb(255 255 255 / 0.6)"
              trackColor="rgb(255 255 255 / 0.14)"
              rangeColor="rgb(255 255 255 / 0.78)"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full text-white/90 active:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
