import { useEffect, useRef, useState } from 'react'
import ActivityCard from '../components/ActivityCard.jsx'
import ChatBox from '../components/ChatBox.jsx'

const BotAvatar = () => (
  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm" aria-hidden="true">
    AI
  </div>
)

export default function CreateActivity() {
  const [parsedResponse, setParsedResponse] = useState(null)
  const [submittedDocument, setSubmittedDocument] = useState('')
  const [parseError, setParseError] = useState('')
  const latestMessageRef = useRef(null)

  useEffect(() => {
    if (parsedResponse || parseError) {
      latestMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [parsedResponse, parseError])

  const handleParsed = (response, document) => {
    setSubmittedDocument(document)
    setParsedResponse(response)
    setParseError('')
  }

  const handleError = (message) => {
    setParseError(message)
    if (message) setParsedResponse(null)
  }

  const handleSubmit = (document) => {
    setSubmittedDocument(document)
    setParsedResponse(null)
    setParseError('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f7f7f5]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-stone-900 text-lg text-white shadow-sm">校</div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-stone-900 sm:text-base">校园活动创建助手</h1>
              <p className="text-xs text-stone-500">把文档交给 AI，快速整理活动信息</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-stone-500 ring-1 ring-stone-200 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            智能解析
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-7">
          <div className="flex items-start gap-3">
            <BotAvatar />
            <div className="max-w-2xl rounded-2xl rounded-tl-md border border-stone-200 bg-white px-4 py-3.5 text-sm leading-7 text-stone-700 shadow-sm">
              你好！请把活动大纲、通知或策划文档粘贴到下方。我会帮你提取时间、地点、活动内容等信息，并生成一张可编辑的预览卡片。
            </div>
          </div>

          {submittedDocument && (
            <div className="flex justify-end">
              <div className="max-w-2xl whitespace-pre-wrap rounded-2xl rounded-tr-md bg-emerald-600 px-4 py-3.5 text-sm leading-7 text-white shadow-sm">
                {submittedDocument}
              </div>
            </div>
          )}

          <div ref={latestMessageRef}>
            {parsedResponse && (
              <div className="flex items-start gap-3">
                <BotAvatar />
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-xs text-stone-500">
                    已完成解析{parsedResponse.passed ? '，请确认以下信息' : '，部分必填信息需要补充'}
                  </p>
                  <ActivityCard
                    parsedResult={parsedResponse.result || {}}
                    missingFields={parsedResponse.missingFields || []}
                  />
                </div>
              </div>
            )}

            {parseError && (
              <div className="flex items-start gap-3">
                <BotAvatar />
                <div role="alert" className="max-w-2xl rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 shadow-sm">
                  {parseError}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 z-20">
        <ChatBox onSubmit={handleSubmit} onParsed={handleParsed} onError={handleError} />
      </div>
    </div>
  )
}
