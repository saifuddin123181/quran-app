import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/admin-auth";
import { AUDIO_TYPES, MAX_AUDIO_BYTES } from "@/lib/audio-files";
import { TOTAL_PAGES } from "@/lib/quran-data";

// Vercel Blob client uploads: the admin's browser asks this route for a short-lived upload token,
// then sends the file straight to Blob storage. Files never pass through a Vercel Function, so
// the 4.5 MB request limit doesn't apply and there's no data transfer charge for the upload.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await isAdmin())) throw new Error("Not signed in as admin.");
        const page = Number(clientPayload);
        const prefix = `audio/${String(page).padStart(3, "0")}.`;
        if (!Number.isInteger(page) || page < 1 || page > TOTAL_PAGES || !pathname.startsWith(prefix)) {
          throw new Error("Invalid page.");
        }
        return {
          allowedContentTypes: Object.keys(AUDIO_TYPES),
          maximumSizeInBytes: MAX_AUDIO_BYTES,
          // A fresh URL per upload, so phones never play a cached copy of a replaced recording.
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
