'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, LoaderCircle, MapPin, ScanText, Send, ShieldAlert, Upload } from 'lucide-react'
import { createViolation, getMines, runOcr, uploadEvidence } from '@/lib/api'

type Mine = {
  id: number
  name: string
  subsidiary: string
  manager_id: number | null
}

type Coordinates = { latitude: number; longitude: number; gps_accuracy?: number }

export default function Page() {
  const [mines, setMines] = useState<Mine[]>([])
  const [mineId, setMineId] = useState('')
  const [category, setCategory] = useState('safety')
  const [severity, setSeverity] = useState('high')
  const [description, setDescription] = useState('')
  const [area, setArea] = useState('')
  const [alertManager, setAlertManager] = useState(true)
  const [evidence, setEvidence] = useState<File | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getMines()
      .then((records: Mine[]) => {
        setMines(records)
        if (records[0]) setMineId(String(records[0].id))
      })
      .catch((requestError: Error) => setError(requestError.message || 'Could not load mines.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedMine = useMemo(() => mines.find((mine) => mine.id === Number(mineId)), [mines, mineId])

  function onEvidenceChange(event: ChangeEvent<HTMLInputElement>) {
    setEvidence(event.target.files?.[0] || null)
    setOcrText('')
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError('This browser cannot capture your location.')
      return
    }

    setLocationLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          gps_accuracy: position.coords.accuracy,
        })
        setLocationLoading(false)
      },
      () => {
        setError('Location permission was not granted. You can still submit the report.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function extractText() {
    if (!evidence) return
    setOcrLoading(true)
    setError('')
    try {
      const result = await runOcr(evidence)
      setOcrText(result.extractedText || '')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'OCR could not read this file.')
    } finally {
      setOcrLoading(false)
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!mineId || !description.trim()) {
      setError('Choose a mine and describe the observation before submitting.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const violation = await createViolation({
        mine_id: Number(mineId),
        category,
        severity,
        description: description.trim(),
        area: area.trim() || undefined,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        gps_accuracy: coordinates?.gps_accuracy,
        device_timestamp: new Date().toISOString(),
        alert_manager: alertManager,
        ocr_text: ocrText || undefined,
      })

      if (evidence) {
        await uploadEvidence(violation.id, evidence, {
          ocr_text: ocrText,
          captured_at: new Date().toISOString(),
          ...(selectedMine?.manager_id ? { performed_by: String(selectedMine.manager_id) } : {}),
        })
      }

      setSuccess(`Report ${violation.case_id} was submitted successfully.`)
      setDescription('')
      setArea('')
      setEvidence(null)
      setOcrText('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The report could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-start gap-4">
          <div className="rounded-xl bg-primary p-3 text-primary-foreground"><ShieldAlert size={26} /></div>
          <div>
            <p className="text-sm font-semibold text-primary">MINEOS FIELD REPORT</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Report a violation</h1>
            <p className="mt-2 text-sm text-muted-foreground">Capture the observation, location, and evidence for the manager action queue.</p>
          </div>
        </header>

        {error && <p role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        {success && <p role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={18} />{success}</p>}

        <form onSubmit={submitReport} className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">Mine
              <select required value={mineId} onChange={(event) => setMineId(event.target.value)} disabled={loading} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {loading && <option>Loading mines…</option>}
                {!loading && !mines.length && <option value="">No mines available</option>}
                {mines.map((mine) => <option key={mine.id} value={mine.id}>{mine.name} · {mine.subsidiary}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                <option value="safety">Safety</option>
                <option value="environment">Environment</option>
                <option value="labour">Labour</option>
                <option value="production">Production</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">Severity
              <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">Mine area
              <input value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Active Panel 3" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-medium">Observation
            <textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="Describe what you observed and why it needs attention." className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </label>

          <section className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Location</h2><p className="mt-1 text-sm text-muted-foreground">{coordinates ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}${coordinates.gps_accuracy ? ` · ±${Math.round(coordinates.gps_accuracy)} m` : ''}` : 'No location captured yet.'}</p></div><button type="button" onClick={captureLocation} disabled={locationLoading} className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"><MapPin size={16} />{locationLoading ? 'Capturing…' : 'Capture GPS'}</button></div>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <div><h2 className="font-semibold">Evidence and OCR</h2><p className="mt-1 text-sm text-muted-foreground">Attach one image or PDF. OCR is optional and the extracted text is saved with the report.</p></div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-input bg-muted/40 px-4 py-3 text-sm"><span className="flex min-w-0 items-center gap-2"><Upload size={17} /><span className="truncate">{evidence ? evidence.name : 'Choose evidence file'}</span></span><input type="file" accept="image/*,application/pdf" onChange={onEvidenceChange} className="hidden" /></label>
            {evidence && <button type="button" onClick={extractText} disabled={ocrLoading} className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"><ScanText size={16} />{ocrLoading ? 'Reading evidence…' : 'Extract text with OCR'}</button>}
            {ocrText && <textarea value={ocrText} onChange={(event) => setOcrText(event.target.value)} rows={4} aria-label="OCR extracted text" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />}
          </section>

          <label className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-4"><span><strong className="text-sm">Unsafe situation</strong><span className="mt-1 block text-sm text-muted-foreground">Alert the selected mine’s manager immediately.</span></span><input type="checkbox" checked={alertManager} onChange={(event) => setAlertManager(event.target.checked)} className="size-5 accent-primary" /></label>

          <button type="submit" disabled={loading || submitting || !mines.length} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}{submitting ? 'Submitting report…' : 'Submit report'}</button>
        </form>

        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><FileText size={14} />Reports are written to the MineOS audit trail after submission.</p>
      </div>
    </main>
  )
}
