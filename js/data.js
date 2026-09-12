// The catalogue. Every name, price and duration below is Spa Sahel's own,
// transcribed from the price list at spasahel.com/price-list on 12 September
// 2026 and from the laser price card they published on Instagram.
//
// Two honesty rules run through this file:
//   `dur: null`   they publish no length for it. The booking flow uses `est`
//                 to hold a slot and the app says "confirmed at booking"
//                 rather than printing a number nobody promised.
//   `price: null` they quote it at a consultation. The card says so and sends
//                 you to the free fifteen minutes instead of a checkout.
//
// Photo keys point at assets/photos/<key>.webp, built by scripts/build_assets.py
// from their own pictures.

export const GROUPS = [
  { id: "face", icon: "face", photo: "facial",
    name: { en: "Facial Treatments", fr: "Soins du visage" },
    short: { en: "Facial", fr: "Visage" },
    blurb: { en: "Phytomer protocols, microdermabrasion, peeling and microneedling.",
             fr: "Protocoles Phytomer, microdermabrasion, peeling et microneedling." } },
  { id: "body", icon: "body", photo: "body-scrub",
    name: { en: "Body Treatments", fr: "Soins du corps" },
    short: { en: "Body", fr: "Corps" },
    blurb: { en: "Exfoliation and hydrotherapy in the Spa Jet, and back care.",
             fr: "Exfoliation et hydrothérapie au Spa Jet, et soin du dos." } },
  { id: "massage", icon: "massage", photo: "massage",
    name: { en: "Massages", fr: "Massages" },
    short: { en: "Massage", fr: "Massage" },
    blurb: { en: "Swedish, therapeutic, reflexology, prenatal and lymphatic drainage.",
             fr: "Suédois, thérapeutique, réflexologie, prénatal et drainage lymphatique." } },
  { id: "nails", icon: "nails", photo: "nails",
    name: { en: "Manicures & Pedicures", fr: "Manucures et pédicures" },
    short: { en: "Hands & Feet", fr: "Mains et pieds" },
    blurb: { en: "Regular and gel, full or on the go.",
             fr: "Régulier et gel, complet ou express." } },
  { id: "wax", icon: "wax", photo: "waxing",
    name: { en: "Waxing", fr: "Épilation à la cire" },
    short: { en: "Waxing", fr: "Cire" },
    blurb: { en: "Face and body, from the upper lip to a full back.",
             fr: "Visage et corps, de la lèvre supérieure au dos complet." } },
  { id: "laser", icon: "laser", photo: "laser",
    name: { en: "Laser Treatments", fr: "Traitements au laser" },
    short: { en: "Laser", fr: "Laser" },
    blurb: { en: "Hair removal, pigmentation, redness and vascular work.",
             fr: "Épilation, pigmentation, rougeurs et lésions vasculaires." } },
  { id: "electro", icon: "electro", photo: "electrolysis",
    name: { en: "Electrolysis & Skin Tags", fr: "Électrolyse et acrochordons" },
    short: { en: "Electrolysis", fr: "Électrolyse" },
    blurb: { en: "Permanent hair removal, priced by the minute.",
             fr: "Épilation définitive, tarifée à la minute." } },
  { id: "sauna", icon: "sauna", photo: "sauna",
    name: { en: "Steam Sauna", fr: "Sauna vapeur" },
    short: { en: "Sauna", fr: "Sauna" },
    blurb: { en: "Thirty minutes of warmth, alone or before a massage.",
             fr: "Trente minutes de chaleur, seul ou avant un massage." } },
  { id: "thread", icon: "thread", photo: "threading",
    name: { en: "Threading", fr: "Épilation au fil" },
    short: { en: "Threading", fr: "Fil" },
    blurb: { en: "Brows, lip and face, with tinting.",
             fr: "Sourcils, lèvre et visage, avec teinture." } },
];

