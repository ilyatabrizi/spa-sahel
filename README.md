# Spa Sahel — PWA preview

An installable app preview for **Spa Sahel**, 1117 Saint-Catherine St W, Suite 401,
Montreal. Built by [Alpha Agency](https://alphaagency.ae) as a proposal.

**Live:** https://ilyatabrizi.github.io/spa-sahel/
**Their site:** [spasahel.com](https://spasahel.com) · 514.844.5509 · [@spa_sahel](https://instagram.com/spa_sahel)

No build step, no dependencies, no framework. Vanilla ES modules, one stylesheet,
a hash router and a service worker. Open `index.html` through `serve.py` and it runs.

```bash
python3 serve.py          # http://localhost:8211
python3 e2e.py            # 176 checks against the local preview
python3 build.py          # stamp the build — run before every deploy
```

---

## What is real and what is ours

Everything factual came off spasahel.com and the client's own price cards on
**12 September 2026**. Nothing was invented to fill a gap.

**Theirs, transcribed:** every treatment name, every price, every published
duration; the nine treatment families; the three packages with their own copy;
the mission and team paragraphs, word for word; the address, telephone, email,
Instagram; the opening hours (Mon–Fri 10–19, Sat 9–17, closed Sunday); the laser
hair-removal rates from their Instagram price card; every photograph, including
the treatment-room shot the client sent.

**Handled honestly rather than filled in:**

| Case | What the app does |
|---|---|
| Laser and electrolysis, priced at consultation | Says **At consultation** and offers the free 15-minute consultation — never a total |
| Treatments with no published length (waxing, threading, nails) | Shows `≈ 30 min` with *"Length confirmed when you book"*, and holds that long in the diary |
| Therapist names | **Placeholders.** Layla M., Nadia R., Sara K., Yasmin B. — replace with the real team |
| The Sahel Club (points, tiers, rewards) | **Alpha's proposal, not a programme they run.** Labelled as such in the app, on the club card and on the profile |
| Promo codes | `SAHEL10` and `SUNRISE` exist so the flow can be demonstrated. Not real offers |

Bookings, points and preferences live in `localStorage` on the visitor's own
device. **Nothing reaches the spa** — the footer says so on every screen.

---

## The design

**Light white ground, their colours as the light.** The furniture is neutral —
white cards on a cool grey ground, ink-on-white buttons. Spa Sahel's sunrise
arrives as *effect*: the tab lens, the progress ring, every hover wash, the focus
ring, the selected day and time, the hero glow, the moment a booking lands. Their
orange is 2.2:1 on white and is never asked to be a text colour; a darker warm
(`--tint`) carries links and labels at 4.5:1 or better.

Palette measured off their logo, not guessed:
`#FDC10D` gold → `#FD8B01` amber, `#06C2FC` sky → `#005BE3` sea.

**The logo** is traced from their master into a 12 KB SVG — 15 rays and 3 sea
bands as real curves, with the radial sunrise and the vertical sea gradient the
original actually uses. 2% mean pixel difference from the raster. It scales to
any size, recolours, and drives the app icons.
`python3 scripts/trace_logo.py` regenerates it.

**Type:** SF (the system stack) for interface text, so on an iPhone the app reads
as an iPhone app. **Jost** for display — a geometric sans matching the one in
their own Instagram posts.

**Glass, properly.** The bars use a transparent tint with `saturate(185%)` and a
`brightness()` clamp, not an opaque panel with a blur behind it. Three traps are
load-bearing and are marked in the source where they bite:

1. `backdrop-filter` samples **nothing** if any *ancestor* is transformed. Both
   bars are centred with flexbox, never `translateX(-50%)`, and `body` is pinned
   to `transform: none`. This one bit during the build and the e2e suite now
   walks every glass surface's ancestors on every run.
2. A folding bar must not measure itself from the row it is shrinking.
3. Setting `location.hash` to the hash you already have fires no `hashchange`.

**The nav bar** is an iOS tab bar: four tabs on a floating capsule, a lens that
springs between them and follows a dragged finger, and a fold — scroll down and
it collapses to the tab you are on, scroll up and it opens again. The top bar
carries no material over the hero photograph and takes on glass and a compact
title once the page title has scrolled by.

---

## The reservation

Six steps, each its own route so the phone's back gesture walks the flow
backwards instead of throwing you out of it. The draft survives a reload.

1. **Treatment** — up to four in one visit, from any family, with a running total
2. **With whom** — only therapists who actually do those treatments; a basket no
   one person covers says so and assigns a pair on the day
3. **Date & time** — a 60-day calendar and a slot grid generated from their real
   opening hours. A booking must *finish* by closing, two hours' notice, fifteen
   minutes between guests, Sundays shut. The diary is seeded from the date, so
   the same Thursday shows the same gaps on every device and after every reload
4. **Your details** — validated name, mobile and email
5. **Health** — pregnancy, allergies, medication, skin conditions, recent sun or
   waxing, circulatory history, and the consent declaration. **Before the money,
   on purpose:** a guest who learns on the payment screen that she cannot have a
   treatment has already been made to enter a card
6. **Confirm** — itemised receipt, reward redemption, promo code, deposit note
   above $150, cancellation policy, points the visit will earn

Then a reference (`SAH-XXXX`), a real `.ics` download, and the appointment in the
profile, where it can be rescheduled or cancelled.

The slot is **held for ten minutes** and really expires. Adding a treatment
releases it, because a ninety-minute booking cannot keep a gap that fits thirty.

---

## The club

One point per dollar. Four lifetime tiers — Shore, Sunrise, Horizon, Solstice —
each earning faster than the last. Points land **only when a visit has actually
happened**: a booking in the future shows what it will earn, a cancelled one
earns nothing, and a visit whose time has passed settles itself and pays out the
next time the app opens. Redeeming moves a voucher into a wallet and the points
leave immediately; cancelling a visit that used one gives it back.

Six rewards, a referral code, and a birthday steam sauna.

---

## Both languages

English is the default; French is one tap away and re-renders in place without
losing your scroll position or a half-finished booking. Quebec convention
throughout: `140 $` with a no-break space, the 24-hour clock as `14 h 30`, a
narrow space before `!` and `?`. Every treatment name, blurb, package and reward
carries its own French. The e2e suite fails if an English string survives on a
French screen.

---

## Layout

```
index.html              one page; build.py inlines the opening mark and the preloads
css/app.css             the whole design system, light and dark
js/
  config.js             the business — address, hours, booking rules, the club
  data.js               the catalogue: every treatment, price and duration
  i18n.js               both languages, and the Quebec formatting
  schedule.js           availability — opening hours, lead time, the seeded diary
  store.js              the member record: bookings, points, tiers, rewards
  basket.js             the booking in progress, and the slot hold
  chrome.js             the glass top bar and the folding tab bar
  router.js             hash routes; a fresh node per screen, so nothing stacks
  brand.js              generated — the traced logo
  views/                home, services, service, book, you
assets/
  brand/  fonts/  icons/  photos/     photos are theirs, built by build_assets.py
scripts/
  trace_logo.py         their logo → SVG
  build_assets.py       their photographs → WebP, and the app icons
  src/                  the originals
e2e.py                  176 checks
```

---

## Before this goes to the client

- [ ] **Real therapist names and specialities** — `THERAPISTS` in `js/config.js`
- [ ] **Confirm the Sahel Club** is something they want before it is shown as
      theirs, or keep the proposal label
- [ ] **Higher-resolution photographs.** Most of theirs are 416×315 from their
      own service grid. The layout never draws a picture larger than its file
      really is, so nothing is stretched — but facials, body, waxing, sauna and
      the Spa Jet would all be sharper with originals
- [ ] Confirm the **Hydra Phytomer** length, and whether **Photo rejuvenation**
      belongs under Facial as well as Laser
- [ ] Decide whether gift cards should be purchasable in-app rather than by phone
- [ ] A real booking back end if this ships — everything is currently on-device

---

Built by **Alpha Agency**, Dubai.
