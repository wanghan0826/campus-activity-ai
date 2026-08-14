import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteActivity,
  duplicateActivity,
  getActivities,
  getActivityStats,
  getApiErrorMessage,
  publishActivity,
  retryActivityNotification,
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

export default function ActivityManagement({ user, onCreate, onEdit, onCheckIn, onRegistrations }) {
  const [activities, setActivities] = useState([])
  const [stats, setStats] = useState({})
  const [scope, setScope] = useState('MINE')
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
        getActivities({ scope, status, keyword, size: 50 }),
        getActivityStats(scope),
      ])
      setActivities(pageData.content || [])
      setStats(statsData || {})
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '活动列表加载失败'))
    } finally {
      setLoading(false)
    }
  }, [scope, status, keyword])

  useEffect(() => {
    const timer = window.setTimeout(loadActivities, keyword ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [loadActivities, keyword])

  const summaryCards = useMemo(() => [
    { label: '全部活动', value: stats.ALL || 0, hint: scope === 'COLLEGE' ? '本学院发布人创建' : '我创建的活动', tone: 'indigo' },
    { label: '待完善草稿', value: stats.DRAFT || 0, hint: '可以继续编辑', tone: 'stone' },
    { label: '正在审批', value: stats.PENDING_APPROVAL || 0, hint: '等待审批处理', tone: 'amber' },
    { label: '已发布', value: stats.PUBLISHED || 0, hint: '学生端可见', tone: 'emerald' },
  ], [scope, stats])

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
    const targetNames = (activity.notificationTargets || []).map((target) => target.groupName).filter(Boolean)
    const notice = targetNames.length ? `\n发布后将通知：${targetNames.join('、')}` : ''
    if (!window.confirm(`“${activity.title || '未命名活动'}”已完成两级审批，确定发布到学生端吗？${notice}`)) return
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

  const handleRetryNotification = async (activity) => {
    if (!window.confirm(`确定重新向“${activity.title || '未命名活动'}”选择的群聊发送通知吗？`)) return
    setActionId(activity.id)
    setError('')
    try {
      await retryActivityNotification(activity.id)
      await loadActivities()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '群聊通知重试失败'))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{scope === 'COLLEGE' ? '本学院活动' : '我的活动'}</h1>
          <p className="text-sm text-gray-500 mt-1">共 {stats.ALL || 0} 个活动 · 草稿 {stats.DRAFT || 0} · 审批中 {stats.PENDING_APPROVAL || 0} · 已发布 {stats.PUBLISHED || 0}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => downloadCsv(activities)}>导出 CSV</button>
          <button className="btn-primary" onClick={onCreate}>+ 创建活动</button>
        </div>
      </div>

      <div className="admin-card mb-6" style={{ padding: '12px 16px' }}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="space-y-2">
            <div className="inline-flex rounded border border-gray-200 bg-gray-50 p-0.5">
              <button type="button" onClick={() => setScope('MINE')} className={`rounded px-3 py-1 text-xs font-semibold ${scope === 'MINE' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>我的活动</button>
              <button type="button" onClick={() => setScope('COLLEGE')} className={`rounded px-3 py-1 text-xs font-semibold ${scope === 'COLLEGE' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>本学院</button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(([k, label]) => (
                <button key={k} onClick={() => setStatus(k)} className={`px-2.5 py-1 text-xs font-medium rounded border transition ${status === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {label}{stats[k] !== undefined ? ` (${stats[k]})` : ''}
                </button>
              ))}
            </div>
          </div>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索…" className="form-input max-w-48" />
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 mb-4">{error} <button onClick={loadActivities} className="font-medium underline">重试</button></div>}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">加载中…</div>
      ) : activities.length === 0 ? (
        <div className="admin-card text-center py-16 text-gray-400 text-sm">暂无活动</div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead><tr><th>活动标题</th><th>分类</th><th>时间</th><th>地点</th><th>审批进度</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.id}>
                  <td className="font-medium text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => setPreview(a)}>
                    <div>{a.title || '未命名'}</div>
                    <div className="mt-1 text-xs font-normal text-gray-400">发布人：{a.creatorDisplayName || a.creatorId || '-'}</div>
                    {a.notificationTargets?.length > 0 && (
                      <div className={`mt-1 text-xs font-normal ${notificationTone(a.notificationDeliveryStatus)}`} title={a.notificationDeliverySummary || ''}>
                        {notificationLabel(a)}
                      </div>
                    )}
                  </td>
                  <td>{CATEGORY_LABELS[a.category] || '-'}</td>
                  <td className="text-sm">{fmtDate(a.startTime)}</td>
                  <td className="text-sm max-w-32 truncate">{a.location || '-'}</td>
                  <td className="text-sm">{approvalLabel(a)}</td>
                  <td>{statusBadge(a)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setPreview(a)} className="btn-secondary btn-sm">查看</button>
                      {a.ownedByCurrentUser !== false && ['PUBLISHED','OFFLINE'].includes(a.status) && a.registrationRequired !== false && <button onClick={() => onRegistrations(a)} className="btn-secondary btn-sm">报名管理</button>}
                      {a.ownedByCurrentUser !== false && ['PUBLISHED','OFFLINE'].includes(a.status) && <button onClick={() => onCheckIn(a)} className="btn-secondary btn-sm">签到表</button>}
                      {a.ownedByCurrentUser !== false && ['DRAFT','REJECTED'].includes(a.status) && <button onClick={() => onEdit(a)} className="btn-secondary btn-sm">编辑</button>}
                      {a.ownedByCurrentUser !== false && a.status === 'APPROVED' && <button disabled={actionId === a.id} onClick={() => handlePublish(a)} className="btn-primary btn-sm">发布</button>}
                      {a.ownedByCurrentUser !== false && a.status === 'PUBLISHED' && ['FAILED','PARTIAL'].includes(a.notificationDeliveryStatus) && <button disabled={actionId === a.id} onClick={() => handleRetryNotification(a)} className="btn-secondary btn-sm">重试通知</button>}
                      {a.ownedByCurrentUser !== false && <button disabled={actionId === a.id} onClick={() => handleDuplicate(a)} className="btn-secondary btn-sm">复制</button>}
                      {a.ownedByCurrentUser !== false && ['DRAFT','REJECTED'].includes(a.status) && <button onClick={() => handleDelete(a)} className="btn-danger btn-sm">删除</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-10 pb-10 px-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setPreview(null) }}>
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200"><h2 className="font-bold">{preview.title || '详情'}</h2><button onClick={() => setPreview(null)} className="btn-secondary btn-sm">关闭</button></div>
            <div className="p-4"><ActivityPreview activity={preview} /></div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusBadge(a) {
  const s = a.status
  const labels = { DRAFT: '草稿', PENDING_APPROVAL: a.approvalStage === 'COLLEGE_LEADER' ? '待领导审批' : '待审核', APPROVED: '已通过', PUBLISHED: '已发布', OFFLINE: '已结束', REJECTED: '已驳回' }
  const cls = { DRAFT: 'draft', PENDING_APPROVAL: 'pending', APPROVED: 'approved', PUBLISHED: 'published', OFFLINE: 'offline', REJECTED: 'rejected' }
  return <span className={`status-tag ${cls[s] || 'draft'}`}>{labels[s] || s}</span>
}
function approvalLabel(a) {
  if (!a.approvalStage || a.status === 'DRAFT' || a.status === 'PUBLISHED') return '-'
  if (a.status === 'APPROVED') return '已通过 ✓'
  if (a.status === 'REJECTED') return '已驳回 ✗'
  return a.approvalStage === 'COLLEGE_LEADER' ? '审核老师 ✓ → 待领导' : '待审核老师'
}
function fmtDate(v) { if (!v) return '-'; const d = String(v).replace('T', ' '); return d.length > 16 ? d.slice(0, 16) : d }

function notificationLabel(activity) {
  const count = activity.notificationTargets?.length || 0
  const labels = {
    NOT_SENT: `待发布后通知 ${count} 个群`,
    PENDING: `正在通知 ${count} 个群`,
    SENT: activity.notificationDeliverySummary || `已通知 ${count} 个群`,
    PARTIAL: activity.notificationDeliverySummary || '部分群聊发送失败',
    FAILED: activity.notificationDeliverySummary || '群聊通知发送失败',
  }
  return labels[activity.notificationDeliveryStatus] || `通知 ${count} 个群`
}

function notificationTone(status) {
  if (status === 'SENT') return 'text-emerald-600'
  if (['FAILED', 'PARTIAL'].includes(status)) return 'text-red-600'
  return 'text-blue-500'
}

function downloadCsv(activities) {
  const headers = ['ID', '标题', '分类', '地点', '主办方', '开始时间', '结束时间', '状态', '创建人', '创建时间']
  const rows = activities.map(a => [
    a.id, a.title || '', a.category || '', a.location || '', a.organizer || '',
    fmtDate(a.startTime), fmtDate(a.endTime), a.status || '', a.creatorId || '', fmtDate(a.createdAt)
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `活动列表_${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

function SummaryCard({ label, value, hint, tone }) {
  const tones = { indigo: 'bg-indigo-600 text-white', stone: 'bg-white text-stone-900', amber: 'bg-amber-50 text-amber-950', emerald: 'bg-emerald-50 text-emerald-950' }
  return <div className={`rounded-2xl border border-stone-200 p-3.5 shadow-sm sm:p-5 ${tones[tone]}`}><div className="text-[11px] font-semibold opacity-70 sm:text-xs">{label}</div><div className="mt-1.5 text-2xl font-bold sm:mt-2 sm:text-3xl">{value}</div><div className="mt-1 truncate text-[10px] opacity-60 sm:text-xs">{hint}</div></div>
}

function ActivityRow({ activity, busy, onPreview, onEdit, onCheckIn, onRegistrations, onDuplicate, onDelete, onPublish }) {
  const editable = ['DRAFT', 'REJECTED'].includes(activity.status)
  return (
    <tr className="border-t border-stone-100 text-sm hover:bg-stone-50/70">
      <td className="px-5 py-4"><button type="button" onClick={() => onPreview(activity)} className="max-w-xs text-left"><div className="font-bold text-stone-900 hover:text-indigo-600">{activity.title || '未命名活动'}</div><div className="mt-1 text-xs text-stone-400">{CATEGORY_LABELS[activity.category] || '未分类'} · #{activity.id}</div></button></td>
      <td className="px-5 py-4"><div className="text-stone-700">{formatDate(activity.startTime)}</div><div className="mt-1 max-w-52 truncate text-xs text-stone-400">{activity.location || '地点待定'}</div></td>
      <td className="px-5 py-4 text-xs text-stone-500">{activity.creationMode === 'MANUAL' ? '手动创建' : 'AI 创建'}</td>
      <td className="px-5 py-4"><StatusBadge activity={activity} /></td>
      <td className="px-5 py-4 text-xs text-stone-400">{formatDate(activity.updatedAt)}</td>
      <td className="px-5 py-4"><div className="flex justify-end gap-1"><Action onClick={() => onPreview(activity)}>预览</Action>{['PUBLISHED', 'OFFLINE'].includes(activity.status) && activity.registrationRequired !== false && <Action primary onClick={() => onRegistrations(activity)}>报名管理</Action>}{['PUBLISHED', 'OFFLINE'].includes(activity.status) && <Action onClick={() => onCheckIn(activity)}>签到表</Action>}{editable && <Action onClick={() => onEdit(activity)}>编辑</Action>}{activity.status === 'APPROVED' && <Action primary disabled={busy} onClick={() => onPublish(activity)}>发布</Action>}<Action disabled={busy} onClick={() => onDuplicate(activity)}>复制</Action>{editable && <Action danger disabled={busy} onClick={() => onDelete(activity)}>删除</Action>}</div></td>
    </tr>
  )
}

function ActivityMobileCard({ activity, busy, onPreview, onEdit, onCheckIn, onRegistrations, onDuplicate, onDelete, onPublish }) {
  const editable = ['DRAFT', 'REJECTED'].includes(activity.status)
  return <div className="p-4"><div className="flex items-start justify-between gap-3"><button type="button" onClick={() => onPreview(activity)} className="min-w-0 text-left"><div className="line-clamp-2 font-bold text-stone-900">{activity.title || '未命名活动'}</div><div className="mt-1 text-xs text-stone-400">{CATEGORY_LABELS[activity.category] || '未分类'} · {formatDate(activity.startTime)}</div></button><StatusBadge activity={activity} /></div><div className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">{activity.location || '地点待定'} · {activity.creationMode === 'MANUAL' ? '手动创建' : 'AI 创建'}</div><div className="mt-3 grid grid-cols-3 gap-1.5"><Action onClick={() => onPreview(activity)}>预览</Action>{['PUBLISHED', 'OFFLINE'].includes(activity.status) && activity.registrationRequired !== false && <Action primary onClick={() => onRegistrations(activity)}>报名管理</Action>}{['PUBLISHED', 'OFFLINE'].includes(activity.status) && <Action onClick={() => onCheckIn(activity)}>签到表</Action>}{editable && <Action onClick={() => onEdit(activity)}>编辑</Action>}{activity.status === 'APPROVED' && <Action primary disabled={busy} onClick={() => onPublish(activity)}>发布</Action>}<Action disabled={busy} onClick={() => onDuplicate(activity)}>复制</Action>{editable && <Action danger disabled={busy} onClick={() => onDelete(activity)}>删除</Action>}</div></div>
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
