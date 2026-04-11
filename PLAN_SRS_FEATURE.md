# Plan: SRS + Web App + Gamification for ConjuMate

## Context
ConjuMate is a Chrome extension that shows verb conjugations/translations on hover-selected text. The goal is to add a full vocabulary-saving + spaced repetition learning system with gamification (streaks, XP, badges, leaderboards) and a companion web app.

### Existing codebase summary
- **Extension** (`LangHover/`): React 19 + TypeScript + Tailwind CSS 4 + Vite. Content script (`ExtensionOverlay.tsx`) injects overlay cards on Ctrl+select. `TranslationCard.tsx` shows verb conjugation tables. `PhraseTranslationCard.tsx` shows phrase translations. `Settings.tsx` is the popup. `dashboard.tsx` is a partially-built flashcard review page (reads `savedTranslations` from chrome.storage.local, but nothing writes to it yet).
- **Backend** (`gube-proxy/`): Cloudflare Worker using Hono framework. Has endpoints for DeepL translation proxy and Italian verb conjugation lookup (backed by KV). Has rate limiting via RATE_LIMIT_KV. No auth, no D1 database, no user data persistence yet.
- **Storage today**: `chrome.storage.local` keys: `savedTranslations` (TranslationEntry[]), `sourceLanguage`, `targetLanguage`, `gubeUserId`, `darkMode`.

---

## Target Architecture

```
Chrome Extension (LangHover)
  ├── Overlay cards  →  Save button  →  Backend API (authenticated)
  ├── Settings popup →  Google Sign-In (chrome.identity)
  └── Extension dashboard  →  Quick SRS review (fetches from backend)

Web App (Cloudflare Pages — new project)
  ├── /dashboard   →  Full SRS review sessions
  ├── /vocabulary  →  Browse & manage saved words
  └── /stats       →  Streaks, XP, level, badges, leaderboard

Backend (gube-proxy — Cloudflare Worker, Hono)
  ├── POST /api/auth/google      →  Verify Google token, return JWT
  ├── GET  /api/auth/me          →  Current user profile
  ├── POST /api/words            →  Save a word
  ├── DELETE /api/words/:id      →  Delete a word
  ├── GET  /api/words            →  All saved words
  ├── GET  /api/words/due        →  Due cards for today's review
  ├── POST /api/words/:id/review →  Submit SRS rating (updates XP/streak/badges)
  └── GET  /api/stats            →  Gamification stats
```

### Auth Flow
1. Extension: `chrome.identity.getAuthToken({ interactive: true })` → Google access token
2. Extension sends token to `POST /api/auth/google`
3. Backend verifies with `https://www.googleapis.com/oauth2/v3/userinfo`, upserts user in D1, returns signed JWT
4. Extension stores JWT in `chrome.storage.local` under `authToken`
5. All subsequent API calls: `Authorization: Bearer <jwt>`
6. Web app: Google Identity Services One Tap → ID token → same `/api/auth/google` endpoint (detect ID token vs access token by checking if it's a 3-part JWT)

---

## Phase 1 — Backend: D1 Database + Auth

### wrangler.jsonc changes
Add D1 binding:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "conjugate-users",
    "database_id": "<run: wrangler d1 create conjugate-users to get this>"
  }
]
```
Add secrets via `wrangler secret put`:
- `JWT_SECRET` — random 32+ char string
- `GOOGLE_CLIENT_ID` — from Google Cloud Console OAuth2 credentials

### D1 Schema — `src/schema.sql`
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,           -- Google sub (unique user ID)
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_words (
  id TEXT PRIMARY KEY,           -- "${userId}::${word.toLowerCase()}::${timestamp}"
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  context TEXT DEFAULT '',
  translation TEXT NOT NULL,
  is_verb INTEGER DEFAULT 0,     -- SQLite boolean (0/1)
  infinitive TEXT,
  source_lang TEXT DEFAULT 'it',
  target_lang TEXT DEFAULT 'en',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_words_user ON saved_words(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS srs_metadata (
  word_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  interval_days INTEGER DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  due_date INTEGER NOT NULL,       -- unix ms
  last_review INTEGER DEFAULT 0,   -- unix ms
  FOREIGN KEY (word_id) REFERENCES saved_words(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_metadata(user_id, due_date);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_review_date TEXT,           -- 'YYYY-MM-DD' UTC
  total_reviews INTEGER DEFAULT 0,
  total_words_saved INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  badge_key TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  UNIQUE(user_id, badge_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Apply with: `wrangler d1 execute conjugate-users --file=src/schema.sql`

### New files in `gube-proxy/src/`

**`auth.ts`** — JWT helpers using `@tsndr/cloudflare-worker-jwt` (tiny, Workers-compatible):
```typescript
export async function signJWT(payload: object, secret: string): Promise<string>
// payload: { sub: googleSub, email, iat, exp: iat + 30*24*60*60 }

