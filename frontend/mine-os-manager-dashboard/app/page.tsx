'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, ClipboardCheck,
  CloudUpload, Filter, HardHat, LayoutDashboard, ListFilter, Map, Menu, MoreHorizontal, Search,
  Settings, ShieldAlert, Users, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { getManagerDashboard, getMines } from '@/lib/api-service'

type Mine = { id: number; name: string; subsidiary: string }
type ApiViolation = {
  id: number; case_id: string; description: string; area: string | null; status: string; severity: string
  category: string; reported_by_name: string; hours_remaining: number | null; escalation_status: string
  evidence: { name: string } | null; latitude: number | null; longitude: number | null
}
type TeamMember = { id: number; name: string; active_actions: number; due_today: number; completion: number }
type Metrics = { open: number; escalated: number; due_soon: number; on_track: number; sla_compliance: number }

function titleCase(value: string) { return value.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') }
function initials(name: string) { return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase() }
function dueLabel(violation: ApiViolation) {
  if (violation.escalation_status === 'closed') return 'Closed'
  if (violation.escalation_status === 'escalated') return `Overdue by ${Math.max(1, Math.abs(violation.hours_remaining || 0))}h`
  return `${Math.max(0, violation.hours_remaining || 0)}h remaining`
}
function categoryIcon(category: string) { return category === 'safety' ? ShieldAlert : category === 'environment' ? CloudUpload : category === 'labour' ? ClipboardCheck : AlertTriangle }

function Brand() { return <div className="brand"><div className="brand-mark"><HardHat size={20} /></div><span>Mine<span>OS</span></span></div> }
function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) { return <button aria-label={label} title={label} onClick={onClick} className="icon-btn">{children}</button> }
function Avatar({ initials: value, tone = 'blue' }: { initials: string; tone?: string }) { return <span className={`avatar avatar-${tone}`}>{value}</span> }

