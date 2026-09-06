'use client'

import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle, Bell, ChevronRight, CircleHelp, ClipboardCheck, Download, FileText,
  LayoutDashboard, Map, Menu, MoreHorizontal, Search, Settings, ShieldCheck, TrendingUp, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCorporateDashboard } from '@/lib/api'

type Metrics = { open: number; escalated: number; due_soon: number; on_track: number; resolved_this_month: number; sla_compliance: number }
type Mine = { id: number; name: string; subsidiary: string; latitude: number | null; longitude: number | null; risk: number; open: number; escalated: number; sla_compliance: number; status: 'high' | 'medium' | 'healthy' }
type Violation = { id: number; case_id: string; category: string; mine_name: string; description: string; severity: string; hours_remaining: number | null; escalation_status: string }
type Category = { category: string; count: number }
type Dashboard = { metrics: Metrics; mines: Mine[]; escalations: Violation[]; category_breakdown: Category[] }
type MetricCard = { label: string; value: string | number; Icon: LucideIcon }

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Portfolio', icon: ClipboardCheck },
  { label: 'Violations', icon: AlertTriangle },
  { label: 'Mine Map', icon: Map },
  { label: 'SLA Monitor', icon: ShieldCheck },
  { label: 'Reports', icon: FileText },
  { label: 'Audit Log', icon: CircleHelp },
]

function titleCase(value: string) {
  return value.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
}

function dueLabel(violation: Violation) {
  if (violation.escalation_status === 'escalated') return `Overdue by ${Math.max(1, Math.abs(violation.hours_remaining || 0))}h`
  if (violation.escalation_status === 'closed') return 'Closed'
  return `${Math.max(0, violation.hours_remaining || 0)}h remaining`
}

