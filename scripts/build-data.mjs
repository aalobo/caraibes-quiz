// Téléchargement + filtrage des données Natural Earth pour les Antilles.
// Lance une seule fois : `node scripts/build-data.mjs`
// Produit public/caribbean.geojson

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Source : Natural Earth Vector "map units" 10m — inclut Porto Rico, Guadeloupe,
// Martinique, etc. comme entités séparées.
const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_units.geojson";

const CACHE = resolve(ROOT, "scripts", ".ne_map_units.geojson");
const OUT = resolve(ROOT, "public", "caribbean.geojson");

// Table (code ISO_A2 ou nom Natural Earth) -> nom français + statut
const TARGETS = {
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

// Filets de secours : certains territoires ont ISO_A2 = "-99" dans Natural Earth.
// On capte alors par nom (case-insensitive, sous-chaîne).
const NAME_FALLBACKS = [
  { match: /saint[- ]barth/i, key: "BL" },
  { match: /saint[- ]martin/i, key: "MF" },
  { match: /sint maarten/i, key: "SX" },
  { match: /curacao|curaçao/i, key: "CW" },
  { match: /bonaire|saba|sint eustatius/i, key: "BQ" },
];

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

function pickKey(props) {
  // Essaie ISO_A2_EH d'abord (codes "de jure" propres, ex: MQ, GP, AG),
  // puis ISO_A2 (parfois "-99" ou "FR-972").
  for (const candidate of [props.ISO_A2_EH, props.ISO_A2]) {
    if (candidate && TARGETS[candidate]) return candidate;
  }
  const name = (props.NAME || props.NAME_LONG || props.ADMIN || "").toString();
  for (const { match, key } of NAME_FALLBACKS) {
    if (match.test(name)) return key;
  }
  return null;
}

// Fusionne plusieurs Polygon/MultiPolygon en un MultiPolygon unique.
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

const src = await getSource();
const groups = new Map(); // key -> { meta, geoms[], nameEn }

for (const f of src.features) {
  const key = pickKey(f.properties);
  if (!key) continue;
  let g = groups.get(key);
  if (!g) {
    g = {
      meta: TARGETS[key],
      geoms: [],
      nameEn: f.properties.NAME || f.properties.NAME_LONG || f.properties.ADMIN,
    };
    groups.set(key, g);
  }
  g.geoms.push(f.geometry);
}

const features = [];
for (const [key, g] of groups) {
  features.push({
    type: "Feature",
    properties: { id: key, nom: g.meta.fr, statut: g.meta.statut, nameEn: g.nameEn },
    geometry: mergeGeometries(g.geoms),
  });
}

const missing = Object.keys(TARGETS).filter((k) => !groups.has(k));
if (missing.length) {
  console.warn("⚠ Territoires non trouvés dans Natural Earth :", missing.join(", "));
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`✓ ${features.length} territoires écrits dans ${OUT}`);
