// Téléchargement + filtrage des données Natural Earth pour plusieurs régions.
// Lance : `node scripts/build-data.mjs`
// Produit public/caribbean.geojson ET public/africa.geojson

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_units.geojson";

const CACHE = resolve(ROOT, "scripts", ".ne_map_units.geojson");

// ============================== ANTILLES ==============================
const TARGETS_CARIBBEAN = {
  CU: { fr: "Cuba", statut: "indépendant" },
  JM: { fr: "Jamaïque", statut: "indépendant" },
  HT: { fr: "Haïti", statut: "indépendant" },
  DO: { fr: "République dominicaine", statut: "indépendant" },
  BS: { fr: "Bahamas", statut: "indépendant" },
  AG: { fr: "Antigua-et-Barbuda", statut: "indépendant" },
  DM: { fr: "Dominique", statut: "indépendant" },
  GD: { fr: "Grenade", statut: "indépendant" },
  KN: { fr: "Saint-Christophe-et-Niévès", statut: "indépendant" },
  LC: { fr: "Sainte-Lucie", statut: "indépendant" },
  VC: { fr: "Saint-Vincent-et-les-Grenadines", statut: "indépendant" },
  BB: { fr: "Barbade", statut: "indépendant" },
  TT: { fr: "Trinité-et-Tobago", statut: "indépendant" },
  PR: { fr: "Porto Rico", statut: "territoire des États-Unis" },
  VI: { fr: "Îles Vierges des États-Unis", statut: "territoire des États-Unis" },
  VG: { fr: "Îles Vierges britanniques", statut: "territoire britannique" },
  KY: { fr: "Îles Caïmans", statut: "territoire britannique" },
  TC: { fr: "Îles Turques-et-Caïques", statut: "territoire britannique" },
  AI: { fr: "Anguilla", statut: "territoire britannique" },
  MS: { fr: "Montserrat", statut: "territoire britannique" },
  AW: { fr: "Aruba", statut: "Pays-Bas" },
  CW: { fr: "Curaçao", statut: "Pays-Bas" },
  SX: { fr: "Saint-Martin (partie néerlandaise)", statut: "Pays-Bas" },
  BQ: { fr: "Pays-Bas caribéens (Bonaire, Saba, Saint-Eustache)", statut: "Pays-Bas" },
  MF: { fr: "Saint-Martin (partie française)", statut: "France" },
  BL: { fr: "Saint-Barthélemy", statut: "France" },
  GP: { fr: "Guadeloupe", statut: "France" },
  MQ: { fr: "Martinique", statut: "France" },
};

const NAME_FALLBACKS_CARIBBEAN = [
  { match: /saint[- ]barth/i, key: "BL" },
  { match: /saint[- ]martin/i, key: "MF" },
  { match: /sint maarten/i, key: "SX" },
  { match: /curacao|curaçao/i, key: "CW" },
  { match: /bonaire|saba|sint eustatius/i, key: "BQ" },
];

