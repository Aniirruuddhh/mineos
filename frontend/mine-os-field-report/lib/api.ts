const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'

async function request(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `MineOS API request failed: ${response.status}`)
  }
  return response.json()
}

export const getMines = () => request('/api/mines')
export const createViolation = (payload: Record<string, unknown>) => request('/api/violations', { method: 'POST', body: JSON.stringify(payload) })
export const runOcr = (file: File) => {
  const body = new FormData()
  body.append('document', file)
  return request('/api/ocr', { method: 'POST', body })
}
export const uploadEvidence = (violationId: number, file: File, payload: Record<string, string> = {}) => {
  const body = new FormData()
  body.append('evidence', file)
  Object.entries(payload).forEach(([key, value]) => body.append(key, value))
  return request(`/api/violations/${violationId}/evidence`, { method: 'POST', body })
}