/** Notes the client prints on their own price list, kept with their group. */
export const GROUP_NOTES = {
  massage: [
    { en: "We offer Swedish, Therapeutic, Reflexology, Prenatal and Lymphatic Drainage massages.",
      fr: "Nous offrons les massages suédois, thérapeutique, réflexologie, prénatal et drainage lymphatique." },
    { en: "Add hot stones or cupping to your massage, free of charge.",
      fr: "Ajoutez les pierres chaudes ou les ventouses à votre massage, sans frais." },
    { en: "A receipt for insurance purposes is issued for all massage therapy treatments on request.",
      fr: "Un reçu pour assurances est remis sur demande pour tous les soins de massothérapie." },
  ],
  laser: [
    { en: "The first step is a free 15-minute consultation with our technician. She will explain the steps involved and the expected results, and all pricing is discussed there.",
      fr: "La première étape est une consultation gratuite de 15 minutes avec notre technicienne. Elle vous expliquera le déroulement et les résultats attendus, et tous les prix y sont discutés." },
  ],
  electro: [
    { en: "The first step is a free 15-minute consultation with one of our technicians, on electrolysis or skin tags.",
      fr: "La première étape est une consultation gratuite de 15 minutes avec l'une de nos techniciennes, pour l'électrolyse ou les acrochordons." },
  ],
};

const S = (id, group, en, fr, price, dur, extra = {}) =>
  ({ id, group, name: { en, fr }, price, dur, ...extra });

