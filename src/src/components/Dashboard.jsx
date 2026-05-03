import { useState, useEffect, useCallback } from 'react'
import { fetchQueue, fetchBeds } from '../services/api.js'
import { esiMeta, mockQueueData, mockBedsData } from '../services/helpers.js'
import './Dashboard.css'

/* ── ESI display metadata ── */
const ESI_FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'ESI 1', value: 1 },
  { label: 'ESI 2', value: 2 },
  { label: 'ESI 3', value: 3 },
  { label: 'ESI 4+', value: 4 },
]

export default function Dashboard() {
  const [queue, setQueue]         = useState([])
  const [beds, setBeds]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [esiFilter, setEsiFilter] = useState(null)
  const [ticker, setTicker]       = useState(0)

  const load = useCallback(async () => {
    try {
      const [qRes, bRes] = await Promise.all([fetchQueue(), fetchBeds()])
      setQueue(qRes.patients ?? qRes)
      setBeds(bRes.beds ?? bRes)
    } catch {
      setQueue(mockQueueData())
      setBeds(mockBedsData())
    }
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const iv   = setInterval(load, 30_000)
    const tick = setInterval(() => setTicker(t => t + 1), 1000)
    return () => { clearInterval(iv); clearInterval(tick) }
  }, [load])

  /* derived stats */
  const critical   = queue.filter(p => p.esi_level <= 2)
  const urgent     = queue.filter(p => p.esi_level === 3)
  const nonUrgent  = queue.filter(p => p.esi_level >= 4)
  const needReview = queue.filter(p => p.needs_human_review)
  const available  = beds.filter(b => b.status === 'available').length
  const occupied   = beds.filter(b => b.status === 'occupied').length

  const filteredQueue = esiFilter == null
    ? queue
    : esiFilter === 4
      ? queue.filter(p => p.esi_level >= 4)
      : queue.filter(p => p.esi_level === esiFilter)

  const avgWait = queue.length
    ? Math.round(queue.reduce((s, p) => s + (p.waiting_minutes ?? p.wait ?? 0), 0) / queue.length)
    : 0

  return (
    <div className="dash">

      {/* ── KPI Tiles ── */}
      <div className="dash-kpi-row">
        <KpiCard
          icon="🚨" label="Critical (ESI 1–2)"
          value={critical.length} total={queue.length}
          accent="var(--esi1)" bg="var(--esi1bg)" border="var(--esi1border)"
          pulse={critical.length > 0}
        />
        <KpiCard
          icon="⚠️" label="Urgent (ESI 3)"
          value={urgent.length} total={queue.length}
          accent="var(--esi3)" bg="var(--esi3bg)" border="var(--esi3border)"
        />
        <KpiCard
          icon="✅" label="Non-Urgent (ESI 4–5)"
          value={nonUrgent.length} total={queue.length}
          accent="var(--esi4)" bg="var(--esi4bg)" border="var(--esi4border)"
        />
        <KpiCard
          icon="👁" label="Need Review"
          value={needReview.length} total={queue.length}
          accent="var(--amber)" bg="rgba(196,154,0,0.09)" border="rgba(196,154,0,0.28)"
        />
        <KpiCard
          icon="🛏" label="Beds Available"
          value={available} total={beds.length}
          accent="var(--blue)" bg="var(--blue-dim)" border="rgba(46,126,176,0.28)"
        />
        <KpiCard
          icon="⏱" label="Avg Wait"
          value={`${avgWait}m`} unit=""
          accent="var(--tx2)" bg="var(--bg4)" border="var(--border)"
          noBar
        />
        <div className="dash-kpi-refresh">
          {lastRefresh && (
            <div className="dash-refresh-time">
              <span className="dash-live-dot" />
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
          <button className="dash-refresh-btn" onClick={load} disabled={loading}>
            {loading ? <span className="dash-spin" /> : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="dash-body">

        {/* Col 1 — Queue */}
        <section className="dash-col dash-col--queue">
          <div className="dash-col-head">
            <span className="dash-col-title">Patient Queue</span>
            <span className="dash-col-badge" style={{ background: 'var(--esi1bg)', color: 'var(--esi1)', borderColor: 'var(--esi1border)' }}>
              {queue.length}
            </span>
            <div className="dash-filter-pills">
              {ESI_FILTER_OPTIONS.map(o => (
                <button
                  key={o.label}
                  className={`dash-pill${esiFilter === o.value ? ' active' : ''}`}
                  onClick={() => setEsiFilter(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="dash-queue-list">
            {loading && queue.length === 0 && (
              <div className="dash-loading">
                <span className="dash-spin" /> Loading patients…
              </div>
            )}
            {filteredQueue.map(patient => (
              <PatientCard
                key={patient.patient_id ?? patient.id}
                patient={patient}
                isSelected={selected?.patient_id === patient.patient_id}
                onClick={() => setSelected(
                  selected?.patient_id === patient.patient_id ? null : patient
                )}
                ticker={ticker}
              />
            ))}
            {filteredQueue.length === 0 && !loading && (
              <div className="dash-empty-state">No patients match this filter</div>
            )}
          </div>
        </section>

        {/* Col 2 — Bed Map */}
        <section className="dash-col dash-col--beds">
          <div className="dash-col-head">
            <span className="dash-col-title">Bed Status</span>
            <span className="dash-col-badge">{available} free / {beds.length} total</span>
          </div>
          <BedMap beds={beds} occupied={occupied} available={available} />
        </section>

        {/* Col 3 — Detail */}
        <section className="dash-col dash-col--detail">
          <div className="dash-col-head">
            <span className="dash-col-title">
              {selected ? 'Patient Details' : 'Clinical Detail'}
            </span>
            {selected && (
              <button className="dash-close-btn" onClick={() => setSelected(null)}>✕ Close</button>
            )}
          </div>
          {selected ? (
            <DetailPanel patient={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="dash-detail-empty">
              <div className="dash-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
              </div>
              <p className="dash-empty-label">Select a patient card</p>
              <p className="dash-empty-sub">to view Gemini clinical findings,<br/>override flags & recommended actions</p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────── */
function KpiCard({ icon, label, value, total, accent, bg, border, pulse, noBar, unit }) {
  const pct = total > 0 && !noBar ? Math.round((Number(value) / total) * 100) : 0
  return (
    <div className="kpi-card" style={{ '--kpi-accent': accent, '--kpi-bg': bg, '--kpi-border': border }}>
      <div className="kpi-icon">
        {pulse && <span className="kpi-pulse-ring" />}
        <span>{icon}</span>
      </div>
      <div className="kpi-body">
        <div className="kpi-value">{value}{unit ?? ''}</div>
        <div className="kpi-label">{label}</div>
        {!noBar && total > 0 && (
          <div className="kpi-bar-track">
            <div className="kpi-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Patient Card
───────────────────────────────────────────── */
function PatientCard({ patient, isSelected, onClick, ticker }) {
  const esi_level = patient.esi_level
  const meta      = esiMeta(esi_level)
  const conf      = patient.confidence ?? 0
  const confPct   = Math.round(conf * 100)
  const wait      = patient.waiting_minutes ?? patient.wait ?? 0
  const name      = patient.name ?? patient.complaint_label ?? `Patient ${patient.patient_id ?? patient.id}`
  const crit      = patient.critical_flags ?? []
  const override  = patient.override_applied
  const review    = patient.needs_human_review

  return (
    <div
      className={`pcard${isSelected ? ' selected' : ''}${esi_level <= 2 ? ' pcard--critical' : ''}`}
      onClick={onClick}
      style={{ '--pcard-color': meta.color, '--pcard-bg': meta.bg, '--pcard-border': meta.border }}
    >
      {/* Left — ESI badge */}
      <div className="pcard-esi" style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
        <span className="pcard-esi-num">{esi_level}</span>
        <span className="pcard-esi-lbl">{meta.short}</span>
      </div>

      {/* Center — info */}
      <div className="pcard-body">
        <div className="pcard-name">
          {name}
          {override && <span className="pcard-chip pcard-chip--override">OVR</span>}
          {review   && <span className="pcard-chip pcard-chip--review">!</span>}
        </div>
        <div className="pcard-meta">
          {patient.age}{patient.gender} ·{' '}
          <span className={wait >= 45 ? 'pcard-wait--long' : ''}>⏱ {wait}m</span>
          {crit.length > 0 && (
            <span className="pcard-crit-tag">🔴 {crit.length} flag{crit.length > 1 ? 's' : ''}</span>
          )}
        </div>
        {/* confidence bar */}
        <div className="pcard-conf-track">
          <div
            className="pcard-conf-fill"
            style={{ width: `${confPct}%`, background: meta.color }}
          />
        </div>
      </div>

      {/* Right — confidence % */}
      <div className="pcard-right">
        <div className="pcard-conf-val" style={{ color: confPct >= 70 ? 'var(--green)' : 'var(--amber)' }}>
          {confPct}%
        </div>
        <div className="pcard-arrow">›</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Bed Map
───────────────────────────────────────────── */
const STATUS_META = {
  available: { color: '#1e9e6a', bg: 'rgba(30,158,106,0.10)', border: 'rgba(30,158,106,0.35)', icon: '✓', label: 'Available' },
  occupied:  { color: '#e02020', bg: 'rgba(224,32,32,0.10)',  border: 'rgba(224,32,32,0.35)',  icon: '●', label: 'Occupied'  },
  cleaning:  { color: '#2e7eb0', bg: 'rgba(46,126,176,0.10)', border: 'rgba(46,126,176,0.35)', icon: '◐', label: 'Cleaning'  },
  pending:   { color: '#c49a00', bg: 'rgba(196,154,0,0.10)',  border: 'rgba(196,154,0,0.35)',  icon: '◌', label: 'Pending'   },
}

const CATEGORY_ICONS = {
  resuscitation: '💉', trauma: '🚑', monitored: '📟', general: '🏥', fast_track: '⚡',
  Resus: '💉', Majors: '📟', Minors: '🏥',
}

function BedMap({ beds, occupied, available }) {
  const getZone = b => b.zone ?? b.category ?? 'General'
  const getCode = b => b.code ?? b.bed_id ?? '?'
  const zones   = [...new Set(beds.map(getZone))]

  return (
    <div className="bedmap">
      {/* Legend */}
      <div className="bedmap-legend">
        {Object.entries(STATUS_META).map(([s, m]) => (
          <div key={s} className="bedmap-legend-item">
            <span className="bedmap-legend-dot" style={{ background: m.color }} />
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Zone sections */}
      <div className="bedmap-zones">
        {zones.map(zone => {
          const zoneBeds = beds.filter(b => getZone(b) === zone)
          const zAvail   = zoneBeds.filter(b => b.status === 'available').length
          const icon     = CATEGORY_ICONS[zone] ?? '🛏'
          return (
            <div key={zone} className="bedmap-zone">
              <div className="bedmap-zone-header">
                <span className="bedmap-zone-icon">{icon}</span>
                <span className="bedmap-zone-name">{zone.replace('_', ' ')}</span>
                <span className="bedmap-zone-stat">{zAvail}/{zoneBeds.length} free</span>
              </div>
              <div className="bedmap-grid">
                {zoneBeds.map(bed => {
                  const sm = STATUS_META[bed.status] ?? STATUS_META.available
                  return (
                    <div
                      key={getCode(bed)}
                      className="bed-tile"
                      title={`${getCode(bed)} — ${bed.status}${bed.patient_id ? ` (${bed.patient_id})` : ''}`}
                      style={{
                        '--bt-color':  sm.color,
                        '--bt-bg':     sm.bg,
                        '--bt-border': sm.border,
                      }}
                    >
                      <span className="bed-tile-code">{getCode(bed)}</span>
                      <span className="bed-tile-icon">{sm.icon}</span>
                      <span className="bed-tile-status">{bed.status}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Donut summary */}
      <BedDonut total={beds.length} available={available} occupied={occupied} />
    </div>
  )
}

function BedDonut({ total, available, occupied }) {
  if (total === 0) return null
  const r = 36
  const circ = 2 * Math.PI * r
  const availPct = available / total
  const occupPct = occupied  / total
  const availDash = circ * availPct
  const occupDash = circ * occupPct
  const cleaning  = total - available - occupied

  return (
    <div className="bed-donut-wrap">
      <svg width="90" height="90" viewBox="0 0 90 90">
        {/* bg */}
        <circle cx="45" cy="45" r={r} fill="none" stroke="var(--bg4)" strokeWidth="10" />
        {/* occupied */}
        <circle cx="45" cy="45" r={r} fill="none"
          stroke="#e02020" strokeWidth="10" strokeLinecap="butt"
          strokeDasharray={`${occupDash} ${circ}`}
          transform="rotate(-90 45 45)"
        />
        {/* available */}
        <circle cx="45" cy="45" r={r} fill="none"
          stroke="#1e9e6a" strokeWidth="10" strokeLinecap="butt"
          strokeDasharray={`${availDash} ${circ}`}
          strokeDashoffset={-occupDash}
          transform="rotate(-90 45 45)"
        />
        <text x="45" y="41" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--tx)">{available}</text>
        <text x="45" y="54" textAnchor="middle" fontSize="9"  fill="var(--tx3)">free</text>
      </svg>
      <div className="bed-donut-legend">
        <div className="bed-donut-item"><span style={{ background: '#1e9e6a' }} />{available} available</div>
        <div className="bed-donut-item"><span style={{ background: '#e02020' }} />{occupied} occupied</div>
        <div className="bed-donut-item"><span style={{ background: '#2e7eb0' }} />{cleaning} cleaning</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Detail Panel
───────────────────────────────────────────── */
function DetailPanel({ patient, onClose }) {
  const meta    = esiMeta(patient.esi_level)
  const confPct = Math.round((patient.confidence ?? 0) * 100)
  const wait    = patient.waiting_minutes ?? patient.wait ?? 0
  const name    = patient.name ?? patient.complaint_label ?? '—'
  const findings  = patient.top_clinical_findings ?? patient.top_risk_factors ?? []
  const critFlags = patient.critical_flags ?? []

  return (
    <div className="dp">

      {/* Patient hero card */}
      <div className="dp-hero" style={{ '--hero-color': meta.color, '--hero-bg': meta.bg, '--hero-border': meta.border }}>
        <div className="dp-hero-esi">
          <span className="dp-hero-num">{patient.esi_level}</span>
          <div>
            <div className="dp-hero-short">{meta.short}</div>
            <div className="dp-hero-label">{meta.label}</div>
          </div>
          {patient.override_applied && (
            <span className="dp-hero-chip dp-hero-chip--override">OVERRIDE</span>
          )}
        </div>
        <div className="dp-hero-info">
          <div className="dp-hero-name">{name}</div>
          <div className="dp-hero-sub">
            {patient.age}{patient.gender}
            {patient.complaint_label && ` · ${patient.complaint_label}`}
          </div>
          <div className="dp-hero-wait">⏱ Waiting {wait} minutes</div>
        </div>
      </div>

      {/* Review alert */}
      {patient.needs_human_review && (
        <div className="dp-alert dp-alert--review">
          <span className="dp-alert-icon">👁</span>
          <div>
            <div className="dp-alert-title">Human Review Required</div>
            <div className="dp-alert-body">Model confidence or clinical signal mismatch detected</div>
          </div>
        </div>
      )}

      {/* Confidence tile */}
      <div className="dp-tile">
        <div className="dp-tile-head">
          <span className="dp-tile-title">Model Confidence</span>
          <span className="dp-conf-val" style={{ color: confPct >= 70 ? 'var(--green)' : 'var(--amber)' }}>
            {confPct}%
          </span>
        </div>
        <div className="dp-conf-track">
          <div className="dp-conf-fill" style={{
            width: `${confPct}%`,
            background: confPct >= 70 ? 'var(--green)' : 'var(--amber)',
          }} />
        </div>
      </div>

      {/* Critical flags */}
      {critFlags.length > 0 && (
        <div className="dp-tile dp-tile--danger">
          <div className="dp-tile-title">⚠ Critical Vital Flags</div>
          <div className="dp-crit-list">
            {critFlags.map((f, i) => (
              <div key={i} className="dp-crit-flag">{f}</div>
            ))}
          </div>
        </div>
      )}

      {/* Gemini findings */}
      {findings.length > 0 && (
        <div className="dp-tile">
          <div className="dp-tile-head">
            <span className="dp-tile-title">Clinical Findings</span>
            <span className="dp-gemini-badge">✦ Gemini</span>
          </div>
          <div className="dp-findings">
            {findings.map((f, i) => (
              <div key={i} className="dp-finding">
                <span className="dp-finding-num" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>{i + 1}</span>
                <span className="dp-finding-text">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended action */}
      <div className="dp-tile dp-tile--action" style={{ '--action-border': meta.border, '--action-bg': meta.bg }}>
        <div className="dp-tile-title">Recommended Action</div>
        <div className="dp-action-content">
          <div className="dp-action-dot" style={{ background: meta.color }} />
          <p className="dp-action-text">{getGuidance(patient.esi_level)}</p>
        </div>
      </div>

    </div>
  )
}

function getGuidance(level) {
  const map = {
    1: 'Immediate resuscitation. Activate trauma/code team NOW.',
    2: 'Emergent — physician within 15 minutes. Continuous monitoring.',
    3: 'Urgent — reassess every 30 min. IV access recommended.',
    4: 'Less urgent — one resource needed. Can wait 60–120 minutes.',
    5: 'Non-urgent — routine care. Consider GP referral.',
  }
  return map[level] ?? '—'
}
