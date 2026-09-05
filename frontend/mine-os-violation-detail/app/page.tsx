'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Copy,
  FileText,
  GitBranch,
  Image as ImageIcon,
  MapPin,
  Menu,
  MoreHorizontal,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
  ZoomIn,
} from 'lucide-react'

const API_ENDPOINTS = {
  violation: '/api/violations/VIO-2026-0148',
  audit: '/api/audit-log/VIO-2026-0148',
  verify: '/api/audit-log/verify',
}

const initialActions = [
  { id: 1, label: 'Inspect affected roof support zone', meta: 'Rakesh Kumar · due today', done: true },
  { id: 2, label: 'Restrict access to Active Panel 3', meta: 'Suresh Yadav · due today', done: true },
  { id: 3, label: 'Replace non-compliant support materials', meta: 'Maintenance crew · overdue 6h', done: false, blocked: true },
  { id: 4, label: 'Upload supervisor verification photo', meta: 'Priya Singh · due 06 Sep', done: false },
]

const timeline = [
  { time: '05 Sep 2026 · 16:26', name: 'MineOS system', action: 'SLA escalated', note: 'Response target exceeded by 6h 14m.', danger: true, initials: 'M' },
  { time: '05 Sep 2026 · 14:18', name: 'Priya Singh', action: 'Evidence uploaded', note: 'Added roof-support inspection photo from Panel 3.', initials: 'PS' },
  { time: '05 Sep 2026 · 12:05', name: 'Suresh Yadav', action: 'Corrective action assigned', note: 'Assigned 4-step remediation plan to Panel 3 crew.', initials: 'SY' },
  { time: '05 Sep 2026 · 11:16', name: 'Anil Kumar', action: 'Status changed from Open to Acknowledged', note: 'Manager confirmed receipt and started review.', initials: 'AK' },
  { time: '05 Sep 2026 · 10:47', name: 'MineOS system', action: 'Manager notified', note: 'Critical violation alert sent to site leadership.', initials: 'M' },
  { time: '05 Sep 2026 · 10:42', name: 'Rakesh Kumar', action: 'Report created', note: 'New critical violation logged from underground inspection.', initials: 'RK' },
]

