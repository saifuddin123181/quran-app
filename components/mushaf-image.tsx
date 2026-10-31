import { preload } from "react-dom";

// A scanned Mushaf page, scaled to fit the screen width (and height on larger screens).
// Pinch-to-zoom works as usual for reading small text.
export function MushafImage({
  src,
  nextSrc,
  pageNumber,
}: {
  src: string;
  nextSrc: string | null;
  pageNumber: number;
}) {
  // Start loading the next page's scan now so turning the page is instant.
  if (nextSrc) preload(nextSrc, { as: "image" });

  return (
    // Plain <img>: the scans are already sized for phones (749×1125) and are served as-is,
    // without re-compression.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Quran page ${pageNumber}`}
      width={749}
      height={1125}
      fetchPriority="high"
      draggable={false}
      className="page-scan mx-auto h-auto max-h-[calc(100dvh-5rem)] w-auto max-w-full select-none"
    />
  );
}
