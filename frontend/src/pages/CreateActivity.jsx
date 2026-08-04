import { useEffect, useRef, useState } from 'react'
import ActivityCard from '../components/ActivityCard.jsx'
import ChatBox from '../components/ChatBox.jsx'

const EMPTY_MANUAL_ACTIVITY = { creationMode: 'MANUAL', schedule: [], materials: [] }

const FIELD_QUESTIONS = {
  title: '这场活动准备使用什么标题？',
  location: '活动安排在哪个场地？',
  startTime: '活动具体从什么时候开始？',
  endTime: '预计什么时候结束？',
}

const BotAvatar = () => (
  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm" aria-hidden="true">AI</div>
)

export default function CreateActivity({ editingActivity, onActivityChanged, onCancelEdit }) {
  const [mode, setMode] = useState(editingActivity?.creationMode === 'MANUAL' ? 'MANUAL' : 'AI')
  const [parsedResponse, setParsedResponse] = useState(null)
  const [submittedDocument, setSubmittedDocument] = useState('')
  const [parseError, setParseError] = useState('')
  const latestMessageRef = useRef(null)

  useEffect(() => {
    if (parsedResponse || parseError) latestMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [parsedResponse, parseError])

  useEffect(() => {
    setMode(editingActivity?.creationMode === 'MANUAL' ? 'MANUAL' : 'AI')
  }, [editingActivity])

  const handleParsed = (response, document, requestDocument) => {
    setSubmittedDocument(requestDocument || document)
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

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setParsedResponse(null)
    setSubmittedDocument('')
    setParseError('')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-white">1</span>
            教师端 · 活动创建
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
            {editingActivity ? '继续完善活动方案' : '创建一个新活动'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">AI 快速生成方案，也可以使用完整表单手动填写。</p>
        </div>
        {editingActivity && (
          <button type="button" onClick={onCancelEdit} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50">
            退出编辑
          </button>
        )}
      </div>

      {!editingActivity && (
        <div className="mb-7 grid gap-3 sm:grid-cols-2">
          <ModeCard active={mode === 'AI'} title="AI 快速创建" badge="推荐" description="输入一句话或粘贴活动文档，AI 自动整理方案。" onClick={() => switchMode('AI')} icon="✦" />
          <ModeCard active={mode === 'MANUAL'} title="手动创建" description="使用传统完整表单，从空白方案开始填写。" onClick={() => switchMode('MANUAL')} icon="✎" />
        </div>
      )}

      {editingActivity ? (
        <ActivityCard parsedResult={editingActivity} creationMode={editingActivity.creationMode} onSaved={onActivityChanged} />
      ) : mode === 'MANUAL' ? (
        <ActivityCard parsedResult={EMPTY_MANUAL_ACTIVITY} creationMode="MANUAL" onSaved={onActivityChanged} />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
          <div className="space-y-7 px-4 py-6 sm:px-7 sm:py-8">
            <div className="flex items-start gap-3">
              <BotAvatar />
              <div className="max-w-2xl rounded-2xl rounded-tl-md bg-indigo-50 px-4 py-3.5 text-sm leading-7 text-indigo-950 ring-1 ring-indigo-100">
                简单描述你的活动需求，我会为你整理完整方案；如果还缺少关键信息，会继续向你确认。
              </div>
            </div>

            {submittedDocument && (
              <div className="flex justify-end">
                <div className="max-w-2xl whitespace-pre-wrap rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3.5 text-sm leading-7 text-white shadow-sm">{submittedDocument}</div>
              </div>
            )}

            <div ref={latestMessageRef}>
              {parsedResponse && (
                <div className="space-y-5">
                  {(parsedResponse.missingFields?.length > 0 || parsedResponse.clarificationQuestions?.length > 0) && (
                    <div className="flex items-start gap-3">
                      <BotAvatar />
                      <div className="max-w-2xl rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
                        <p className="font-semibold">方案已经生成，还需要确认：</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
                          {(parsedResponse.missingFields || []).map((field) => <li key={field}>{FIELD_QUESTIONS[field] || `请补充 ${field}`}</li>)}
                          {(parsedResponse.clarificationQuestions || []).map((question) => <li key={question}>{question}</li>)}
                        </ul>
                        <p className="mt-2 text-xs text-amber-700">可以直接在下方方案卡片中补充。</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <BotAvatar />
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs text-stone-500">AI 已生成完整方案卡片，请人工核对后提交。</p>
                      <ActivityCard
                        parsedResult={parsedResponse.result || {}}
                        missingFields={parsedResponse.missingFields || []}
                        sourceDocument={submittedDocument}
                        creationMode="AI"
                        onSaved={onActivityChanged}
                      />
                    </div>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-3">
                  <BotAvatar />
                  <div role="alert" className="max-w-2xl rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">{parseError}</div>
                </div>
              )}
            </div>
          </div>

          <ChatBox
            onSubmit={handleSubmit}
            onParsed={handleParsed}
            onError={handleError}
            contextDocument={parsedResponse ? submittedDocument : ''}
            placeholder={parsedResponse ? '继续补充人数、预算、场地或其他要求...' : '请粘贴活动大纲或文档...'}
          />
        </div>
      )}
    </div>
  )
}

function ModeCard({ active, title, badge, description, onClick, icon }) {
  return (
    <button type="button" onClick={onClick} className={`relative rounded-2xl border p-5 text-left transition ${active ? 'border-indigo-500 bg-indigo-50 shadow-[0_8px_30px_rgba(79,70,229,0.12)] ring-2 ring-indigo-100' : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${active ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-600'}`}>{icon}</span>
        <div>
          <div className="flex items-center gap-2"><span className="font-bold text-stone-900">{title}</span>{badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{badge}</span>}</div>
          <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>
        </div>
      </div>
    </button>
  )
}
