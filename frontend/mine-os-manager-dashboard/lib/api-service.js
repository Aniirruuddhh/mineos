const request = async (url, options = {}) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!response.ok) throw new Error(`MineOS API request failed: ${response.status}`)
  return response.json()
}

export const getViolations = () => request('/api/violations')
export const getMines = () => request('/api/mines')
export const getAuditLog = (violationId) => request(`/api/audit-log/${encodeURIComponent(violationId)}`)
