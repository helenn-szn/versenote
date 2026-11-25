# VerseNote

**Never miss a word while searching for the Word.**
A sermon notebook for churches all over the world, built for the AI for Church Hackathon 2026 (Discipleship & Spiritual Growth track).

Live: https://versenote.vercel.app · For pastors: https://versenote.vercel.app/pastors

## What it does

**For members**
- **Verses as you type.** Write `Gen 1:1`, `Romans chapter 8 verse 28`, `Jean 3:16`, `요 3:16` or `约翰福音3:16` and the exact verse appears. Press Tab to insert it where you are writing, and the next line starts a new paragraph.
- **A real notebook.** Headings, bold, italic, highlight, lists and quotes, from a floating toolbar with large touch targets. Everything saves as you type.
- **Follow the outline.** When the church shares a sermon, the pastor's outline points appear above the note. Tap a point and it becomes a subheading to write under. Points stay in the pastor's order however you tap them, or "Add all points" sets them all up at once.
- **Record the sermon.** Record in the app or upload audio or video. AI writes the transcript a minute at a time. Then it works out which part of the sermon belongs to each outline point and adds it there as plain bullet notes, written the way a person takes notes. Every verse mentioned appears under the point where it came up, looked up from the Bible. If you wrote nothing, it writes the whole note. "What did I miss?" lets you pick what to add.
- **Jot questions.** The **?** button keeps questions out of your notes until you send them to the preacher, named or anonymously.
- **Translate and share.** Make a translated copy of any note, share a read-only link, or send it as text.

**For pastors**
- Add the title, outline (as bullet points) and scriptures, then show one QR code. Members get everything in their notebook before you read it.
- See how many people joined, read the questions people send you, and answer one person or publish an answer for everyone.
- Pastors never see anyone's notes, recordings or transcripts, or who asked an anonymous question.

**Seven languages.** The whole site and the Bibles switch together: English, French, Spanish, Portuguese, Swahili, Korean and Chinese.

## Bibles

Every verse is copied word for word from a free Bible. AI never writes, translates or changes scripture.

| Language | Bible | Licence | Source |
|---|---|---|---|
| English | King James Version, Berean Standard Bible, World English Bible | Public domain | bible-api.com |
| French | Louis Segond 1910 | Public domain | bundled |
| Spanish | Reina-Valera 1909 | Public domain | bundled |
| Portuguese | Bíblia Livre | CC BY 4.0 BR | bundled |
| Swahili | Kiswahili Contemporary Version (Biblica Open) | CC BY-SA 4.0 | bundled |
| Korean | 개역한글 Korean Revised Version | Public domain | bundled |
| Chinese | 和合本 Chinese Union Version, Simplified | Public domain | bundled |

Bundled Bibles live in `data/bibles/{ID}/{book}.json` (one file per book, about 25 MB in total) and are read on the server, so lookups don't depend on an outside service.

## Built with

Next.js 15 (App Router), React 19, TypeScript, TipTap editor, Supabase (Postgres, auth, storage and row-level security), AI SDK with Google Gemini, and Vercel. The font is Outfit.

## Setup

### 1. Supabase
1. In the SQL Editor, run the files in `supabase/migrations/` in order (0001 to 0006). They create:
   - the private schema
   - accounts-only access
   - the preferred Bible setting and the extra Bibles
   - recordings with a private storage bucket
   - note sharing
2. **Authentication → URL Configuration**
   - Site URL: your live URL (for example `https://versenote.vercel.app`)
   - Redirect URLs: add `http://localhost:3000/**` and `https://<your-vercel-url>/**`
3. **Authentication → Sign In / Providers**
   - Email: on. Turn **Confirm email off**: otherwise every sign-up sends an email, and Supabase's built-in sender only allows a few per hour.
   - Anonymous sign-ins: **off** (an account is required).
   - Google (optional): needs a Google Cloud OAuth client. Then set `NEXT_PUBLIC_ENABLE_GOOGLE=true`.
