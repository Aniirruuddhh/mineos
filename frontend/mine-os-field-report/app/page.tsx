'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  CloudUpload,
  FileText,
  Factory,
  Flame,
  Leaf,
  LocateFixed,
  MapPin,
  Pickaxe,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

type Category = 'Safety' | 'Environment' | 'Labour' | 'Production'
type Severity = 'Low' | 'Medium' | 'High' | 'Critical'
type LocationState = 'idle' | 'requesting' | 'captured' | 'unavailable'

const categories: { label: Category; icon: typeof Shield; tint: string }[] = [
  { label: 'Safety', icon: Shield, tint: 'text-red-600' },
  { label: 'Environment', icon: Leaf, tint: 'text-emerald-600' },
  { label: 'Labour', icon: Users, tint: 'text-amber-600' },
  { label: 'Production', icon: Factory, tint: 'text-blue-600' },
]
const severities: Severity[] = ['Low', 'Medium', 'High', 'Critical']

async function createViolation(payload: unknown) {
  return { endpoint: 'POST /api/violations', payload, ok: true }
}
async function extractOcr(file: File | null) {
  return { endpoint: 'POST /api/ocr', fileName: file?.name, text: 'DANGER: HEAVY VEHICLES', confidence: 0.92 }
}
async function uploadEvidence(file: File | null) {
  return { endpoint: 'POST /api/evidence', fileName: file?.name, ok: true }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-slate-700">{children}</label>
}
function SectionCard({ title, icon: Icon, children }: { title: string; icon: typeof Shield; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(43,72,116,0.06)] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={18} /></div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <div><FieldLabel>{label}</FieldLabel><div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-4 text-slate-400" /></div></div>
}

