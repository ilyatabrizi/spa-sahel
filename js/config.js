// Everything about the business that is fact, in one place.
//
// The address, the telephone number, the hours and every price in data.js were
// read off spasahel.com and the client's own price cards on 12 September 2026.
// Nothing here is invented. Where they publish no figure — the laser and
// electrolysis consultations — the app says so rather than filling a gap.
//
// The Sahel Club (points, tiers, rewards) is the one part that is Alpha's
// proposal rather than theirs, and it is marked as such in the app and in the
// README so nobody mistakes it for something already running.

export const STORAGE = "sahel.";

export const BUSINESS = {
  name: "Spa Sahel",
  tagline: { en: "Relaxation · Wellness · Happiness", fr: "Détente · Bien-être · Bonheur" },
  phone: "514.844.5509",
  phoneHref: "+15148445509",
  email: "info@spasahel.com",
  site: "spasahel.com",
  instagram: "spa_sahel",
  street: "1117 Saint-Catherine St W, Suite 401",
  city: "Montreal, QC H3B 1H9",
  maps: "https://maps.google.com/?q=1117+Saint-Catherine+St+W+Suite+401+Montreal+QC+H3B+1H9",
  currency: "$",
  taxNote: { en: "Prices before taxes", fr: "Prix avant taxes" },
};

// 0 = Sunday. `null` is closed. Minutes from midnight, so the slot maths is
// plain arithmetic and a 30-minute grid lands on the hour.
export const HOURS = [
  null,                 // Sunday — closed
  [600, 1140],          // Monday      10:00 – 19:00
  [600, 1140],          // Tuesday
  [600, 1140],          // Wednesday
  [600, 1140],          // Thursday
  [600, 1140],          // Friday
  [540, 1020],          // Saturday    09:00 – 17:00
];

export const BOOKING = {
  slotStep: 30,         // minutes between the start times we offer
  leadMinutes: 120,     // the earliest booking is two hours out
  horizonDays: 60,      // how far ahead the calendar opens
  maxServices: 4,       // a single visit can stack this many treatments
  turnaround: 15,       // minutes left between one guest and the next
  holdMinutes: 10,      // how long a chosen slot is held while you finish
  cancelHours: 24,      // free cancellation window
  depositFrom: 150,     // a card is asked for above this total
};

// Alpha's proposal. One point per dollar; tiers are lifetime, not annual.
export const CLUB = {
  name: { en: "Sahel Club", fr: "Club Sahel" },
  perDollar: 1,
  welcomeBonus: 100,
  referralBonus: 250,
  birthdayReward: { en: "A complimentary steam sauna in your birthday month",
                    fr: "Un sauna vapeur offert le mois de votre anniversaire" },
  tiers: [
    { id: "shore",    at: 0,    name: { en: "Shore",    fr: "Rivage" },
      perks: { en: ["1 point per dollar", "Birthday steam sauna"],
               fr: ["1 point par dollar", "Sauna vapeur d'anniversaire"] } },
    { id: "sunrise",  at: 500,  name: { en: "Sunrise",  fr: "Lever" },
      perks: { en: ["1.15 points per dollar", "Free hands or feet exfoliation each visit"],
               fr: ["1,15 point par dollar", "Exfoliation mains ou pieds offerte à chaque visite"] } },
    { id: "horizon",  at: 1200, name: { en: "Horizon",  fr: "Horizon" },
      perks: { en: ["1.3 points per dollar", "Priority evening slots", "Free paraffin treatment"],
               fr: ["1,3 point par dollar", "Créneaux du soir prioritaires", "Traitement à la paraffine offert"] } },
    { id: "solstice", at: 2500, name: { en: "Solstice", fr: "Solstice" },
      perks: { en: ["1.5 points per dollar", "Priority evening slots", "One free 30-minute massage a year"],
               fr: ["1,5 point par dollar", "Créneaux du soir prioritaires", "Un massage de 30 minutes offert par an"] } },
  ],
};

export const REWARDS = [
  { id: "r-brow",    cost: 120, value: 12,
    name: { en: "Eyebrow threading", fr: "Épilation des sourcils au fil" },
    note: { en: "Our most-asked-for ten minutes", fr: "Nos dix minutes les plus demandées" } },
  { id: "r-sauna",   cost: 250, value: 25,
    name: { en: "Steam sauna, 30 minutes", fr: "Sauna vapeur, 30 minutes" },
    note: { en: "Before any treatment, or on its own", fr: "Avant un soin, ou seul" } },
  { id: "r-off10",   cost: 200, value: 10,
    name: { en: "$10 off any treatment", fr: "10 $ de rabais sur un soin" },
    note: { en: "Applied at the counter", fr: "Appliqué au comptoir" } },
  { id: "r-parafin", cost: 100, value: 10,
    name: { en: "Paraffin treatment", fr: "Traitement à la paraffine" },
    note: { en: "Hands or feet", fr: "Mains ou pieds" } },
  { id: "r-micro",   cost: 550, value: 60,
    name: { en: "Microdermabrasion, 30 minutes", fr: "Microdermabrasion, 30 minutes" },
    note: { en: "A full session, on us", fr: "Une séance complète, offerte" } },
  { id: "r-massage", cost: 900, value: 100,
    name: { en: "60-minute massage", fr: "Massage de 60 minutes" },
    note: { en: "Swedish, therapeutic or reflexology", fr: "Suédois, thérapeutique ou réflexologie" } },
];

// The room holds four tables and two laser rooms; these are the people the
// booking flow offers. Names are placeholders until the client confirms them.
export const THERAPISTS = [
  { id: "any",  initials: "", name: { en: "First available", fr: "Première disponibilité" },
    role: { en: "We match you to the right hands", fr: "Nous vous confions aux bonnes mains" }, skills: "*" },
  { id: "t-1",  initials: "LM", name: { en: "Layla M.", fr: "Layla M." },
    role: { en: "Massage therapist", fr: "Massothérapeute" }, skills: ["massage", "sauna"] },
  { id: "t-2",  initials: "NR", name: { en: "Nadia R.", fr: "Nadia R." },
    role: { en: "Aesthetician · Phytomer", fr: "Esthéticienne · Phytomer" }, skills: ["face", "body", "wax", "thread"] },
  { id: "t-3",  initials: "SK", name: { en: "Sara K.", fr: "Sara K." },
    role: { en: "Laser & electrolysis technician", fr: "Technicienne laser et électrolyse" }, skills: ["laser", "electro"] },
  { id: "t-4",  initials: "YB", name: { en: "Yasmin B.", fr: "Yasmin B." },
    role: { en: "Nail technician", fr: "Technicienne en pose d'ongles" }, skills: ["nails", "wax"] },
];
