// Two languages, English first.
//
// Spa Sahel is on Saint-Catherine and serves Montreal in both, so French is not
// a courtesy translation — it is half the room. The French here follows Quebec
// convention: a narrow space before ! ? : and », the dollar sign after the
// figure (65 $), 24-hour clock, "h" for the hour (14 h 30).
//
// Anything in data.js carries its own {en, fr}; `tr()` picks from those. The
// dictionary below is the interface around them.

import { STORAGE } from "./config.js";

const KEY = STORAGE + "lang";
export const LANGS = ["en", "fr"];
let lang = "en";

const DICT = {
  /* ------------------------------------------------------------ chrome */
  "tab.home": ["Home", "Accueil"],
  "tab.services": ["Services", "Soins"],
  "tab.book": ["Book", "Réserver"],
  "tab.you": ["You", "Profil"],
  "nav.back": ["Back", "Retour"],
  "nav.close": ["Close", "Fermer"],
  "nav.done": ["Done", "Terminé"],
  "nav.cancel": ["Cancel", "Annuler"],
  "nav.save": ["Save", "Enregistrer"],
  "nav.continue": ["Continue", "Continuer"],
  "nav.language": ["Language", "Langue"],

  /* -------------------------------------------------------------- home */
  "home.greet.morning": ["Good morning", "Bonjour"],
  "home.greet.afternoon": ["Good afternoon", "Bon après-midi"],
  "home.greet.evening": ["Good evening", "Bonsoir"],
  "home.hero.line": ["Give yourself a moment of", "Offrez-vous un moment de"],
  "home.hero.cta": ["Book an appointment", "Prendre rendez-vous"],
  "home.hero.scroll": ["Explore", "Explorer"],
  "home.open.now": ["Open now", "Ouvert"],
  "home.open.until": ["Open until {t}", "Ouvert jusqu'à {t}"],
  "home.open.soon": ["Opens at {t}", "Ouvre à {t}"],
  "home.open.closed": ["Closed today", "Fermé aujourd'hui"],
  "home.open.tomorrow": ["Closed · opens {d} at {t}", "Fermé · ouvre {d} à {t}"],
  "home.quick.book": ["Book", "Réserver"],
  "home.quick.call": ["Call", "Appeler"],
  "home.quick.map": ["Directions", "Itinéraire"],
  "home.quick.gift": ["Gift card", "Carte-cadeau"],
  "home.next.title": ["Your next visit", "Votre prochaine visite"],
  "home.next.manage": ["Manage", "Gérer"],
  "home.featured": ["Most booked", "Les plus réservés"],
  "home.featured.sub": ["What our guests ask for", "Ce que nos clientes demandent"],
  "home.groups": ["Treatments", "Soins"],
  "home.groups.sub": ["Nine ways to spend an hour", "Neuf façons de passer une heure"],
  "home.packages": ["Packages", "Forfaits"],
  "home.packages.sub": ["Two or more treatments, at a better price", "Deux soins ou plus, à meilleur prix"],
  "home.club": ["Sahel Club", "Club Sahel"],
  "home.club.join": ["Join the club", "Rejoindre le club"],
  "home.club.pitch": ["A point for every dollar, a sauna on your birthday, and treatments that come back to you.",
                      "Un point par dollar, un sauna pour votre anniversaire, et des soins qui vous reviennent."],
  "home.club.balance": ["{n} points", "{n} points"],
  "home.about": ["Our mission", "Notre mission"],
  "home.about.body": [
    "Each guest receives a high quality spa experience by skilled and caring professionals in a tranquil environment that promotes stress reduction and life balance. We strive to create an oasis where you can leave the world behind and enter into a state of well-being.",
    "Chaque cliente reçoit une expérience spa de grande qualité, prodiguée par des professionnelles compétentes et attentionnées, dans un environnement paisible qui favorise la réduction du stress et l'équilibre de vie. Nous créons une oasis où vous pouvez laisser le monde derrière vous et entrer dans un état de bien-être."],
  "home.staff": ["Our team", "Notre équipe"],
  "home.staff.body": [
    "We care as a team about each other and seek to ensure that the experiences we create are received in an atmosphere of integrity, compassion and professionalism. Our massage therapists and beauticians are all graduates, qualified and passionate about their profession.",
    "Nous prenons soin les unes des autres et veillons à ce que les expériences que nous créons soient offertes dans un climat d'intégrité, de compassion et de professionnalisme. Nos massothérapeutes et esthéticiennes sont toutes diplômées, qualifiées et passionnées par leur métier."],
  "home.visit": ["Visit us", "Nous visiter"],
  "home.hours": ["Opening hours", "Heures d'ouverture"],
  "home.closed": ["Closed", "Fermé"],
  "home.install": ["Add Spa Sahel to your home screen", "Ajouter Spa Sahel à votre écran d'accueil"],
  "home.install.ios": ["Tap Share, then Add to Home Screen.", "Touchez Partager, puis Sur l'écran d'accueil."],
  "home.install.do": ["Add", "Ajouter"],

  /* ---------------------------------------------------------- services */
  "svc.title": ["Treatments", "Soins"],
  "svc.search": ["Search treatments", "Rechercher un soin"],
  "svc.all": ["All", "Tous"],
  "svc.packages": ["Packages", "Forfaits"],
  "svc.none": ["Nothing matches that.", "Aucun résultat."],
  "svc.count": ["{n} treatments", "{n} soins"],
  "svc.from": ["from {p}", "à partir de {p}"],
  "svc.free": ["Free", "Gratuit"],
  "svc.quoted": ["At consultation", "En consultation"],
  "svc.perSession": ["per session", "par séance"],
  "svc.min": ["{n} min", "{n} min"],
  "svc.approx": ["≈ {n} min", "≈ {n} min"],
  "svc.durNote": ["Length confirmed when you book", "Durée confirmée à la réservation"],
  "svc.book": ["Book this", "Réserver"],
  "svc.add": ["Add", "Ajouter"],
  "svc.added": ["Added", "Ajouté"],
  "svc.remove": ["Remove", "Retirer"],
  "svc.earn": ["Earn {n} points", "Gagnez {n} points"],
  "svc.consultFirst": ["Book the free consultation", "Réserver la consultation gratuite"],
  "svc.consultNote": ["Pricing for this is set with you at a free 15-minute consultation.",
                      "Le prix est établi avec vous lors d'une consultation gratuite de 15 minutes."],
  "svc.alsoIn": ["Also in", "Également dans"],
  "svc.includes": ["What's included", "Ce qui est inclus"],
  "svc.package.book": ["Book this package", "Réserver ce forfait"],
  "svc.package.choose": ["Choose an option", "Choisir une option"],
  "svc.package.value": ["Book separately: {p}", "Réservé séparément : {p}"],
  "svc.package.save": ["You save {p}", "Vous économisez {p}"],
  "svc.beforeTwo": ["Before 2 PM", "Avant 14 h"],

  /* ----------------------------------------------------------- booking */
  "bk.title": ["Book an appointment", "Prendre rendez-vous"],
  "bk.step": ["Step {n} of {m}", "Étape {n} sur {m}"],
  "bk.s1": ["Treatment", "Soin"],
  "bk.s2": ["With whom", "Avec qui"],
  "bk.s3": ["Date & time", "Date et heure"],
  "bk.s4": ["Your details", "Vos coordonnées"],
  "bk.s5": ["Health", "Santé"],
  "bk.s6": ["Confirm", "Confirmer"],
  "bk.pick": ["What would you like?", "Que souhaitez-vous ?"],
  "bk.pick.sub": ["Choose one, or stack up to {n} in a single visit.", "Choisissez-en un, ou jusqu'à {n} dans une même visite."],
  "bk.chosen": ["Your visit", "Votre visite"],
  "bk.empty": ["Nothing chosen yet", "Aucun soin choisi"],
  "bk.total": ["Total", "Total"],
  "bk.totalTime": ["Total time", "Durée totale"],
  "bk.who": ["Who would you like?", "Avec qui souhaitez-vous ?"],
  "bk.who.sub": ["Any of them can take this, and we will match you if you have no preference.",
                 "Chacune peut vous recevoir ; nous vous assignerons si vous n'avez pas de préférence."],
  "bk.who.busy": ["Not available for this treatment", "Non disponible pour ce soin"],
  "bk.who.split": ["We will pair you up", "Nous vous assignerons"],
  "bk.who.splitNote": ["Your treatments are handled by different specialists, so we assign the pair on the day.",
                       "Vos soins relèvent de spécialistes différentes ; nous formons le duo le jour même."],
  "bk.when": ["When suits you?", "Quand vous convient-il ?"],
  "bk.when.sub": ["We hold your slot for {n} minutes while you finish.", "Nous gardons votre créneau {n} minutes le temps de finir."],
  "bk.morning": ["Morning", "Matin"],
  "bk.afternoon": ["Afternoon", "Après-midi"],
  "bk.evening": ["Evening", "Soirée"],
  "bk.noslots": ["Nothing free that day. Try another.", "Rien de libre ce jour-là. Essayez un autre."],
  "bk.closedDay": ["We are closed on Sundays.", "Nous sommes fermés le dimanche."],
  "bk.tooSoon": ["Bookings open {n} hours ahead. Call us for anything sooner.",
                 "Les réservations ouvrent {n} heures à l'avance. Appelez-nous pour plus tôt."],
  "bk.you": ["Who are we expecting?", "Qui attendons-nous ?"],
  "bk.name": ["Full name", "Nom complet"],
  "bk.phone": ["Mobile number", "Téléphone mobile"],
  "bk.email": ["Email", "Courriel"],
  "bk.first": ["This is my first visit", "C'est ma première visite"],
  "bk.notes": ["Anything we should know?", "Quelque chose à nous signaler ?"],
  "bk.notes.ph": ["Pressure, a sore shoulder, a quiet room — tell us here.",
                  "Pression, une épaule douloureuse, une salle calme — dites-le ici."],
  "bk.remind": ["Text me a reminder the day before", "M'envoyer un rappel par texto la veille"],
  "bk.health": ["A few health questions", "Quelques questions de santé"],
  "bk.health.sub": ["Your therapist needs these before treatment. They stay on this device in the preview.",
                    "Votre thérapeute en a besoin avant le soin. Elles restent sur cet appareil dans cet aperçu."],
  "bk.h.pregnant": ["Pregnant or breastfeeding", "Enceinte ou allaitante"],
  "bk.h.allergies": ["Allergies — including latex, nuts or fragrance", "Allergies — dont latex, noix ou parfum"],
  "bk.h.meds": ["Taking medication, including Accutane or retinoids", "Prise de médicaments, dont Accutane ou rétinoïdes"],
  "bk.h.skin": ["A skin condition — eczema, psoriasis, rosacea", "Une affection cutanée — eczéma, psoriasis, rosacée"],
  "bk.h.recent": ["Sun, self-tanner or waxing in the last two weeks", "Soleil, autobronzant ou épilation dans les deux dernières semaines"],
  "bk.h.circulatory": ["Heart, blood pressure or circulatory condition", "Trouble cardiaque, de tension ou circulatoire"],
  "bk.h.detail": ["Tell us more", "Précisez"],
  "bk.h.none": ["None of these apply to me", "Aucune de ces situations ne s'applique"],
  "bk.consent": ["I confirm the above is accurate and I have read the consent form.",
                 "Je confirme l'exactitude de ces informations et j'ai lu le formulaire de consentement."],
  "bk.consent.link": ["Read the consent form", "Lire le formulaire de consentement"],
  "bk.review": ["Check it over", "Vérifiez le tout"],
  "bk.deposit": ["A card is taken at the spa for visits over {p}. Nothing is charged now.",
                 "Une carte est demandée au spa pour les visites de plus de {p}. Rien n'est débité maintenant."],
  "bk.policy": ["Free to change or cancel up to {n} hours before.", "Modification ou annulation gratuite jusqu'à {n} heures avant."],
  "bk.promo": ["Promo code", "Code promo"],
  "bk.promo.apply": ["Apply", "Appliquer"],
  "bk.promo.bad": ["We don't recognise that code.", "Ce code n'est pas reconnu."],
  "bk.redeem": ["Use a reward", "Utiliser une récompense"],
  "bk.redeem.none": ["Nothing to use yet", "Rien à utiliser pour l'instant"],
  "bk.earnNote": ["This visit earns {n} points", "Cette visite rapporte {n} points"],
  "bk.confirm": ["Confirm booking", "Confirmer la réservation"],
  "bk.confirming": ["Confirming…", "Confirmation…"],
  "bk.done": ["You're booked", "C'est réservé"],
  "bk.done.sub": ["We have sent the details to {e}.", "Nous avons envoyé les détails à {e}."],
  "bk.ref": ["Reference", "Référence"],
  "bk.addCal": ["Add to calendar", "Ajouter au calendrier"],
  "bk.viewAll": ["See my appointments", "Voir mes rendez-vous"],
  "bk.arrive": ["Arrive ten minutes early. Suite 401, fourth floor.",
                "Arrivez dix minutes à l'avance. Suite 401, quatrième étage."],
  "bk.err.name": ["We need a name for the booking.", "Il nous faut un nom pour la réservation."],
  "bk.err.phone": ["A mobile number, so we can reach you.", "Un numéro de mobile, pour vous joindre."],
  "bk.err.email": ["That email doesn't look right.", "Ce courriel semble incorrect."],
  "bk.err.consent": ["Please confirm the health declaration.", "Veuillez confirmer la déclaration de santé."],
  "bk.err.slot": ["Choose a date and a time.", "Choisissez une date et une heure."],
  "bk.err.service": ["Choose at least one treatment.", "Choisissez au moins un soin."],
  "bk.held": ["Slot held · {n}", "Créneau retenu · {n}"],
  "bk.heldGone": ["Your hold expired. Pick a time again.", "Votre créneau a expiré. Choisissez à nouveau."],

  /* -------------------------------------------------------------- you */
  "you.title": ["You", "Profil"],
  "you.guest": ["Guest", "Invitée"],
  "you.signin": ["It's your spa. Make it yours.", "C'est votre spa. Faites-le vôtre."],
  "you.signin.sub": ["Add your name to keep your appointments, points and preferences on this device.",
                     "Ajoutez votre nom pour conserver vos rendez-vous, points et préférences sur cet appareil."],
  "you.start": ["Get started", "Commencer"],
  "you.member": ["Member since {d}", "Membre depuis {d}"],
  "you.points": ["points", "points"],
  "you.toNext": ["{n} points to {t}", "{n} points avant {t}"],
  "you.topTier": ["You're at the top. Thank you.", "Vous êtes au sommet. Merci."],
  "you.perks": ["Your perks", "Vos avantages"],
  "you.upcoming": ["Upcoming", "À venir"],
  "you.past": ["Past visits", "Visites passées"],
  "you.noUpcoming": ["No appointments yet.", "Aucun rendez-vous."],
  "you.noPast": ["Your visits will show up here.", "Vos visites apparaîtront ici."],
  "you.rewards": ["Rewards", "Récompenses"],
  "you.rewards.sub": ["Spend your points", "Dépensez vos points"],
  "you.redeem": ["Redeem", "Échanger"],
  "you.redeemed": ["Ready to use", "Prêt à utiliser"],
  "you.needMore": ["{n} more", "{n} de plus"],
  "you.wallet": ["Your rewards", "Vos récompenses"],
  "you.gift": ["Gift cards", "Cartes-cadeaux"],
  "you.gift.sub": ["A treatment, given", "Un soin, offert"],
  "you.gift.buy": ["Buy a gift card", "Acheter une carte-cadeau"],
  "you.refer": ["Refer a friend", "Parrainer une amie"],
  "you.refer.sub": ["You both get {n} points on her first visit.", "Vous recevez toutes les deux {n} points à sa première visite."],
  "you.refer.code": ["Your code", "Votre code"],
  "you.copy": ["Copy", "Copier"],
  "you.copied": ["Copied", "Copié"],
  "you.prefs": ["Preferences", "Préférences"],
  "you.pref.therapist": ["Preferred therapist", "Thérapeute préférée"],
  "you.pref.pressure": ["Massage pressure", "Pression du massage"],
  "you.pref.pressure.light": ["Light", "Légère"],
  "you.pref.pressure.medium": ["Medium", "Moyenne"],
  "you.pref.pressure.firm": ["Firm", "Ferme"],
  "you.pref.room": ["Room", "Ambiance"],
  "you.pref.room.quiet": ["Quiet", "Silencieuse"],
  "you.pref.room.music": ["Music", "Musique"],
  "you.pref.notes": ["Notes for your therapist", "Notes pour votre thérapeute"],
  "you.settings": ["Settings", "Réglages"],
  "you.appearance": ["Appearance", "Apparence"],
  "you.theme.system": ["System", "Système"],
  "you.theme.light": ["Light", "Clair"],
  "you.theme.dark": ["Dark", "Sombre"],
  "you.contact": ["Contact", "Contact"],
  "you.forget": ["Sign out and erase", "Se déconnecter et effacer"],
  "you.forget.ask": ["This erases your appointments, points and preferences from this device. It cannot be undone.",
                     "Ceci efface vos rendez-vous, points et préférences de cet appareil. C'est irréversible."],
  "you.forget.do": ["Erase everything", "Tout effacer"],
  "you.name.ask": ["What should we call you?", "Comment devons-nous vous appeler ?"],
  "you.birthday": ["Birthday", "Date de naissance"],
  "you.birthday.why": ["For your birthday sauna. We only keep the day and month.",
                       "Pour votre sauna d'anniversaire. Nous ne gardons que le jour et le mois."],
  "you.visits": ["{n} visits", "{n} visites"],
  "you.spent": ["{p} of treatments", "{p} de soins"],
  "you.demo": ["Fill with sample history", "Remplir avec un historique d'exemple"],
  "you.demo.sub": ["For the preview only — invents a year of visits so the club has something to show.",
                   "Pour l'aperçu seulement — invente une année de visites pour illustrer le club."],

  /* ----------------------------------------------------- appointments */
  "ap.confirmed": ["Confirmed", "Confirmé"],
  "ap.cancelled": ["Cancelled", "Annulé"],
  "ap.completed": ["Completed", "Terminé"],
  "ap.today": ["Today", "Aujourd'hui"],
  "ap.tomorrow": ["Tomorrow", "Demain"],
  "ap.in": ["in {n} days", "dans {n} jours"],
  "ap.with": ["with {n}", "avec {n}"],
  "ap.reschedule": ["Reschedule", "Reporter"],
  "ap.cancel": ["Cancel appointment", "Annuler le rendez-vous"],
  "ap.cancel.ask": ["Cancel this appointment? It is free to do until {n} hours before.",
                    "Annuler ce rendez-vous ? C'est gratuit jusqu'à {n} heures avant."],
  "ap.cancel.late": ["This is inside the {n}-hour window. Please call us instead.",
                     "Nous sommes à moins de {n} heures. Merci de nous appeler."],
  "ap.keep": ["Keep it", "Le conserver"],
  "ap.earned": ["Earned {n} points", "{n} points gagnés"],

  /* ------------------------------------------------------------ misc */
  "gift.title": ["Gift cards", "Cartes-cadeaux"],
  "gift.body": ["Any amount, or any treatment. We prepare it at the spa and you can collect it or have it emailed.",
                "Tout montant, ou tout soin. Nous la préparons au spa : à venir chercher ou à recevoir par courriel."],
  "gift.call": ["Call to arrange one", "Appeler pour en commander une"],
  "club.proposal": ["The Sahel Club is a proposal from Alpha Agency, not a programme Spa Sahel runs yet.",
                    "Le Club Sahel est une proposition d'Alpha Agency, pas un programme déjà en place chez Spa Sahel."],
  "preview.note": ["Preview — nothing here reaches the spa. Bookings stay on this device.",
                   "Aperçu — rien n'est transmis au spa. Les réservations restent sur cet appareil."],
  "foot.by": ["Preview built by", "Aperçu réalisé par"],
  "foot.rights": ["All rights reserved.", "Tous droits réservés."],
  "a11y.langTo": ["Switch to French", "Passer en anglais"],
};

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};
const MONTHS_SHORT = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
};
const DAYS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
};
const DAYS_SHORT = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fr: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
};