export default function Page() {
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState<Category | ''>('Safety')
  const [severity, setSeverity] = useState<Severity | ''>('High')
  const [area, setArea] = useState('Active Panel 3')
  const [observation, setObservation] = useState('')
  const [unsafe, setUnsafe] = useState(true)
  const [photo, setPhoto] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [location, setLocation] = useState<LocationState>('idle')
  const [manual, setManual] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [deviceTime] = useState(() => new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }))

  const canContinue = useMemo(() => Boolean(category && severity && area && observation.trim()), [category, severity, area, observation])
  const captureLocation = () => {
    setLocation('requesting')
    window.setTimeout(() => setLocation('captured'), 900)
  }
  const handlePhoto = async (file: File | null) => {
    setPhoto(true)
    if (file) await uploadEvidence(file)
  }
  const handleOcr = async (file: File | null) => {
    setOcrLoading(true)
    const result = await extractOcr(file)
    window.setTimeout(() => { setOcrText(result.text); setOcrLoading(false) }, 700)
  }
  const next = () => {
    if (step === 1 && !canContinue) { setError('Add an observation before continuing.'); return }
    setError(''); setStep((value) => Math.min(3, value + 1))
  }
  const submit = async () => {
    if (!confirmed) { setError('Please confirm that this report is accurate.'); return }
    setSubmitting(true); setError('')
    await createViolation({ category, severity, area, observation, unsafe, location })
    window.setTimeout(() => { setSubmitting(false); setSuccess(true) }, 900)
  }
  if (success) return <SuccessState unsafe={unsafe} onAnother={() => { setSuccess(false); setStep(1); setObservation(''); setPhoto(false); setConfirmed(false) }} />

  return (
    <main className="min-h-screen bg-[#edf3f9] pb-28 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <button aria-label="Go back" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ArrowLeft size={20} /></button>
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-700 text-white"><Pickaxe size={19} /></div>
          <div><p className="text-sm font-black tracking-wide text-blue-800">MineOS</p><p className="text-xs text-slate-500">Field operations</p></div>
          <div className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Online</div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 pt-7 sm:px-6">
        <div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">New field report</p><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Report a safety or compliance issue.</h1><p className="mt-2 text-sm leading-6 text-slate-500">Capture the details now. Your report will be routed to the right team.</p></div>
        <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between text-xs font-bold"><span className={step >= 1 ? 'text-blue-700' : 'text-slate-400'}>1&nbsp; Issue details</span><span className={step >= 2 ? 'text-blue-700' : 'text-slate-400'}>2&nbsp; Evidence & location</span><span className={step >= 3 ? 'text-blue-700' : 'text-slate-400'}>3&nbsp; Review & submit</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${step * 33.33}%` }} /></div></div>

        {step === 1 && <div className="space-y-5"><SectionCard title="Issue details" icon={ClipboardCheck}><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Mine" value="Jharia OCP-3" options={['Jharia OCP-3', 'Bokaro East', 'Singrauli North']} onChange={() => {}} /><SelectField label="Mine area" value={area} options={['Active Panel 3', 'Haul Road', 'Workshop', 'Coal Yard']} onChange={setArea} /></div><div className="mt-5"><FieldLabel>Category</FieldLabel><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map(({ label, icon: Icon, tint }) => <button key={label} onClick={() => setCategory(label)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${category === label ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}><Icon size={20} className={category === label ? 'text-blue-700' : tint} />{label}</button>)}</div></div><div className="mt-5"><FieldLabel>Severity</FieldLabel><div className="grid grid-cols-4 gap-2">{severities.map((item) => <button key={item} onClick={() => setSeverity(item)} className={`min-h-12 rounded-xl border text-xs font-bold ${severity === item ? (item === 'Critical' ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-600 bg-blue-50 text-blue-800') : 'border-slate-200 text-slate-600'}`}>{item}</button>)}</div></div><div className="mt-5"><FieldLabel>Observation</FieldLabel><textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={5} placeholder="Describe what you observed and any immediate risk." className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div><div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${unsafe ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}><button type="button" role="switch" aria-checked={unsafe} onClick={() => setUnsafe(!unsafe)} className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${unsafe ? 'bg-red-600' : 'bg-slate-300'}`}><span className={`size-4 rounded-full bg-white transition ${unsafe ? 'translate-x-5' : ''}`} /></button><div><p className="text-sm font-bold text-slate-800">Unsafe situation — alert manager immediately</p>{unsafe && <p className="mt-1 text-xs leading-5 text-red-700">The site manager will be notified as soon as this report is submitted.</p>}</div></div></SectionCard></div>}

        {step === 2 && <div className="space-y-5"><SectionCard title="Evidence" icon={Camera}><div className={`rounded-2xl border-2 border-dashed p-6 text-center ${photo ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50'}`}>{photo ? <><div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-xl bg-slate-800 text-white"><Camera size={28} /></div><p className="text-sm font-bold text-emerald-800">Photo captured</p><p className="mt-1 text-xs text-emerald-700">1 image ready to attach</p></> : <><div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Camera size={26} /></div><p className="text-sm font-bold text-slate-800">Add photo evidence</p><p className="mt-1 text-xs text-slate-500">Use your camera or choose a file from device</p></>}<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center"><button onClick={() => handlePhoto(null)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm"><Camera size={17} />Take photo</button><label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700"><CloudUpload size={17} />Upload from device<input type="file" accept="image/*" className="sr-only" onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)} /></label></div></div><div className="mt-5"><FieldLabel>Document or signage for OCR <span className="font-normal text-slate-400">(optional)</span></FieldLabel><label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600"><FileText size={18} className="text-blue-600" />Choose a document or sign image<input type="file" className="sr-only" onChange={(e) => handleOcr(e.target.files?.[0] ?? null)} /></label>{(ocrLoading || ocrText) && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4">{ocrLoading ? <p className="flex items-center gap-2 text-sm font-semibold text-blue-800"><Sparkles size={16} />Extracting text…</p> : <><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-blue-800">OCR extracted text</p><span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">92% confidence</span></div><input value={ocrText} onChange={(e) => setOcrText(e.target.value)} className="min-h-11 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-700 outline-none" /></>}</div>}</div></SectionCard><SectionCard title="Location & timestamp" icon={MapPin}><div className={`rounded-xl border p-4 ${location === 'captured' ? 'border-emerald-200 bg-emerald-50' : location === 'unavailable' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-start gap-3"><LocateFixed className={location === 'captured' ? 'text-emerald-600' : 'text-blue-700'} size={20} /><div className="flex-1"><p className="text-sm font-bold">{location === 'requesting' ? 'Requesting location permission' : location === 'captured' ? 'GPS captured' : location === 'unavailable' ? 'Location unavailable' : 'Capture your location'}</p>{location === 'captured' && <p className="mt-1 text-xs leading-5 text-emerald-700">23.7957° N, 86.4304° E · Accuracy ±8 m<br />Captured from device</p>}{location === 'idle' && <p className="mt-1 text-xs text-slate-500">Attach precise coordinates to this report.</p>}</div>{location === 'captured' && <Check size={19} className="text-emerald-600" />}</div><button onClick={captureLocation} disabled={location === 'requesting'} className="mt-4 min-h-11 w-full rounded-xl border border-blue-200 bg-white text-sm font-bold text-blue-700 disabled:opacity-60">{location === 'captured' ? 'Recapture location' : 'Use current location'}</button></div><button onClick={() => setManual(!manual)} className="mt-4 text-sm font-semibold text-blue-700 underline underline-offset-4">{manual ? 'Hide manual location' : 'Enter location manually'}</button>{manual && <div className="mt-4 grid gap-3 sm:grid-cols-2"><SelectField label="Mine area" value={area} options={['Active Panel 3', 'Haul Road', 'Workshop', 'Coal Yard']} onChange={setArea} /><div><FieldLabel>Landmark</FieldLabel><input placeholder="e.g. North gate" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-600" /></div><div className="sm:col-span-2"><FieldLabel>Location notes</FieldLabel><input placeholder="Add directions or nearby reference" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-600" /></div></div>}<div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Device timestamp</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 size={15} className="text-blue-600" />{deviceTime}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Server received</p><p className="mt-1 text-sm font-semibold text-slate-400">Added on submission</p></div></div></SectionCard></div>}

        {step === 3 && <SectionCard title="Review & submit" icon={ClipboardCheck}><div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{[['Category', category], ['Severity', severity], ['Mine / area', `Jharia OCP-3 · ${area}`], ['Evidence', photo ? '1 photo attached' : 'No photo attached'], ['GPS status', location === 'captured' ? 'Captured · ±8 m accuracy' : 'Not captured'], ['Manager alert', unsafe ? 'Immediate alert enabled' : 'No alert']].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><span className="text-slate-500">{label}</span><span className={`text-right font-bold ${label === 'Severity' && value === 'Critical' ? 'text-red-600' : 'text-slate-800'}`}>{value}</span></div>)}</div><div className="mt-5 flex items-start gap-3"><input id="confirm" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 size-4 accent-blue-700" /><label htmlFor="confirm" className="text-sm leading-6 text-slate-600">I confirm this report is accurate to the best of my knowledge.</label></div></SectionCard>}
        {error && <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><CircleAlert size={17} />{error}</div>}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:static sm:mx-auto sm:mt-6 sm:max-w-3xl sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"><div className="mx-auto flex max-w-3xl gap-3 sm:justify-end">{step > 1 && <button onClick={() => setStep(step - 1)} className="min-h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">Back</button>}{step < 3 ? <button onClick={next} className="min-h-12 flex-1 rounded-xl bg-blue-700 px-6 text-sm font-bold text-white shadow-lg shadow-blue-700/20 sm:flex-none">Continue</button> : <button onClick={submit} disabled={submitting} className="min-h-12 flex-1 rounded-xl bg-blue-700 px-6 text-sm font-bold text-white shadow-lg shadow-blue-700/20 sm:flex-none disabled:opacity-70">{submitting ? 'Submitting report…' : 'Submit field report'}</button>}</div></div>
    </main>
  )
}

function SuccessState({ unsafe, onAnother }: { unsafe: boolean; onAnother: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#edf3f9] px-4 py-10"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_16px_40px_rgba(43,72,116,0.1)] sm:p-10"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={38} strokeWidth={2.5} /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Submission complete</p><h1 className="mt-2 text-2xl font-bold text-slate-950">Report submitted successfully</h1><p className="mt-3 text-sm leading-6 text-slate-500">Your field report has been securely recorded and is ready for review.</p><div className="my-7 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Case ID</p><p className="mt-2 font-mono text-xl font-bold tracking-wide text-blue-800">VIO-2026-0148</p></div><div className={`flex items-center gap-3 rounded-xl p-4 text-left text-sm font-semibold ${unsafe ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{unsafe ? <AlertTriangle size={19} /> : <Check size={19} />} {unsafe ? 'Manager alerted immediately.' : 'No manager alert was requested.'}</div><div className="mt-7 grid gap-3"><button className="min-h-12 rounded-xl bg-blue-700 text-sm font-bold text-white">View report</button><button onClick={onAnother} className="min-h-12 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700">Submit another report</button></div></div></main>
}
