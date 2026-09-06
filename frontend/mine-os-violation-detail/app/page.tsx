'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Copy,
  FileText, GitBranch, Image as ImageIcon, MapPin, MoreHorizontal, Navigation, Plus, Search,
  ShieldCheck, Upload, Users, X, ZoomIn,
} from 'lucide-react'
import { getAuditLog, getCorrectiveActions, getViolation, updateCorrectiveAction, updateViolationStatus, uploadEvidence, verifyAuditLog } from '@/lib/api'

type Evidence = { id: number; url: string; name: string; mime_type: string; captured_at: string | null }
type Violation = {
  id: number; case_id: string; mine_name: string; mine_subsidiary: string; category: string; description: string
  status: string; severity: string; area: string | null; reported_by: number; reported_by_name: string
  latitude: number | null; longitude: number | null; gps_accuracy: number | null; device_timestamp: string | null
  server_received_at: string | null; created_at: string; ocr_text: string | null; evidence: Evidence | null
  escalation_status: string; hours_remaining: number | null
}
type CorrectiveAction = { id: number; action_taken: string; owner_name: string | null; due_at: string | null; status: string; notes: string | null }
type AuditEntry = { id: number; action: string; performed_by_name: string | null; details: string; created_at: string }
type Integrity = { valid: boolean; entriesChecked?: number; brokenAtEntryId?: number }

function titleCase(value: string) { return value.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not recorded' }
function dueLabel(violation: Violation) {
  if (violation.escalation_status === 'closed') return 'Closed'
  if (violation.escalation_status === 'escalated') return `Overdue by ${Math.max(1, Math.abs(violation.hours_remaining || 0))}h`
  return `${Math.max(0, violation.hours_remaining || 0)}h remaining`
}

function Avatar({ initials, tone = 'blue' }: { initials: string; tone?: 'blue' | 'sand' | 'green' }) { return <span className={`avatar avatar-${tone}`}>{initials}</span> }
function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) { return <span className={`pill pill-${tone}`}>{children}</span> }

