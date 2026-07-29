# web — the deployable page

A single static page. Drop a chart screenshot in, answer what you can read off
it, and the same six gates the engine runs produce the conclusion.

**The page cannot see the screenshot.** It has no network access and no vision
model — the image sits on screen so you can read it while you answer, and the
verdict is computed from your reading. `script.js` does not exist: everything is
one self-contained `index.html`, so there is nothing to build and nothing to
bundle.

The verdict logic is a faithful port of `../src/verdict.ts`. If you change the
rules there, change them here too — or the two will start telling you different
things about the same setup.

---

## It stands completely alone

This directory shares nothing with the rest of the repository, and nothing here
can collide with the other sites in it.

```
web/
├── index.html    one file — all markup, CSS and JS inline
├── vercel.json   response headers only
└── README.md     this
```

- **No `package.json`, no dependencies, no build step.** There is nothing for
  Vercel to install or compile, so it cannot pick up the repository's root
  `package.json` or the Bun project in `../`.
- **No imports and no external requests.** Verified: the page references no URL,
  no stylesheet, no font, no script, no API. The only `data:` URI is its favicon.
- **No shared config.** Vercel reads `vercel.json` from the configured Root
  Directory only. The repository's other sites — `bokningssystem`,
  `salon-website`, `website/suntfornuft`, `install` — each have their own, and
  none of them is read when this one is deployed.
- **Its own Vercel project.** Deploy it as a separate project with its own
  domain. Several projects can point at the same repository as long as each has
  a different Root Directory, which is already how the sites above are set up.

If you would rather it not live in this repository at all, copy the three files
into an empty repository and deploy that — nothing needs changing, because
nothing here points outward.

---

## Deploy on Vercel

The site root is **this directory**, not the repository root. That is the only
setting that matters.

### From the dashboard

1. **Add New → Project**, import the repository.
2. Set **Root Directory** to `powell-10am/web`.
3. Leave Framework Preset as **Other**. There is no build step — leave the
   build and install commands empty.
4. **Deploy.**

### From the CLI

```bash
npm i -g vercel

cd powell-10am/web
vercel            # preview deployment
vercel --prod     # production
```

Run it from this directory and Vercel treats it as the root, so no extra
configuration is needed.

### What `vercel.json` does

Nothing structural — the page is one file and Vercel serves it as-is. The config
only sets response headers, chiefly a Content Security Policy that matches what
the page actually needs:

```
default-src 'none'; img-src 'self' data: blob:;
style-src 'unsafe-inline'; script-src 'unsafe-inline';
base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

`default-src 'none'` means the deployed page cannot make network requests at
all. That is deliberate: your screenshot never leaves the browser, because there
is nowhere for it to go. `data:` and `blob:` are permitted for `img` so the file
you drop in can be displayed.

`noindex` is set in the page's metadata. Remove that meta tag if you want it
indexed.

---

## Running it locally

No tooling required:

```bash
cd powell-10am/web
python3 -m http.server 8000
# → http://localhost:8000
```

Opening `index.html` directly from the filesystem also works.

---

## Keeping it in step with the engine

The constants at the top of the page's script mirror the spec:

| Page constant | Spec field |
|---|---|
| `MIN_PENETRATION` | `minSweepPenetration` |
| `MIN_PLANNED_R` | `minPlannedR` |
| `STOP_BUFFER` | stands in for `stopBufferAtr` — a screenshot rarely carries an ATR |
| `OTE_SWEET` | `FIB_LEVELS.oteSweet` |
| `STD_DEV_TARGET` | `stdDevTarget` |

Everything else in `../docs` still applies, including
[`08-sources.md`](../docs/08-sources.md) on provenance.