export const SERVICES = [
  /* ---------------------------------------------------------------- facial */
  S("f-phyto-micro", "face", "Phytomer Facial + Microdermabrasion", "Soin Phytomer + microdermabrasion", 140, 90,
    { photo: "microderm", hero: true,
      blurb: { en: "Their deepest facial: the Phytomer protocol, then microdermabrasion to resurface.",
               fr: "Leur soin le plus complet : le protocole Phytomer, puis la microdermabrasion pour resurfacer." } }),
  S("f-phyto", "face", "Phytomer Facial", "Soin du visage Phytomer", 85, 75,
    { photo: "facial", hero: true,
      blurb: { en: "A personalised facial on the Phytomer marine line — cleanse, exfoliate, mask, massage.",
               fr: "Un soin personnalisé sur la ligne marine Phytomer — nettoyage, exfoliation, masque, massage." } }),
  S("f-micro", "face", "Microdermabrasion", "Microdermabrasion", 60, 30,
    { photo: "microderm",
      blurb: { en: "Mechanical resurfacing for texture and dullness. Thirty minutes, no downtime.",
               fr: "Resurfaçage mécanique pour la texture et le teint terne. Trente minutes, sans convalescence." } }),
  S("f-peel", "face", "Peeling", "Peeling", 90, 45,
    { photo: "peel",
      blurb: { en: "A chemical exfoliation chosen for your skin at the start of the session.",
               fr: "Une exfoliation chimique choisie pour votre peau au début de la séance." } }),
  S("f-needle", "face", "Microneedling", "Microneedling", 200, 90,
    { photo: "microneedle", hero: true,
      blurb: { en: "Collagen induction. The longest and the most asked-for of their facial work.",
               fr: "Induction de collagène. Le plus long et le plus demandé de leurs soins du visage." } }),
  S("f-phyto-back", "face", "Phytomer Facial + Back Care", "Soin Phytomer + soin du dos", 140, 90,
    { photo: "facial-glow",
      blurb: { en: "The facial, and the same care given to a back you cannot reach.",
               fr: "Le soin du visage, et les mêmes soins pour un dos que vous ne pouvez atteindre." } }),
  S("f-hydra", "face", "Hydra Phytomer", "Hydra Phytomer", 95, null,
    { photo: "facial-mask", est: 60,
      blurb: { en: "Deep marine hydration.", fr: "Hydratation marine en profondeur." } }),
  S("f-photo", "face", "Photo Rejuvenation (Laser)", "Photorajeunissement (laser)", null, null,
    { photo: "laser-face", est: 45, consult: "laser" }),

  /* ------------------------------------------------------------------ body */
  S("b-exfol", "body", "Body Exfoliation — Spa Jet", "Exfoliation corporelle — Spa Jet", 95, 75,
    { photo: "body-scrub", hero: true,
      blurb: { en: "A full-body scrub finished in the Spa Jet capsule.",
               fr: "Un gommage intégral terminé dans la capsule Spa Jet." } }),
  S("b-back", "body", "Back Treatment", "Soin du dos", 75, 45,
    { photo: "body-oil",
      blurb: { en: "Cleansing, exfoliation and extraction, for skin a facial never reaches.",
               fr: "Nettoyage, exfoliation et extraction, pour une peau qu'un soin du visage n'atteint jamais." } }),
  S("b-hydro", "body", "Hydrotherapy — Spa Jet", "Hydrothérapie — Spa Jet", 60, 30,
    { photo: "spa-jet", hero: true,
      blurb: { en: "Chromotherapy, steam and jets in the Spa Jet Hydrofusion capsule.",
               fr: "Chromothérapie, vapeur et jets dans la capsule Spa Jet Hydrofusion." } }),

  /* --------------------------------------------------------------- massage */
  S("m-30", "massage", "Massage — 30 minutes", "Massage — 30 minutes", 55, 30, { photo: "massage-cal" }),
  S("m-60", "massage", "Massage — 60 minutes", "Massage — 60 minutes", 100, 60,
    { photo: "massage", hero: true,
      blurb: { en: "The hour most people book. Choose the style when you arrive.",
               fr: "L'heure que la plupart réservent. Choisissez le style à votre arrivée." } }),
  S("m-75", "massage", "Massage — 75 minutes", "Massage — 75 minutes", 120, 75, { photo: "massage-face" }),
  S("m-90", "massage", "Massage — 90 minutes", "Massage — 90 minutes", 135, 90, { photo: "reflexology", hero: true }),
  S("m-sauna", "massage", "Steam Sauna 30 min + Massage 60 min", "Sauna vapeur 30 min + massage 60 min", 110, 90,
    { photo: "sauna", hero: true,
      blurb: { en: "Warm through in the sauna first, so the massage starts where it would normally end.",
               fr: "Réchauffez-vous d'abord au sauna, pour que le massage commence là où il finirait normalement." } }),

  /* ----------------------------------------------------------------- nails */
  S("n-mani-reg", "nails", "Full Manicure — Regular", "Manucure complète — régulier", 30, null, { photo: "nails", est: 45 }),
  S("n-mani-gel", "nails", "Full Manicure — Gel", "Manucure complète — gel", 48, null, { photo: "nails", est: 60, hero: true }),
  S("n-mani-go-reg", "nails", "Manicure On The Go — Regular", "Manucure express — régulier", 26, null, { photo: "nails-stone", est: 30 }),
  S("n-mani-go-gel", "nails", "Manicure On The Go — Gel", "Manucure express — gel", 45, null, { photo: "nails-stone", est: 45 }),
  S("n-pedi-reg", "nails", "Full Pedicure — Regular", "Pédicure complète — régulier", 49, null, { photo: "pedicure", est: 60, hero: true }),
  S("n-pedi-gel", "nails", "Full Pedicure — Gel", "Pédicure complète — gel", 60, null, { photo: "pedicure", est: 75 }),
  S("n-pedi-go-reg", "nails", "Pedicure On The Go — Regular", "Pédicure express — régulier", 35, null, { photo: "nails-stone", est: 40 }),
  S("n-pedi-go-gel", "nails", "Pedicure On The Go — Gel", "Pédicure express — gel", 50, null, { photo: "nails-stone", est: 50 }),
  S("n-pol-mani-reg", "nails", "Nail Polish — Manicure, Regular", "Vernis — manucure, régulier", 17, null, { est: 20, addon: true }),
  S("n-pol-mani-gel", "nails", "Nail Polish — Manicure, Gel", "Vernis — manucure, gel", 35, null, { est: 30, addon: true }),
  S("n-pol-pedi-reg", "nails", "Nail Polish — Pedicure, Regular", "Vernis — pédicure, régulier", 20, null, { est: 20, addon: true }),
  S("n-pol-pedi-gel", "nails", "Nail Polish — Pedicure, Gel", "Vernis — pédicure, gel", 35, null, { est: 30, addon: true }),
  S("n-gel-off", "nails", "Gel Removal", "Retrait de gel", 15, null, { est: 20, addon: true }),
  S("n-exfol", "nails", "Exfoliation of Hands or Feet", "Exfoliation des mains ou des pieds", 10, null, { est: 15, addon: true }),
  S("n-paraffin", "nails", "Paraffin Treatment — Hands or Feet", "Traitement à la paraffine — mains ou pieds", 10, null, { est: 15, addon: true }),

  /* --------------------------------------------------------------- waxing */
  S("w-chin", "wax", "Chin or Upper Lip", "Menton ou lèvre supérieure", 10, null, { est: 15 }),
  S("w-face", "wax", "Face", "Visage", 25, null, { est: 30, photo: "waxing" }),
  S("w-brow", "wax", "Eyebrows", "Sourcils", 15, null, { est: 15 }),
  S("w-nose", "wax", "Nose", "Nez", 10, null, { est: 15 }),
  S("w-abline", "wax", "Abdominal Line", "Ligne abdominale", 10, null, { est: 15 }),
  S("w-under", "wax", "Underarms", "Aisselles", 20, null, { est: 15 }),
  S("w-bikini", "wax", "Bikini Line", "Ligne de bikini", 20, null, { est: 20 }),
  S("w-brazil", "wax", "Brazilian", "Brésilien", 35, null, { est: 30, photo: "waxing", hero: true }),
  S("w-halfarm", "wax", "Half Arms", "Demi-bras", 25, null, { est: 20 }),
  S("w-fullarm", "wax", "Full Arms", "Bras complets", 30, null, { est: 30 }),
  S("w-lowerleg", "wax", "Lower Legs", "Demi-jambes", 30, null, { est: 30 }),
  S("w-fullleg", "wax", "Full Legs", "Jambes complètes", 50, null, { est: 45, photo: "waxing", hero: true }),
  S("w-thigh", "wax", "Thighs", "Cuisses", 30, null, { est: 30 }),
  S("w-back", "wax", "Full Back", "Dos complet", 45, null, { est: 40 }),
  S("w-abdomen", "wax", "Abdomen", "Abdomen", 30, null, { est: 30 }),
  S("w-torso", "wax", "Torso", "Torse", 30, null, { est: 30 }),
  S("w-bum", "wax", "Bum", "Fessier", 15, null, { est: 15 }),
  S("w-abchest", "wax", "Abdomen and Chest", "Abdomen et poitrine", 50, null, { est: 45 }),

  /* ---------------------------------------------------------------- laser */
  // Hair-removal rates are the ones on the client's own laser price card.
  S("l-under", "laser", "Laser Hair Removal — Under Arm", "Épilation laser — aisselles", 45, null,
    { est: 20, perSession: true, photo: "laser", hero: true }),
  S("l-bikini", "laser", "Laser Hair Removal — Full Bikini", "Épilation laser — bikini complet", 100, null,
    { est: 30, perSession: true, photo: "laser" }),
  S("l-under-bikini", "laser", "Laser — Under Arm + Full Bikini", "Laser — aisselles + bikini complet", 120, null,
    { est: 45, perSession: true, photo: "laser" }),
  S("l-halfface", "laser", "Laser Hair Removal — Half Face", "Épilation laser — demi-visage", 45, null,
    { est: 20, perSession: true, photo: "laser-face" }),
  S("l-fullface", "laser", "Laser Hair Removal — Full Face", "Épilation laser — visage complet", 60, null,
    { est: 30, perSession: true, photo: "laser-face", hero: true }),
  S("l-consult", "laser", "Laser Consultation", "Consultation laser", 0, 15,
    { photo: "laser", free: true, hero: true,
      blurb: { en: "Fifteen free minutes with the technician before anything is booked or paid for.",
               fr: "Quinze minutes gratuites avec la technicienne avant toute réservation ou paiement." } }),
  S("l-veins", "laser", "Red Spider Veins", "Varicosités", null, null, { est: 30, consult: "laser", photo: "vein" }),
  S("l-rosacea", "laser", "Rosacea / Diffuse Redness", "Rosacée / rougeurs diffuses", null, null, { est: 30, consult: "laser" }),
  S("l-photo", "laser", "Photo Rejuvenation", "Photorajeunissement", null, null, { est: 45, consult: "laser" }),
  S("l-angioma", "laser", "Angiomas / Ruby Points", "Angiomes / points rubis", null, null, { est: 20, consult: "laser" }),
  S("l-pigment", "laser", "Hyperpigmentation — Sun Spots", "Hyperpigmentation — taches solaires", null, null, { est: 30, consult: "laser" }),

  /* ---------------------------------------------------------- electrolysis */
  S("e-consult", "electro", "Electrolysis Consultation", "Consultation d'électrolyse", 0, 15,
    { photo: "electrolysis", free: true, hero: true,
      blurb: { en: "Free, and the first step for electrolysis or skin tags.",
               fr: "Gratuite, et la première étape pour l'électrolyse ou les acrochordons." } }),
  S("e-15", "electro", "Electrolysis — 15 minutes", "Électrolyse — 15 minutes", 30, 15, { photo: "electrolysis" }),
  S("e-20", "electro", "Electrolysis — 20 minutes", "Électrolyse — 20 minutes", 35, 20, { photo: "electrolysis" }),
  S("e-25", "electro", "Electrolysis — 25 minutes", "Électrolyse — 25 minutes", 40, 25, { photo: "electrolysis" }),
  S("e-30", "electro", "Electrolysis — 30 minutes", "Électrolyse — 30 minutes", 45, 30, { photo: "electrolysis", hero: true }),
  S("e-45", "electro", "Electrolysis — 45 minutes", "Électrolyse — 45 minutes", 60, 45, { photo: "electrolysis" }),
  S("e-60", "electro", "Electrolysis — 60 minutes", "Électrolyse — 60 minutes", 75, 60, { photo: "electrolysis" }),

  /* ---------------------------------------------------------------- sauna */
  S("s-single", "sauna", "Steam Sauna — Single Treatment", "Sauna vapeur — séance unique", 25, 30,
    { photo: "sauna", hero: true,
      blurb: { en: "Thirty minutes. Come twenty early and use it before anything else.",
               fr: "Trente minutes. Arrivez vingt minutes plus tôt et profitez-en avant tout le reste." } }),
  S("s-four", "sauna", "Steam Sauna — 4 Treatments", "Sauna vapeur — 4 séances", 80, 30,
    { photo: "sauna", multi: 4,
      blurb: { en: "Four sessions of thirty minutes, twenty dollars saved.",
               fr: "Quatre séances de trente minutes, vingt dollars d'économie." } }),
  S("s-massage", "sauna", "Steam Sauna 30 min + Massage 60 min", "Sauna vapeur 30 min + massage 60 min", 110, 90,
    { photo: "massage", alias: "m-sauna" }),

  /* ------------------------------------------------------------- threading */
  S("t-brow", "thread", "Eyebrows", "Sourcils", 12, null, { est: 15, photo: "threading", hero: true }),
  S("t-chin", "thread", "Chin or Upper Lip", "Menton ou lèvre supérieure", 5, null, { est: 10 }),
  S("t-face", "thread", "Face", "Visage", 30, null, { est: 30, photo: "threading" }),
  S("t-side", "thread", "Sideburns", "Favoris", 9, null, { est: 10 }),
  S("t-brow-lip", "thread", "Eyebrow & Upper Lip", "Sourcils et lèvre supérieure", 25, null, { est: 20, hero: true }),
  S("t-tint", "thread", "Eyebrow Tinting", "Teinture des sourcils", 37, null, { est: 20, photo: "threading" }),
  S("t-tint-thread", "thread", "Eyebrow Tinting & Threading", "Teinture et épilation des sourcils au fil", 17, null, { est: 25 }),
];