function Avatar({ initials, tone = 'blue' }: { initials: string; tone?: 'blue' | 'sand' | 'green' }) {
  return <span className={`avatar avatar-${tone}`}>{initials}</span>
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export default function Page() {
  const [status, setStatus] = useState('In Progress')
  const [actions, setActions] = useState(initialActions)
  const [statusOpen, setStatusOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const completed = useMemo(() => actions.filter((item) => item.done).length, [actions])
  const toggleAction = (id: number) => setActions((items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item))
  const copyText = async () => {
    await navigator.clipboard?.writeText('ROOF SUPPORT SPACING: 1.8M | PERMITTED MAX: 1.5M | PANEL 3 | INSPECTION REQUIRED')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="mineos-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><div className="brand-mark"><GitBranch size={17} strokeWidth={2.5} /></div><span>mine<span>os</span></span></div>
          <div className="topbar-divider" />
          <nav className="topnav"><a className="active" href="#violations">Violations</a><a href="#dashboard">Dashboard</a><a href="#reports">Reports</a><a href="#people">People</a></nav>
          <div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button has-dot" aria-label="Notifications"><Clock3 size={18} /></button><Avatar initials="AK" tone="sand" /><ChevronDown size={14} className="muted-icon" /></div>
        </div>
      </header>

      <div className="page-wrap">
        <div className="page-toolbar"><button className="back-link"><ArrowLeft size={16} /> All violations</button><div className="breadcrumbs"><span>MineOS</span><span>/</span><span>Violations</span><span>/</span><strong>VIO-2026-0148</strong></div><div className="toolbar-actions"><button className="button button-secondary"><Users size={16} /> Assign action</button><button className="button button-primary" onClick={() => setStatusOpen(true)}>Update status <ChevronDown size={15} /></button><div className="relative"><button className="button button-icon" onClick={() => setMenuOpen(!menuOpen)} aria-label="More actions"><MoreHorizontal size={18} /></button>{menuOpen && <div className="menu-popover"><button>Export violation</button><button>Print summary</button><button>Archive record</button></div>}</div></div></div>

        <section className="summary-card">
          <div className="summary-main">
            <div className="eyebrow">VIOLATION <span>•</span> 05 SEP 2026</div>
            <div className="title-row"><h1>Roof support spacing exceeds permitted limit</h1><Pill tone="progress">{status}</Pill><Pill tone="critical">Critical</Pill></div>
            <p className="summary-copy">Roof support spacing measured at 1.8m in Active Panel 3, exceeding the permitted maximum of 1.5m. Immediate corrective action is required to maintain ground control.</p>
            <div className="summary-details"><div><span>Mine</span><strong>Jharia OCP-3</strong></div><div><span>Area</span><strong>Active Panel 3</strong></div><div className="reporter"><span>Reporter</span><strong><Avatar initials="RK" /> Rakesh Kumar</strong></div><div><span>Reported</span><strong>05 Sep 2026, 10:42 AM</strong></div></div>
          </div>
          <div className="sla-panel"><div className="sla-icon"><AlertTriangle size={19} /></div><span className="eyebrow">SLA STATUS</span><strong>Overdue by 6h 14m</strong><small>Target was 05 Sep · 10:42 AM</small></div>
          <div className="integrity-wrap"><button className="integrity-badge" onClick={() => setVerifyOpen(!verifyOpen)}><ShieldCheck size={17} /> Audit integrity verified <ChevronDown size={14} /></button><small>Hash chain verified — 8 entries checked.</small>{verifyOpen && <div className="verify-popover"><div className="verify-title"><ShieldCheck size={18} /> Verification complete</div><p>Every audit entry is linked and untampered.</p><code>sha256: 7a9c...4e21</code><span>{API_ENDPOINTS.verify}</span></div>}</div>
        </section>

        <div className="content-grid">
          <div className="left-column">
            <section className="card evidence-card"><div className="section-heading"><div><span className="section-kicker">PRIMARY EVIDENCE</span><h2>Evidence & location</h2></div><button className="text-button"><Plus size={15} /> Add evidence</button></div><button className="evidence-visual" onClick={() => setLightboxOpen(true)} aria-label="Open evidence image"><div className="mine-photo"><div className="photo-lamp lamp-one" /><div className="photo-lamp lamp-two" /><div className="photo-roof" /><div className="photo-support support-one" /><div className="photo-support support-two" /><div className="photo-floor" /><span className="photo-label">PANEL 3 / ROOF SUPPORT INSPECTION</span></div><span className="zoom-hint"><ZoomIn size={15} /> View full image</span></button><div className="tag-row"><Pill tone="blue"><ImageIcon size={13} /> Photo evidence</Pill><Pill tone="green"><MapPin size={13} /> GPS captured</Pill><Pill tone="purple"><FileText size={13} /> OCR processed</Pill></div><div className="location-grid"><div><span>Latitude</span><strong>23.748193° N</strong></div><div><span>Longitude</span><strong>86.423802° E</strong></div><div><span>Location accuracy</span><strong>±8 m</strong></div><div><span>Device timestamp</span><strong>05 Sep · 10:39 AM</strong></div><div><span>Server received</span><strong>05 Sep · 10:42 AM</strong></div></div><div className="map-preview"><div className="map-lines" /><div className="map-pin"><MapPin size={17} /></div><div className="map-caption"><strong>Jharia OCP-3 · Active Panel 3</strong><span>23.748193, 86.423802</span></div><button className="map-action"><Navigation size={14} /> Open on mine map <ArrowUpRight size={13} /></button></div></section>

            <section className="card ocr-card"><div className="section-heading"><div><span className="section-kicker">DOCUMENT INTELLIGENCE</span><h2>OCR extraction</h2></div><Pill tone="confidence">92% confidence</Pill></div><div className="ocr-text"><span>EXTRACTED FROM IMAGE</span><p>“ROOF SUPPORT SPACING: 1.8M<br />PERMITTED MAXIMUM: 1.5M<br />INSPECTION REQUIRED — PANEL 3”</p></div><div className="ocr-actions"><button className="button button-secondary" onClick={copyText}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy text'}</button><button className="button button-ghost" onClick={() => setLightboxOpen(true)}>View source image <ArrowUpRight size={14} /></button></div></section>
          </div>

          <div className="right-column"><section className="card action-card"><div className="section-heading"><div><span className="section-kicker">REMEDIATION</span><h2>Corrective action plan</h2></div><button className="icon-button subtle"><MoreHorizontal size={18} /></button></div><div className="progress-line"><div><strong>{completed} of {actions.length} completed</strong><span>50% complete</span></div><div className="progress-track"><span style={{ width: `${(completed / actions.length) * 100}%` }} /></div></div><div className="checklist">{actions.map((item) => <button className={`check-item ${item.blocked && !item.done ? 'blocked' : ''}`} key={item.id} onClick={() => toggleAction(item.id)}><span className={`check-box ${item.done ? 'checked' : ''}`}>{item.done && <Check size={13} />}</span><span className="check-copy"><strong>{item.label}</strong><small>{item.meta}</small></span>{item.blocked && !item.done && <span className="overdue-tag">OVERDUE</span>}</button>)}</div><div className="assignee-row"><div className="assignee"><Avatar initials="SY" tone="green" /><div><span>Assigned to</span><strong>Suresh Yadav</strong></div></div><div className="due-date"><span>Due date</span><strong>05 Sep 2026</strong></div></div><button className="button button-primary full-width"><ClipboardCheck size={16} /> Update action plan</button></section><section className="card insight-card"><div className="insight-icon"><AlertTriangle size={17} /></div><div><strong>Critical risk requires attention</strong><p>Until support spacing is corrected, access to Active Panel 3 should remain restricted.</p></div></section></div>
        </div>

        <section className="card timeline-card"><div className="timeline-header"><div><span className="section-kicker">IMMUTABLE RECORD</span><h2>Status and audit history</h2></div><button className="button button-secondary"><SlidersHorizontal size={15} /> Filter events</button></div><div className="timeline">{timeline.map((event, index) => <div className={`timeline-item ${event.danger ? 'danger' : ''}`} key={event.time}><div className="timeline-marker"><Avatar initials={event.initials} tone={event.danger ? 'sand' : index % 2 ? 'blue' : 'green'} /></div><div className="timeline-content"><div className="timeline-meta"><strong>{event.action}</strong><span>{event.time}</span></div><p>{event.note}</p><small>by {event.name}</small></div><CheckCircle2 size={16} className="timeline-check" /></div>)}</div></section>
        <footer className="page-footer"><span>MineOS Compliance Platform · Production workspace</span><span><ShieldCheck size={14} /> Audit log protected by hash chain</span></footer>
      </div>

      {statusOpen && <div className="modal-backdrop" onClick={() => setStatusOpen(false)}><div className="status-modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">WORKFLOW</span><h2>Update status</h2></div><button className="icon-button" onClick={() => setStatusOpen(false)}><X size={18} /></button></div><p>Choose the next state for violation <strong>VIO-2026-0148</strong>.</p><div className="status-options">{['Open', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'].map((option) => <button key={option} className={status === option ? 'selected' : ''} onClick={() => { setStatus(option); setStatusOpen(false) }}><span className={`status-dot ${option === 'Resolved' || option === 'Closed' ? 'green' : option === 'In Progress' ? 'blue' : 'gray'}`} />{option}{status === option && <Check size={16} />}</button>)}</div><button className="button button-secondary full-width" onClick={() => setStatusOpen(false)}>Cancel</button></div></div>}
      {lightboxOpen && <div className="lightbox" onClick={() => setLightboxOpen(false)}><button className="lightbox-close" aria-label="Close image"><X size={22} /></button><div className="lightbox-image" onClick={(e) => e.stopPropagation()}><div className="mine-photo large"><div className="photo-lamp lamp-one" /><div className="photo-lamp lamp-two" /><div className="photo-roof" /><div className="photo-support support-one" /><div className="photo-support support-two" /><div className="photo-floor" /><span className="photo-label">PANEL 3 / ROOF SUPPORT INSPECTION</span></div><p>Evidence photo · captured 05 Sep 2026, 10:39 AM</p></div></div>}
    </main>
  )
}