// ============================== AFRIQUE ==============================
const TARGETS_AFRICA = {
  DZ: { fr: "Algérie", statut: "indépendant" },
  AO: { fr: "Angola", statut: "indépendant" },
  BJ: { fr: "Bénin", statut: "indépendant" },
  BW: { fr: "Botswana", statut: "indépendant" },
  BF: { fr: "Burkina Faso", statut: "indépendant" },
  BI: { fr: "Burundi", statut: "indépendant" },
  CM: { fr: "Cameroun", statut: "indépendant" },
  CV: { fr: "Cap-Vert", statut: "indépendant" },
  CF: { fr: "République centrafricaine", statut: "indépendant" },
  TD: { fr: "Tchad", statut: "indépendant" },
  KM: { fr: "Comores", statut: "indépendant" },
  CG: { fr: "République du Congo", statut: "indépendant" },
  CD: { fr: "République démocratique du Congo", statut: "indépendant" },
  DJ: { fr: "Djibouti", statut: "indépendant" },
  EG: { fr: "Égypte", statut: "indépendant" },
  GQ: { fr: "Guinée équatoriale", statut: "indépendant" },
  ER: { fr: "Érythrée", statut: "indépendant" },
  SZ: { fr: "Eswatini", statut: "indépendant" },
  ET: { fr: "Éthiopie", statut: "indépendant" },
  GA: { fr: "Gabon", statut: "indépendant" },
  GM: { fr: "Gambie", statut: "indépendant" },
  GH: { fr: "Ghana", statut: "indépendant" },
  GN: { fr: "Guinée", statut: "indépendant" },
  GW: { fr: "Guinée-Bissau", statut: "indépendant" },
  CI: { fr: "Côte d'Ivoire", statut: "indépendant" },
  KE: { fr: "Kenya", statut: "indépendant" },
  LS: { fr: "Lesotho", statut: "indépendant" },
  LR: { fr: "Liberia", statut: "indépendant" },
  LY: { fr: "Libye", statut: "indépendant" },
  MG: { fr: "Madagascar", statut: "indépendant" },
  MW: { fr: "Malawi", statut: "indépendant" },
  ML: { fr: "Mali", statut: "indépendant" },
  MR: { fr: "Mauritanie", statut: "indépendant" },
  MU: { fr: "Maurice", statut: "indépendant" },
  MA: { fr: "Maroc", statut: "indépendant" },
  MZ: { fr: "Mozambique", statut: "indépendant" },
  NA: { fr: "Namibie", statut: "indépendant" },
  NE: { fr: "Niger", statut: "indépendant" },
  NG: { fr: "Nigeria", statut: "indépendant" },
  RW: { fr: "Rwanda", statut: "indépendant" },
  ST: { fr: "Sao Tomé-et-Principe", statut: "indépendant" },
  SN: { fr: "Sénégal", statut: "indépendant" },
  SC: { fr: "Seychelles", statut: "indépendant" },
  SL: { fr: "Sierra Leone", statut: "indépendant" },
  SO: { fr: "Somalie", statut: "indépendant" },
  ZA: { fr: "Afrique du Sud", statut: "indépendant" },
  SS: { fr: "Soudan du Sud", statut: "indépendant" },
  SD: { fr: "Soudan", statut: "indépendant" },
  TZ: { fr: "Tanzanie", statut: "indépendant" },
  TG: { fr: "Togo", statut: "indépendant" },
  TN: { fr: "Tunisie", statut: "indépendant" },
  UG: { fr: "Ouganda", statut: "indépendant" },
  ZM: { fr: "Zambie", statut: "indépendant" },
  ZW: { fr: "Zimbabwe", statut: "indépendant" },
  EH: { fr: "Sahara occidental", statut: "territoire contesté" },
  RE: { fr: "La Réunion", statut: "France" },
  YT: { fr: "Mayotte", statut: "France" },
};

const NAME_FALLBACKS_AFRICA = [
  { match: /western sahara|sahara occidental/i, key: "EH" },
  { match: /south sudan/i, key: "SS" },
  { match: /^sudan$/i, key: "SD" },
];

// ============== AUTRES CONTINENTS (noms FR auto via Intl) ==============
// Les fichiers map_units découpent les pays en sous-unités : on ne peut pas
// se fier au NAME_FR de la source (il renvoie le nom d'une sous-unité). On
// génère donc le nom français à partir du code ISO via Intl.DisplayNames.
const FR_NAMES = new Intl.DisplayNames(["fr"], { type: "region" });

// Quelques noms raccourcis pour le quiz.
const NAME_OVERRIDES = {
  HK: "Hong Kong",
  MO: "Macao",
  VA: "Vatican",
  SJ: "Svalbard",
};

// statut : "indépendant" par défaut. Dépendances / territoires listés ici.
const STATUT_OVERRIDES = {
  // France
  GF: "France", PM: "France", NC: "France", PF: "France", WF: "France",
  // Royaume-Uni
  GI: "territoire britannique", FK: "territoire britannique", BM: "territoire britannique",
  PN: "territoire britannique", GG: "territoire britannique", JE: "territoire britannique",
  IM: "territoire britannique",
  // États-Unis
  GU: "territoire des États-Unis", AS: "territoire des États-Unis", MP: "territoire des États-Unis",
  // Danemark
  GL: "Danemark", FO: "Danemark",
  // Norvège
  SJ: "Norvège",
  // Finlande
  AX: "Finlande",
  // Nouvelle-Zélande
  CK: "Nouvelle-Zélande", NU: "Nouvelle-Zélande", TK: "Nouvelle-Zélande",
  // Australie
  NF: "Australie",
  // Chine
  HK: "Chine", MO: "Chine",
};

function buildTargets(codesStr) {
  const t = {};
  for (const code of codesStr.trim().split(/\s+/)) {
    t[code] = {
      fr: NAME_OVERRIDES[code] || FR_NAMES.of(code),
      statut: STATUT_OVERRIDES[code] || "indépendant",
    };
  }
  return t;
}

const TARGETS_EUROPE = buildTargets(`
  AD AL AT BA BE BG BY CH CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU
  LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM UA VA XK GI FO SJ GG JE
  IM AX`);

const TARGETS_ASIA = buildTargets(`
  AF SA AM AZ BH BD BT MM BN KH CY KP KR GE HK IN ID IR IL JP JO KZ KG KW IQ
  LA LB MO MY MN NP OM UZ PK PH QA CN SG LK SY TJ TW TH TL TM TR VN YE AE`);

