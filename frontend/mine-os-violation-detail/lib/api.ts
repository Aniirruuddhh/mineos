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

export const getViolation = (id: number) => request(`/api/violations/${id}`)
export const getAuditLog = (id: number) => request(`/api/audit-log/${id}`)
export const getCorrectiveActions = (id: number) => request(`/api/violations/${id}/actions`)
export const verifyAuditLog = () => request('/api/audit-log/verify')
export const updateViolationStatus = (id: number, payload: { status: string; performed_by: number }) => request(`/api/violations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const updateCorrectiveAction = (id: number, payload: { status: string; performed_by: number }) => request(`/api/actions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const uploadEvidence = (violationId: number, file: File, payload: Record<string, string> = {}) => {
  const body = new FormData()
  body.append('evidence', file)
  Object.entries(payload).forEach(([key, value]) => body.append(key, value))
  return request(`/api/violations/${violationId}/evidence`, { method: 'POST', body })
}
