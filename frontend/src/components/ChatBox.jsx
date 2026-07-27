import { useState } from 'react'
import { getApiErrorMessage, parseDocument } from '../api/activity.js'

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 14-7-4.5 14-3-5.5L5 12Z" />
    <path strokeLinecap="round" d="m11.5 13.5 3-3" />
  </svg>
)

export default function ChatBox({
  onSubmit,
  onParsed,
  onError,
  disabled = false,
  contextDocument = '',
  placeholder = '请粘贴活动大纲或文档...',
}) {
  const [document, setDocument] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const value = document.trim()
    if (!value || loading || disabled) return

    const requestDocument = contextDocument
      ? `${contextDocument}\n\n教师补充信息：${value}`
      : value

    setLoading(true)
    onError?.('')
    onSubmit?.(value)
    try {
      const response = await parseDocument(requestDocument)
      onParsed(response, value, requestDocument)
      setDocument('')
    } catch (error) {
      onError?.(getApiErrorMessage(error, 'AI 解析失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-stone-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[22px] border border-stone-200 bg-stone-50 p-2 shadow-sm transition focus-within:border-emerald-500/50 focus-within:bg-white focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <label htmlFor="activity-document" className="sr-only">
            活动文档
          </label>
          <textarea
            id="activity-document"
            value={document}
            onChange={(event) => setDocument(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={4}
            disabled={loading || disabled}
            className="max-h-60 min-h-24 w-full resize-y bg-transparent px-3 py-2 text-[15px] leading-7 text-stone-800 outline-none placeholder:text-stone-400 disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="hidden text-xs text-stone-400 sm:inline">Ctrl / ⌘ + Enter 发送</span>
            <button
              type="button"
              onClick={submit}
              disabled={!document.trim() || loading || disabled}
              className="ml-auto inline-flex min-w-32 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  AI 正在解析...
                </>
              ) : (
                <>
                  <SendIcon />
                  发送给 AI
                </>
              )}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-stone-400">AI 生成内容仅供参考，创建前请核对关键信息</p>
      </div>
    </div>
  )
}
