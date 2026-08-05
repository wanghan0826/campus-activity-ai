import axios from 'axios'

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const AUTH_TOKEN_KEY = 'campus_activity_auth_token'

const api = axios.create({
  baseURL: configuredApiBaseUrl ? `${configuredApiBaseUrl}/api` : '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const initialToken = window.localStorage.getItem(AUTH_TOKEN_KEY)
if (initialToken) api.defaults.headers.Authorization = `Bearer ${initialToken}`

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = String(error.config?.url || '').includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      setAuthToken(null)
      window.dispatchEvent(new Event('campus-auth-expired'))
    }
    return Promise.reject(error)
  },
)

export function setAuthToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
    api.defaults.headers.Authorization = `Bearer ${token}`
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    delete api.defaults.headers.Authorization
  }
}

export function hasStoredAuthToken() {
  return Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY))
}

export async function login(username, password) {
  const { data } = await api.post('/auth/login', { username, password })
  setAuthToken(data.token)
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // 即使后端会话已失效，也要清除设备上的本地登录态。
  } finally {
    setAuthToken(null)
  }
}

export function resolveApiAssetUrl(value) {
  if (!value || !configuredApiBaseUrl || !String(value).startsWith('/api/')) return value
  return `${configuredApiBaseUrl}${value}`
}

export async function getAiSettings() {
  const { data } = await api.get('/ai/settings')
  return data
}

export async function updateAiSettings(apiKey) {
  const { data } = await api.put('/ai/settings', { apiKey })
  return data
}

export async function clearAiSettings() {
  await api.delete('/ai/settings')
}

export async function getImageAiSettings() {
  const { data } = await api.get('/ai/image-settings')
  return data
}

export async function updateImageAiSettings({ apiKey, apiUrl, model }) {
  const { data } = await api.put('/ai/image-settings', { apiKey, apiUrl, model })
  return data
}

export async function clearImageAiSettings() {
  await api.delete('/ai/image-settings')
}

export async function generateCoverImage(prompt) {
  const { data } = await api.post('/ai/images/generate', { prompt }, { timeout: 180000 })
  return data
}

export async function parseDocument(document) {
  const { data } = await api.post('/activities/parse', { document })
  return data
}

export async function createActivity(result) {
  const { data } = await api.post('/activities', result)
  return data
}

export async function updateActivity(id, result) {
  const { data } = await api.put(`/activities/${id}`, result)
  return data
}

export async function getActivities({ status = 'ALL', keyword = '', page = 0, size = 20 } = {}) {
  const { data } = await api.get('/activities', {
    params: { status: status === 'ALL' ? undefined : status, keyword: keyword || undefined, page, size },
  })
  return data
}

export async function getActivityStats() {
  const { data } = await api.get('/activities/stats')
  return data
}

export async function submitActivity(id, message = '') {
  const { data } = await api.post(`/activities/${id}/submit`, { message })
  return data
}

export async function publishActivity(id) {
  const { data } = await api.post(`/activities/${id}/publish`)
  return data
}

export async function getApprovalTasks({ keyword = '', page = 0, size = 20 } = {}) {
  const { data } = await api.get('/approvals/tasks', {
    params: { keyword: keyword || undefined, page, size },
  })
  return data
}

export async function getApprovalHistory(activityId) {
  const { data } = await api.get(`/approvals/${activityId}/history`)
  return data
}

export async function approveActivity(activityId, comment = '') {
  const { data } = await api.post(`/approvals/${activityId}/approve`, { comment })
  return data
}

export async function rejectActivity(activityId, comment) {
  const { data } = await api.post(`/approvals/${activityId}/reject`, { comment })
  return data
}

export async function duplicateActivity(id) {
  const { data } = await api.post(`/activities/${id}/duplicate`)
  return data
}

export async function deleteActivity(id) {
  await api.delete(`/activities/${id}`)
}

export async function getStudentActivities({ category = '', keyword = '', page = 0, size = 30 } = {}) {
  const { data } = await api.get('/student/activities', {
    params: { category: category || undefined, keyword: keyword || undefined, page, size },
  })
  return data
}

export async function getStudentActivity(id) {
  const { data } = await api.get(`/student/activities/${id}`)
  return data
}

export async function getMyRegistrations() {
  const { data } = await api.get('/student/registrations')
  return data
}

export async function registerForActivity(id) {
  const { data } = await api.post(`/student/activities/${id}/registrations`)
  return data
}

export async function cancelActivityRegistration(id) {
  const { data } = await api.delete(`/student/activities/${id}/registrations`)
  return data
}

export function getApiErrorMessage(error, fallback = '请求失败，请稍后重试') {
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? '请求超时，请稍后重试'
      : '无法连接后端服务，请确认电脑后端已启动且设备处于同一网络'
  }

  const body = error.response.data
  if (typeof body === 'string' && body.trim()) return body
  return body?.detail || body?.message || body?.error || fallback
}
