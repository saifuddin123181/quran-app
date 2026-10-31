# Quran App

An application for reading, listening to, and exploring the Holy Quran.

## Features

- Browse all 114 Surahs and their Ayahs
- Arabic text with translations
- Audio recitation
- Search by Surah, Ayah, or keyword
- Bookmarks and last-read position

> The project is in early development, so this list may change.

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 20.9 or later

### Installation

```bash
git clone https://github.com/saifuddin123181/quran-app.git
cd quran-app
npm install
```

### Running the App

```bash
npm run dev
```

Open http://localhost:3000. You'll be redirected to `/login`.

Accounts and passwords aren't in the code. Copy `.env.example` to `.env.local` and fill in:

- `READER_ACCOUNTS`: reader logins as `username:password` pairs, comma-separated.
- `ADMIN_PASSWORD`: password for the admin (username `admin` or ID `admin-01`).
- `SESSION_SECRET`: a long random string that signs login cookies.

A missing setting turns that login off. On Vercel, set the same variables in the project settings.

### Mushaf pages

The reader shows the 15-line Saudi color Mushaf, one scanned page per screen. The 611 page
images are in `public/mushaf/` (`001.jpg` is the title page, `002.jpg` is Al-Fatihah, up to
`611.jpg`), extracted unchanged from the Mushaf PDF. Surah and juz start pages are in
`lib/quran-data.ts`. On Vercel the images are served from Blob storage (see below).

### Recitation audio

Pages with a recording show a mini player in the reader. When a page's recording ends, the
reader turns to the next page and plays its recording, as long as that page has one.

The app remembers the last page and how far into its recording the reader got, in the
browser's local storage (`lib/resume.ts`). After a refresh, closing the tab or signing out,
the home screen shows a "Continue reading" card, and the player resumes from the same second.

Recordings are managed in the admin area at `/admin` (sign in as `admin` with
`ADMIN_PASSWORD`, at `/admin/login` or the normal sign-in page). Upload an
MP3 or M4A for a page, or choose several files named by page number (`007.mp3`, `008.mp3`, ...)
to upload them together. Replace or delete a page's recording from the list.

Where uploads are stored:

- **Locally** (no `BLOB_READ_WRITE_TOKEN`): `public/audio/`, named by page (`002.mp3` is
  Al-Fatihah). Use `npm run dev`; `next start` only serves files that existed when it started.
- **With Vercel Blob** (`BLOB_READ_WRITE_TOKEN` set): in the Blob store. Required on Vercel,
  where the app can't write files at runtime.

## Deploying on Vercel

The page images (108 MB) are over the Hobby plan's 100 MB deployment limit, and uploaded audio
needs persistent storage, so both are served from [Vercel Blob](https://vercel.com/docs/vercel-blob).
Its free Hobby allowance (1 GB storage, 10 GB transfer per month) covers this app.

1. Push the repository to GitHub and import it in Vercel.
2. In the Vercel project: **Storage > Create > Blob**, and connect the store to the project.
   This sets `BLOB_READ_WRITE_TOKEN` for you.
3. In **Settings > Environment Variables**, add (see `.env.example`):
   - `READER_ACCOUNTS`: reader logins, e.g. `Saif:password1,Bushra:password2`.
   - `ADMIN_PASSWORD`: your admin password.
   - `SESSION_SECRET`: a long random string (signs login cookies).
4. Copy the page images and existing recordings into Blob (once, from your computer):

   ```bash
   npx vercel link
   npx vercel env pull .env.local    # note: replaces your existing .env.local
   node --env-file=.env.local scripts/upload-to-blob.mjs
   ```

   It prints a `NEXT_PUBLIC_MUSHAF_BASE_URL=...` line. Add that variable in Vercel too.
5. Keep the images and audio out of the deployment by creating a `.vercelignore` file:

   ```
   public/mushaf
   public/audio
   ```

6. Deploy. New recordings uploaded at `/admin` go straight to the Blob store.

With `BLOB_READ_WRITE_TOKEN` in your local `.env.local`, development uses the same Blob store as
production, so uploads made locally appear on the live site.

## Project Structure

```
quran-app/
├── app/
│   ├── actions.ts       # reader login / logout server actions
│   ├── login/           # reader login page and form
│   ├── admin/           # admin login, recitation upload/management, admin actions
│   ├── api/admin/audio/ # upload routes (local files, Vercel Blob client uploads)
│   ├── page/[number]/   # Mushaf reader, one route per page (1–611)
│   └── page.tsx         # home: surah list, juz list, go to page
├── components/          # page scan viewer, audio player, swipe navigation, admin uploader
├── lib/
│   ├── quran-data.ts    # surahs, juz, page count
│   ├── mushaf-pages.ts  # page number -> image URL (local or Blob)
│   ├── audio-store.ts   # recitation storage: list, save, delete (local or Blob)
│   ├── audio-files.ts   # upload rules: allowed types, size limit, file naming
│   ├── admin-auth.ts    # server-side admin session check
│   └── session.ts       # reader/admin accounts (from env) and signed session cookies
├── public/mushaf/       # page scans 001.jpg-611.jpg
├── public/audio/        # recitations in local development, NNN.mp3 per page
├── scripts/
│   └── upload-to-blob.mjs # copies images and recordings to Vercel Blob for deployment
├── proxy.ts             # redirects signed-out readers to /login, admins to /admin/login
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push the branch: `git push origin feature/my-feature`
5. Open a pull request

## License

_Specify a license here (e.g. MIT)._