export async function verifyJWT(token: string, secret: string): Promise<{ sub: string, email: string } | null>
```

**`authMiddleware.ts`** — Hono middleware:
- Reads `Authorization: Bearer <token>` header
- Calls `verifyJWT` → 401 if invalid/expired
- Sets `c.set('userId', sub)` and `c.set('userEmail', email)`

**`srs.ts`** — SM-2 algorithm (pure function, no I/O):
```typescript
export interface SRSData {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  dueDate: number;
  lastReview: number;
}

export function computeNextSRS(current: SRSData, rating: 'again' | 'good' | 'easy'): SRSData {
  // q: again=1, good=4, easy=5
  // EF' = max(1.3, EF + 0.1 - (5-q)*(0.08 + (5-q)*0.02))
  // again: rep=0, interval=1
  // rep=0: interval=1
  // rep=1: interval=6
  // rep>=2: interval = round(prev * EF')  [easy: * EF' * 1.3]
  // dueDate = now + interval * 86_400_000
}

export function createInitialSRS(): SRSData {
  return { intervalDays: 0, easeFactor: 2.5, repetitions: 0, dueDate: Date.now(), lastReview: 0 };
}
```

**`badges.ts`** — Badge definitions + award logic:
```typescript
const BADGE_DEFINITIONS = {
  first_save:   (stats) => stats.total_words_saved >= 1,
  first_review: (stats) => stats.total_reviews >= 1,
  words_10:     (stats) => stats.total_words_saved >= 10,
  words_50:     (stats) => stats.total_words_saved >= 50,
  words_100:    (stats) => stats.total_words_saved >= 100,
  streak_3:     (stats) => stats.current_streak >= 3,
  streak_7:     (stats) => stats.current_streak >= 7,
  streak_30:    (stats) => stats.current_streak >= 30,
  mastered_10:  (stats, masteredCount) => masteredCount >= 10,  // repetitions >= 5
};

// Returns array of newly awarded badge keys
export async function checkAndAwardBadges(db, userId, stats, masteredCount): Promise<string[]>
```

### New routes in `src/index.ts`

**`POST /api/auth/google`** (public)
- Body: `{ token: string }`
- Detect token type: if token contains 2 dots → ID token, else → access token
- Verify: access token → GET `https://www.googleapis.com/oauth2/v3/userinfo?access_token=<token>`, ID token → GET `https://oauth2.googleapis.com/tokeninfo?id_token=<token>`
- Get `{ sub, email, name, picture }` from Google response
- `INSERT OR REPLACE INTO users ...`
- `INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)`
- Return `{ token: appJWT, user: { id, email, displayName, avatarUrl } }`

**`GET /api/auth/me`** (auth middleware)
- SELECT from users + user_stats + COUNT(user_badges)
- Return user profile with stats

**`POST /api/words`** (auth middleware)
- Body: `{ word, context, translation, isVerb, infinitive, sourceLang, targetLang }`
- `id = "${userId}::${word.toLowerCase()}::${Date.now()}"`
- INSERT into `saved_words`
- INSERT into `srs_metadata` with `due_date = Date.now()` (new card = due immediately)
- UPDATE `user_stats SET total_words_saved = total_words_saved + 1`
- Call `checkAndAwardBadges` for save-related badges
- Return `{ word: savedWord, srs: initialSRS, newBadges }`

**`DELETE /api/words/:id`** (auth middleware)
- SELECT to verify ownership (`user_id = userId`) → 403 if mismatch
- DELETE FROM saved_words (cascades to srs_metadata)