export default function Page() {
  const [violationId, setViolationId] = useState<number | null>(null)
  const [violation, setViolation] = useState<Violation | null>(null)
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [integrity, setIntegrity] = useState<Integrity | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadRecord = useCallback(async (id: number) => {
    setLoading(true)
    setError('')
    try {
      const [record, actionRecords, auditRecords] = await Promise.all([getViolation(id), getCorrectiveActions(id), getAuditLog(id)])
      setViolation(record)
      setActions(actionRecords)
      setAudit(auditRecords)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load this violation.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('id'))
    if (!Number.isInteger(id) || id <= 0) {
      setError('Open a violation with a numeric id, for example ?id=1.')
      setLoading(false)
      return
    }
    setViolationId(id)
    void loadRecord(id)
  }, [loadRecord])

  const completed = useMemo(() => actions.filter((action) => action.status === 'completed').length, [actions])
  const evidenceUrl = violation?.evidence ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}${violation.evidence.url}` : null

  async function changeStatus(status: string) {
    if (!violation || !violationId) return
    try {
      await updateViolationStatus(violationId, { status, performed_by: violation.reported_by })
      setStatusOpen(false)
      await loadRecord(violationId)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update the status.')
    }
  }

  async function changeAction(action: CorrectiveAction) {
    if (!violation || !violationId) return
    const status = action.status === 'completed' ? 'in_progress' : 'completed'
    try {
      await updateCorrectiveAction(action.id, { status, performed_by: violation.reported_by })
      await loadRecord(violationId)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update the corrective action.')
    }
  }

  async function verifyIntegrity() {
    try {
      setIntegrity(await verifyAuditLog())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not verify the audit log.')
    }
  }

  async function addEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !violation || !violationId) return
    setUploading(true)
    setError('')
    try {
      await uploadEvidence(violationId, file, { performed_by: String(violation.reported_by), captured_at: new Date().toISOString() })
      await loadRecord(violationId)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not upload evidence.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const copyText = async () => {
    if (!violation?.ocr_text) return
    await navigator.clipboard?.writeText(violation.ocr_text)
  }

  if (loading) return <main className="mineos-shell"><p className="page-wrap">Loading violation…</p></main>
  if (!violation) return <main className="mineos-shell"><p role="alert" className="page-wrap">{error || 'Violation not found.'}</p></main>

  return <main className="mineos-shell">
    <header className="topbar"><div className="topbar-inner"><div className="brand"><div className="brand-mark"><GitBranch size={17} strokeWidth={2.5} /></div><span>mine<span>os</span></span></div><div className="topbar-divider" /><nav className="topnav"><a className="active" href="#violation">Violations</a><a href="#audit">Audit history</a></nav><div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button" aria-label="Notifications"><Clock3 size={18} /></button><Avatar initials={violation.reported_by_name.split(' ').map((name) => name[0]).slice(0, 2).join('')} tone="sand" /><ChevronDown size={14} className="muted-icon" /></div></div></header>
    <div className="page-wrap" id="violation"><div className="page-toolbar"><button className="back-link" onClick={() => window.history.back()}><ArrowLeft size={16} /> All violations</button><div className="breadcrumbs"><span>MineOS</span><span>/</span><span>Violations</span><span>/</span><strong>{violation.case_id}</strong></div><div className="toolbar-actions"><button className="button button-secondary" onClick={() => document.getElementById('actions')?.scrollIntoView({ behavior: 'smooth' })}><Users size={16} /> View actions</button><button className="button button-primary" onClick={() => setStatusOpen(true)}>Update status <ChevronDown size={15} /></button></div></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <section className="summary-card"><div className="summary-main"><div className="eyebrow">VIOLATION <span>•</span> {formatDate(violation.created_at)}</div><div className="title-row"><h1>{violation.description}</h1><Pill tone="progress">{titleCase(violation.status)}</Pill><Pill tone={violation.severity}>{titleCase(violation.severity)}</Pill></div><div className="summary-details"><div><span>Mine</span><strong>{violation.mine_name}</strong></div><div><span>Area</span><strong>{violation.area || 'Not recorded'}</strong></div><div className="reporter"><span>Reporter</span><strong>{violation.reported_by_name}</strong></div><div><span>Reported</span><strong>{formatDate(violation.created_at)}</strong></div></div></div><div className="sla-panel"><div className="sla-icon"><AlertTriangle size={19} /></div><span className="eyebrow">SLA STATUS</span><strong>{dueLabel(violation)}</strong><small>{violation.escalation_status === 'escalated' ? 'Response target exceeded.' : 'Calculated from the report timestamp.'}</small></div><div className="integrity-wrap"><button className="integrity-badge" onClick={verifyIntegrity}><ShieldCheck size={17} /> {integrity?.valid ? 'Audit integrity verified' : 'Verify audit integrity'} <ChevronDown size={14} /></button>{integrity && <small>{integrity.valid ? `${integrity.entriesChecked} entries checked.` : `Integrity issue at entry ${integrity.brokenAtEntryId}.`}</small>}</div></section>
      <div className="content-grid"><div className="left-column"><section className="card evidence-card"><div className="section-heading"><div><span className="section-kicker">PRIMARY EVIDENCE</span><h2>Evidence & location</h2></div><label className="text-button"><Plus size={15} /> {uploading ? 'Uploading…' : 'Add evidence'}<input type="file" accept="image/*,application/pdf" onChange={addEvidence} disabled={uploading} hidden /></label></div>{evidenceUrl && violation.evidence?.mime_type.startsWith('image/') ? <button className="evidence-visual" onClick={() => setLightboxOpen(true)} aria-label="Open evidence image"><img src={evidenceUrl} alt={violation.evidence.name || 'Violation evidence'} className="h-full w-full object-cover" /><span className="zoom-hint"><ZoomIn size={15} /> View full image</span></button> : <div className="detail-evidence"><ImageIcon size={24} /><div><strong>{violation.evidence?.name || 'No evidence attached'}</strong><span>{violation.evidence ? 'Open the original file from the evidence link.' : 'Upload an image or PDF to attach evidence.'}</span></div></div>} {evidenceUrl && <a className="text-button" href={evidenceUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Open evidence file</a>}<div className="tag-row">{violation.evidence && <Pill tone="blue"><ImageIcon size={13} /> Evidence attached</Pill>}{violation.latitude !== null && <Pill tone="green"><MapPin size={13} /> GPS captured</Pill>}{violation.ocr_text && <Pill tone="purple"><FileText size={13} /> OCR processed</Pill>}</div><div className="location-grid"><div><span>Latitude</span><strong>{violation.latitude ?? 'Not recorded'}</strong></div><div><span>Longitude</span><strong>{violation.longitude ?? 'Not recorded'}</strong></div><div><span>Location accuracy</span><strong>{violation.gps_accuracy ? `±${Math.round(violation.gps_accuracy)} m` : 'Not recorded'}</strong></div><div><span>Device timestamp</span><strong>{formatDate(violation.device_timestamp)}</strong></div><div><span>Server received</span><strong>{formatDate(violation.server_received_at)}</strong></div></div><div className="map-preview"><div className="map-lines" /><div className="map-pin"><MapPin size={17} /></div><div className="map-caption"><strong>{violation.mine_name} · {violation.area || 'Reported location'}</strong><span>{violation.latitude ?? '—'}, {violation.longitude ?? '—'}</span></div><span className="map-action"><Navigation size={14} /> Location captured from report</span></div></section>
          <section className="card ocr-card"><div className="section-heading"><div><span className="section-kicker">DOCUMENT INTELLIGENCE</span><h2>OCR extraction</h2></div>{violation.ocr_text && <Pill tone="confidence">Captured</Pill>}</div><div className="ocr-text"><span>EXTRACTED FROM EVIDENCE</span><p>{violation.ocr_text || 'No OCR text has been captured for this violation.'}</p></div>{violation.ocr_text && <div className="ocr-actions"><button className="button button-secondary" onClick={copyText}><Copy size={15} /> Copy text</button></div>}</section></div>
        <div className="right-column"><section className="card action-card" id="actions"><div className="section-heading"><div><span className="section-kicker">REMEDIATION</span><h2>Corrective action plan</h2></div><MoreHorizontal size={18} /></div><div className="progress-line"><div><strong>{completed} of {actions.length} completed</strong><span>{actions.length ? Math.round((completed / actions.length) * 100) : 0}% complete</span></div><div className="progress-track"><span style={{ width: `${actions.length ? (completed / actions.length) * 100 : 0}%` }} /></div></div><div className="checklist">{actions.map((action) => <button className={`check-item ${action.status === 'completed' ? 'done' : ''}`} key={action.id} onClick={() => changeAction(action)}><span className={`check-box ${action.status === 'completed' ? 'checked' : ''}`}>{action.status === 'completed' && <Check size={13} />}</span><span className="check-copy"><strong>{action.action_taken}</strong><small>{action.owner_name || 'Unassigned'} · {action.due_at ? `due ${formatDate(action.due_at)}` : 'no due date'}</small></span></button>)}{!actions.length && <p className="empty-state">No corrective actions have been assigned yet.</p>}</div></section><section className="card insight-card"><div className="insight-icon"><AlertTriangle size={17} /></div><div><strong>{titleCase(violation.severity)} risk requires attention</strong><p>{violation.escalation_status === 'escalated' ? 'This violation has exceeded its SLA target.' : 'Monitor this violation until its corrective actions are completed.'}</p></div></section></div></div>
      <section className="card timeline-card" id="audit"><div className="timeline-header"><div><span className="section-kicker">IMMUTABLE RECORD</span><h2>Status and audit history</h2></div><button className="button button-secondary" onClick={verifyIntegrity}><ShieldCheck size={15} /> Verify chain</button></div><div className="timeline">{audit.map((entry) => <div className="timeline-item" key={entry.id}><div className="timeline-marker"><Avatar initials={(entry.performed_by_name || 'M').split(' ').map((name) => name[0]).slice(0, 2).join('')} tone="green" /></div><div className="timeline-content"><div className="timeline-meta"><strong>{titleCase(entry.action)}</strong><span>{formatDate(entry.created_at)}</span></div><p>{entry.details}</p><small>by {entry.performed_by_name || 'MineOS system'}</small></div><CheckCircle2 size={16} className="timeline-check" /></div>)}{!audit.length && <p className="empty-state">No audit entries are available for this violation.</p>}</div></section><footer className="page-footer"><span>MineOS Compliance Platform · MVP workspace</span><span><ShieldCheck size={14} /> Audit log protected by hash chain</span></footer>
    </div>
    {statusOpen && <div className="modal-backdrop" onClick={() => setStatusOpen(false)}><div className="status-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">WORKFLOW</span><h2>Update status</h2></div><button className="icon-button" onClick={() => setStatusOpen(false)}><X size={18} /></button></div><p>Choose the next state for violation <strong>{violation.case_id}</strong>.</p><div className="status-options">{['open', 'acknowledged', 'in_progress', 'resolved', 'closed'].map((option) => <button key={option} className={violation.status === option ? 'selected' : ''} onClick={() => changeStatus(option)}>{titleCase(option)}{violation.status === option && <Check size={16} />}</button>)}</div><button className="button button-secondary full-width" onClick={() => setStatusOpen(false)}>Cancel</button></div></div>}
    {lightboxOpen && evidenceUrl && <div className="lightbox" onClick={() => setLightboxOpen(false)}><button className="lightbox-close" aria-label="Close image"><X size={22} /></button><div className="lightbox-image" onClick={(event) => event.stopPropagation()}><img src={evidenceUrl} alt={violation.evidence?.name || 'Violation evidence'} /><p>{violation.evidence?.name}</p></div></div>}
  </main>
}
