// One-time copy of the Mushaf page images (public/mushaf) and existing recitations (public/audio)
// into Vercel Blob storage, for deploying on Vercel. Safe to re-run: files already in the store
// are skipped.
//
//   npx vercel link
//   npx vercel env pull .env.vercel --environment=production
//   node --env-file=.env.vercel scripts/upload-to-blob.mjs
//
// It prints the NEXT_PUBLIC_MUSHAF_BASE_URL value to set in the Vercel project's settings.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";

// Vercel won't download secret values, so a pulled BLOB_READ_WRITE_TOKEN is just a placeholder.
// The Blob SDK can authenticate with the pulled VERCEL_OIDC_TOKEN and BLOB_STORE_ID instead.
if (process.env.BLOB_READ_WRITE_TOKEN === "[SENSITIVE]") delete process.env.BLOB_READ_WRITE_TOKEN;
if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) {
  console.error("No Blob credentials. Run: npx vercel env pull .env.vercel --environment=production");
  process.exit(1);
}

const PARALLEL = 8;

async function existing(prefix) {
  const names = new Map();
  let cursor;
  do {
    const result = await list({ prefix, cursor, limit: 1000 });
    for (const blob of result.blobs) names.set(blob.pathname, blob.url);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return names;
}

async function inBatches(items, fn) {
  for (let i = 0; i < items.length; i += PARALLEL) {
    await Promise.all(items.slice(i, i + PARALLEL).map(fn));
    process.stdout.write(`\r  ${Math.min(i + PARALLEL, items.length)}/${items.length}`);
  }
  if (items.length) process.stdout.write("\n");
}

// Page images: fixed names (mushaf/001.jpg ...) that never change, cached for a year.
const mushafDir = path.join("public", "mushaf");
const images = (await readdir(mushafDir)).filter((name) => /^\d{3}\.jpg$/.test(name)).sort();
const storedImages = await existing("mushaf/");
const newImages = images.filter((name) => !storedImages.has(`mushaf/${name}`));
console.log(`Page images: ${images.length} total, ${newImages.length} to upload`);
await inBatches(newImages, async (name) => {
  const { url } = await put(`mushaf/${name}`, await readFile(path.join(mushafDir, name)), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/jpeg",
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  storedImages.set(`mushaf/${name}`, url);
});

// Recitations: same naming as admin uploads (audio/007-<random>.mp3); skip pages already in the store.
const audioDir = path.join("public", "audio");
const recordings = (await readdir(audioDir).catch(() => [])).filter((name) => /^\d{3}\.(mp3|m4a)$/.test(name));
const storedPages = new Set([...(await existing("audio/")).keys()].map((p) => p.slice("audio/".length, "audio/".length + 3)));
const newRecordings = recordings.filter((name) => !storedPages.has(name.slice(0, 3)));
console.log(`Recordings: ${recordings.length} total, ${newRecordings.length} to upload`);
await inBatches(newRecordings, async (name) => {
  await put(`audio/${name}`, await readFile(path.join(audioDir, name)), {
    access: "public",
    addRandomSuffix: true,
    contentType: name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg",
  });
});

const sample = storedImages.get("mushaf/001.jpg");
if (sample) {
  console.log("\nSet this environment variable in your Vercel project (Settings > Environment Variables):");
  console.log(`  NEXT_PUBLIC_MUSHAF_BASE_URL=${sample.slice(0, sample.lastIndexOf("/"))}`);
}
