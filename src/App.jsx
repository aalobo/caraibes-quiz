import { useEffect, useMemo, useState } from 'react'
import { MapContainer, GeoJSON, Marker } from 'react-leaflet'
import L from 'leaflet'
import './App.css'

const BOUNDS = [
  [10.5, -85.5],
  [27.5, -59],
]

const PALETTE = [
  '#E07A5F', '#81B29A', '#F2CC8F', '#3D5A80', '#EE6C4D',
  '#98C1D9', '#BC4749', '#A7C957', '#6A4C93', '#F4A261',
  '#2A9D8F', '#E76F51', '#264653', '#8AB17D', '#D88C9A',
  '#F6BD60', '#84A59D', '#F28482', '#9D6B53', '#5B8E7D',
  '#B07BAC', '#E9C46A', '#577590', '#F9844A', '#90BE6D',
  '#F94144', '#43AA8B', '#277DA1',
]

// Villes phares par territoire, avec coordonnées pour les afficher
// directement à leur emplacement sur la carte. `cap` = capitale/chef-lieu.
const CITIES = {
  CU: [
    { nom: 'La Havane', lat: 23.1136, lng: -82.3666, cap: true },
    { nom: 'Santiago de Cuba', lat: 20.0247, lng: -75.8219 },
    { nom: 'Camagüey', lat: 21.3808, lng: -77.9169 },
    { nom: 'Holguín', lat: 20.8872, lng: -76.2630 },
    { nom: 'Santa Clara', lat: 22.4069, lng: -79.9649 },
  ],
  JM: [
    { nom: 'Kingston', lat: 17.9714, lng: -76.7929, cap: true },
    { nom: 'Montego Bay', lat: 18.4762, lng: -77.8939 },
    { nom: 'Spanish Town', lat: 17.9911, lng: -76.9573 },
  ],
  HT: [
    { nom: 'Port-au-Prince', lat: 18.5944, lng: -72.3074, cap: true },
    { nom: 'Cap-Haïtien', lat: 19.7572, lng: -72.1956 },
    { nom: 'Gonaïves', lat: 19.4500, lng: -72.6833 },
    { nom: 'Les Cayes', lat: 18.2000, lng: -73.7500 },
  ],
  DO: [
    { nom: 'Saint-Domingue', lat: 18.4861, lng: -69.9312, cap: true },
    { nom: 'Santiago de los Caballeros', lat: 19.4517, lng: -70.6970 },
    { nom: 'La Romana', lat: 18.4273, lng: -68.9728 },
    { nom: 'Puerto Plata', lat: 19.7935, lng: -70.6884 },
  ],
  BS: [
    { nom: 'Nassau', lat: 25.0780, lng: -77.3380, cap: true },
    { nom: 'Freeport', lat: 26.5333, lng: -78.7000 },
  ],
  AG: [
    { nom: "Saint John's", lat: 17.1175, lng: -61.8456, cap: true },
    { nom: 'Codrington', lat: 17.6346, lng: -61.8290 },
  ],
  DM: [
    { nom: 'Roseau', lat: 15.3017, lng: -61.3870, cap: true },
    { nom: 'Portsmouth', lat: 15.5854, lng: -61.4641 },
  ],
  GD: [
    { nom: "Saint-Georges", lat: 12.0540, lng: -61.7484, cap: true },
    { nom: 'Gouyave', lat: 12.1683, lng: -61.7298 },
    { nom: 'Grenville', lat: 12.1268, lng: -61.6224 },
  ],
  KN: [
    { nom: 'Basseterre', lat: 17.2955, lng: -62.7261, cap: true },
    { nom: 'Charlestown', lat: 17.1356, lng: -62.6219 },
  ],
  LC: [
    { nom: 'Castries', lat: 14.0101, lng: -60.9870, cap: true },
    { nom: 'Vieux Fort', lat: 13.7250, lng: -60.9486 },
    { nom: 'Soufrière', lat: 13.8569, lng: -61.0561 },
  ],
  VC: [
    { nom: 'Kingstown', lat: 13.1567, lng: -61.2248, cap: true },
    { nom: 'Georgetown', lat: 13.2667, lng: -61.1333 },
  ],
  BB: [
    { nom: 'Bridgetown', lat: 13.0935, lng: -59.6105, cap: true },
    { nom: 'Speightstown', lat: 13.2500, lng: -59.6431 },
    { nom: 'Oistins', lat: 13.0667, lng: -59.5333 },
  ],
  TT: [
    { nom: "Port-d'Espagne", lat: 10.6603, lng: -61.5089, cap: true },
    { nom: 'San Fernando', lat: 10.2796, lng: -61.4683 },
    { nom: 'Arima', lat: 10.6373, lng: -61.2832 },
    { nom: 'Scarborough', lat: 11.1815, lng: -60.7355 },
  ],
  PR: [
    { nom: 'San Juan', lat: 18.4663, lng: -66.1057, cap: true },
    { nom: 'Ponce', lat: 18.0111, lng: -66.6140 },
    { nom: 'Mayagüez', lat: 18.2014, lng: -67.1397 },
    { nom: 'Caguas', lat: 18.2342, lng: -66.0356 },
  ],
  VI: [
    { nom: 'Charlotte-Amélie', lat: 18.3419, lng: -64.9307, cap: true },
    { nom: 'Christiansted', lat: 17.7456, lng: -64.7032 },
    { nom: 'Frederiksted', lat: 17.7167, lng: -64.8833 },
  ],
  VG: [
    { nom: 'Road Town', lat: 18.4264, lng: -64.6208, cap: true },
    { nom: 'Spanish Town', lat: 18.4493, lng: -64.4400 },
  ],
  KY: [
    { nom: 'George Town', lat: 19.2867, lng: -81.3744, cap: true },
    { nom: 'West Bay', lat: 19.3700, lng: -81.4192 },
    { nom: 'Bodden Town', lat: 19.2828, lng: -81.2419 },
  ],
  TC: [
    { nom: 'Cockburn Town', lat: 21.4664, lng: -71.1364, cap: true },
    { nom: 'Providenciales', lat: 21.7716, lng: -72.2870 },
  ],
  AI: [
    { nom: 'The Valley', lat: 18.2167, lng: -63.0500, cap: true },
    { nom: 'South Hill', lat: 18.1922, lng: -63.0871 },
  ],
  MS: [
    { nom: 'Brades', lat: 16.7917, lng: -62.2103, cap: true },
    { nom: 'Plymouth (abandonnée)', lat: 16.7050, lng: -62.2167 },
  ],
  AW: [
    { nom: 'Oranjestad', lat: 12.5210, lng: -70.0353, cap: true },
    { nom: 'San Nicolas', lat: 12.4322, lng: -69.9100 },
  ],
  CW: [
    { nom: 'Willemstad', lat: 12.1224, lng: -68.8819, cap: true },
    { nom: 'Sint Michiel', lat: 12.1583, lng: -68.9881 },
  ],
  SX: [
    { nom: 'Philipsburg', lat: 18.0237, lng: -63.0458, cap: true },
  ],
  BQ: [
    { nom: 'Kralendijk', lat: 12.1500, lng: -68.2769, cap: true },
    { nom: 'The Bottom', lat: 17.6248, lng: -63.2521 },
    { nom: 'Oranjestad', lat: 17.4842, lng: -62.9819 },
  ],
  MF: [
    { nom: 'Marigot', lat: 18.0708, lng: -63.0857, cap: true },
    { nom: 'Grand-Case', lat: 18.1014, lng: -63.0511 },
  ],
  BL: [
    { nom: 'Gustavia', lat: 17.8967, lng: -62.8489, cap: true },
    { nom: 'Lorient', lat: 17.9028, lng: -62.8203 },
  ],
  GP: [
    { nom: 'Basse-Terre', lat: 15.9985, lng: -61.7252, cap: true },
    { nom: 'Pointe-à-Pitre', lat: 16.2415, lng: -61.5346 },
    { nom: 'Les Abymes', lat: 16.2702, lng: -61.5057 },
    { nom: 'Sainte-Anne', lat: 16.2275, lng: -61.3825 },
  ],
  MQ: [
    { nom: 'Fort-de-France', lat: 14.6037, lng: -61.0594, cap: true },
    { nom: 'Le Lamentin', lat: 14.6105, lng: -61.0114 },
    { nom: 'Sainte-Marie', lat: 14.7800, lng: -61.0017 },
    { nom: 'Le François', lat: 14.6125, lng: -60.8997 },
  ],
}

