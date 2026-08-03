import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    // 企业微信登录接入前的本地身份占位，正式环境由登录态提供。
    'X-User-Id': 'test_teacher_001',
    'X-User-Role': 'PUBLISHER',
    'X-User-College': 'INFORMATION_ENGINEERING',
  },
})

export function setApiIdentity({ id, role, college }) {
  api.defaults.headers['X-User-Id'] = id
  api.defaults.headers['X-User-Role'] = role
  api.defaults.headers['X-User-College'] = college
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

export function getApiErrorMessage(error, fallback = '请求失败，请稍后重试') {
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? '请求超时，请稍后重试'
      : '无法连接后端服务，请确认后端已在 8080 端口启动'
  }

  const body = error.response.data
  if (typeof body === 'string' && body.trim()) return body
  return body?.detail || body?.message || body?.error || fallback
}
