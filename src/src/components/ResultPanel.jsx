import { esiMeta } from '../services/helpers.js'
import './ResultPanel.css'

export default function ResultPanel({ result, onClear }) {
  const {
    esi_level,
    confidence,
    model_version,
    override_applied,
    override_reason,
    needs_human_review,
    uncertainty_reason,
    clinical_summary,
    top_clinical_findings = [],
    immediate_next_steps  = [],
    confidence_explanation,
    critical_probability,
  } = result

  const meta          = esiMeta(esi_level)
  const confidencePct = Math.round((confidence ?? 0) * 100)
  const isHighConf    = confidencePct >= 70
  const critPct       = Math.round((critical_probability ?? 0) * 100)

  return (
    <div className="rp-wrap">
      <div className="rp-inner">

        {/* ESI ring */}
        <div className="rp-esi-ring" style={{ '--esi-color': meta.color, '--esi-bg': meta.bg, '--esi-border': meta.border }}>
          <div className="rp-esi-circle">
            <span className="rp-esi-num">{esi_level}</span>
            <span className="rp-esi-label">{meta.label}</span>
          </div>
          <svg className="rp-ring-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bg4)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={meta.color} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54 * ((6 - esi_level) / 5)} ${2 * Math.PI * 54}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
        </div>

        {/* Priority chip */}
        <div className="rp-priority" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
          <span className="rp-priority-dot" style={{ background: meta.color }} />
          {meta.short} — {meta.label}
        </div>

        {/* Override alert */}
        {override_applied && override_reason && (
          <div className="rp-alert rp-alert--override">
            <span className="rp-alert-icon">⚠</span>
            <div>
              <div className="rp-alert-title">Clinical Override Applied</div>
              <div className="rp-alert-body">{override_reason}</div>
            </div>
          </div>
        )}

        {/* Human review warning */}
        {needs_human_review && (
          <div className="rp-alert rp-alert--review">
            <span className="rp-alert-icon">👁</span>
            <div>
              <div className="rp-alert-title">Human Review Required</div>
              <div className="rp-alert-body">{uncertainty_reason}</div>
            </div>
          </div>
        )}

        {/* Clinical summary */}
        {clinical_summary && (
          <div className="rp-summary">
            <div className="rp-section-title">Clinical Summary</div>
            <p className="rp-summary-text">{clinical_summary}</p>
          </div>
        )}

        {/* Model confidence */}
        <div className="rp-conf-section">
          <div className="rp-conf-header">
            <span className="rp-conf-title">Model confidence</span>
            <span className="rp-conf-val" style={{ color: isHighConf ? 'var(--green)' : 'var(--amber)' }}>
              {confidencePct}%
            </span>
          </div>
          <div className="rp-conf-track">
            <div
              className="rp-conf-fill"
              style={{
                width: `${confidencePct}%`,
                background: isHighConf ? 'var(--green)' : 'var(--amber)',
                transition: 'width 0.8s ease',
              }}
            />
          </div>
          {critical_probability !== undefined && (
            <div className="rp-conf-sub">Critical prob: {critPct}%</div>
          )}
          {confidence_explanation && (
            <p className="rp-conf-note" style={{ color: 'var(--tx3)' }}>{confidence_explanation}</p>
          )}
        </div>

        {/* Gemini clinical findings */}
        {top_clinical_findings.length > 0 && (
          <div className="rp-findings-section">
            <div className="rp-section-title">
              <span className="rp-gemini-badge">✦ Gemini</span> Top Clinical Findings
            </div>
            <div className="rp-findings-list">
              {top_clinical_findings.map((finding, i) => (
                <div key={i} className="rp-finding-row">
                  <div className="rp-finding-rank" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>{i + 1}</div>
                  <div className="rp-finding-text">{finding}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gemini next steps */}
        {immediate_next_steps.length > 0 && (
          <div className="rp-steps-section">
            <div className="rp-section-title">
              <span className="rp-gemini-badge">✦ Gemini</span> Immediate Next Steps
            </div>
            <ol className="rp-steps-list">
              {immediate_next_steps.map((step, i) => (
                <li key={i} className="rp-step-item">
                  <span className="rp-step-num">{i + 1}</span>
                  <span className="rp-step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="rp-footer">
          <span className="rp-model-ver">model {model_version}</span>
          <button className="rp-clear-btn" onClick={onClear}>New patient →</button>
        </div>
      </div>
    </div>
  )
}