/* ------------------------------------------------------------- runtime */
export function initLang() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  if (!LANGS.includes(saved)) {
    // Montreal: honour the browser before assuming English.
    saved = (navigator.languages || [navigator.language || "en"])
      .map((l) => String(l).slice(0, 2).toLowerCase())
      .find((l) => LANGS.includes(l)) || "en";
  }
  applyLang(saved);
}

function applyLang(next) {
  lang = LANGS.includes(next) ? next : "en";
  const root = document.documentElement;
  root.lang = lang;
  root.dataset.lang = lang;
}

export const getLang = () => lang;
export const otherLang = () => (lang === "en" ? "fr" : "en");

export function setLang(next) {
  if (next === lang) return;
  try { localStorage.setItem(KEY, next); } catch {}
  applyLang(next);
  document.dispatchEvent(new CustomEvent("lang:change", { detail: { lang } }));
}

/** t("bk.step", { n: 2, m: 6 }) */
export function t(key, vars) {
  const row = DICT[key];
  let s = row ? (row[LANGS.indexOf(lang)] ?? row[0]) : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}

/** Pull the current language out of a {en, fr} pair in the catalogue. */
export const tr = (pair) => (pair == null ? "" : typeof pair === "string" ? pair : (pair[lang] ?? pair.en ?? ""));

