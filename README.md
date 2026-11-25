# VerseNote

**Never miss a word while searching for the Word.**
A sermon notebook built for the AI for Church Hackathon 2026 (Discipleship track).

- Type `Gen 1:1` or `Romans chapter 8 verse 28` in your notes and the exact verse appears, in the reader's choice of KJV, BSB or WEB, ready to insert.
- Pastors share a sermon by link or QR code. Members scan it and the outline and scriptures are waiting in their notebook.
- After the service, members can ask the preacher questions, anonymously if they prefer.
- Privacy first: notes are private to their owner (enforced in the database), pastors never see members' notes,
  users can download or delete everything.

Built with Next.js 15, TypeScript and Supabase (Postgres, auth and row-level security).

## Setup

### 1. Supabase
1. Run the SQL files from `versenote-db/supabase/migrations/` in the SQL Editor, in order (0001, 0002, 0003).
2. **Authentication → URL Configuration**
   - Site URL: your live URL (e.g. `https://versenote.vercel.app`)
   - Redirect URLs: add `http://localhost:3000/**` and `https://<your-vercel-url>/**`
3. **Authentication → Sign In / Providers**
   - Email: on (magic links work straight away)
   - Google (optional): needs a Google Cloud OAuth client ID and secret
   - Anonymous sign-ins: **off** (an account is required)

### 2. Run locally
```bash
cp .env.example .env.local   # fill in the three values from Supabase
npm install
npm run dev                  # http://localhost:3000
```

### 3. Deploy to Vercel
Import the GitHub repo in Vercel, add the same three environment variables, and deploy.
Then add the Vercel URL to Supabase's Site URL and Redirect URLs.

## Where things are
| Path | What it does |
|---|---|
| `app/s/[slug]` | QR landing page: title preview for visitors, opens the member's notebook once signed in |
| `app/notes/[id]` + `components/NoteEditor.tsx` | Notebook: autosave, inline verse detection, scripture cards, sermon scripture tray |
| `components/AskPreacher.tsx` | Members ask questions (named or anonymous) and see answers |
| `app/pastor` + `components/SermonManager.tsx` | Pastors create sermons, add scriptures, get the link and QR code, answer questions |
| `app/account` | Display name, download my data, delete account |
| `lib/bible/` | Reference parser (abbreviations, numbered books, spoken numbers) and verse fetch |
| `app/api/verse` | Signed-in verse lookup (KJV, BSB or WEB via bible-api.com, cached for a week) |

## Responsible AI and privacy
- Scripture always comes from the Bible source and is labelled with its translation. Only public-domain translations are used (KJV, BSB, WEB). AI never writes or edits it.
- Row-level security means each user can only read their own notes, even if the app code has a bug.
- Anonymous questions are truly anonymous: who asked is stored in a table only the asker can read.
- The service-role key is used in one server route only (account deletion) and never reaches the browser.

## Tests
```bash
npm test   # Bible reference parser
```
Database privacy tests (48 checks) are in `versenote-db/tests/`.

## Next
- AI verse search from a remembered phrase
- AI summary, key takeaways and reflection questions (saved separately from the original notes)
- Live listening: detect spoken references during the sermon and offer them as cards
