#!/usr/bin/env python3
"""End-to-end checks for the Spa Sahel PWA.

    python3 serve.py &                                      # or the "sahel" preview
    python3 e2e.py                                          # local preview, :8211
    python3 e2e.py https://ilyatabrizi.github.io/spa-sahel/ # the deployed build

Drives the system Chrome as an iPhone through everything a guest would do, and
fails loudly on anything broken. What it is actually guarding:

  the glass      every fixed bar really blurs — no transformed ancestor anywhere
                 above a backdrop-filter, which is the one mistake that turns
                 this design into flat paint with no error in the console
  the tab bar    lens lands on the right tab, folds on a scroll down, opens on
                 the way up, drags between tabs, and the tab you are on scrolls
                 to the top instead of navigating
  the top bar    no material over the hero, material and a compact title after
  the prices     every figure on screen matches the price list in data.js, which
                 is Spa Sahel's own — a typo here is a typo a client would sign
  the booking    all six steps, the validation, the health gate before the money,
                 a slot that is really held and really expires, the .ics
  the club       points land only on visits that have happened, a redeemed
                 reward leaves the balance, a cancelled visit gives it back
  both languages every screen in French, Quebec formatting (65 $, 14 h 30), and
                 no English left behind
  the honesty    nothing invented: consultation prices say so, our own duration
                 estimates are marked, the club is labelled as Alpha's proposal
  light + dark   and a contrast walk over both
  the nav, as it  the folded capsule really hugs its tab at the leading edge with
  looks          the call button at the trailing one; the lens sits on its tab to
                 the pixel and never flies in on a deep link; the top bar never
                 shows glass and white controls together over a photograph; the
                 bar title is centred on the screen
  touch          no hover without a hover-capable pointer, a tapped row stays
                 under the finger, the toast never lands on the dock or a bar
  moving a visit reschedule carries the appointment into the diary and moves it

Screenshots land in scripts/shots/.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8211/").rstrip("/") + "/"
LIVE = "localhost" not in BASE and "127.0.0.1" not in BASE
SHOTS = ROOT / "scripts" / "shots"
IPHONE = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
          "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")

PASS: list[str] = []
FAIL: list[str] = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else f"{name}  →  {detail}")


def http(url, method="GET"):
    try:
        req = urllib.request.Request(url, method=method, headers={"User-Agent": "sahel-e2e"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, (r.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, b""
    except Exception as e:
        return 0, {}, str(e).encode()


# Every fixed, glassy surface, and the walk up its ancestors. A transform, a
# filter or a perspective on ANY ancestor makes backdrop-filter sample an empty
# backdrop; the element keeps its tint and quietly stops being glass.
GLASS_JS = """() => {
  const out = [];
  for (const el of document.querySelectorAll('#tabs, #topbar::before, #bookdock, #toast, #call-btn')) {
    const cs = getComputedStyle(el);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (!bf || bf === 'none') continue;
    const bad = [];
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none' ||
          s.backdropFilter === 'blur(0px)' || parseFloat(s.opacity) < 1)
        bad.push(n.tagName + (n.id ? '#' + n.id : '') + ' ' + s.transform + ' ' + s.filter + ' op=' + s.opacity);
    }
    out.push({ id: el.id || el.className, filter: bf, ancestors: bad });
  }
  return out;
}"""

CONTRAST_JS = """(sel) => {
  const rgb = (c) => (c.match(/[\\d.]+/g) || [0,0,0]).slice(0, 3).map(Number);
  const lum = (c) => { const v = rgb(c).map(x => { x /= 255; return x <= .03928 ? x/12.92 : Math.pow((x+.055)/1.055, 2.4); });
    return .2126*v[0] + .7152*v[1] + .0722*v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const solid = (el) => { for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c) && rgb(c).length === 3) {
        const a = (c.match(/[\\d.]+/g) || [])[3];
        if (a === undefined || parseFloat(a) > .85) return c;
      } } return 'rgb(255,255,255)'; };
  const bad = [];
  for (const el of document.querySelectorAll(sel)) {
    const txt = (el.textContent || '').trim();
    if (!txt || el.children.length) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // skip anything sitting on a photograph or a gradient — the walker cannot
    // read those, and guessing produces noise instead of findings
    let skip = false;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage !== 'none' || n.classList.contains('hero') ||
          n.classList.contains('club') || n.classList.contains('gtile-cap') ||
          s.backdropFilter !== 'none' && s.backdropFilter !== '') { skip = true; break; }
    }
    if (skip) continue;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(cs.color, solid(el));
    if (got < need) bad.push({ t: txt.slice(0, 42), got: +got.toFixed(2), need, size, color: cs.color });
  }
  return bad;
}"""

# Where the capsule, the call button, the current tab and the lens actually are.
GEO_JS = """() => {
  const cap = document.getElementById('tabs').getBoundingClientRect();
  const call = document.getElementById('call-btn').getBoundingClientRect();
  const tabs = [...document.querySelectorAll('.tab')];
  const cur = document.querySelector('.tab[aria-current=page]');
  const lens = document.getElementById('tabs-lens').getBoundingClientRect();
  const c = cur ? cur.getBoundingClientRect() : null;
  return { min: document.getElementById('tabbar').classList.contains('min'), vw: innerWidth,
    capL: cap.left, capR: cap.right, capW: cap.width, callL: call.left, callR: call.right,
    sumTabs: tabs.reduce((s, t) => s + t.getBoundingClientRect().width, 0),
    curL: c && c.left, curW: c && c.width, lensL: lens.left, lensW: lens.width };
}"""

# Every rendered element carrying a backdrop-filter, and the first ancestor that
# would stop it sampling the page: a transform, a filter, or opacity below one.
ALL_GLASS_JS = """() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (!bf || bf === 'none' || !el.getClientRects().length) continue;
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.transform !== 'none' || s.filter !== 'none' || parseFloat(s.opacity) < 1) {
        out.push((el.id || el.className) + ' <- ' + (n.id || n.className || n.tagName) + ' ' + s.transform + ' op' + s.opacity);
        break;
      }
    }
  }
  return out;
}"""


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("pip install playwright  (uses the system Chrome)")

    SHOTS.mkdir(parents=True, exist_ok=True)
    prices = price_list()

    # ---------------------------------------------------------------- static
    status, headers, body = http(BASE)
    check("index 200", status == 200, str(status))
    html = body.decode("utf-8", "replace")
    check("boot mark inlined", "id=\"boot\"" in html and "url(#sun-boot)" in html)
    check("modulepreload written", html.count("modulepreload") >= 20, str(html.count("modulepreload")))
    check("preload links carry no ?v=", 'modulepreload href="js/app.js?v' not in html)
    check("css is versioned", re.search(r"css/app\.css\?v=[0-9a-f]{6,}", html) is not None)
    check("manifest linked", 'rel="manifest"' in html)
    check("theme-color present", 'name="theme-color"' in html)
    check("viewport-fit=cover", "viewport-fit=cover" in html)
    check("og image declared", 'property="og:image"' in html)

    for path in ("manifest.webmanifest", "sw.js", "css/app.css", "js/app.js",
                 "assets/fonts/jost.woff2", "assets/icons/icon-512.png",
                 "assets/icons/maskable-512.png", "assets/photos/room-sm.webp", "assets/og.jpg"):
        s, _, _ = http(BASE + path)
        check(f"{path} 200", s == 200, str(s))

    s, _, mf = http(BASE + "manifest.webmanifest")
    man = json.loads(mf or b"{}")
    check("manifest standalone", man.get("display") == "standalone")
    check("manifest has maskable", any(i.get("purpose") == "maskable" for i in man.get("icons", [])))
    check("manifest shortcuts", len(man.get("shortcuts", [])) >= 2)

    s, _, swtxt = http(BASE + "sw.js")
    sw = swtxt.decode("utf-8", "replace")
    check("worker is network-first with cache reload", 'cache: "reload"' in sw)
    check("worker claims only on update", "=== \"update\"" in sw and "clients.claim" in sw)
    check("worker version stamped", re.search(r'VERSION = "sahel-[0-9a-f]{8,}"', sw) is not None)
    check("worker precaches the photos", sw.count("assets/photos/") >= 20)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True, user_agent=IPHONE, locale="en-CA")
        page = ctx.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        def open_at(hash_="#/", wait=".screen"):
            """Always a cold load.

            goto() to a URL that differs only in its hash is a SAME-DOCUMENT
            navigation: the page does not reload, so every module keeps the
            state it already had. Any check that writes localStorage and then
            expects the app to read it back passes or fails at random without
            this. The sentinel survives only inside one document, so its
            presence after a goto is proof no reload happened."""
            page.goto(BASE + hash_, wait_until="domcontentloaded")
            if page.evaluate("() => window.__e2e === 1"):
                page.reload(wait_until="domcontentloaded")
            page.wait_for_selector(wait, timeout=15000)
            page.wait_for_timeout(650)
            page.evaluate("() => { window.__e2e = 1; }")

        def shot(name):
            page.screenshot(path=str(SHOTS / f"{name}.png"))

        # ------------------------------------------------------------- boot
        open_at("#/", ".hero")
        page.wait_for_selector("#boot", state="detached", timeout=8000)
        check("opening screen clears", page.locator("#boot").count() == 0)
        check("hero photo painted", page.evaluate(
            "() => { const i = document.querySelector('.hero-media img'); return !!i && i.complete && i.naturalWidth > 0; }"))
        shot("01-home")

        # ------------------------------------------------------------ glass
        glass = page.evaluate(GLASS_JS)
        check("glass surfaces found", len(glass) >= 2, str(len(glass)))
        for g in glass:
            check(f"glass '{g['id']}' has no transformed ancestor", not g["ancestors"], "; ".join(g["ancestors"]))
        check("body is not transformed", page.evaluate("() => getComputedStyle(document.body).transform") == "none")
        check("tab capsule blurs", "blur" in page.evaluate(
            "() => { const c = getComputedStyle(document.getElementById('tabs')); return c.backdropFilter || c.webkitBackdropFilter; }"))

        # ----------------------------------------------------------- topbar
        check("top bar has no material over the hero",
              page.evaluate("() => document.getElementById('topbar').dataset.lifted") == "0")
        check("top bar goes white over the hero",
              page.evaluate("() => document.getElementById('topbar').dataset.tone") == "dark")
        page.mouse.wheel(0, 900)
        page.wait_for_timeout(600)
        check("top bar takes material after the title",
              page.evaluate("() => document.getElementById('topbar').dataset.lifted") == "1")
        check("compact title appears", page.evaluate(
            "() => parseFloat(getComputedStyle(document.getElementById('tb-title')).opacity) > .9"))
        check("compact title reads Spa Sahel", page.inner_text("#tb-title").strip() == "Spa Sahel")

        # ---------------------------------------------------------- tab bar
        check("lens sits under Home", page.evaluate(
            "() => { const b = document.getElementById('tabbar'); const t = document.querySelector('.tab[data-tab=home]');"
            " return Math.abs(parseFloat(b.style.getPropertyValue('--lens-x')) - t.offsetLeft) < 2; }"))
        page.mouse.wheel(0, 1400)
        page.wait_for_timeout(700)
        check("tab bar folds on the way down", page.evaluate(
            "() => document.getElementById('tabbar').classList.contains('min')"))
        check("folded bar hides the other tabs", page.evaluate(
            "() => parseFloat(getComputedStyle(document.querySelector('.tab[data-tab=you]')).opacity) < .1"))
        page.mouse.wheel(0, -500)
        page.wait_for_timeout(700)
        check("tab bar opens on the way up", not page.evaluate(
            "() => document.getElementById('tabbar').classList.contains('min')"))
        shot("02-home-scrolled")

        # every tab reachable, and the lens follows
        for tab, route in (("services", "/services"), ("book", "/book"), ("you", "/you"), ("home", "/")):
            page.click(f".tab[data-tab={tab}]")
            page.wait_for_timeout(700)
            check(f"tab {tab} routes", page.evaluate("() => location.hash").startswith("#" + route),
                  page.evaluate("() => location.hash"))
            check(f"tab {tab} is current",
                  page.get_attribute(f".tab[data-tab={tab}]", "aria-current") == "page")

        # the tab you are on scrolls to the top rather than navigating
        page.click(".tab[data-tab=services]")
        page.wait_for_timeout(500)
        page.mouse.wheel(0, 1200)
        page.wait_for_timeout(500)
        before = page.evaluate("() => scrollY")
        page.click(".tab[data-tab=services]")
        page.wait_for_timeout(900)
        check("tapping the current tab returns to the top",
              before > 300 and page.evaluate("() => scrollY") < 60, f"{before} → {page.evaluate('() => scrollY')}")

        # ------------------------------------------------------- the prices
        open_at("#/services")
        shot("03-services")
        check("nine treatment families", page.locator(".gtile").count() == 9,
              str(page.locator(".gtile").count()))
        check("packages listed", page.locator('a[href^="#/package/"]').count() == 3)

        # every published figure, against data.js
        bad_price = []
        for gid in ("face", "body", "massage", "nails", "wax", "laser", "electro", "sauna", "thread"):
            open_at(f"#/group/{gid}", ".list")
            rows = page.eval_on_selector_all(
                ".list .row", "els => els.map(e => [e.querySelector('.row-title').textContent.trim(),"
                              " e.querySelector('.row-val') ? e.querySelector('.row-val').textContent.trim() : ''])")
            for name, val in rows:
                want = prices.get((gid, name))
                if want is None:
                    bad_price.append(f"unknown row '{name}'")
                elif want == "quoted":
                    if "consultation" not in val.lower():
                        bad_price.append(f"{name}: expected a consultation, got {val!r}")
                elif want == 0:
                    if "free" not in val.lower():
                        bad_price.append(f"{name}: expected Free, got {val!r}")
                elif f"${want}" not in val:
                    bad_price.append(f"{name}: expected ${want}, got {val!r}")
        check("every price matches the price list", not bad_price, "; ".join(bad_price[:6]))
        check("price list covers every service", len(prices) >= 70, str(len(prices)))

        # search runs across both languages
        open_at("#/services")
        page.fill("#svc-q", "sourcils")
        page.wait_for_timeout(400)
        check("French search hits English rows", page.locator("#svc-out .row").count() > 0)
        page.fill("#svc-q", "brow")
        page.wait_for_timeout(400)
        check("English search hits the same rows", page.locator("#svc-out .row").count() > 0)
        page.fill("#svc-q", "zzzz")
        page.wait_for_timeout(400)
        check("a search with no hits says so", page.locator("#svc-out .empty").count() == 1)

        # ------------------------------------------------------- the honesty
        open_at("#/service/l-veins")
        body_txt = page.inner_text(".screen")
        check("a consultation price says so, and offers the free 15 minutes",
              "At consultation" in body_txt and "free" in body_txt.lower())
        check("a consultation has no Book button with a total",
              page.locator('a[href^="#/book?s=l-consult"]').count() == 1)
        open_at("#/service/f-hydra")
        check("an unpublished length is marked as an estimate", "≈" in page.inner_text(".screen"))
        check("and says the length is confirmed at booking",
              "confirmed when you book" in page.inner_text(".screen").lower())
        open_at("#/service/f-needle")
        check("a published length is printed plainly",
              "1 hr 30 min" in page.inner_text(".screen") and "≈" not in page.inner_text(".price-badge"))
        shot("04-service")

        open_at("#/you")
        check("the club is labelled as a proposal",
              "proposal from Alpha Agency" in page.inner_text(".screen"))
        open_at("#/")
        check("the preview says nothing reaches the spa",
              "nothing here reaches the spa" in page.inner_text(".foot").lower())
        check("Alpha's mark is in the footer",
              "alpha agency" in page.inner_text(".foot-alpha").lower(),
              page.inner_text(".foot-alpha"))

        # ------------------------------------------------------- the booking
        page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        open_at("#/book", ".steps")
        shot("05-book-1")
        check("step 1 of 6", "STEP 1 OF 6" in page.inner_text(".step-kicker").upper())
        check("continue is disabled with an empty basket",
              page.get_attribute("#bookdock button", "disabled") is not None)
        page.click('.row[data-id="f-phyto"]')
        page.wait_for_timeout(400)
        check("a chosen treatment shows in the visit", "Phytomer Facial" in page.inner_text("#chosen"))
        check("the dock shows its price", "$85" in page.inner_text("#bookdock"))
        check("one treatment is singular", "1 treatment" in page.inner_text("#bookdock")
              and "1 treatments" not in page.inner_text("#bookdock"), page.inner_text("#bookdock"))
        check("the dock shows the time", "1 hr 15" in page.inner_text("#bookdock"))
        page.click('.chip[data-g="massage"]')
        page.wait_for_timeout(300)
        page.click('.row[data-id="m-60"]')
        page.wait_for_timeout(400)
        check("two treatments total correctly", "$185" in page.inner_text("#bookdock"),
              page.inner_text("#bookdock"))
        check("two treatments are plural", "2 treatments" in page.inner_text("#bookdock"))
        check("and their time adds up", "2 hr 15" in page.inner_text("#bookdock"),
              page.inner_text("#bookdock"))
        page.click("#bookdock button")
        page.wait_for_timeout(700)

        check("step 2 is the therapist", "/book/who" in page.evaluate("() => location.hash"))
        check("a basket no one person covers offers first-available",
              page.get_attribute('.person[data-t="any"]', "disabled") is None)
        check("and explains why the others are out",
              "different specialists" in page.inner_text(".screen"))
        check("a nail technician is not offered for a facial",
              page.get_attribute('.person[data-t="t-4"]', "disabled") is not None)
        shot("06-book-2")
        page.click('.person[data-t="any"]')
        page.wait_for_timeout(800)

        check("step 3 is the diary", "/book/when" in page.evaluate("() => location.hash"))
        check("the calendar opens", page.locator(".cal-day").count() >= 30)
        check("Sundays are shut", page.evaluate(
            "() => [...document.querySelectorAll('.cal-day')].some(d => d.classList.contains('closed') && d.disabled)"))
        check("continue waits for a time",
              page.get_attribute("#bookdock button", "disabled") is not None)
        page.wait_for_selector(".slot:not([disabled])", timeout=8000)
        slots = page.eval_on_selector_all(".slot", "els => els.map(e => e.textContent.trim())")
        check("no slot starts before the doors open",
              all(not s.startswith("8 ") and not s.startswith("7 ") for s in slots), str(slots[:4]))
        check("no slot runs past closing", all("8 PM" not in s and "9 PM" not in s for s in slots), str(slots[-4:]))
        first_free = page.locator(".slot:not([disabled])").first
        chosen_time = first_free.inner_text().strip()
        first_free.click()
        page.wait_for_timeout(500)
        check("choosing a time enables continue",
              page.get_attribute("#bookdock button", "disabled") is None)
        check("the dock shows the chosen time", chosen_time in page.inner_text("#bookdock"),
              page.inner_text("#bookdock"))
        shot("07-book-3")
        page.click("#bookdock button")
        page.wait_for_timeout(700)

        check("step 4 is who you are", "/book/details" in page.evaluate("() => location.hash"))
        page.click("#bookdock button")
        page.wait_for_timeout(500)
        check("an empty name is refused", page.locator(".field.bad").count() >= 1)
        check("and says why", "need a name" in page.inner_text(".screen").lower())
        page.fill("#f-name", "Camille Tremblay")
        page.fill("#f-phone", "5145551234")
        page.fill("#f-email", "not-an-email")
        page.click("#bookdock button")
        page.wait_for_timeout(500)
        check("a broken email is refused", "doesn't look right" in page.inner_text(".screen"))
        page.fill("#f-email", "camille@example.com")
        page.fill("#f-notes", "Shoulder is sore on the right.")
        shot("08-book-4")
        page.click("#bookdock button")
        page.wait_for_timeout(700)

        check("step 5 is health, and it comes before the money",
              "/book/health" in page.evaluate("() => location.hash"))
        page.click("#bookdock button")
        page.wait_for_timeout(500)
        check("the health declaration must be confirmed",
              "confirm the health declaration" in page.inner_text(".screen").lower())
        page.click('.row[data-flag="allergies"]')
        page.wait_for_timeout(300)
        check("ticking a flag opens the detail box",
              page.locator("#detail-wrap").is_visible())
        page.fill("#f-detail", "Latex.")
        page.click("[data-consent]")
        page.wait_for_timeout(300)
        shot("09-book-5")
        page.click("#bookdock button")
        page.wait_for_timeout(700)

        check("step 6 is the money", "/book/confirm" in page.evaluate("() => location.hash"))
        receipt = page.inner_text(".receipt")
        check("the receipt lists both treatments", "Phytomer Facial" in receipt and "Massage" in receipt)
        check("the receipt totals $185", "$185" in receipt, receipt)
        check("it says what the visit earns", "185 points" in page.inner_text(".screen"))
        check("a deposit is mentioned above the threshold", "card is taken" in page.inner_text(".screen"))
        check("the cancellation window is stated", "24 hours before" in page.inner_text(".screen"))
        page.fill("#f-promo", "NOPE")
        page.click("[data-promo]")
        page.wait_for_timeout(400)
        check("an unknown promo code is refused", "don't recognise" in page.inner_text(".screen"))
        page.fill("#f-promo", "SAHEL10")
        page.click("[data-promo]")
        page.wait_for_timeout(800)
        check("a good promo code comes off the total", "$175" in page.inner_text(".receipt"),
              page.inner_text(".receipt"))
        shot("10-book-6")
        page.click("#bookdock button")
        page.wait_for_timeout(1200)

        check("the booking lands", "/booked/" in page.evaluate("() => location.hash"),
              page.evaluate("() => location.hash"))
        check("a reference is shown", re.match(r"SAH-[A-Z0-9]{4}", page.inner_text(".ref-chip").strip()) is not None)
        check("the dock is gone once it is booked", not page.locator("#bookdock").is_visible())
        shot("11-booked")

        stored = page.evaluate("() => JSON.parse(localStorage.getItem('sahel.member') || '{}')")
        check("the booking is recorded", len(stored.get("bookings", [])) == 1)
        check("it is confirmed, not completed", stored["bookings"][0]["status"] == "confirmed")
        check("no points are credited before the visit", stored.get("points") == 100,
              str(stored.get("points")))
        check("the promo is kept with the booking", stored["bookings"][0].get("promo") == "SAHEL10")
        check("the health answers are kept", (stored["bookings"][0].get("health") or {}).get("flags") == ["allergies"])
        check("the draft is cleared", not json.loads(
            page.evaluate("() => localStorage.getItem('sahel.draft') || '{}'")).get("items"))

        # the .ics really downloads
        with page.expect_download(timeout=8000) as dl:
            page.click("[data-ics]")
        download = dl.value
        ics = pathlib.Path(download.path()).read_text(errors="replace")
        check("the calendar file is a real VEVENT", "BEGIN:VEVENT" in ics and "DTSTART:" in ics)
        check("with the spa's address", "Saint-Catherine" in ics)
        check("and the reference", stored["bookings"][0]["ref"] in ics)

        # ------------------------------------------------------------- club
        open_at("#/you")
        check("the member is known now", "Camille" in page.inner_text(".screen"))
        check("the tier ring is drawn", page.locator(".ring .val").count() == 1)
        check("the appointment is listed as upcoming",
              page.locator('.list a[href^="#/appointment/"]').count() >= 1)
        shot("12-you")

        # a reward leaves the balance, and comes back with a cancellation
        page.evaluate("() => { const m = JSON.parse(localStorage.getItem('sahel.member'));"
                      " m.points = 1200; m.lifetime = 1200; localStorage.setItem('sahel.member', JSON.stringify(m)); }")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".screen")
        page.wait_for_timeout(700)
        check("a tier is reached at 1200", "Horizon" in page.inner_text(".screen"))
        page.click('[data-redeem="r-sauna"]')
        page.wait_for_timeout(600)
        page.click(".sheet [data-yes]")
        page.wait_for_timeout(900)
        after = page.evaluate("() => JSON.parse(localStorage.getItem('sahel.member'))")
        check("redeeming spends the points", after["points"] == 950, str(after["points"]))
        check("the voucher waits in the wallet", len(after["wallet"]) == 1)
        check("lifetime points do not fall", after["lifetime"] == 1200, str(after["lifetime"]))

        appt = page.get_attribute('.list a[href^="#/appointment/"]', "href")
        open_at(appt.lstrip("#") and appt)
        check("the appointment opens", page.locator(".receipt").count() == 1)
        page.click("[data-cancel]")
        page.wait_for_timeout(700)
        page.click(".sheet [data-yes]")
        page.wait_for_timeout(900)
        gone = page.evaluate("() => JSON.parse(localStorage.getItem('sahel.member'))")
        check("cancelling marks it cancelled",
              gone["bookings"][0]["status"] == "cancelled", gone["bookings"][0]["status"])
        check("no points are credited for a cancelled visit", gone["points"] == 950, str(gone["points"]))

        # a visit in the past settles itself and pays out
        page.evaluate("""() => {
          const m = JSON.parse(localStorage.getItem('sahel.member'));
          m.bookings = [{ id: 'x1', ref: 'SAH-TEST', when: Date.now() - 7200000, items: [{ id: 'm-60' }],
            therapist: 'any', total: 100, minutes: 60, points: 100, status: 'confirmed', made: 0 }];
          m.points = 0; m.lifetime = 0;
          localStorage.setItem('sahel.member', JSON.stringify(m)); }""")
        open_at("#/you")
        settled = page.evaluate("() => JSON.parse(localStorage.getItem('sahel.member'))")
        check("a visit that has been and gone settles itself",
              settled["bookings"][0]["status"] == "completed", settled["bookings"][0]["status"])
        check("and its points land", settled["points"] == 100, str(settled["points"]))
        check("it moves to past visits",
              "past visits" in page.inner_text(".screen").lower())

        # -------------------------------------------------------- the hold
        page.evaluate("() => localStorage.clear()")
        open_at("#/book")
        page.click('.row[data-id="f-micro"]')
        page.wait_for_timeout(300)
        page.click("#bookdock button")
        page.wait_for_timeout(600)
        page.click('.person[data-t="any"]')
        page.wait_for_timeout(800)
        page.wait_for_selector(".slot:not([disabled])")
        page.locator(".slot:not([disabled])").first.click()
        page.wait_for_timeout(400)
        # wind the hold back past its expiry
        page.evaluate("""() => { const d = JSON.parse(localStorage.getItem('sahel.draft'));
          d.heldAt = Date.now() - 11 * 60000;
          d.name = 'Test'; d.phone = '5145551234'; d.email = 't@example.com';
          d.health = { flags: [], detail: '', consent: true };
          localStorage.setItem('sahel.draft', JSON.stringify(d)); }""")
        open_at("#/book/confirm", ".step-head")
        check("an expired hold is called out", "hold expired" in page.inner_text(".screen").lower(),
              page.inner_text(".screen")[:160])

        # changing the basket drops a held slot, because the visit got longer
        page.evaluate("() => localStorage.clear()")
        open_at("#/book")
        page.click('.row[data-id="f-micro"]')
        page.wait_for_timeout(250)
        page.evaluate("""() => { const d = JSON.parse(localStorage.getItem('sahel.draft'));
          d.day = '2030-01-02'; d.slot = 600; d.heldAt = Date.now();
          localStorage.setItem('sahel.draft', JSON.stringify(d)); }""")
        open_at("#/book")
        page.click('.row[data-id="f-peel"]')
        page.wait_for_timeout(350)
        after_add = page.evaluate("() => JSON.parse(localStorage.getItem('sahel.draft'))")
        check("adding a treatment releases the held slot", after_add["slot"] is None, str(after_add["slot"]))

        # ------------------------------------------------------------ French
        page.evaluate("() => localStorage.clear()")
        open_at("#/")
        page.click("#lang-pill")
        page.wait_for_timeout(900)
        check("the page language switches", page.evaluate("() => document.documentElement.lang") == "fr")
        home_fr = page.inner_text(".screen")
        check("the hero is in French", "Offrez-vous un moment de" in home_fr)
        check("the tagline is in French", "Détente" in home_fr)
        check("the tabs are in French", "Réserver" in page.inner_text("#tabbar"))
        check("the mission is in French", "Chaque cliente" in home_fr)
        shot("13-home-fr")

        open_at("#/group/face")
        fr = page.inner_text(".screen")
        check("prices use the Quebec form", re.search(r"\d+[\u00a0\u202f ]\$", fr) is not None,
              repr(fr[:160]))
        check("the figure and its dollar sign cannot break apart",
              "\u00a0$" in fr, repr([x for x in fr if x == "\u00a0"][:1]))
        check("and not the English form", "$140" not in fr)
        check("treatment names are translated", "Soin du visage Phytomer" in fr)
        open_at("#/service/f-needle")
        fr2 = page.inner_text(".screen")
        check("durations use h, not hr", re.search(r"1[\u00a0 ]h[\u00a0 ]30", fr2) is not None, repr(fr2[:200]))
        check("no English durations survive", "hr" not in fr2)

        open_at("#/book")
        check("the booking is in French", "Que souhaitez-vous" in page.inner_text(".screen"))
        page.click('.row[data-id="f-micro"]')
        page.wait_for_timeout(400)
        check("one treatment is singular in French too", "1 soin" in page.inner_text("#bookdock")
              and "1 soins" not in page.inner_text("#bookdock"), page.inner_text("#bookdock"))
        page.click('.row[data-id="f-micro"]')
        page.wait_for_timeout(300)
        check("the step counter is in French", "ÉTAPE 1 SUR 6" in page.inner_text(".step-kicker").upper())
        page.click('.row[data-id="f-phyto"]')
        page.wait_for_timeout(300)
        page.click("#bookdock button")
        page.wait_for_timeout(600)
        page.click('.person[data-t="any"]')
        page.wait_for_timeout(800)
        times = page.eval_on_selector_all(".slot", "els => els.map(e => e.textContent.trim())")
        check("times use the 24-hour clock in French",
              all(("AM" not in x and "PM" not in x) for x in times)
              and any(re.search(r"\d[\u00a0 ]h", x) for x in times), repr(times[:4]))
        shot("14-book-fr")

        # nothing English left on a French screen
        open_at("#/you")
        leftover = [w for w in ("Settings", "Rewards", "Upcoming", "Appearance", "Language")
                    if w in page.inner_text(".screen")]
        check("no English strings left on the French profile", not leftover, str(leftover))

        page.click("#lang-pill")
        page.wait_for_timeout(700)
        check("switching back returns to English",
              page.evaluate("() => document.documentElement.lang") == "en")

        # ---------------------------------------------------- hash-router traps
        open_at("#/services")
        page.click('.gtile[href="#/group/face"]')
        page.wait_for_timeout(700)
        page.go_back()
        page.wait_for_timeout(700)
        page.click('.gtile[href="#/group/face"]')
        page.wait_for_timeout(700)
        check("a second visit renders once, not twice",
              page.locator(".screen").count() == 1, str(page.locator(".screen").count()))
        check("and lands on the right screen", "Facial Treatments" in page.inner_text(".screen"))

        page.evaluate("() => localStorage.removeItem('sahel.draft')")
        open_at("#/book")
        page.click('.row[data-id="f-micro"]')
        page.wait_for_timeout(300)
        check("the basket holds only what was just chosen",
              page.evaluate("() => JSON.parse(localStorage.getItem('sahel.draft')).items.length") == 1)
        page.click("#bookdock button")
        page.wait_for_timeout(600)
        page.click('.person[data-t="any"]')
        page.wait_for_timeout(700)
        page.go_back()
        page.wait_for_timeout(700)
        check("back walks the booking backwards", "/book/who" in page.evaluate("() => location.hash"),
              page.evaluate("() => location.hash"))
        check("and the basket survives it",
              page.evaluate("() => JSON.parse(localStorage.getItem('sahel.draft')).items.length") == 1,
              page.evaluate("() => localStorage.getItem('sahel.draft')"))

        # a screen reached from a photograph must not keep the last one's chrome
        open_at("#/service/m-60")
        check("a photo screen asks for white chrome",
              page.evaluate("() => document.getElementById('topbar').dataset.tone") == "dark")
        page.click(".tab[data-tab=you]")
        page.wait_for_timeout(800)
        check("and the next screen takes it back",
              page.evaluate("() => document.getElementById('topbar').dataset.tone") == "light")

        # ------------------------------------------------------------ contrast
        for route, name in (("#/", "home"), ("#/services", "services"), ("#/book", "book"), ("#/you", "you")):
            open_at(route)
            bad = page.evaluate(CONTRAST_JS, ".row-title, .row-sub, .lede, .step-sub, .tile-name, .meta, .sec-head h2, .foot-lines, p, small")
            check(f"contrast holds on {name} (light)", not bad, json.dumps(bad[:3]))

        page.emulate_media(color_scheme="dark")
        page.wait_for_timeout(400)
        for route, name in (("#/", "home"), ("#/services", "services"), ("#/book", "book"), ("#/you", "you")):
            open_at(route)
            bad = page.evaluate(CONTRAST_JS, ".row-title, .row-sub, .lede, .step-sub, .tile-name, .meta, .sec-head h2, .foot-lines, p, small")
            check(f"contrast holds on {name} (dark)", not bad, json.dumps(bad[:3]))
        open_at("#/")
        shot("15-home-dark")
        check("dark mode really is dark", page.evaluate(
            "() => getComputedStyle(document.body).backgroundColor") in ("rgb(11, 12, 14)",))
        page.emulate_media(color_scheme="light")

        # ---------------------------------------------------------- no overflow
        for route in ("#/", "#/services", "#/book", "#/you", "#/group/wax", "#/service/m-60", "#/package/p-sublime"):
            open_at(route)
            over = page.evaluate("() => document.documentElement.scrollWidth - innerWidth")
            check(f"{route} does not scroll sideways", over <= 1, f"{over}px")

        # ------------------------------------------------------------- a11y
        open_at("#/")
        check("tabs are labelled", page.eval_on_selector_all(
            ".tab", "els => els.every(e => e.getAttribute('aria-label'))"))
        check("the language pill is labelled", bool(page.get_attribute("#lang-pill", "aria-label")))
        check("images carry alt text", page.eval_on_selector_all(
            "img", "els => els.every(e => e.hasAttribute('alt'))"))
        check("one h1 per screen", page.locator(".screen h1").count() <= 1,
              str(page.locator(".screen h1").count()))
        check("the toast is a live region", page.get_attribute("#toast", "aria-live") == "polite")

        # ------------------------------------------------------------- wide
        wide = browser.new_context(viewport={"width": 1280, "height": 900})
        wpage = wide.new_page()
        wpage.goto(BASE + "#/", wait_until="domcontentloaded")
        wpage.wait_for_selector(".hero", timeout=15000)
        wpage.wait_for_timeout(1200)
        check("the wide layout centres its column", wpage.evaluate(
            "() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect();"
            " return Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 3; }"))
        check("the wide layout does not scroll sideways",
              wpage.evaluate("() => document.documentElement.scrollWidth - innerWidth") <= 1)
        wpage.screenshot(path=str(SHOTS / "16-wide.png"))
        wide.close()

        # ------------------------------------------------ reduced motion
        rm = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                                 has_touch=True, user_agent=IPHONE, reduced_motion="reduce")
        rpage = rm.new_page()
        rpage.goto(BASE + "#/", wait_until="domcontentloaded")
        rpage.wait_for_selector(".hero", timeout=15000)
        rpage.wait_for_timeout(1200)
        check("reduced motion still shows the revealed sections", rpage.evaluate(
            "() => [...document.querySelectorAll('.reveal')].every(e => getComputedStyle(e).opacity === '1')"))
        rm.close()


        # ========================================================= the nav
        # Every check below was a bug a client could see. The fold hid three
        # tabs inside a capsule that never narrowed; the lens sat six pixels off
        # its tab; the bar painted white type on white glass over the hero; hover
        # stuck on touch and, after the tap reflowed the list, sat on a row that
        # had not been tapped; reschedule bounced to an empty step one.
        nav = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True, user_agent=IPHONE)
        npg = nav.new_page()
        nav_errors: list[str] = []
        npg.on("pageerror", lambda e: nav_errors.append(str(e)))

        def cold(route, wait=".screen"):
            npg.goto("about:blank")
            npg.goto(BASE + route, wait_until="domcontentloaded")
            npg.wait_for_selector(wait, timeout=20000)
            npg.wait_for_timeout(1300)

        def to(y):
            npg.evaluate(f"() => window.scrollTo({{ top: {y}, behavior: 'instant' }})")
            npg.wait_for_timeout(650)

        def fold():
            to(0)
            npg.mouse.wheel(0, 500)
            npg.wait_for_timeout(250)
            npg.mouse.wheel(0, 1300)
            npg.wait_for_timeout(900)

        for route, tab in (("#/", "home"), ("#/services", "services"), ("#/book", "book"), ("#/you", "you")):
            cold(route)
            g = npg.evaluate(GEO_JS)
            check(f"[{tab}] the open capsule is its tabs plus padding", abs(g["capW"] - (g["sumTabs"] + 12)) <= 1.5, g)
            check(f"[{tab}] capsule and call button centred together",
                  abs((g["capL"] + g["callR"]) / 2 - g["vw"] / 2) <= 2, g)
            check(f"[{tab}] the lens sits exactly on its tab",
                  abs(g["lensL"] - g["curL"]) <= 1 and abs(g["lensW"] - g["curW"]) <= 1, g)

        npg.goto("about:blank")
        npg.goto(BASE + "#/you", wait_until="domcontentloaded")
        npg.wait_for_function("() => document.getElementById('tabbar')?.dataset.ready === '1'"
                              " && document.querySelector('.tab[data-tab=you]').getAttribute('aria-current') === 'page'",
                              timeout=20000)
        drift = []
        for _ in range(15):
            drift.append(npg.evaluate("() => Math.round(document.getElementById('tabs-lens').getBoundingClientRect().left"
                                      " - document.querySelector('.tab[data-tab=you]').getBoundingClientRect().left)"))
            npg.wait_for_timeout(40)
        check("a deep link places the lens, it does not fly in", max(abs(x) for x in drift) <= 1, drift)

        for route, label in (("#/", "home"), ("#/services", "services")):
            cold(route)
            fold()
            g = npg.evaluate(GEO_JS)
            check(f"[{label}] the bar folds", g["min"], g)
            check(f"[{label}] the folded capsule hugs its one tab", abs(g["capW"] - (g["curW"] + 12)) <= 1.5, g)
            check(f"[{label}] and sits at the leading edge", abs(g["capL"] - 16) <= 1.5, g["capL"])
            check(f"[{label}] with the call button at the trailing edge", abs(g["callR"] - (g["vw"] - 16)) <= 1.5, g["callR"])
            check(f"[{label}] the folded lens stays on the tab", abs(g["lensL"] - g["curL"]) <= 1, g)
            if label == "home":
                npg.screenshot(path=str(SHOTS / "17-folded-bar.png"))
            npg.mouse.wheel(0, -600)
            npg.wait_for_timeout(900)
            g = npg.evaluate(GEO_JS)
            check(f"[{label}] it opens back to full width, centred",
                  not g["min"] and abs(g["capW"] - (g["sumTabs"] + 12)) <= 1.5
                  and abs((g["capL"] + g["callR"]) / 2 - g["vw"] / 2) <= 2, g)

        cold("#/")
        clash = []
        for y in range(0, 1101, 50):
            to(y)
            st = npg.evaluate("() => { const t = document.getElementById('topbar');"
                              " return { y: scrollY, lifted: t.dataset.lifted, tone: t.dataset.tone,"
                              " title: +getComputedStyle(document.getElementById('tb-title')).opacity }; }")
            if (st["lifted"] == "1" and st["tone"] == "dark") or (st["tone"] == "dark" and st["title"] > .05):
                clash.append(st)
        check("over the hero the bar is never glass and white at once", not clash, clash[:3])
        to(900)
        check("past the hero the bar is glass, dark and titled", npg.evaluate(
            "() => { const t = document.getElementById('topbar');"
            " return t.dataset.lifted === '1' && t.dataset.tone === 'light' && t.dataset.titled === '1'; }"))

        cold("#/services")
        to(6)
        check("a plain page takes material as soon as content passes under",
              npg.evaluate("() => document.getElementById('topbar').dataset.lifted") == "1")
        check("the compact title waits for the page title",
              npg.evaluate("() => document.getElementById('topbar').dataset.titled") == "0")
        to(140)
        check("then arrives", npg.evaluate("() => document.getElementById('topbar').dataset.titled") == "1")
        off = npg.evaluate("() => { const r = document.getElementById('tb-title').getBoundingClientRect();"
                           " return (r.left + r.right) / 2 - innerWidth / 2; }")
        check("the bar title is centred on the screen", abs(off) <= 1, off)
        check("the bar title is not a second heading", npg.evaluate("() => document.getElementById('tb-title').tagName") != "H1")

        for route in ("#/", "#/book", "#/you"):
            cold(route)
            npg.evaluate("() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'))")
            npg.wait_for_timeout(900)
            broken = npg.evaluate(ALL_GLASS_JS)
            check(f"{route}: every glass element, chrome or page, really blurs", not broken, broken[:4])
        check("a screen keeps no transform after its entry",
              npg.evaluate("() => getComputedStyle(document.querySelector('.screen')).transform") == "none")

        npg.evaluate("() => localStorage.removeItem('sahel.draft')")
        cold("#/book")
        check("a touch screen gets no hover", npg.evaluate("() => matchMedia('(hover: hover)').matches") is False)
        edge = npg.evaluate("() => { const c = document.querySelector('.chips').getBoundingClientRect(); return [c.left, c.right, innerWidth]; }")
        check("the chips strip runs edge to edge", abs(edge[0]) <= 1 and abs(edge[1] - edge[2]) <= 1, edge)
        check("no badge on an empty basket",
              not npg.evaluate("() => document.querySelector('.tab[data-tab=book] .tab-badge').classList.contains('on')"))
        before = npg.locator('.row[data-id="f-micro"]').bounding_box()["y"]
        npg.click('.row[data-id="f-micro"]')
        npg.wait_for_timeout(500)
        after = npg.locator('.row[data-id="f-micro"]').bounding_box()["y"]
        check("a tapped row stays under the finger", abs(after - before) <= 2, f"{before:.1f} -> {after:.1f}")
        box = npg.evaluate("() => { const i = document.querySelector('#chosen .row-ico img'); const r = i.getBoundingClientRect(),"
                           " b = i.parentElement.getBoundingClientRect(); return [r.width, r.height, b.width, b.height]; }")
        check("the visit thumbnail fills its box", abs(box[0] - box[2]) <= 1 and abs(box[1] - box[3]) <= 1, box)
        check("the Book tab counts the basket", npg.evaluate(
            "() => { const b = document.querySelector('.tab[data-tab=book] .tab-badge'); return b.classList.contains('on') && b.textContent === '1'; }"))
        stuck = npg.evaluate("() => [...document.querySelectorAll('#g-list .row')].map(r => getComputedStyle(r).backgroundColor)"
                             ".filter(c => c.includes('253, 139, 1'))")
        check("no hover wash is left behind by a tap", not stuck, stuck)
        npg.evaluate("() => import('./js/ui.js').then(m => m.toast('Overlap probe'))")
        npg.wait_for_timeout(600)
        hits = npg.evaluate("() => { const t = document.getElementById('toast').getBoundingClientRect();"
                            " const over = (s) => { const r = document.querySelector(s).getBoundingClientRect();"
                            " return t.bottom > r.top && t.top < r.bottom && t.right > r.left && t.left < r.right; };"
                            " return { dock: over('#bookdock'), tabs: over('#tabs'), topbar: over('#topbar') }; }")
        check("a toast lands on neither the dock nor either bar", not any(hits.values()), hits)

        cold("#/service/f-peel")
        npg.click("[data-add]")
        npg.wait_for_timeout(400)
        first = npg.inner_text("#toast")
        npg.click("[data-add]")
        npg.wait_for_timeout(400)
        second = npg.inner_text("#toast")
        check("Add says it was added", "Added" in first, first)
        check("tapping Added takes it out again, and says so", "Removed" in second and npg.evaluate(
            "() => !JSON.parse(localStorage.getItem('sahel.draft')).items.some(i => i.id === 'f-peel')"), second)

        npg.evaluate("""() => {
          localStorage.removeItem('sahel.draft');
          const d = new Date(); d.setDate(d.getDate() + 6); d.setHours(11, 0, 0, 0);
          if (d.getDay() === 0) d.setDate(d.getDate() + 1);
          localStorage.setItem('sahel.member', JSON.stringify({ v: 1, name: 'Test Guest', phone: '5145551234',
            email: 't@example.com', joined: Date.now(), points: 100, lifetime: 100, wallet: [], prefs: {},
            health: null, referral: 'TEST123', bookings: [
              { id: 'mv', ref: 'SAH-MOVE', when: d.getTime(), items: [{ id: 'f-phyto' }], therapist: 'any',
                total: 85, minutes: 75, points: 85, status: 'confirmed', made: 0 },
              { id: 'soon', ref: 'SAH-SOON', when: Date.now() + 3 * 3600000, items: [{ id: 'f-micro' }], therapist: 'any',
                total: 60, minutes: 30, points: 60, status: 'confirmed', made: 0 }] })); }""")
        cold("#/appointment/mv")
        was = npg.evaluate("() => JSON.parse(localStorage.getItem('sahel.member')).bookings[0].when")
        npg.click("[data-resched]")
        npg.wait_for_timeout(1500)
        check("reschedule opens the diary carrying the appointment",
              "/book/when?r=mv" in npg.evaluate("() => location.hash"), npg.evaluate("() => location.hash"))
        check("the diary names what is being moved", "SAH-MOVE" in npg.inner_text(".step-head"))
        check("the time already held is marked as yours", npg.locator(".slot.current").count() == 1)
        check("moving a visit is not a basket", not npg.evaluate(
            "() => document.querySelector('.tab[data-tab=book] .tab-badge').classList.contains('on')"))
        npg.screenshot(path=str(SHOTS / "18-reschedule.png"))
        open_slots = npg.locator(".slot:not([disabled])")
        if open_slots.count() == 0:
            npg.locator(".cal-day:not([disabled])").nth(1).click()
            npg.wait_for_timeout(700)
            open_slots = npg.locator(".slot:not([disabled])")
        open_slots.first.click()
        npg.wait_for_timeout(400)
        check("the dock offers to move it", "Move it here" in npg.inner_text("#bookdock"), npg.inner_text("#bookdock"))
        npg.click("#bookdock button")
        npg.wait_for_timeout(1300)
        moved = npg.evaluate("() => JSON.parse(localStorage.getItem('sahel.member')).bookings[0]")
        check("the appointment really moves", moved["when"] != was and moved["status"] == "confirmed", moved)
        check("and you land back on it", npg.evaluate("() => location.hash") == "#/appointment/mv")
        check("with nothing left half-done in the draft",
              not json.loads(npg.evaluate("() => localStorage.getItem('sahel.draft') || '{}'")).get("reschedule"))
        cold("#/appointment/soon")
        npg.click("[data-resched]")
        npg.wait_for_timeout(700)
        check("inside the 24-hour window, moving it asks for a call",
              npg.locator(".sheet.on").count() == 1 and "call" in npg.inner_text(".sheet").lower())
        check("an open sheet holds the page still", npg.evaluate(
            "() => document.documentElement.classList.contains('sheet-open')"
            " && getComputedStyle(document.documentElement).overflow === 'hidden'"))
        npg.keyboard.press("Escape")
        npg.wait_for_timeout(500)
        check("closing it lets go", not npg.evaluate("() => document.documentElement.classList.contains('sheet-open')"))

        cold("#/")
        npg.click("#lang-pill")
        npg.wait_for_timeout(900)
        heights = npg.evaluate("() => [...document.querySelectorAll('.quick .ql')].map(e => Math.round(e.getBoundingClientRect().height))")
        check("French quick actions share one label height", len(set(heights)) == 1, heights)
        npg.click("#lang-pill")
        npg.wait_for_timeout(700)
        npg.evaluate("() => localStorage.removeItem('sahel.draft')")
        cold("#/book")
        npg.click('.row[data-id="f-micro"]')
        npg.wait_for_timeout(300)
        npg.click("#bookdock button")
        npg.wait_for_timeout(700)
        npg.click('.person[data-t="any"]')
        npg.wait_for_timeout(1300)
        npg.locator(".slot:not([disabled])").first.click()
        npg.wait_for_timeout(300)
        npg.click("#bookdock button")
        npg.wait_for_timeout(800)
        check("the email placeholder is English in English",
              npg.get_attribute("#f-email", "placeholder") == "name@example.com")
        check("no page errors across the nav walk", not nav_errors, "; ".join(nav_errors[:3]))
        nav.close()

        dark = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                                   has_touch=True, user_agent=IPHONE, color_scheme="dark")
        npg = dark.new_page()
        cold("#/services")
        shadow = npg.evaluate("() => getComputedStyle(document.getElementById('tabs-lens')).boxShadow")
        check("the dark lens takes the dark edge, not the light shadow", "inset" in shadow and "16, 20, 28" not in shadow, shadow)
        fold()
        g = npg.evaluate(GEO_JS)
        check("dark: the folded capsule hugs its tab", abs(g["capW"] - (g["curW"] + 12)) <= 1.5, g)
        npg.screenshot(path=str(SHOTS / "19-folded-dark.png"))
        dark.close()

        desk = browser.new_context(viewport={"width": 1280, "height": 900})
        npg = desk.new_page()
        cold("#/book")
        npg.click('.row[data-id="f-micro"]')
        npg.wait_for_timeout(300)
        npg.click("#bookdock button")
        npg.wait_for_timeout(700)
        npg.click('.person[data-t="any"]')
        npg.wait_for_timeout(1300)
        cal = npg.evaluate("() => { const c = document.getElementById('cal'), s = c.querySelector('[aria-pressed=true]');"
                           " const cr = c.getBoundingClientRect(), sr = s.getBoundingClientRect();"
                           " const h = document.querySelector('.step-head').getBoundingClientRect(), w = document.querySelector('.wrap').getBoundingClientRect();"
                           " return { visible: sr.left >= cr.left - 1 && sr.right <= cr.right + 1, head: h.left, wrap: w.left }; }")
        check("desktop: the chosen day is in view", cal["visible"], cal)
        check("desktop: the booking header sits in the content column", abs(cal["head"] - cal["wrap"]) <= 1, cal)
        desk.close()

        noisy = [e for e in errors if "favicon" not in e.lower() and "sw.js" not in e.lower()]
        check("no console errors", not noisy, "; ".join(noisy[:3]))

        browser.close()

    print(f"\n  {len(PASS)} passed, {len(FAIL)} failed   ({BASE})")
    if FAIL:
        print("\n  FAILED")
        for f in FAIL:
            print("   ·", f)
        sys.exit(1)
    print(f"  screenshots → {SHOTS.relative_to(ROOT)}/\n")


def price_list():
    """Read data.js and build {(family, display name): price} for both languages,
    so the check runs against the catalogue rather than a second copy of it.

    Keyed by family on purpose: "Face" is $25 waxed and $30 threaded, "Eyebrows"
    $15 and $12, "Chin or Upper Lip" $10 and $5. A name-only key silently checks
    three prices against the wrong one."""
    src = (ROOT / "js" / "data.js").read_text(encoding="utf-8")
    out: dict[str, object] = {}
    for m in re.finditer(r'S\("([\w-]+)",\s*"(\w+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*'
                         r'(null|\d+),\s*(null|\d+)(.*?)\),\n', src, re.S):
        _id, _group, en, fr, price, _dur, extra = m.groups()
        val: object
        if "free: true" in extra:
            val = 0
        elif price == "null":
            val = "quoted"
        else:
            val = int(price)
        out[(_group, en.replace('\\"', '"'))] = val
        out[(_group, fr.replace('\\"', '"'))] = val
    return out


if __name__ == "__main__":
    main()
