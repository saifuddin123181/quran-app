"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { isAdminLogin, requireAdmin, startAdminSession } from "@/lib/admin-auth";
import { AUDIO_TAG, deleteAudio } from "@/lib/audio-store";
import { TOTAL_PAGES } from "@/lib/quran-data";
import { ADMIN_SESSION_COOKIE, ADMIN_TOKEN_SUBJECT, READER_NAME_COOKIE } from "@/lib/session";
import type { LoginState } from "@/app/actions";

export async function adminLogin(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!isAdminLogin(username, password)) {
    return { error: "Invalid admin username or password." };
  }

  await startAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  if (cookieStore.get(READER_NAME_COOKIE)?.value === ADMIN_TOKEN_SUBJECT) cookieStore.delete(READER_NAME_COOKIE);
  redirect("/admin/login");
}

function validPage(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > TOTAL_PAGES) throw new Error("Invalid page.");
}

// Called after a recording finishes uploading: removes the page's previous recording (when the
// new one is a Vercel Blob URL) and refreshes the reader's list of recorded pages.
export async function audioUploaded(page: number, url?: string) {
  await requireAdmin();
  validPage(page);
  if (url) await deleteAudio(page, url);
  updateTag(AUDIO_TAG);
}

export async function deletePageAudio(page: number) {
  await requireAdmin();
  validPage(page);
  await deleteAudio(page);
  updateTag(AUDIO_TAG);
}
