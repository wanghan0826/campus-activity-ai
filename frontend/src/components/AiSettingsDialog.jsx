import { useEffect, useState } from 'react'
import {
  clearAiSettings,
  clearImageAiSettings,
  getAiSettings,
  getApiErrorMessage,
  getImageAiSettings,
  updateAiSettings,
  updateImageAiSettings,
} from '../api/activity.js'

export default function AiSettingsDialog({ onClose }) {
  const [chatSettings, setChatSettings] = useState(null)
  const [imageSettings, setImageSettings] = useState(null)
  const [chatApiKey, setChatApiKey] = useState('')
  const [imageApiKey, setImageApiKey] = useState('')
  const [imageApiUrl, setImageApiUrl] = useState('https://ark.cn-beijing.volces.com/api/v3/images/generations')
  const [imageModel, setImageModel] = useState('doubao-seedream-5-0-260128')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([getAiSettings(), getImageAiSettings()])
      .then(([chat, image]) => {
        setChatSettings(chat)
        setImageSettings(image)
        setImageApiUrl(image.apiUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations')
        setImageModel(image.model || 'doubao-seedream-5-0-260128')
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'AI 配置读取失败')))
      .finally(() => setLoading(false))
  }, [])

  const resetFeedback = () => {
    setError('')
    setSuccess('')
  }

  const saveChat = async () => {
    if (!chatApiKey.trim()) return
    setSaving('chat')
    resetFeedback()
    try {
      const updated = await updateAiSettings(chatApiKey.trim())
      setChatSettings(updated)
      setChatApiKey('')
      setSuccess('活动方案模型已启用')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '活动方案模型保存失败'))
    } finally {
      setSaving('')
    }
  }

  const saveImage = async () => {
    if (!imageApiKey.trim() || !imageApiUrl.trim() || !imageModel.trim()) return
    setSaving('image')
    resetFeedback()
    try {
      const updated = await updateImageAiSettings({
        apiKey: imageApiKey.trim(),
        apiUrl: imageApiUrl.trim(),
        model: imageModel.trim(),
      })
      setImageSettings(updated)
      setImageApiKey('')
      setSuccess('封面生图模型已启用')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '封面生图模型保存失败'))
    } finally {
      setSaving('')
    }
  }

  const clearChat = async () => {
    if (!window.confirm('确定清除活动方案模型的 API Key 吗？')) return
    setSaving('chat')
    resetFeedback()
    try {
      await clearAiSettings()
      setChatSettings((current) => ({ ...current, configured: false, maskedKey: null }))
      setSuccess('活动方案模型的 Key 已清除')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'API Key 清除失败'))
    } finally {
      setSaving('')
    }
  }

  const clearImage = async () => {
    if (!window.confirm('确定清除封面生图模型的 API Key 吗？')) return
    setSaving('image')
    resetFeedback()
    try {
      await clearImageAiSettings()
      setImageSettings((current) => ({ ...current, configured: false, maskedKey: null }))
      setSuccess('封面生图模型的 Key 已清除')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '生图 API Key 清除失败'))
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end overflow-y-auto bg-stone-950/55 p-0 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:my-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 font-bold text-indigo-700 sm:h-11 sm:w-11 sm:rounded-2xl">AI</div>
            <h2 id="ai-settings-title" className="mt-3 text-xl font-bold text-stone-900 sm:mt-4">AI 设置</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">分别连接活动方案模型和封面生图模型。</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-bold text-stone-400 hover:bg-stone-100 hover:text-stone-700">关闭</button>
        </div>

        {loading ? <p className="mt-6 text-sm text-stone-400">正在读取配置…</p> : (
          <div className="mt-5 space-y-4 sm:mt-6">
            <SettingsSection
              title="活动方案"
              description="用于理解活动需求并整理方案"
              configured={chatSettings?.configured}
              maskedKey={chatSettings?.maskedKey}
              model={chatSettings?.model || 'deepseek-chat'}
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-stone-600">API Key</span>
                <input type="password" autoComplete="off" value={chatApiKey} onChange={(event) => { setChatApiKey(event.target.value); resetFeedback() }} placeholder="输入 sk-..." className="form-input" />
              </label>
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                {chatSettings?.configured && <button type="button" disabled={Boolean(saving)} onClick={clearChat} className="min-h-10 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 sm:mr-auto">清除 Key</button>}
                <button type="button" disabled={Boolean(saving) || !chatApiKey.trim()} onClick={saveChat} className="min-h-10 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40">{saving === 'chat' ? '正在保存…' : '保存活动方案配置'}</button>
              </div>
            </SettingsSection>

            <SettingsSection
              title="封面生图 · Seedream 5.0 Pro"
              description="火山方舟高质量国产生图模型，与即梦同源"
              configured={imageSettings?.configured}
              maskedKey={imageSettings?.maskedKey}
              model={imageSettings?.model || imageModel}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-600">生图接口地址</span>
                  <input type="url" value={imageApiUrl} onChange={(event) => { setImageApiUrl(event.target.value); resetFeedback() }} className="form-input" />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-semibold text-stone-600">生图模型</span>
                  <input value={imageModel} onChange={(event) => { setImageModel(event.target.value); resetFeedback() }} placeholder="doubao-seedream-5-0-260128" className="form-input" />
                </label>
                <label>
                  <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-stone-600">
                    <span>火山方舟 API Key</span>
                    <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/apikey" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:text-indigo-800">获取 Key</a>
                  </span>
                  <input type="password" autoComplete="off" value={imageApiKey} onChange={(event) => { setImageApiKey(event.target.value); resetFeedback() }} placeholder="粘贴方舟 API Key" className="form-input" />
                </label>
              </div>
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                {imageSettings?.configured && <button type="button" disabled={Boolean(saving)} onClick={clearImage} className="min-h-10 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 sm:mr-auto">清除 Key</button>}
                <button type="button" disabled={Boolean(saving) || !imageApiKey.trim() || !imageApiUrl.trim() || !imageModel.trim()} onClick={saveImage} className="min-h-10 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">{saving === 'image' ? '正在保存…' : '保存生图配置'}</button>
              </div>
            </SettingsSection>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs leading-5 text-emerald-800">
          Key 只保存在当前后端进程内存中，不写入数据库、浏览器存储或项目文件。
        </div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {success}</div>}
      </section>
    </div>
  )
}

function SettingsSection({ title, description, configured, maskedKey, model, children }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 sm:p-4">
      <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3">
        <div><h3 className="text-sm font-bold text-stone-900">{title}</h3><p className="mt-1 text-xs text-stone-500">{description}</p></div>
        <div className="max-w-full text-left sm:text-right"><div className={`text-xs font-bold ${configured ? 'text-emerald-700' : 'text-amber-700'}`}>{configured ? `已连接 ${maskedKey}` : '未连接'}</div><div className="mt-1 break-all text-[11px] text-stone-400">{model}</div></div>
      </div>
      {children}
    </section>
  )
}
