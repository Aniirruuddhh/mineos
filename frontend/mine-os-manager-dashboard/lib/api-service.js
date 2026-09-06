const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`MineOS API request failed: ${response.status}`);
  }

  return response.json();
}

export const getViolations = () => request("/api/violations");
export const getManagerDashboard = (mineId) =>
  request(`/api/dashboard/manager?mineId=${encodeURIComponent(mineId)}`);
export const getViolation = (id) => request(`/api/violations/${id}`);
export const getMines = () => request("/api/mines");
export const getAuditLog = (id) => request(`/api/audit-log/${id}`);
export const verifyAuditLog = () => request("/api/audit-log/verify");

export const createViolation = (data) =>
  request("/api/violations", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateViolationStatus = (id, data) =>
  request(`/api/violations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const runOcr = (file) => {
  const formData = new FormData();
  formData.append("document", file);

  return request("/api/ocr", {
    method: "POST",
    body: formData,
  });
};