export default function Page() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [query, setQuery] = useState('')
  const [selectedMine, setSelectedMine] = useState<Mine | null>(null)
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getCorporateDashboard()
      .then((result: Dashboard) => setDashboard(result))
      .catch((requestError: Error) => setError(requestError.message || 'Could not load the corporate dashboard.'))
  }, [])

  const mines = useMemo(
    () => (dashboard?.mines || []).filter((mine) => `${mine.name} ${mine.subsidiary}`.toLowerCase().includes(query.toLowerCase())),
    [dashboard, query],
  )
  const positions = useMemo(() => {
    const located = mines.filter((mine) => mine.latitude !== null && mine.longitude !== null)
    const latitudes = located.map((mine) => mine.latitude as number)
    const longitudes = located.map((mine) => mine.longitude as number)
    const minLat = latitudes.length ? Math.min(...latitudes) : 0
    const maxLat = latitudes.length ? Math.max(...latitudes) : 1
    const minLon = longitudes.length ? Math.min(...longitudes) : 0
    const maxLon = longitudes.length ? Math.max(...longitudes) : 1
    return new globalThis.Map(mines.map((mine, index) => {
      const x = mine.longitude === null ? 20 + (index * 15) % 60 : 20 + ((mine.longitude - minLon) / Math.max(0.01, maxLon - minLon)) * 60
      const y = mine.latitude === null ? 30 + (index * 14) % 45 : 75 - ((mine.latitude - minLat) / Math.max(0.01, maxLat - minLat)) * 45
      return [mine.id, { x, y }]
    }))
  }, [mines])

  const metrics = dashboard?.metrics
  const metricCards: MetricCard[] = [
    { label: 'Open violations', value: metrics?.open ?? '—', Icon: TrendingUp },
    { label: 'Escalated cases', value: metrics?.escalated ?? '—', Icon: AlertTriangle },
    { label: 'SLA compliance', value: metrics ? `${metrics.sla_compliance}%` : '—', Icon: TrendingUp },
    { label: 'Resolved this month', value: metrics?.resolved_this_month ?? '—', Icon: TrendingUp },
  ]
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`${mobileNav ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar p-5 transition-transform lg:translate-x-0`}>
        <div className="flex items-center gap-3 px-2 pb-9"><div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><span className="text-lg font-black">M</span></div><div><p className="text-base font-bold tracking-tight">MineOS</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Corporate suite</p></div></div>
        <nav className="flex-1 space-y-1" aria-label="Primary navigation">{navItems.map(({ label, icon: Icon, active }) => <button key={label} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'}`}><Icon className="size-[17px]" />{label}</button>)}</nav>
        <div className="border-t border-border pt-4"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground"><Settings className="size-[17px]" />Settings</button><div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/70 p-3"><div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">CO</div><div><p className="text-xs font-semibold">Corporate workspace</p><p className="text-[11px] text-muted-foreground">Live portfolio view</p></div><MoreHorizontal className="ml-auto size-4 text-muted-foreground" /></div></div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu className="size-5" /></button><div><h1 className="text-lg font-bold tracking-tight md:text-xl">Corporate Compliance Overview</h1><p className="hidden text-xs text-muted-foreground sm:block">Live safety, SLA, and risk across all operations.</p></div></div><div className="flex items-center gap-2"><div className="relative hidden md:block"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mines..." className="h-9 w-48 rounded-lg border border-input bg-card pl-9 pr-3 text-xs" /></div><button className="relative rounded-lg p-2 text-muted-foreground" aria-label="Notifications"><Bell className="size-[18px]" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-red-500" /></button><Button size="sm" onClick={() => notify('Use your browser print dialog to export the live dashboard.')} className="hidden gap-2 sm:flex"><Download className="size-3.5" />Export report</Button></div></header>
        <main className="space-y-6 p-5 md:p-8">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map(({ label, value, Icon }, index) => <div key={label} className="relative overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground shadow-sm"><div className="flex items-start justify-between"><p className="text-xs font-medium text-primary-foreground/70">{label}</p><Icon className={`size-4 ${index === 1 ? 'text-red-300' : 'text-primary-foreground/60'}`} /></div><p className="mt-4 text-3xl font-bold">{value}</p><p className="mt-2 text-[11px] text-primary-foreground/70">Current data from MineOS API</p></div>)}</section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5"><h2 className="font-semibold">Mine risk overview</h2><p className="mt-1 text-xs text-muted-foreground">Portfolio locations and current risk classification</p></div><div className="relative h-72 overflow-hidden rounded-lg bg-[#eef4f9]"><svg className="absolute inset-0 size-full" viewBox="0 0 600 310" preserveAspectRatio="none" aria-hidden="true"><path d="M170 18L240 32L280 70L325 88L370 132L420 145L470 198L450 257L390 286L315 273L285 235L235 222L200 176L158 146L145 93Z" fill="none" stroke="#c7d8e5" strokeWidth="2" strokeDasharray="5 6" /></svg>{mines.map((mine) => { const position = positions.get(mine.id); return <button key={mine.id} onClick={() => setSelectedMine(mine)} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${position?.x || 50}%`, top: `${position?.y || 50}%` }} aria-label={`View ${mine.name}`}><span className={`block size-4 rounded-full border-[3px] border-white shadow-md ${mine.status === 'high' ? 'bg-red-500' : mine.status === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} /></button>})}<div className="absolute bottom-3 left-3 rounded-lg border border-border/70 bg-card/90 px-3 py-2 text-[10px] shadow-sm">Risk map from mine coordinates</div></div></div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-start justify-between"><div><h2 className="font-semibold">Escalation queue</h2><p className="mt-1 text-xs text-muted-foreground">Cases requiring leadership review</p></div><span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">{dashboard?.escalations.length || 0} active</span></div><div className="space-y-2.5">{dashboard?.escalations.map((violation) => <button key={violation.id} onClick={() => setSelectedViolation(violation)} className="flex w-full items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3 text-left"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600"><AlertTriangle className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{violation.category} · {dueLabel(violation)}</p><p className="mt-1 truncate text-xs font-semibold">{violation.mine_name}</p><p className="truncate text-[11px] text-muted-foreground">{violation.description}</p></div><ChevronRight className="size-4 text-primary" /></button>)}{dashboard && !dashboard.escalations.length && <p className="py-8 text-center text-sm text-muted-foreground">No escalated cases.</p>}</div></div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr_0.9fr]">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-4"><h2 className="font-semibold">Highest-risk mines</h2><p className="mt-1 text-xs text-muted-foreground">Ranked by current risk score</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="pb-3 font-medium">#</th><th className="pb-3 font-medium">Mine</th><th className="pb-3 font-medium">Risk</th><th className="pb-3 font-medium">SLA</th></tr></thead><tbody>{[...mines].sort((a, b) => b.risk - a.risk).map((mine, index) => <tr key={mine.id} onClick={() => setSelectedMine(mine)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40"><td className="py-3 font-semibold text-muted-foreground">{String(index + 1).padStart(2, '0')}</td><td className="py-3"><p className="font-semibold">{mine.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{mine.open} open · {mine.escalated} overdue</p></td><td className={`py-3 font-bold ${mine.risk > 70 ? 'text-red-600' : mine.risk > 45 ? 'text-amber-600' : 'text-emerald-600'}`}>{mine.risk}</td><td className="py-3 font-medium">{mine.sla_compliance}%</td></tr>)}</tbody></table></div></div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="font-semibold">Violation categories</h2><p className="mt-1 text-xs text-muted-foreground">Reports by compliance category</p><div className="mt-6 space-y-4">{dashboard?.category_breakdown.map((category) => <div key={category.category}><div className="flex justify-between text-xs"><span>{titleCase(category.category)}</span><b>{category.count}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (category.count / Math.max(1, metrics?.open || 1)) * 100)}%` }} /></div></div>)}</div></div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="font-semibold">SLA health</h2><p className="mt-1 text-xs text-muted-foreground">Current response performance</p><div className="my-5 flex items-center justify-center"><div className="relative flex size-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(#1e40af 0deg ${(metrics?.sla_compliance || 0) * 3.6}deg, #ef4444 ${(metrics?.sla_compliance || 0) * 3.6}deg 360deg)` }}><div className="flex size-24 flex-col items-center justify-center rounded-full bg-card"><span className="text-2xl font-bold">{metrics?.sla_compliance ?? '—'}%</span><span className="text-[10px] text-muted-foreground">compliance</span></div></div></div><div className="space-y-2 text-xs"><div className="flex items-center justify-between"><span>On track</span><b>{metrics?.on_track || 0}</b></div><div className="flex items-center justify-between"><span>Due soon</span><b>{metrics?.due_soon || 0}</b></div><div className="flex items-center justify-between"><span>Escalated</span><b>{metrics?.escalated || 0}</b></div></div></div>
          </section>
        </main>
      </div>

      {mobileNav && <button className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      {selectedMine && <div className="fixed inset-0 z-50 flex justify-end bg-foreground/20" onClick={() => setSelectedMine(null)}><aside onClick={(event) => event.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Mine profile</p><h2 className="mt-2 text-2xl font-bold">{selectedMine.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedMine.subsidiary}</p></div><button onClick={() => setSelectedMine(null)} className="rounded-lg p-2 hover:bg-muted"><X className="size-5" /></button></div><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-xl bg-red-50 p-4"><p className="text-xs text-red-700">Risk score</p><p className="mt-2 text-3xl font-bold text-red-700">{selectedMine.risk}</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs text-blue-700">SLA compliance</p><p className="mt-2 text-3xl font-bold text-blue-700">{selectedMine.sla_compliance}%</p></div></div><div className="mt-6 space-y-3 rounded-xl border border-border p-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Open violations</span><b>{selectedMine.open}</b></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Overdue cases</span><b className="text-red-600">{selectedMine.escalated}</b></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Risk classification</span><b>{titleCase(selectedMine.status)}</b></div></div></aside></div>}
      {selectedViolation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setSelectedViolation(null)}><div onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-red-600">{selectedViolation.case_id}</p><h2 className="mt-2 text-xl font-bold">{selectedViolation.description}</h2></div><button onClick={() => setSelectedViolation(null)} className="rounded-lg p-2 hover:bg-muted"><X className="size-5" /></button></div><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Mine</p><p className="mt-1 font-semibold">{selectedViolation.mine_name}</p></div><div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">SLA status</p><p className="mt-1 font-semibold text-red-600">{dueLabel(selectedViolation)}</p></div></div><div className="mt-6 flex justify-end"><Button onClick={() => setSelectedViolation(null)}>Close</Button></div></div></div>}
      {toast && <div role="status" className="fixed bottom-5 right-5 z-[60] rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">{toast}</div>}
    </div>
  )
}
