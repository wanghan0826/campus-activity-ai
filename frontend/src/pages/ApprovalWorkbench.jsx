import { useCallback, useEffect, useState } from 'react'
import {
  approveActivity,
  getApprovalHistory,
  getApprovalTasks,
  getApiErrorMessage,
  rejectActivity,
} from '../api/activity.js'
import ActivityPreview from '../components/ActivityPreview.jsx'

const STEP_LABELS = {
  PUBLISHER: '发布人提交',
  COLLEGE_REVIEWER: '学院审核老师',
  COLLEGE_LEADER: '学院领导',
}

const ACTION_LABELS = { SUBMITTED: '已提交', APPROVED: '已通过', REJECTED: '已驳回' }

export default function ApprovalWorkbench({ identity }) {
  const [tasks, setTasks] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decision, setDecision] = useState(null)
  const [preview, setPreview] = useState(null)
  const [history, setHistory] = useState([])

  const isLeader = identity.role === 'COLLEGE_LEADER'
  const roleLabel = isLeader ? '学院领导' : '学院审核老师'

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const page = await getApprovalTasks({ keyword, size: 50 })
      setTasks(page.content || [])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '审批待办加载失败'))
    } finally {
      setLoading(false)
    }
  }, [keyword, identity.id])

  useEffect(() => {
    const timer = window.setTimeout(loadTasks, keyword ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [loadTasks, keyword])

  const openPreview = async (activity) => {
    setPreview(activity)
    setHistory([])
    try {
      setHistory(await getApprovalHistory(activity.id))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '审批轨迹加载失败'))
    }
  }

  const handleDecision = async (comment) => {
    if (!decision) return
    setError('')
    try {
      if (decision.type === 'approve') await approveActivity(decision.activity.id, comment)
      else await rejectActivity(decision.activity.id, comment)
      setDecision(null)
      await loadTasks()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '审批处理失败'))
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-white">审</span>
            {identity.collegeName || identity.college} · {roleLabel}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">审批工作台</h1>
          <p className="mt-2 text-sm text-stone-500">
            {isLeader ? '处理已通过学院老师审核、等待学院领导终审的活动。' : '核对发布人提交的活动内容，通过后自动流转给学院领导。'}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-right">
          <div className="text-xs font-semibold text-amber-700">当前待办</div>
          <div className="mt-0.5 text-2xl font-bold text-amber-950">{tasks.length}</div>
        </div>
      </div>

      <ApprovalFlow activeStage={isLeader ? 'COLLEGE_LEADER' : 'COLLEGE_REVIEWER'} />

      <section className="mt-6 overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="font-bold text-stone-900">待我审批</h2><p className="mt-1 text-xs text-stone-400">按提交时间从早到晚排列</p></div>
          <label className="relative block sm:w-80">
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-stone-400">⌕</span>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、发布人或主办方" className="form-input pl-9" />
          </label>
        </div>

        {error && <div className="m-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={loadTasks} className="font-bold">重试</button></div>}

        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm text-stone-400">正在加载审批待办…</div>
        ) : tasks.length === 0 ? (
          <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
            <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">✓</div><h2 className="mt-4 font-bold text-stone-800">当前没有待审批活动</h2><p className="mt-2 text-sm text-stone-400">新的活动流转到当前节点后会显示在这里。</p></div>
          </div>
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-2 sm:p-5">
            {tasks.map((activity) => (
              <article key={activity.id} className="rounded-2xl border border-stone-200 p-5 transition hover:border-indigo-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate font-bold text-stone-900">{activity.title || '未命名活动'}</h3><p className="mt-1 text-xs text-stone-400">发布人 {activity.creatorId} · 第 {activity.approvalRound || 1} 轮</p></div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">待处理</span>
                </div>
                <div className="mt-4 grid gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 sm:grid-cols-2">
                  <Info label="活动时间" value={formatDate(activity.startTime)} />
                  <Info label="活动地点" value={activity.location || '待定'} />
                  <Info label="主办单位" value={activity.organizer || '待定'} />
                  <Info label="提交时间" value={formatDate(activity.submittedAt)} />
                </div>
                {activity.approvalMessage && <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-xs leading-5 text-indigo-800">发布备注：{activity.approvalMessage}</div>}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => openPreview(activity)} className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50">查看材料</button>
                  <button type="button" onClick={() => setDecision({ activity, type: 'reject' })} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">驳回</button>
                  <button type="button" onClick={() => setDecision({ activity, type: 'approve' })} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">通过</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {decision && <DecisionDialog decision={decision} roleLabel={roleLabel} onClose={() => setDecision(null)} onConfirm={handleDecision} />}
      {preview && <PreviewDialog activity={preview} history={history} onClose={() => setPreview(null)} />}
    </div>
  )
}

function ApprovalFlow({ activeStage }) {
  const steps = [
    ['PUBLISHER', '发布人', '提交活动方案'],
    ['COLLEGE_REVIEWER', '学院审核老师', '内容与规范审核'],
    ['COLLEGE_LEADER', '学院领导', '学院终审'],
  ]
  const activeIndex = steps.findIndex(([key]) => key === activeStage)
  return (
    <div className="mt-7 grid gap-2 rounded-[22px] border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4 sm:grid-cols-3 sm:p-5">
      {steps.map(([key, label, hint], index) => (
        <div key={key} className={`rounded-2xl px-4 py-3 ${index === activeIndex ? 'bg-indigo-600 text-white shadow-sm' : index < activeIndex ? 'bg-white text-emerald-700' : 'text-stone-400'}`}>
          <div className="flex items-center gap-2"><span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${index === activeIndex ? 'bg-white/20' : index < activeIndex ? 'bg-emerald-100' : 'bg-stone-100'}`}>{index < activeIndex ? '✓' : index + 1}</span><span className="text-sm font-bold">{label}</span></div>
          <p className="mt-1 pl-8 text-[11px] opacity-70">{hint}</p>
        </div>
      ))}
    </div>
  )
}

function DecisionDialog({ decision, roleLabel, onClose, onConfirm }) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const rejecting = decision.type === 'reject'
  const submit = async () => {
    if (rejecting && !comment.trim()) return
    setBusy(true)
    await onConfirm(comment)
    setBusy(false)
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl text-xl ${rejecting ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{rejecting ? '×' : '✓'}</div>
        <h2 className="mt-4 text-xl font-bold text-stone-900">{rejecting ? '驳回活动' : '确认通过'}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">“{decision.activity.title || '未命名活动'}”将由{roleLabel}{rejecting ? '驳回给发布人修改' : (decision.activity.approvalStage === 'COLLEGE_REVIEWER' ? '流转给学院领导' : '完成学院终审')}。</p>
        <label className="mt-5 block"><span className="mb-1.5 block text-xs font-semibold text-stone-600">审批意见{rejecting && <span className="ml-1 text-red-500">必填</span>}</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={500} placeholder={rejecting ? '请说明需要修改的内容' : '可填写审批意见（选填）'} className="form-input resize-y" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-500 hover:bg-stone-100">取消</button><button type="button" disabled={busy || (rejecting && !comment.trim())} onClick={submit} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40 ${rejecting ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{busy ? '正在处理…' : (rejecting ? '确认驳回' : '确认通过')}</button></div>
      </div>
    </div>
  )
}

function PreviewDialog({ activity, history, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mx-auto my-4 max-w-4xl sm:my-10">
        <div className="mb-3 flex justify-end"><button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow">关闭</button></div>
        <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-start">
          <ActivityPreview activity={activity} />
          <aside className="rounded-3xl bg-white p-5 shadow-sm"><h3 className="font-bold text-stone-900">审批轨迹</h3><div className="mt-4 space-y-4">{history.length === 0 ? <p className="text-xs text-stone-400">正在加载…</p> : history.map((record) => <div key={record.id} className="border-l-2 border-indigo-100 pl-3"><div className="text-xs font-bold text-stone-700">{STEP_LABELS[record.step] || record.step} · {ACTION_LABELS[record.action] || record.action}</div><div className="mt-1 text-[11px] text-stone-400">{record.operatorId} · {formatDate(record.createdAt)}</div>{record.comment && <p className="mt-1 text-xs leading-5 text-stone-600">{record.comment}</p>}</div>)}</div></aside>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return <div><div className="text-[10px] font-semibold text-stone-400">{label}</div><div className="mt-1 truncate font-medium text-stone-700">{value}</div></div>
}

function formatDate(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '待定'
}