// Abréviation du statut pour l'étiquette sur la carte.
const STATUT_SHORT = {
  'indépendant': '',
  'France': 'FR.',
  'territoire britannique': 'R.-U.',
  'Pays-Bas': 'P.-B.',
  'territoire des États-Unis': 'É.-U.',
}

function HeartIcon() {
  return (
    <svg
      className="heart"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 21s-7.2-4.6-9.5-9.1C.7 8.6 2.7 5 6.4 5c2 0 3.6 1.1 5.6 3.1 2-2 3.6-3.1 5.6-3.1 3.7 0 5.7 3.6 3.9 6.9C19.2 16.4 12 21 12 21z"
        fill="#ff5d8f"
        stroke="#c2185b"
        strokeWidth="1"
      />
    </svg>
  )
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildTerritoryIcon(feature) {
  const suffix = STATUT_SHORT[feature.properties.statut]
  const suffixHtml = suffix ? ` <span class="land-suffix">(${escapeHtml(suffix)})</span>` : ''
  const html = `<div class="land-label">${escapeHtml(feature.properties.nom)}${suffixHtml}</div>`
  return L.divIcon({
    html,
    className: 'overlay-label',
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  })
}

function buildCityIcon(ville) {
  const star = ville.cap ? '<span class="city-star">★</span> ' : ''
  const html = `<div class="city-label${ville.cap ? ' cap' : ''}">${star}${escapeHtml(ville.nom)}</div>`
  return L.divIcon({
    html,
    className: 'overlay-label',
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  })
}

// Renvoie le centre du plus grand polygone de la géométrie — utile pour les
// archipels (Bahamas, Trinité-et-Tobago) afin que l'étiquette tombe sur l'île
// principale et non au milieu de l'océan.
function centroidOf(feature) {
  const g = feature.geometry
  if (!g) return [0, 0]
  const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  let bestRing = polygons[0][0]
  let bestArea = -1
  for (const poly of polygons) {
    const ring = poly[0] // anneau extérieur
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
    const area = (maxLat - minLat) * (maxLng - minLng)
    if (area > bestArea) { bestArea = area; bestRing = ring }
  }
  // Centroïde par formule du lacet (shoelace) sur l'anneau retenu.
  let twiceArea = 0, cx = 0, cy = 0
  for (let i = 0, n = bestRing.length - 1; i < n; i++) {
    const [x1, y1] = bestRing[i]
    const [x2, y2] = bestRing[i + 1]
    const cross = x1 * y2 - x2 * y1
    twiceArea += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  if (twiceArea === 0) {
    // Polygone dégénéré : fallback sur le centre du rectangle.
    return L.geoJSON(feature).getBounds().getCenter()
  }
  const factor = 1 / (3 * twiceArea)
  return [cy * factor, cx * factor] // [lat, lng]
}

function pickRandom(arr, n) {
  const copy = [...arr]
  const out = []
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}

export default function App() {
  const [data, setData] = useState(null)
  const [mode, setMode] = useState('quiz')
  const [selected, setSelected] = useState(null)
  const [options, setOptions] = useState([])
  const [answer, setAnswer] = useState(null)
  const [score, setScore] = useState({ ok: 0, total: 0 })

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}caribbean.geojson`)
      .then((r) => r.json())
      .then((raw) => {
        raw.features.forEach((f, i) => {
          f.properties.color = PALETTE[i % PALETTE.length]
        })
        setData(raw)
      })
      .catch((e) => console.error('Chargement GeoJSON échoué', e))
  }, [])

  const territoires = useMemo(
    () => (data ? data.features.map((f) => f.properties.nom) : []),
    [data]
  )

  function handleFeatureClick(feature) {
    if (mode === 'exploration') {
      setSelected(feature)
      return
    }
    if (answer) return
    const bonneReponse = feature.properties.nom
    const leurres = pickRandom(territoires.filter((t) => t !== bonneReponse), 3)
    setSelected(feature)
    setOptions(pickRandom([bonneReponse, ...leurres], 4))
    setAnswer(null)
  }

  function choisir(option) {
    if (!selected || answer) return
    const correct = selected.properties.nom
    const ok = option === correct
    setAnswer({ chosen: option, correct })
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }))
  }

  function suivant() {
    setSelected(null)
    setOptions([])
    setAnswer(null)
  }

  function reinitialiser() {
    setScore({ ok: 0, total: 0 })
    suivant()
  }

  function styleFor(feature) {
    const base = {
      color: '#1c2541',
      weight: 1,
      fillColor: feature.properties.color,
      fillOpacity: 0.85,
    }
    if (!selected || selected.properties.id !== feature.properties.id) return base
    if (!answer) return { ...base, color: '#1c2541', weight: 3, fillColor: '#ffd166' }
    return answer.chosen === answer.correct
      ? { ...base, color: '#065f46', weight: 3, fillColor: '#43c46a' }
      : { ...base, color: '#7f1d1d', weight: 3, fillColor: '#ef476f' }
  }

  function onEachFeature(feature, layer) {
    if (mode === 'exploration') {
      layer.bindTooltip(feature.properties.nom, { sticky: true, direction: 'top' })
    }
    layer.on({
      click: () => handleFeatureClick(feature),
      mouseover: (e) => e.target.setStyle({ weight: 3 }),
      mouseout: (e) => {
        const isSelected = selected?.properties.id === feature.properties.id
        e.target.setStyle({ weight: isSelected ? 3 : 1 })
      },
    })
  }

  const geoKey = `${mode}-${selected?.properties.id ?? 'none'}-${answer ? 'a' : 'q'}`
  const pourcentage = score.total ? Math.round((score.ok / score.total) * 100) : 0

  // Le label sur la carte n'apparaît qu'après réponse (quiz) ou clic (exploration).
  const showLabel = selected && (mode === 'exploration' || !!answer)

  return (
    <div className="app">
      <header className="top">
        <h1>
          <HeartIcon />
          <span>Pussycat</span>
          <HeartIcon />
        </h1>
        <div className="controls">
          <div className="mode-switch" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'quiz'}
              className={mode === 'quiz' ? 'on' : ''}
              onClick={() => { setMode('quiz'); suivant() }}
            >
              Quiz
            </button>
            <button
              role="tab"
              aria-selected={mode === 'exploration'}
              className={mode === 'exploration' ? 'on' : ''}
              onClick={() => { setMode('exploration'); suivant() }}
            >
              Exploration
            </button>
          </div>
          {mode === 'quiz' && (
            <div className="score">
              <span>Score : <strong>{score.ok}</strong> / {score.total}</span>
              {score.total > 0 && <span className="pct">({pourcentage}%)</span>}
              <button className="reset" onClick={reinitialiser}>Réinitialiser</button>
            </div>
          )}
        </div>
      </header>

      <main className="layout">
        <div className="map-card">
          <MapContainer
            bounds={BOUNDS}
            minZoom={5}
            maxZoom={10}
            scrollWheelZoom
            zoomControl
            attributionControl={false}
            className="map"
          >
            {data && (
              <GeoJSON
                key={geoKey}
                data={data}
                style={styleFor}
                onEachFeature={onEachFeature}
              />
            )}
            {showLabel && (
              <>
                <Marker
                  key={`land-${selected.properties.id}`}
                  position={centroidOf(selected)}
                  icon={buildTerritoryIcon(selected)}
                  interactive={false}
                />
                {(CITIES[selected.properties.id] || []).map((v) => (
                  <Marker
                    key={`city-${selected.properties.id}-${v.nom}`}
                    position={[v.lat, v.lng]}
                    icon={buildCityIcon(v)}
                    interactive={false}
                  />
                ))}
              </>
            )}
          </MapContainer>
        </div>

        <aside className="panel">
          {mode === 'quiz' && (
            <>
              {!selected && (
                <p className="hint">
                  Clique sur un territoire de la carte. Quatre noms te seront
                  proposés — choisis le bon.
                </p>
              )}

              {selected && (
                <div className="question">
                  <p className="prompt">Quel est ce territoire ?</p>
                  <div className="options">
                    {options.map((opt) => {
                      let cls = 'opt'
                      if (answer) {
                        if (opt === answer.correct) cls += ' good'
                        else if (opt === answer.chosen) cls += ' bad'
                        else cls += ' dim'
                      }
                      return (
                        <button
                          key={opt}
                          className={cls}
                          disabled={!!answer}
                          onClick={() => choisir(opt)}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>

                  {answer && (
                    <div className="feedback">
                      {answer.chosen === answer.correct ? (
                        <p className="ok">Bonne réponse !</p>
                      ) : (
                        <p className="ko">Mauvaise réponse.</p>
                      )}
                      <button className="next" onClick={suivant}>Suivant</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {mode === 'exploration' && (
            <p className="hint">
              Clique un territoire pour voir son nom et ses villes principales
              s'afficher directement sur la carte.
            </p>
          )}
        </aside>
      </main>
    </div>
  )
}
