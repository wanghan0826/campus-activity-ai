import { useEffect, useState } from 'react'
import {
  clearAiSettings,
  getAiSettings,
  getApiErrorMessage,
  updateAiSettings,
} from '../api/activity.js'

export default function AiSettingsDialog({ onClose }) {
  const [settings, setSettings] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getAiSettings()
      .then(setSettings)
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'AI 配置读取失败')))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!apiKey.trim()) {
      setError('请输入 API Key')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateAiSettings(apiKey.trim())
      setSettings(updated)
      setApiKey('')
      setSuccess('API Key 已在本机后端启用')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'API Key 保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const clear = async () => {
    if (!window.confirm('确定清除当前后端内存中的 API Key 吗？')) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await clearAiSettings()
      setSettings((current) => ({ ...current, configured: false, maskedKey: null }))
      setApiKey('')
      setSuccess('API Key 已清除')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'API Key 清除失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-100 font-bold text-indigo-700">AI</div>
            <h2 id="ai-settings-title" className="mt-4 text-xl font-bold text-stone-900">AI 设置</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">连接你的模型服务，用于生成活动方案与解析文档。</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-bold text-stone-400 hover:bg-stone-100 hover:text-stone-700">关闭</button>
        </div>

        <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          {loading ? <p className="text-sm text-stone-400">正在读取配置…</p> : (
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-xs font-semibold text-stone-400">当前状态</div><div className={`mt-1 text-sm font-bold ${settings?.configured ? 'text-emerald-700' : 'text-amber-700'}`}>{settings?.configured ? `已配置 ${settings.maskedKey}` : '尚未配置 API Key'}</div></div>
              <div className="text-right"><div className="text-xs text-stone-400">{settings?.provider || 'DeepSeek'}</div><div className="mt-1 text-xs font-semibold text-stone-600">{settings?.model || 'deepseek-chat'}</div></div>
            </div>
          )}
        </div>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-xs font-semibold text-stone-600">DeepSeek API Key</span>
          <input type="password" autoComplete="off" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setError(''); setSuccess('') }} placeholder="输入 sk-..." className="form-input" />
        </label>

        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs leading-5 text-emerald-800">
          Key 仅发送到 localhost 后端并保存在当前进程内存中，不写入数据库、浏览器存储或项目文件；重启后端后会自动清除。
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {success}</div>}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {settings?.configured && <button type="button" disabled={saving} onClick={clear} className="mr-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">清除 Key</button>}
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-500 hover:bg-stone-100">取消</button>
          <button type="button" disabled={saving || !apiKey.trim()} onClick={save} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">{saving ? '正在保存…' : '保存并启用'}</button>
        </div>
      </section>
    </div>
  )
}