/* -------------------------------------------------------------- format */
/** 65 → "$65" in English, "65 $" in French — with the required narrow space. */
export function money(n) {
  const v = Number(n) || 0;
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (lang === "fr") return `${s.replace(".", ",")} $`;
  return `$${s}`;
}

/** 90 → "1 h 30" / "1 hr 30 min"; 45 → "45 min". French keeps the figure
 *  and its unit together with a no-break space, as the money does. */
export function duration(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if (lang === "fr") return h ? (r ? `${h}\u00a0h\u00a0${r}` : `${h}\u00a0h`) : `${r}\u00a0min`;
  if (!h) return `${r} min`;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

/** 600 → "10:00" / "10 h". Opening hours, in minutes from midnight. */
export function clock(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (lang === "fr") return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, "0")}` : `${h}\u00a0h`;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${ampm}` : `${h12} ${ampm}`;
}

export const dayName = (d, short = false) => (short ? DAYS_SHORT : DAYS)[lang][d];
export const monthName = (m, short = false) => (short ? MONTHS_SHORT : MONTHS)[lang][m];

/** "Thursday 18 September" / "jeudi 18 septembre" */
export function dateLong(date) {
  const d = new Date(date);
  return lang === "fr"
    ? `${DAYS.fr[d.getDay()]} ${d.getDate()} ${MONTHS.fr[d.getMonth()]}`
    : `${DAYS.en[d.getDay()]} ${d.getDate()} ${MONTHS.en[d.getMonth()]}`;
}

/** "18 Sep" / "18 sept." */
export function dateShort(date) {
  const d = new Date(date);
  return `${d.getDate()} ${MONTHS_SHORT[lang][d.getMonth()]}`;
}

/** The greeting that matches the hour. */
export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return t("home.greet.morning");
  if (h >= 12 && h < 18) return t("home.greet.afternoon");
  return t("home.greet.evening");
}
