import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { MapContainer, GeoJSON, Marker } from 'react-leaflet'
import L from 'leaflet'
import { CITIES_CARIBBEAN, CITIES_AFRICA } from './data/cities'
import './App.css'

// ============================== CONFIG RÉGIONS ==============================
const REGIONS = {
  caribbean: {
    label: 'Caraïbes',
    emoji: '🏝',
    fichier: 'caribbean.geojson',
    cities: CITIES_CARIBBEAN,
    bounds: [
      [10.5, -85.5],
      [27.5, -59],
    ],
    minZoom: 5,
    maxZoom: 10,
  },
  africa: {
    label: 'Afrique',
    emoji: '🌍',
    fichier: 'africa.geojson',
    cities: CITIES_AFRICA,
    bounds: [
      [-36, -25],
      [38, 57],
    ],
    minZoom: 2,
    maxZoom: 8,
  },
}

const PALETTE = [
  '#E07A5F', '#81B29A', '#F2CC8F', '#3D5A80', '#EE6C4D',
  '#98C1D9', '#BC4749', '#A7C957', '#6A4C93', '#F4A261',
  '#2A9D8F', '#E76F51', '#264653', '#8AB17D', '#D88C9A',
  '#F6BD60', '#84A59D', '#F28482', '#9D6B53', '#5B8E7D',
  '#B07BAC', '#E9C46A', '#577590', '#F9844A', '#90BE6D',
  '#F94144', '#43AA8B', '#277DA1',
]

const STATUT_SHORT = {
  'indépendant': '',
  'France': 'FR.',
  'territoire britannique': 'R.-U.',
  'Pays-Bas': 'P.-B.',
  'territoire des États-Unis': 'É.-U.',
  'territoire contesté': 'contesté',
}

const NIVEAUX = {
  facile: { label: 'Facile', description: '4 choix' },
  moyen: { label: 'Moyen', description: 'saisie + indice' },
  difficile: { label: 'Difficile', description: 'saisie sans indice' },
}

