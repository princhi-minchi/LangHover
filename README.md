# ConjuMate

**Instant Italian conjugations and translations without leaving the webpage you're reading.**

ConjuMate is a Chrome extension I built while studying in Milan. Select a word or phrase on almost any webpage and ConjuMate shows the relevant verb conjugation or translation directly on the page.

**[Chrome Web Store](https://chromewebstore.google.com/detail/conjumate-translator-and/lddadpilkaeiijmioafidgdngomiknmn)** · **[Demo + Pitch](https://www.youtube.com/watch?v=gRBc71vt0o0)** · **[Backend](https://github.com/princhi-minchi/gube-proxy)**

---

## The idea

Language learners spend a lot of time reading material they actually care about — news articles, Reddit threads, blogs, Wikipedia — but looking up unfamiliar words or verb forms constantly interrupts the experience.

ConjuMate tries to remove that friction.

Instead of copying a word, opening another tab, searching for its infinitive and then finding the correct conjugation, the learner can bring up the information in context without leaving the page.

---

## What it does

When reading Italian on the web:

1. Select a word or phrase.
2. Hold **Ctrl** on Windows/Linux or **Cmd** on macOS.
3. ConjuMate identifies what was selected.
4. If it detects an Italian verb form, it finds the infinitive and displays the full conjugation table, highlighting the form that appeared in the text.
5. If it isn't a conjugatable verb — or the user selects a longer phrase — ConjuMate falls back to translation.

The interface is injected directly into the webpage, so the learner can understand the text and keep reading.

### Features

* Instant Italian verb lookup
* Identification of conjugated forms from their inflected form
* Full mood and tense conjugation tables
* Automatic highlighting of the conjugation found in the text
* Word and phrase translation
* Configurable source and target languages
* UI rendered directly over the webpage
* Settings synced across open tabs
* Light/dark dashboard
* Chrome Manifest V3 extension

---

## How it works

At a high level:

```text
Selected text on webpage
          ↓
Chrome content script
          ↓
Determine conjugation vs. translation
          ↓
Cloudflare Worker API
       ↙       ↘
Verb database   DeepL
       ↘       ↙
   Result returned
          ↓
ConjuMate overlay
```

For short selections, ConjuMate first attempts to identify a conjugated verb.

The backend maintains a reverse lookup from conjugated forms to possible infinitives. Candidate verbs are then scored against the user's selection and surrounding context to determine the most likely grammatical form.

Translation requests are handled separately through DeepL.

For longer selections, the extension skips conjugation lookup and goes directly to phrase translation.

---

## Tech stack

### Extension

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **Chrome Extension Manifest V3**
* **Chrome Storage API**

### Backend

The backend lives in a separate repository: **[gube-proxy](https://github.com/princhi-minchi/gube-proxy)**.

* **Cloudflare Workers**
* **Hono**
* **Cloudflare KV**
* **DeepL API**

The extension UI is mounted inside a **Shadow DOM**, isolating ConjuMate's styles from the CSS of whatever website the user is visiting.

API requests are managed through a central service layer with request cancellation, error handling and rate-limit handling.

For more detail on the implementation, see [`architecture.md`](./architecture.md).

---

## Running it locally

### 1. Clone the repository

```bash
git clone https://github.com/princhi-minchi/LangHover.git
cd LangHover
npm install
```

### 2. Build the extension

```bash
npm run build
```

This generates the `dist` directory.

### 3. Load it into Chrome

Open:

```text
chrome://extensions
```

Enable **Developer mode**, click **Load unpacked**, and select the generated `dist` directory.

The production extension communicates with the Cloudflare Worker backend. For local backend development, see the [gube-proxy repository](https://github.com/princhi-minchi/gube-proxy).

---

## Building ConjuMate

I built ConjuMate end-to-end while studying at Bocconi in Milan, using AI coding tools extensively as part of my development workflow.

It started as an attempt to make learning Italian from real-world material less cumbersome. I designed the product, built the Chrome extension and backend integrations, packaged it, and shipped it publicly on the Chrome Web Store.

ConjuMate was subsequently selected for **Tech Europe Foundation's seven-week Ignition founder program**. Through customer research, workshops, mentoring and pitching during the program, I began exploring a broader version of the idea: instead of helping learners understand individual words while reading, what if **any webpage could itself become a language lesson?**

That became **[PorpoiseRead](https://github.com/princhi-minchi/Read-With-Porpoise)**.

---

## Links

* **Chrome Web Store:** [ConjuMate – Translator and Conjugator](https://chromewebstore.google.com/detail/conjumate-translator-and/lddadpilkaeiijmioafidgdngomiknmn)
* **Demo + Pitch:** [YouTube](https://www.youtube.com/watch?v=gRBc71vt0o0)
* **Original pitch deck:** [`ConjuMate Ignition 02-03.pdf`](./ConjuMate%20Ignition%2002-03.pdf)
* **Backend:** [princhi-minchi/gube-proxy](https://github.com/princhi-minchi/gube-proxy)
* **Evolution of the idea:** [PorpoiseRead](https://github.com/princhi-minchi/Read-With-Porpoise)
