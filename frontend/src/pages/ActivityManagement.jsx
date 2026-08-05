import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteActivity,
  duplicateActivity,
  getActivities,
  getActivityStats,
  getApiErrorMessage,
  publishActivity,
} from '../api/activity.js'
import ActivityPreview from '../components/ActivityPreview.jsx'

const STATUS_META = {
  DRAFT: { label: '草稿', classes: 'bg-stone-100 text-stone-600' },
  PENDING_APPROVAL: { label: '审批中', classes: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: '已通过', classes: 'bg-sky-100 text-sky-700' },
  PUBLISHED: { label: '已发布', classes: 'bg-emerald-100 text-emerald-700' },
  OFFLINE: { label: '已结束', classes: 'bg-slate-100 text-slate-600' },
  REJECTED: { label: '已驳回', classes: 'bg-red-100 text-red-700' },
}

const FILTERS = [
  ['ALL', '全部'], ['DRAFT', '草稿'], ['PENDING_APPROVAL', '审批中'], ['APPROVED', '已通过'],
  ['PUBLISHED', '已发布'], ['REJECTED', '已驳回'], ['OFFLINE', '已结束'],
]

const CATEGORY_LABELS = { ART: '艺术类', SPORTS: '艺体类', PRACTICE: '实践类', LIFE: '生活类', FEATURE: '特色类' }

export default function ActivityManagement({ onCreate, onEdit }) {
  const [activities, setActivities] = useState([])
  const [stats, setStats] = useState({})
  const [status, setStatus] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [preview, setPreview] = useState(null)

  const loadActivities = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [pageData, statsData] = await Promise.all([
        getActivities({ status, keyword, size: 50 }),
        getActivityStats(),
      ])
      setActivities(pageData.content || [])
      setStats(statsData || {})
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '活动列表加载失败'))
    } finally {
      setLoading(false)
    }
  }, [status, keyword])

  useEffect(() => {
    const timer = window.setTimeout(loadActivities, keyword ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [loadActivities, keyword])

  const summaryCards = useMemo(() => [
    { label: '全部活动', value: stats.ALL || 0, hint: '我创建的活动', tone: 'indigo' },
    { label: '待完善草稿', value: stats.DRAFT || 0, hint: '可以继续编辑', tone: 'stone' },
    { label: '正在审批', value: stats.PENDING_APPROVAL || 0, hint: '等待审批处理', tone: 'amber' },
    { label: '已发布', value: stats.PUBLISHED || 0, hint: '学生端可见', tone: 'emerald' },
  ], [stats])

  const handleDuplicate = async (activity) => {
    setActionId(activity.id)
    try {
      const copy = await duplicateActivity(activity.id)
      await loadActivities()
      onEdit(copy)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '复制活动失败'))
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (activity) => {
    if (!window.confirm(`确定删除草稿“${activity.title || '未命名活动'}”吗？`)) return
    setActionId(activity.id)
    try {
      await deleteActivity(activity.id)
      await loadActivities()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '删除草稿失败'))
    } finally {
      setActionId(null)
    }
  }

  const handlePublish = async (activity) => {
    if (!window.confirm(`“${activity.title || '未命名活动'}”已完成两级审批，确定发布到学生端吗？`)) return
    setActionId(activity.id)
    setError('')
    try {
      await publishActivity(activity.id)
      await loadActivities()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '活动发布失败'))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-white">2</span>
            教师端 · 活动管理
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">活动管理</h1>
          <p className="mt-2 text-sm text-stone-500">统一查看草稿、审批进度和发布状态。</p>
        </div>
        <button type="button" onClick={onCreate} className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto">+ 创建活动</button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-7 sm:gap-3 xl:grid-cols-4">
        {summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm sm:mt-6 sm:rounded-[24px]">
        <div className="border-b border-stone-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map(([key, label]) => (
                <button key={key} type="button" onClick={() => setStatus(key)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${status === key ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  {label}{stats[key] !== undefined && <span className="ml-1.5 opacity-70">{stats[key]}</span>}
                </button>
              ))}
            </div>
            <label className="relative block lg:w-80">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-stone-400">⌕</span>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、地点或主办方" className="form-input pl-9" />
            </label>
          </div>
        </div>

        {error && <div className="m-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={loadActivities} className="font-bold">重试</button></div>}

        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm text-stone-400">正在加载活动…</div>
        ) : activities.length === 0 ? (
          <div className="grid min-h-80 place-items-center px-6 py-12 text-center">
            <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">◇</div><h2 className="mt-4 font-bold text-stone-800">暂无符合条件的活动</h2><p className="mt-2 text-sm text-stone-400">可以调整筛选条件，或创建第一个活动方案。</p><button type="button" onClick={onCreate} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">创建活动</button></div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] border-collapse text-left">
                <thead><tr className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-400"><Th>活动信息</Th><Th>时间与地点</Th><Th>创建方式</Th><Th>状态</Th><Th>更新时间</Th><Th align="right">操作</Th></tr></thead>
                <tbody>{activities.map((activity) => <ActivityRow key={activity.id} activity={activity} busy={actionId === activity.id} onPreview={setPreview} onEdit={onEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} onPublish={handlePublish} />)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-stone-100 md:hidden">
              {activities.map((activity) => <ActivityMobileCard key={activity.id} activity={activity} busy={actionId === activity.id} onPreview={setPreview} onEdit={onEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} onPublish={handlePublish} />)}
            </div>
          </>
        )}
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && setPreview(null)}>
          <div className="mx-auto my-2 max-w-3xl sm:my-10">
            <div className="mb-3 flex justify-end"><button type="button" onClick={() => setPreview(null)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow">关闭预览</button></div>
            <ActivityPreview activity={preview} />
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, hint, tone }) {
  const tones = { indigo: 'bg-indigo-600 text-white', stone: 'bg-white text-stone-900', amber: 'bg-amber-50 text-amber-950', emerald: 'bg-emerald-50 text-emerald-950' }
  return <div className={`rounded-2xl border border-stone-200 p-3.5 shadow-sm sm:p-5 ${tones[tone]}`}><div className="text-[11px] font-semibold opacity-70 sm:text-xs">{label}</div><div className="mt-1.5 text-2xl font-bold sm:mt-2 sm:text-3xl">{value}</div><div className="mt-1 truncate text-[10px] opacity-60 sm:text-xs">{hint}</div></div>
}

