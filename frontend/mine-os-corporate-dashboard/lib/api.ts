const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include' })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `MineOS API request failed: ${response.status}`)
  }
  return response.json()
}

export const getCorporateDashboard = () => request('/api/dashboard/corporate')
export const getViolation = (id: number) => request(`/api/violations/${id}`)
