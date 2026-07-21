import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function parseDocument(document) {
  const { data } = await api.post('/activities/parse', { document })
  return data
}

export async function createActivity(result) {
  const { data } = await api.post('/activities', result)
  return data
}

export function getApiErrorMessage(error, fallback = '请求失败，请稍后重试') {
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? '请求超时，请稍后重试'
      : '无法连接后端服务，请确认后端已在 8080 端口启动'
  }

  const body = error.response.data
  if (typeof body === 'string' && body.trim()) return body
  return body?.message || body?.error || fallback
}