/** Their packages page, as they wrote it. */
export const PACKAGES = [
  {
    id: "p-sublime", price: 450, photo: "microneedle",
    name: { en: "Sublime Radiance", fr: "Éclat sublime" },
    sub: { en: "A complete beauty journey", fr: "Un parcours beauté complet" },
    blurb: {
      en: "Immerse yourself in the harmony of a personalised facial — soothing, gentle, and naturally radiant. Offer your skin a moment of pure relaxation to restore balance, freshness and luminosity.",
      fr: "Plongez dans l'harmonie d'un soin du visage personnalisé — apaisant, doux et naturellement lumineux. Offrez à votre peau un moment de pure détente pour retrouver équilibre, fraîcheur et luminosité.",
    },
    items: [
      { of: "f-phyto-micro", qty: 1 },
      { of: "f-peel", qty: 1 },
      { of: "f-needle", qty: 2 },
    ],
  },
  {
    id: "p-signature", price: 140, dur: 135, photo: "massage",
    name: { en: "Signature Ritual", fr: "Rituel signature" },
    sub: { en: "Phytomer facial and massage", fr: "Soin Phytomer et massage" },
    blurb: {
      en: "Close your eyes and let yourself be carried away by the softness of a Phytomer facial, followed by a soothing, fluid massage. Tension melts away, your skin breathes, and your face glows with renewed vitality.",
      fr: "Fermez les yeux et laissez-vous emporter par la douceur d'un soin Phytomer, suivi d'un massage apaisant et fluide. Les tensions fondent, votre peau respire, et votre visage retrouve son éclat.",
    },
    items: [{ of: "f-phyto", qty: 1 }, { of: "m-60", qty: 1 }],
  },
  {
    id: "p-elegance", photo: "nails",
    name: { en: "Natural Elegance", fr: "Élégance naturelle" },
    sub: { en: "Hands & feet beauty", fr: "Beauté des mains et des pieds" },
    options: [
      { price: 58, name: { en: "Mani-Pedi On The Go — Regular", fr: "Mani-pédi express — régulier" }, est: 60 },
      { price: 90, name: { en: "Mani-Pedi On The Go — Gel", fr: "Mani-pédi express — gel" }, est: 80 },
      { price: 75, name: { en: "Full Mani-Pedi — Regular", fr: "Mani-pédi complet — régulier" }, est: 105 },
      { price: 105, name: { en: "Full Mani-Pedi — Gel", fr: "Mani-pédi complet — gel" }, est: 135 },
      { price: 65, name: { en: "Full Mani-Pedi — Regular, before 2 PM", fr: "Mani-pédi complet — régulier, avant 14 h" }, est: 105, before: 840 },
    ],
  },
];

/* --------------------------------------------------------------- lookups */
const byId = new Map(SERVICES.map((s) => [s.id, s]));
export const service = (id) => byId.get(id) || null;
export const group = (id) => GROUPS.find((g) => g.id === id) || null;
export const pkg = (id) => PACKAGES.find((p) => p.id === id) || null;
export const inGroup = (id) => SERVICES.filter((s) => s.group === id && !s.alias);
export const featured = () => SERVICES.filter((s) => s.hero && !s.alias);

/** How long to hold the room for. Published length, else our estimate. */
export const lengthOf = (s) => (s?.dur ?? s?.est ?? 60);
/** Whether the length shown to a guest is ours rather than theirs. */
export const lengthIsOurs = (s) => s?.dur == null;
/** Consultation-priced services never reach a total. */
export const isQuoted = (s) => s?.price == null;