**`GET /api/words`** (auth middleware)
- `SELECT w.*, s.* FROM saved_words w LEFT JOIN srs_metadata s ON w.id = s.word_id WHERE w.user_id = ? ORDER BY w.created_at DESC`
- Optional `?lang=it` filter
- Return array

**`GET /api/words/due`** (auth middleware)
- `WHERE w.user_id = ? AND (s.due_date IS NULL OR s.due_date <= ?)` (? = Date.now())
- ORDER BY due_date ASC
- Return array of due cards

**`POST /api/words/:id/review`** (auth middleware)
- Body: `{ rating: 'again' | 'good' | 'easy' }`
- Verify ownership
- Fetch current `srs_metadata` row
- Compute `next = computeNextSRS(current, rating)`
- UPDATE `srs_metadata`
- XP: again→1, good→3, easy→5
- Streak logic:
  - Get today's date in UTC: `new Date().toISOString().slice(0,10)`
  - If `last_review_date` === yesterday → `current_streak++`
  - If `last_review_date` === today → no streak change
  - Else → `current_streak = 1` (reset)
  - Update `longest_streak = max(longest_streak, current_streak)`
- Level formula: `level = Math.floor(1 + Math.sqrt(newXp / 50))`
- UPDATE `user_stats`
- Count mastered words (repetitions >= 5) for mastered_10 badge check
- Call `checkAndAwardBadges`
- Return `{ srs: next, xp, level, streak: current_streak, newBadges }`

**`GET /api/stats`** (auth middleware)
- SELECT user_stats + badge list + word counts by status (new: rep=0, learning: 0<rep<5, mastered: rep>=5)
- Return full stats object

---

## Phase 2 — Extension: Auth + Save Button

### `public/manifest.json` changes
```json
{
  "permissions": ["storage", "identity"],
  "oauth2": {
    "client_id": "<YOUR_GOOGLE_CLIENT_ID>.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```
Note: The Google OAuth2 client ID must be created in Google Cloud Console with the Chrome extension as an authorized origin (use the extension ID).

### `services/authService.ts` (new)
```typescript
const BACKEND = 'https://gube-proxy.raunaksbs.workers.dev';

export async function signInWithGoogle(): Promise<{ token: string; user: User }> {
  // 1. chrome.identity.getAuthToken({ interactive: true }) → accessToken
  // 2. POST /api/auth/google { token: accessToken }
  // 3. Store { authToken: jwt, authUser: user } in chrome.storage.local
}

export async function signOut(): Promise<void> {
  // chrome.identity.removeCachedAuthToken({ token })
  // chrome.storage.local.remove(['authToken', 'authUser'])
}

export async function getStoredAuth(): Promise<{ token: string; user: User } | null>
export async function isAuthenticated(): Promise<boolean>
```

### `components/Settings.tsx` additions
Add auth section above language dropdowns:
- **Not signed in**: Google logo + "Sign in with Google" button → calls `signInWithGoogle()`
- **Signed in**: avatar (img) + email text + "Sign out" button
- Below auth: "X words saved · Y due today" pill (fetched from `/api/stats`)
- Keep existing language dropdowns

### `services/srsService.ts` (new)
All functions gracefully fall back to `chrome.storage.local` when no `authToken`:

```typescript
export async function saveWord(entry: Omit<TranslationEntry, 'id'>, authToken?: string): Promise<TranslationEntry>
// authenticated: POST /api/words
// unauthenticated: generate id locally, push to savedTranslations in storage

export async function unsaveWord(id: string, authToken?: string): Promise<void>
// authenticated: DELETE /api/words/:id
// unauthenticated: filter from storage

export async function isWordSaved(word: string, sourceLang: string, authToken?: string): Promise<string | null>
// authenticated: GET /api/words → find match on word+sourceLang
// unauthenticated: check chrome.storage.local

export async function loadDashboardData(authToken?: string): Promise<DashboardData>
// authenticated: GET /api/words + GET /api/words/due + GET /api/stats
// unauthenticated: load from chrome.storage.local

export async function submitReview(id: string, rating: SRSRating, authToken?: string): Promise<ReviewResult>
// authenticated: POST /api/words/:id/review
// unauthenticated: run SM-2 locally, save to chrome.storage.local

// SM-2 exported for local use:
export function computeNextSRS(current: SRSData, rating: SRSRating): SRSData
export function createInitialSRS(): SRSData
```

