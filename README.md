# Vocab Parser — MVP (GitHub Pages Ready)

This repo contains a browser-only MVP of a vocabulary parser + dictionary manager.

## Features
- Create/rename/delete dictionaries (stored in `localStorage`).
- Paste **text** or a **URL** (URL may be blocked by CORS; prefer pasting text).
- Extract top-10 frequent words and add to the active dictionary.
- Auto-translate via **Google/DeepL/Lingva** (requires keys/endpoint; otherwise edit manually).
- Edit translation/example inline — auto-saved.
- Preview table and export to **CSV (Excel)** and **JSON**.
- Auto light/dark theme by local time.

> Note: For Google/DeepL from the browser you typically need your own proxy because of CORS.

## Quick start
1. Click **Add file → Upload files** and drop these repo files into a new GitHub repository.
2. Commit the upload.
3. Go to **Settings → Pages**.
   - **Source:** *Deploy from a branch*
   - **Branch:** *main* / *(root)*
4. Save and wait 1–2 minutes. Your site will be available at:
   `https://YOUR_USERNAME.github.io/REPO_NAME/`

## Files
- `index.html` — main UI
- `style.css` — styles
- `app.js` — logic
- `.nojekyll` — disables Jekyll processing on GitHub Pages
- `index_standalone.html` — single-file build (HTML+CSS+JS in one file)

## Local testing
Just open `index.html` (or `index_standalone.html`) in a modern browser.


## Enhancements
- Batch processing: **Next 10 words** from the same analysis.
- **Import CSV/JSON** into the active dictionary.
- **Clear current dictionary** button.
- Language-aware stopword set.

- Preview & Export moved to a separate tab.

## Free translation services configured
- **LibreTranslate** (default): set base URL in Settings (demo: https://libretranslate.de). No key required; rate-limited.
- **MyMemory**: public endpoint (no key). Lower quality but easy to test.
- **Lingva**: proxy to Google Translate (use a public instance like https://lingva.ml if it supports CORS).

> You can still switch to Google/DeepL later; they usually require a proxy from the browser due to CORS.

- Only free translation providers left (LibreTranslate, MyMemory, Lingva).
- Language dropdowns added: native = Ukrainian; learning = EN/DE/FR/ES.
- UI switches to Ukrainian when native language is Ukrainian.