export default function Page() {
  const [mines, setMines] = useState<Mine[]>([])
  const [mineId, setMineId] = useState('')
  const [tab, setTab] = useState('All')
  const [date, setDate] = useState('Today')
  const [violations, setViolations] = useState<ApiViolation[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [selected, setSelected] = useState<ApiViolation | null>(null)
  const [notifications, setNotifications] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fieldReportUrl = process.env.NEXT_PUBLIC_FIELD_REPORT_URL || 'http://localhost:3001'
  const violationDetailUrl = process.env.NEXT_PUBLIC_VIOLATION_DETAIL_URL || 'http://localhost:3002'

  useEffect(() => {
    getMines()
      .then((records: Mine[]) => {
        setMines(records)
        if (records[0]) setMineId(String(records[0].id))
      })
      .catch((requestError: Error) => setError(requestError.message || 'Could not load mines.'))
  }, [])

  useEffect(() => {
    if (!mineId) return
    setLoading(true)
    setError('')
    getManagerDashboard(mineId)
      .then((dashboard: { metrics: Metrics; violations: ApiViolation[]; team: TeamMember[] }) => {
        setMetrics(dashboard.metrics)
        setViolations(dashboard.violations)
        setTeam(dashboard.team)
      })
      .catch((requestError: Error) => setError(requestError.message || 'Could not load this manager dashboard.'))
      .finally(() => setLoading(false))
  }, [mineId])

  const filtered = useMemo(() => violations.filter((violation) => {
    if (tab === 'Open') return !['resolved', 'closed'].includes(violation.status)
    if (tab === 'Due soon') return violation.escalation_status === 'on_track' && (violation.hours_remaining || 0) <= 24
    if (tab === 'Overdue') return violation.escalation_status === 'escalated'
    return true
  }), [tab, violations])
  const tabCount = (label: string) => label === 'All' ? violations.length : label === 'Open' ? metrics?.open || 0 : label === 'Due soon' ? metrics?.due_soon || 0 : metrics?.escalated || 0
  const selectedMine = mines.find((mine) => mine.id === Number(mineId))

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}><Brand /><nav><NavItem active icon={<LayoutDashboard />} label="Dashboard" /><NavItem icon={<ClipboardCheck />} label="Reports" /><NavItem icon={<ShieldAlert />} label="Violations" /><NavItem icon={<Check />} label="Corrective actions" /><NavItem icon={<Map />} label="Mine map" /><NavItem icon={<Users />} label="Team" /><NavItem icon={<ListFilter />} label="Audit log" /></nav><div className="sidebar-bottom"><NavItem icon={<Settings />} label="Settings" /></div></aside>
    <main className="main-content">
      <header className="topbar"><IconButton label="Open navigation" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></IconButton><div className="greeting"><p>Manager workspace</p><span>Live violations and corrective actions</span></div><div className="top-actions"><label className="select-wrap"><Map size={16} /><select value={mineId} onChange={(event) => setMineId(event.target.value)}>{mines.map((mine) => <option key={mine.id} value={mine.id}>{mine.name}</option>)}</select><ChevronDown size={14} /></label><label className="select-wrap date-select"><CalendarDays size={16} /><select value={date} onChange={(event) => setDate(event.target.value)}><option>Today</option><option>Current workload</option></select><ChevronDown size={14} /></label><IconButton label="Search"><Search /></IconButton><div className="notification-wrap"><IconButton label="Notifications" onClick={() => setNotifications(!notifications)}><Bell /><b>{metrics?.escalated || 0}</b></IconButton>{notifications && <div className="notification-pop"><strong>Escalation status</strong><p>{metrics?.escalated || 0} cases are overdue.</p><p>{metrics?.due_soon || 0} cases are due within 24 hours.</p></div>}</div><a className="primary-btn" href={fieldReportUrl}>+ Report violation</a></div></header>
      <div className="page-heading"><div><p className="eyebrow">MANAGER DASHBOARD</p><h1>Safety at a glance</h1></div><span className="quick-link">{selectedMine?.name || 'Loading mine…'}</span></div>
      {error && <p role="alert" className="mx-7 mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="kpi-grid">{[
        [metrics?.open || 0, 'Open violations', 'up'], [metrics?.escalated || 0, 'Overdue / Escalated', 'warn'], [metrics?.due_soon || 0, 'Due within 24 hours', 'down'], [`${metrics?.sla_compliance || 0}%`, 'SLA compliance', 'up'],
      ].map(([value, label, tone]) => <div className={`kpi-card ${tone}`} key={String(label)}><div><span>{label}</span><strong>{value}</strong></div><div className="kpi-trend">{tone === 'warn' ? <AlertTriangle size={14} /> : <ArrowUpRight size={14} />} <small>Current workload</small></div></div>)}</section>
      <div className="content-grid"><section className="panel queue-panel"><div className="panel-header"><div><h2>Violation action queue</h2><p>Prioritized by risk and SLA deadline</p></div><div className="panel-tools"><IconButton label="Filter queue"><Filter /></IconButton><IconButton label="More options"><MoreHorizontal /></IconButton></div></div><div className="tabs">{['All', 'Open', 'Due soon', 'Overdue'].map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}<span>{tabCount(item)}</span></button>)}</div><div className="queue-list">{loading ? <p className="p-5 text-sm text-muted-foreground">Loading violations…</p> : filtered.map((violation) => { const CategoryIcon = categoryIcon(violation.category); return <button className="violation-row" key={violation.id} onClick={() => setSelected(violation)}><span className="category-icon"><CategoryIcon size={17} /></span><div className="violation-copy"><div className="row-title"><strong>{violation.description}</strong><span className={`status status-${violation.status}`}>{titleCase(violation.status)}</span></div><span className="row-meta">{violation.case_id} · {violation.area || 'Area not recorded'}</span><div className="row-progress"><span><i style={{ width: `${violation.status === 'closed' || violation.status === 'resolved' ? 100 : violation.status === 'in_progress' ? 50 : violation.status === 'acknowledged' ? 25 : 0}%` }} /></span><small>{titleCase(violation.severity)} risk</small></div></div><div className={`sla ${violation.escalation_status === 'escalated' ? 'sla-overdue' : ''}`}><strong>{dueLabel(violation)}</strong><span>{violation.reported_by_name} <Avatar initials={initials(violation.reported_by_name)} /></span></div><div className="evidence-thumb"><span>{violation.evidence?.name || 'No evidence'}</span></div></button>})}{!loading && !filtered.length && <p className="p-5 text-sm text-muted-foreground">No violations match this filter.</p>}</div></section>
        <aside className="right-stack"><section className="panel attention-panel"><div className="panel-header"><div><h2>Requires your attention</h2><p>Cases past or nearing their SLA target</p></div><span className="count-badge">{(metrics?.escalated || 0) + (metrics?.due_soon || 0)}</span></div>{violations.filter((violation) => violation.escalation_status === 'escalated' || (violation.hours_remaining || 99) <= 24).slice(0, 3).map((violation) => <div className="attention-item" key={violation.id}><div className={`risk-dot risk-${violation.severity === 'critical' ? 'critical' : 'high'}`} /><div><strong>{violation.description}</strong><p>{violation.area || 'No area recorded'}</p><span className={violation.escalation_status === 'escalated' ? 'overdue-text' : ''}>{dueLabel(violation)}</span></div><button onClick={() => setSelected(violation)}>Review now <ArrowUpRight size={13} /></button></div>)}</section><section className="panel sla-panel"><div className="panel-header"><div><h2>SLA health</h2><p>Current violation workload</p></div><span className="sla-score">{metrics?.sla_compliance || 0}%</span></div><div className="sla-body"><div className="donut"><span>{violations.length}<br /><small>total</small></span></div><div className="legend"><span><i className="dot green" />On track <b>{metrics?.on_track || 0}</b></span><span><i className="dot amber" />Due soon <b>{metrics?.due_soon || 0}</b></span><span><i className="dot red" />Escalated <b>{metrics?.escalated || 0}</b></span></div></div></section></aside>
        <section className="panel map-panel"><div className="panel-header"><div><h2>Mine activity &amp; risk</h2><p>Reported locations · {selectedMine?.name || ''}</p></div></div><div className="mine-map"><div className="map-controls"><IconButton label="Zoom in"><ZoomIn /></IconButton><IconButton label="Zoom out"><ZoomOut /></IconButton></div>{violations.slice(0, 6).map((violation, index) => <button key={violation.id} aria-label={`View ${violation.case_id}`} onClick={() => setSelected(violation)} className={`map-marker marker-${violation.severity === 'critical' ? 'red' : violation.severity === 'high' ? 'amber' : 'blue'}`} style={{ left: `${24 + ((index * 17) % 58)}%`, top: `${28 + ((index * 19) % 52)}%` }} />)}<div className="map-legend"><span><i className="dot red" />Critical</span><span><i className="dot amber" />High</span><span><i className="dot blue" />Other</span></div></div></section>
        <section className="panel team-panel"><div className="panel-header"><div><h2>Team corrective actions</h2><p>Ownership and completion performance</p></div><IconButton label="Team options"><MoreHorizontal /></IconButton></div><div className="team-table"><div className="team-head"><span>Team member</span><span>Active actions</span><span>Due today</span><span>Completion</span></div>{team.map((member) => <div className="team-row" key={member.id}><span><Avatar initials={initials(member.name)} tone="slate" /><strong>{member.name}</strong></span><b>{member.active_actions}</b><b className={member.due_today ? 'due-count' : ''}>{member.due_today}</b><span className="completion"><i style={{ width: `${member.completion}%` }} />{member.completion}%</span></div>)}{!team.length && <p className="p-5 text-sm text-muted-foreground">No team action data is available for this mine.</p>}</div></section>
      </div>
    </main>
    {selected && <div className="overlay drawer-overlay"><div className="drawer"><div className="drawer-top"><span className="eyebrow">VIOLATION DETAIL</span><IconButton label="Close violation detail" onClick={() => setSelected(null)}><X /></IconButton></div><div className="drawer-title"><ShieldAlert /><div><h2>{selected.description}</h2><p>{selected.case_id} · {selected.area || 'Area not recorded'}</p></div></div><div className="detail-pills"><span className="status status-open">{titleCase(selected.status)}</span><span className="pill-high">{titleCase(selected.severity)} risk</span><span className="sla-overdue">{dueLabel(selected)}</span></div><div className="detail-facts"><span><small>Reported by</small><b>{selected.reported_by_name}</b></span><span><small>Category</small><b>{titleCase(selected.category)}</b></span><span><small>Evidence</small><b>{selected.evidence?.name || 'None attached'}</b></span></div><a className="primary-btn drawer-action" href={`${violationDetailUrl}?id=${selected.id}`}>Open full detail <ArrowUpRight size={15} /></a></div></div>}
  </div>
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) { return <button className={`nav-item ${active ? 'active' : ''}`} title={label}><span>{icon}</span><em>{label}</em></button> }