4. For sign-in links at scale, add your own email service under **Authentication → Emails → SMTP Settings**.

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill in:

| Variable | Where it's used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everywhere (browser and server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only, for "Delete my account". Never prefix it with `NEXT_PUBLIC_`. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Server only, for AI. A free key from Google AI Studio. Without it the Vercel AI Gateway is used, which needs a card on the Vercel account. |

### 3. Run locally
```bash
npm install
npm run dev     # http://localhost:3000
```

### 4. Deploy to Vercel
Import the GitHub repo, add the environment variables and deploy. Then add the Vercel URL to Supabase's Site URL and Redirect URLs.

## Where things are

| Path | What it does |
|---|---|
| `app/page.tsx` | Landing page |
| `app/pastors` | Landing page for pastors |
| `app/login` | Sign in / create account, with separate designs for members, new members and pastors (`?next=/pastor`) |
| `app/notes/[id]` + `components/NoteEditor.tsx` | The notebook: rich text, verse detection, floating toolbar, autosave |
| `components/editor/ScriptureNode.tsx` | Scripture cards inside the note |
| `components/SermonRecorder.tsx` + `lib/audio.ts` | Recording, upload, live transcript, "What did I miss?", notes from a recording |
| `components/OutlineEditor.tsx` + `lib/outline.ts` | Pastors' bulleted outline; reading the outline for members |
| `components/NoteSheets.tsx` | Share, translate and "My questions" sheets |
| `components/AskPreacher.tsx` | Members' questions and answers for a church sermon |
| `app/pastor` + `components/SermonManager.tsx` | Pastors create sermons, add scriptures, get the link and QR code, answer questions |
| `app/s/[slug]` | QR landing: preview for visitors, opens the notebook once signed in |
| `app/n/[token]` | Read-only shared note |
| `app/account` | Name, Bible, download my data, delete account |
| `app/api/verse` | Verse lookup (signed-in only) |
| `app/api/ai/transcribe` | One short piece of audio to text |
| `app/api/ai/gaps` | Sorts the sermon under each outline point: missed points for a note in progress, or full notes for an empty one |
| `app/api/ai/translate` | Translated copy of a note, with verses taken from the new language's Bible |
| `lib/bible/` | Reference parser (abbreviations, numbered books, spoken numbers, all 7 languages), book names, translations, fetch |
| `lib/i18n/` | Dictionaries for the 7 languages, language switcher logic, showcase verses |
| `lib/ai.ts` | AI model choice with automatic fallback when a model is busy or retired |
| `supabase/migrations`, `supabase/tests` | Schema, row-level security and database privacy tests |

## Responsible AI and privacy

- **Scripture is never generated.** Verses come from a Bible text and are labelled with their translation. When AI mentions a verse, the app looks up the real text. When a note is translated, verses are fetched again from that language's Bible.
- **AI stays faithful to the sermon.** It writes only what was preached, with no teaching, opinions or summaries of its own. Transcripts are labelled as AI and kept next to the note so anything added can be checked. A note written entirely from a recording says so in its first line.
- **The member decides.** AI notes are added only from a recording the member chose to make, and "What did I miss?" shows each point before it is added.
- **Private by default.** Row-level security means each user can only read their own notes, recordings and transcripts, even if the app code has a bug. Recordings sit in a private storage bucket under the owner's folder.
- **Anonymous means anonymous.** Who asked a question is stored in a table only the asker can read.
- **Sharing is opt-in.** A shared note shows only the note: no name, questions or recordings. Turning the link off stops it working.
- **Leave any time.** Members can download all their data, or delete their account along with every note, recording and transcript.
- **Secrets stay on the server.** The service-role key is used in one server route (account deletion), and the AI key only in the AI routes.

## Tests
```bash
npm test   # Bible reference parser, including the other 6 languages
```
The database privacy tests (48 checks) are in `supabase/tests/`.

## Contributors

- **Helen** ([@helenn-szn](https://github.com/helenn-szn)), Lagos, Nigeria: creator of VerseNote, product and design.
