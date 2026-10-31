import { PageAudioProvider } from "@/components/page-audio";
import { getAudioPages } from "@/lib/audio-store";

// Shared by every reader page, so recitation audio keeps playing while pages turn.
export default async function ReaderLayout({ children }: { children: React.ReactNode }) {
  return <PageAudioProvider recordings={await getAudioPages()}>{children}</PageAudioProvider>;
}