const TARGETS_SOUTH_AMERICA = buildTargets(`
  AR BO BR CL CO GY GF PY PE SR UY VE EC FK`);

// Amérique du Nord + centrale (les Antilles ont leur propre carte).
const TARGETS_NORTH_AMERICA = buildTargets(`
  BZ BM CA CR GL GT HN MX NI PA PM SV US`);

const TARGETS_OCEANIA = buildTargets(`
  AU FJ GU PN KI NR NU NC NZ PW PG PF WS AS TK TO TV VU WF FM NF CK MH SB MP`);

// ============================== TÉLÉCHARGEMENT ==============================
async function getSource() {
  if (existsSync(CACHE)) {
    console.log("Cache trouvé :", CACHE);
    return JSON.parse(readFileSync(CACHE, "utf8"));
  }
  console.log("Téléchargement de Natural Earth (~28 Mo)…");
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${SOURCE_URL}`);
  const text = await res.text();
  writeFileSync(CACHE, text);
  console.log("Mis en cache :", CACHE);
  return JSON.parse(text);
}

function makePickKey(targets, fallbacks) {
  return (props) => {
    for (const candidate of [props.ISO_A2_EH, props.ISO_A2]) {
      if (candidate && targets[candidate]) return candidate;
    }
    const name = (props.NAME || props.NAME_LONG || props.ADMIN || "").toString();
    for (const { match, key } of fallbacks) {
      if (match.test(name)) return key;
    }
    return null;
  };
}

function mergeGeometries(geoms) {
  const polygons = [];
  for (const g of geoms) {
    if (!g) continue;
    if (g.type === "Polygon") polygons.push(g.coordinates);
    else if (g.type === "MultiPolygon") polygons.push(...g.coordinates);
  }
  if (polygons.length === 1) return { type: "Polygon", coordinates: polygons[0] };
  return { type: "MultiPolygon", coordinates: polygons };
}

// Pour une carte centrée sur le Pacifique (Océanie), on ramène les longitudes
// négatives vers +360 afin que les pays à cheval sur l'antiméridien (Fidji,
// Nouvelle-Zélande, Kiribati…) restent d'un seul tenant au lieu d'être coupés.
function shiftAntimeridian(geometry) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys)
    for (const ring of poly)
      for (const pt of ring) if (pt[0] < 0) pt[0] += 360;
}

function buildRegion(src, targets, fallbacks, outPath, label, opts = {}) {
  const pickKey = makePickKey(targets, fallbacks);
  const groups = new Map();

  for (const f of src.features) {
    const key = pickKey(f.properties);
    if (!key) continue;
    let g = groups.get(key);
    if (!g) {
      g = {
        meta: targets[key],
        geoms: [],
        nameEn: f.properties.NAME || f.properties.NAME_LONG || f.properties.ADMIN,
      };
      groups.set(key, g);
    }
    g.geoms.push(f.geometry);
  }

  const features = [];
  for (const [key, g] of groups) {
    const geometry = mergeGeometries(g.geoms);
    if (opts.shiftAntimeridian) shiftAntimeridian(geometry);
    features.push({
      type: "Feature",
      properties: { id: key, nom: g.meta.fr, statut: g.meta.statut, nameEn: g.nameEn },
      geometry,
    });
  }

  const missing = Object.keys(targets).filter((k) => !groups.has(k));
  if (missing.length) {
    console.warn(`⚠ [${label}] Non trouvés dans Natural Earth : ${missing.join(", ")}`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ type: "FeatureCollection", features }));
  console.log(`✓ [${label}] ${features.length} territoires écrits dans ${outPath}`);
}

// ============================== EXÉCUTION ==============================
const src = await getSource();

buildRegion(
  src,
  TARGETS_CARIBBEAN,
  NAME_FALLBACKS_CARIBBEAN,
  resolve(ROOT, "public", "caribbean.geojson"),
  "Antilles"
);

buildRegion(
  src,
  TARGETS_AFRICA,
  NAME_FALLBACKS_AFRICA,
  resolve(ROOT, "public", "africa.geojson"),
  "Afrique"
);

buildRegion(src, TARGETS_EUROPE, [], resolve(ROOT, "public", "europe.geojson"), "Europe");
buildRegion(src, TARGETS_ASIA, [], resolve(ROOT, "public", "asia.geojson"), "Asie");
buildRegion(src, TARGETS_NORTH_AMERICA, [], resolve(ROOT, "public", "north-america.geojson"), "Amérique du Nord");
buildRegion(src, TARGETS_SOUTH_AMERICA, [], resolve(ROOT, "public", "south-america.geojson"), "Amérique du Sud");
buildRegion(src, TARGETS_OCEANIA, [], resolve(ROOT, "public", "oceania.geojson"), "Océanie", { shiftAntimeridian: true });