### `components/TranslationCard.tsx`
Add to props interface:
```typescript
isSaved: boolean
onToggleSave: () => void
```
In the header's right column div (`px-5 py-4 bg-slate-50/20`): add `relative` class, render bookmark icon button `absolute top-2 right-2`:
```tsx
<button
  onClick={onToggleSave}
  title={isSaved ? 'Remove from saved' : 'Save word'}
  className={`absolute top-2 right-2 p-1 rounded-lg transition-all ${
    isSaved
      ? 'text-indigo-600 bg-indigo-50 border border-indigo-200'
      : 'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50'
  }`}
>
  <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
  </svg>
</button>
```

### `components/PhraseTranslationCard.tsx`
Same props. In the `flex items-center justify-between mb-1` row (the language badge row), add the bookmark button as second flex child.

### `components/ExtensionOverlay.tsx`
New state and ref:
```typescript
const [savedWordId, setSavedWordId] = useState<string | null>(null);
const selectionContextRef = useRef<string>('');
```

In `handleGlobalSelection`, after `const selectionContext = parentElement?.innerText || ...`:
```typescript
selectionContextRef.current = selectionContext;
```

New `useEffect` watching `selection`:
```typescript
useEffect(() => {
  if (!selection || selection.mode === 'loading') { setSavedWordId(null); return; }
  const word = selection.mode === 'conjugation' ? selection.word : selection.phrase;
  getStoredAuth().then(auth => {
    isWordSaved(word, sourceLanguage, auth?.token).then(setSavedWordId);
  });
}, [selection, sourceLanguage]);
```

`handleToggleSave`:
```typescript
const handleToggleSave = async () => {
  const auth = await getStoredAuth();
  if (savedWordId) {
    await unsaveWord(savedWordId, auth?.token);
    setSavedWordId(null);
  } else {
    if (!selection || selection.mode === 'loading') return;
    const entry = selection.mode === 'conjugation'
      ? {
          word: selection.word,
          context: selectionContextRef.current,
          translation: selection.wordTranslation ?? '',
          isVerb: true,
          infinitive: selection.response.entry?.infinitive ?? null,
          sourceLang: sourceLanguage,
          targetLang: targetLanguage,
          timestamp: Date.now(),
        }
      : {
          word: selection.phrase,
          context: selectionContextRef.current,
          translation: selection.translation ?? '',
          isVerb: false,
          infinitive: null,
          sourceLang: sourceLanguage,
          targetLang: targetLanguage,
          timestamp: Date.now(),
        };
    const saved = await saveWord(entry, auth?.token);
    setSavedWordId(saved.id);
  }
};
```

Pass `isSaved={!!savedWordId}` and `onToggleSave={handleToggleSave}` to both `<TranslationCard>` and `<PhraseTranslationCard>`.

---

## Phase 3 — Extension Dashboard (Quick Review Mode)

Overhaul `dashboard.tsx`:

**New state** (replace old `translations` + `currentIndex`):
```typescript
type DashboardView = 'review' | 'browse';
const [allWords, setAllWords] = useState<TranslationEntry[]>([]);
const [srsMap, setSrsMap] = useState<SRSMetadataMap>({});
const [reviewQueue, setReviewQueue] = useState<TranslationEntry[]>([]);  // fixed at session start
const [reviewIndex, setReviewIndex] = useState(0);
const [reviewedCount, setReviewedCount] = useState(0);
const [sessionDone, setSessionDone] = useState(false);
const [view, setView] = useState<DashboardView>('review');
const [browseIndex, setBrowseIndex] = useState(0);
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
const [toastBadges, setToastBadges] = useState<Badge[]>([]);
```

**Loading**: call `loadDashboardData(authToken)` → set all state. `reviewQueue = dueWords` (fixed at load time).

**Review flow**:
- Current card: `reviewQueue[reviewIndex]`
- Before reveal: centered "Reveal Answer" button
- After reveal: three buttons:
  - **Again** (red) — shows `<1d` preview
  - **Good** (amber) — shows `Xd` preview (compute from `computeNextSRS` with current SRS data + 'good')
  - **Easy** (green) — shows `Yd` preview
- On rate: call `submitReview(card.id, rating, token)` → update `srsMap`, check `newBadges`, advance index
- If `newBadges.length > 0` → show toast overlay for 3s