// ============================== HELPERS ==============================
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Normalise une chaîne pour comparaison fuzzy : minuscules, sans accents,
// sans apostrophes/tirets/espaces.
function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Masque un nom à la façon du pendu : on garde la première lettre de chaque
// mot (séparé par espace, tiret ou apostrophe) et on masque le reste avec •.
function maskName(name) {
  let out = ''
  let inWord = false
  for (const ch of name) {
    if (/\p{L}/u.test(ch)) {
      if (!inWord) {
        out += ch
        inWord = true
      } else {
        out += '•'
      }
    } else {
      out += ch
      inWord = false
    }
  }
  return out
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

function centroidOf(feature) {
  const g = feature.geometry
  if (!g) return [0, 0]
  const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  let bestRing = polygons[0][0]
  let bestArea = -1
  for (const poly of polygons) {
    const ring = poly[0]
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
  let twiceArea = 0, cx = 0, cy = 0
  for (let i = 0, n = bestRing.length - 1; i < n; i++) {
    const [x1, y1] = bestRing[i]
    const [x2, y2] = bestRing[i + 1]
    const cross = x1 * y2 - x2 * y1
    twiceArea += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  if (twiceArea === 0) return L.geoJSON(feature).getBounds().getCenter()
  const factor = 1 / (3 * twiceArea)
  return [cy * factor, cx * factor]
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

function HeartIcon() {
  return (
    <svg className="heart" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s-7.2-4.6-9.5-9.1C.7 8.6 2.7 5 6.4 5c2 0 3.6 1.1 5.6 3.1 2-2 3.6-3.1 5.6-3.1 3.7 0 5.7 3.6 3.9 6.9C19.2 16.4 12 21 12 21z"
        fill="#ff5d8f"
        stroke="#c2185b"
        strokeWidth="1"
      />
    </svg>
  )
}

// ============================== ÉCRAN D'ACCUEIL ==============================
function WelcomeScreen({ onChoose }) {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <h1 className="welcome-title">
          <HeartIcon />
          <span>Pussycat</span>
          <HeartIcon />
        </h1>
        <p className="welcome-sub">Choisis ta carte</p>
        <div className="welcome-regions">
          {Object.entries(REGIONS).map(([key, r]) => (
            <button
              key={key}
              className="region-card"
              type="button"
              onClick={() => onChoose(key)}
            >
              <span className="region-emoji" aria-hidden="true">{r.emoji}</span>
              <span className="region-label">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================== APP ==============================
export default function App() {
  const [region, setRegion] = useState(null)
  const [data, setData] = useState(null)
  const [niveau, setNiveau] = useState('facile')
  const [mode, setMode] = useState('quiz')
  const [selected, setSelected] = useState(null)
  const [options, setOptions] = useState([])
  const [answer, setAnswer] = useState(null)
  const [score, setScore] = useState({ ok: 0, total: 0 })
  const inputRef = useRef(null)

  // Charge le geojson de la région choisie.
  useEffect(() => {
    if (!region) {
      setData(null)
      return
    }
    const r = REGIONS[region]
    fetch(`${import.meta.env.BASE_URL}${r.fichier}`)
      .then((res) => res.json())
      .then((raw) => {
        raw.features.forEach((f, i) => {
          f.properties.color = PALETTE[i % PALETTE.length]
        })
        setData(raw)
      })
      .catch((e) => console.error('Chargement GeoJSON échoué', e))
  }, [region])

  // Reset quand on change de région ou de niveau.
  useEffect(() => {
    setSelected(null)
    setOptions([])
    setAnswer(null)
    setScore({ ok: 0, total: 0 })
  }, [region, niveau])

  // Autofocus du champ de saisie quand un territoire est sélectionné.
  useEffect(() => {
    if (selected && niveau !== 'facile' && !answer) {
      inputRef.current?.focus()
    }
  }, [selected, niveau, answer])

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
    if (niveau === 'facile') {
      const leurres = pickRandom(territoires.filter((t) => t !== bonneReponse), 3)
      setOptions(pickRandom([bonneReponse, ...leurres], 4))
    } else {
      setOptions([])
    }
    setSelected(feature)
    setAnswer(null)
  }

  function choisirQCM(option) {
    if (!selected || answer) return
    const correct = selected.properties.nom
    const ok = option === correct
    setAnswer({ chosen: option, correct, ok })
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }))
  }

  function validerSaisie(typed) {
    if (!selected || answer) return
    const correct = selected.properties.nom
    const ok = normalize(typed) === normalize(correct)
    setAnswer({ chosen: typed, correct, ok })
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

  function changerRegion() {
    setRegion(null)
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
    return answer.ok
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

  // -------- Welcome screen --------
  if (!region) {
    return <WelcomeScreen onChoose={setRegion} />
  }

  // -------- Quiz screen --------
  const r = REGIONS[region]
  const cities = r.cities
  const showLabel = selected && (mode === 'exploration' || !!answer)
  const geoKey = `${region}-${mode}-${selected?.properties.id ?? 'none'}-${answer ? 'a' : 'q'}`
  const pourcentage = score.total ? Math.round((score.ok / score.total) * 100) : 0

  return (
    <div className="app">
      <header className="top">
        <h1>
          <HeartIcon />
          <span>Pussycat</span>
          <HeartIcon />
        </h1>
        <div className="controls">
          <button className="region-pill" type="button" onClick={changerRegion}>
            {r.emoji} {r.label} <span className="change">— changer</span>
          </button>
          <div className="mode-switch" role="tablist" aria-label="Niveau">
            {Object.entries(NIVEAUX).map(([key, n]) => (
              <button
                key={key}
                role="tab"
                aria-selected={niveau === key}
                className={niveau === key ? 'on' : ''}
                onClick={() => setNiveau(key)}
                title={n.description}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="mode-switch" role="tablist" aria-label="Mode">
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
            key={region}
            bounds={r.bounds}
            minZoom={r.minZoom}
            maxZoom={r.maxZoom}
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
                {(cities[selected.properties.id] || []).map((v) => (
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
                  Clique sur un territoire de la carte.{' '}
                  {niveau === 'facile'
                    ? 'Quatre noms te seront proposés — choisis le bon.'
                    : niveau === 'moyen'
                    ? 'Tape son nom (un indice te sera donné).'
                    : 'Tape son nom (aucun indice).'}
                </p>
              )}

              {selected && (
                <div className="question">
                  <p className="prompt">Quel est ce territoire ?</p>

                  {niveau === 'facile' ? (
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
                            onClick={() => choisirQCM(opt)}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <TypedInput
                      key={selected.properties.id}
                      ref={inputRef}
                      target={selected.properties.nom}
                      statut={selected.properties.statut}
                      niveau={niveau}
                      answer={answer}
                      onSubmit={validerSaisie}
                    />
                  )}

                  {answer && (
                    <div className="feedback">
                      {answer.ok ? (
                        <p className="ok">Bonne réponse !</p>
                      ) : (
                        <p className="ko">
                          Mauvaise réponse — c'était <strong>{answer.correct}</strong>.
                        </p>
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

// ============================== INPUT DE SAISIE ==============================
const TypedInput = forwardRef(function TypedInput(
  { target, statut, niveau, answer, onSubmit },
  ref
) {
  const [val, setVal] = useState('')
  const localRef = useRef(null)
  useImperativeHandle(ref, () => ({
    focus: () => localRef.current?.focus(),
  }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!val.trim() || answer) return
    onSubmit(val)
  }

  // Compte uniquement les lettres (pas les espaces ni la ponctuation).
  const nbLettres = [...target].filter((c) => /\p{L}/u.test(c)).length
  const nbMots = target.trim().split(/[\s\-]+/).filter(Boolean).length
  const masque = maskName(target)

  return (
    <form className="typed" onSubmit={handleSubmit}>
      {niveau === 'moyen' && (
        <div className="indices">
          <p className="indice motif" aria-label="Motif">{masque}</p>
          <ul className="indice-meta">
            <li>
              <strong>{nbLettres}</strong> lettre{nbLettres > 1 ? 's' : ''}
              {nbMots > 1 && <> en <strong>{nbMots}</strong> mots</>}
            </li>
            <li>
              Statut : <em>{statut}</em>
            </li>
          </ul>
        </div>
      )}
      <div className="typed-row">
        <input
          ref={localRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={!!answer}
          placeholder="Tape ta réponse…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="submit" disabled={!!answer || !val.trim()}>
          Valider
        </button>
      </div>
    </form>
  )
})
