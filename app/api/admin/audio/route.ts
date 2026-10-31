import { isAdmin } from "@/lib/admin-auth";
import { AUDIO_TYPES, MAX_AUDIO_BYTES } from "@/lib/audio-files";
import { audioStorage, saveLocalAudio } from "@/lib/audio-store";
import { TOTAL_PAGES } from "@/lib/quran-data";

// Local development uploads (no Vercel Blob store): saves the file into public/audio/.
// On Vercel, uploads go straight to Blob storage via ./blob instead.
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not signed in as admin." }, { status: 401 });
  if (audioStorage() !== "local") {
    return Response.json({ error: "Uploads go to Vercel Blob in this environment." }, { status: 400 });
  }

  const form = await request.formData();
  const page = Number(form.get("page"));
  const file = form.get("file");
  if (!Number.isInteger(page) || page < 1 || page > TOTAL_PAGES) {
    return Response.json({ error: "Invalid page." }, { status: 400 });
  }
  if (!(file instanceof File) || !(file.type in AUDIO_TYPES)) {
    return Response.json({ error: "Choose an MP3 or M4A file." }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "File is larger than 25 MB." }, { status: 400 });
  }

  try {
    await saveLocalAudio(page, file);
  } catch {
    // e.g. deployed without a Blob store, where the file system is read-only.
    return Response.json(
      { error: "Couldn't save the file. On Vercel, connect a Blob store to the project." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true });
}