**Progress bar** (replaces dot indicators):
```tsx
<div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
  <div className="h-full bg-indigo-500 rounded-full transition-all"
       style={{ width: `${reviewQueue.length > 0 ? (reviewedCount / reviewQueue.length) * 100 : 0}%` }} />
</div>
<div className="flex justify-between text-xs mt-2">
  <span>{reviewedCount} done</span>
  <span>{reviewQueue.length - reviewedCount} remaining</span>
</div>
```

**"All caught up" state**: when `sessionDone && view === 'review'` → checkmark icon, "All caught up!" heading, next due label (min dueDate from srsMap, formatted as "in Xh" or "tomorrow"), "Browse all words" button.

**Keyboard shortcuts**: `Space`/`Enter` = reveal. After reveal: `1` = Again, `2` = Good, `3` = Easy.

**Header**: add view toggle tabs ("Review [N]" / "Browse (total)") + keep dark mode + clear all.

**Browse mode**:
- Uses `allWords` + `browseIndex`
- Shows answer always visible
- SRS status badge per card: "New" (indigo), "Due" (red), "In Xd" (green)
- Delete button per card → `deleteConfirmId` flow → `unsaveWord` + remove from all state arrays

---

## Phase 4 — Web App (Cloudflare Pages)

New project directory (e.g., `conjugate-app/` or separate repo).
Stack: React 19 + Vite + Tailwind CSS 4 + React Router.

**Setup**:
```bash
npm create vite@latest conjugate-app -- --template react-ts
cd conjugate-app && npm install tailwindcss @tailwindcss/vite react-router-dom
```

**Google auth**: use Google Identity Services (GSI) library:
```html
<script src="https://accounts.google.com/gsi/client" async></script>
```
```tsx
// One Tap or Sign-In button → callback receives credential (ID token)
// Send to POST /api/auth/google { token: credential }
// Store JWT in localStorage
```

**Routes**:
- `/` — Landing: hero, feature list, "Sign in with Google" button
- `/dashboard` — SRS review (same card-flip logic as extension dashboard, fetches from backend)
- `/vocabulary` — Table/grid of all words, search bar, filter by language/status (New/Learning/Mastered), delete button
- `/stats` — Streak calendar heatmap, XP bar + level, badges grid (locked/unlocked), leaderboard table (top users by XP)

**Shared API client** (`src/api.ts`):
```typescript
const BASE = 'https://gube-proxy.raunaksbs.workers.dev';
// All calls include Authorization: Bearer ${localStorage.getItem('authToken')}
export const api = { getMe, getWords, getDueWords, saveWord, deleteWord, reviewWord, getStats }
```

**Deploy**: `npm run build && wrangler pages deploy dist --project-name conjugate-app`

---

## Types to add to `LangHover/types.ts`

```typescript
export interface TranslationEntry {
  id: string;              // "${userId}::${word}::${timestamp}"
  word: string;
  context: string;
  translation: string;
  isVerb?: boolean;
  infinitive?: string | null;
  sourceLang?: string;
  targetLang?: string;
  timestamp: number;
}

export interface SRSData {
  intervalDays: number;    // days until next review
  easeFactor: number;      // SM-2 EF, default 2.5, min 1.3
  repetitions: number;
  dueDate: number;         // unix ms
  lastReview: number;      // unix ms
}

export type SRSRating = 'again' | 'good' | 'easy';
export type SRSMetadataMap = Record<string, SRSData>;

export interface User {
  id: string;              // Google sub
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Badge {
  key: string;
  earnedAt: number;
}

export interface ReviewResult {
  srs: SRSData;
  xp: number;
  level: number;
  streak: number;
  newBadges: Badge[];
}

export interface DashboardData {
  allWords: TranslationEntry[];
  srsMap: SRSMetadataMap;
  dueWords: TranslationEntry[];
  stats?: { xp: number; level: number; streak: number; totalWords: number };
}
```

---

## SM-2 Algorithm Reference

```
Inputs: current SRSData, rating ('again' | 'good' | 'easy')
Map rating to q: again=1, good=4, easy=5

EF' = max(1.3, EF + 0.1 - (5-q) * (0.08 + (5-q) * 0.02))

if rating === 'again':
  repetitions = 0
  interval = 1
else:
  repetitions = repetitions + 1
  if repetitions === 1: interval = 1
  elif repetitions === 2: interval = 6
  else:
    multiplier = (rating === 'easy') ? EF' * 1.3 : EF'
    interval = round(prevInterval * multiplier)

dueDate = Date.now() + interval * 86_400_000
```