function ActivityRow({ activity, busy, onPreview, onEdit, onDuplicate, onDelete, onPublish }) {
  const editable = ['DRAFT', 'REJECTED'].includes(activity.status)
  return (
    <tr className="border-t border-stone-100 text-sm hover:bg-stone-50/70">
      <td className="px-5 py-4"><button type="button" onClick={() => onPreview(activity)} className="max-w-xs text-left"><div className="font-bold text-stone-900 hover:text-indigo-600">{activity.title || '未命名活动'}</div><div className="mt-1 text-xs text-stone-400">{CATEGORY_LABELS[activity.category] || '未分类'} · #{activity.id}</div></button></td>
      <td className="px-5 py-4"><div className="text-stone-700">{formatDate(activity.startTime)}</div><div className="mt-1 max-w-52 truncate text-xs text-stone-400">{activity.location || '地点待定'}</div></td>
      <td className="px-5 py-4 text-xs text-stone-500">{activity.creationMode === 'MANUAL' ? '手动创建' : 'AI 创建'}</td>
      <td className="px-5 py-4"><StatusBadge activity={activity} /></td>
      <td className="px-5 py-4 text-xs text-stone-400">{formatDate(activity.updatedAt)}</td>
      <td className="px-5 py-4"><div className="flex justify-end gap-1"><Action onClick={() => onPreview(activity)}>预览</Action>{editable && <Action onClick={() => onEdit(activity)}>编辑</Action>}{activity.status === 'APPROVED' && <Action primary disabled={busy} onClick={() => onPublish(activity)}>发布</Action>}<Action disabled={busy} onClick={() => onDuplicate(activity)}>复制</Action>{editable && <Action danger disabled={busy} onClick={() => onDelete(activity)}>删除</Action>}</div></td>
    </tr>
  )
}

function ActivityMobileCard({ activity, busy, onPreview, onEdit, onDuplicate, onDelete, onPublish }) {
  const editable = ['DRAFT', 'REJECTED'].includes(activity.status)
  return <div className="p-4"><div className="flex items-start justify-between gap-3"><button type="button" onClick={() => onPreview(activity)} className="min-w-0 text-left"><div className="line-clamp-2 font-bold text-stone-900">{activity.title || '未命名活动'}</div><div className="mt-1 text-xs text-stone-400">{CATEGORY_LABELS[activity.category] || '未分类'} · {formatDate(activity.startTime)}</div></button><StatusBadge activity={activity} /></div><div className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">{activity.location || '地点待定'} · {activity.creationMode === 'MANUAL' ? '手动创建' : 'AI 创建'}</div><div className="mt-3 grid grid-cols-3 gap-1.5"><Action onClick={() => onPreview(activity)}>预览</Action>{editable && <Action onClick={() => onEdit(activity)}>编辑</Action>}{activity.status === 'APPROVED' && <Action primary disabled={busy} onClick={() => onPublish(activity)}>发布</Action>}<Action disabled={busy} onClick={() => onDuplicate(activity)}>复制</Action>{editable && <Action danger disabled={busy} onClick={() => onDelete(activity)}>删除</Action>}</div></div>
}

function StatusBadge({ activity }) {
  const { status, approvalStage } = activity
  const meta = STATUS_META[status] || { label: status || '未知', classes: 'bg-stone-100 text-stone-600' }
  const label = status === 'PENDING_APPROVAL'
    ? (approvalStage === 'COLLEGE_LEADER' ? '待学院领导' : '待审核老师')
    : meta.label
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.classes}`}>{label}</span>
}

function Action({ children, onClick, disabled, danger = false, primary = false }) {
  const tone = primary ? 'bg-indigo-600 text-white hover:bg-indigo-700' : danger ? 'text-red-600 hover:bg-red-50' : 'text-stone-500 hover:bg-stone-100 hover:text-indigo-600'
  return <button type="button" disabled={disabled} onClick={onClick} className={`min-h-9 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${tone}`}>{children}</button>
}

function Th({ children, align }) {
  return <th className={`px-5 py-3 font-semibold ${align === 'right' ? 'text-right' : ''}`}>{children}</th>
}

function formatDate(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '待定'
}