---

## Gamification Reference

**XP per action**: save word=5, review again=1, review good=3, review easy=5

**Level formula**: `level = Math.floor(1 + Math.sqrt(xp / 50))`
- Level 1: 0 XP, Level 2: 50 XP, Level 3: 200 XP, Level 4: 450 XP, Level 10: ~5000 XP

**Streak rule**: A day counts if at least one review is submitted. UTC dates only. Gap > 1 day resets to 1.

**Badges**:
| Key | Trigger |
|-----|---------|
| `first_save` | total_words_saved >= 1 |
| `first_review` | total_reviews >= 1 |
| `words_10` | total_words_saved >= 10 |
| `words_50` | total_words_saved >= 50 |
| `words_100` | total_words_saved >= 100 |
| `streak_3` | current_streak >= 3 |
| `streak_7` | current_streak >= 7 |
| `streak_30` | current_streak >= 30 |
| `mastered_10` | words with repetitions >= 5 >= 10 |

---

## Implementation Order

| # | Task | Location |
|---|------|----------|
| 1 | `wrangler d1 create conjugate-users` | gube-proxy |
| 2 | Write `src/schema.sql`, run `wrangler d1 execute` | gube-proxy |
| 3 | `wrangler secret put JWT_SECRET` | gube-proxy |
| 4 | `npm install @tsndr/cloudflare-worker-jwt` | gube-proxy |
| 5 | Create `src/auth.ts` (JWT sign/verify) | gube-proxy |
| 6 | Create `src/srs.ts` (SM-2 algorithm) | gube-proxy |
| 7 | Create `src/badges.ts` | gube-proxy |
| 8 | Add auth middleware to `src/index.ts` | gube-proxy |
| 9 | Add `POST /api/auth/google` route | gube-proxy |
| 10 | Add `GET /api/auth/me` route | gube-proxy |
| 11 | Add word CRUD routes (`/api/words`) | gube-proxy |
| 12 | Add `POST /api/words/:id/review` route | gube-proxy |
| 13 | Add `GET /api/stats` route | gube-proxy |
| 14 | `wrangler deploy` + test with curl | gube-proxy |
| 15 | Add `identity` + `oauth2` to manifest.json | LangHover |
| 16 | Add new types to `types.ts` | LangHover |
| 17 | Create `services/authService.ts` | LangHover |
| 18 | Update `components/Settings.tsx` (Google Sign-In) | LangHover |
| 19 | Create `services/srsService.ts` (API + local fallback) | LangHover |
| 20 | Update `TranslationCard.tsx` (save button) | LangHover |
| 21 | Update `PhraseTranslationCard.tsx` (save button) | LangHover |
| 22 | Update `ExtensionOverlay.tsx` (save logic + context ref) | LangHover |
| 23 | Overhaul `dashboard.tsx` (SRS review + browse) | LangHover |
| 24 | Scaffold web app with Vite + React + Tailwind | New project |
| 25 | Implement Google One Tap auth in web app | New project |
| 26 | Build `/dashboard` SRS review page | New project |
| 27 | Build `/vocabulary` browse page | New project |
| 28 | Build `/stats` gamification page | New project |
| 29 | Deploy to Cloudflare Pages | New project |

---

## Verification Checklist

- [ ] `curl -X POST .../api/auth/google -d '{"token":"<google_token>"}'` returns `{ token, user }`
- [ ] `wrangler d1 execute conjugate-users --command "SELECT * FROM users"` shows user row
- [ ] Extension: Ctrl+select word → card appears → bookmark icon → click → saved
- [ ] `wrangler d1 execute ... "SELECT * FROM saved_words"` shows saved word
- [ ] Rate a card "Good" → D1 shows `interval_days=1`, `due_date ≈ now+86400000`
- [ ] Submit reviews for 3 days → `current_streak=3`, badge `streak_3` appears in `user_badges`
- [ ] Web app: Google One Tap → dashboard loads same words as extension
- [ ] Level formula: 50 XP → level 2, 200 XP → level 3
