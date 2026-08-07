import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveActivityRegistration,
  getActivityRegistrations,
  getApiErrorMessage,
  rejectActivityRegistration,
} from '../api/activity.js'

const STATUS_META = {
  PENDING: { label: '待审核', classes: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: '报名成功', classes: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '审核未通过', classes: 'bg-red-100 text-red-700' },
  CANCELLED: { label: '已取消', classes: 'bg-stone-100 text-stone-500' },
}

export default function RegistrationManagement({ activity, onBack }) {
  const [roster, setRoster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('ALL')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRoster(await getActivityRegistrations(activity.id))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '报名名单加载失败'))
    } finally {
      setLoading(false)
    }
  }, [activity.id])

  useEffect(() => { load() }, [load])

  const registrations = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return (roster?.registrations || []).filter((item) => {
      const matchesStatus = status === 'ALL' || item.registrationStatus === status
      const matchesKeyword = !normalized || [item.studentId, item.studentName, item.collegeName]
        .some((value) => String(value || '').toLowerCase().includes(normalized))
      return matchesStatus && matchesKeyword
    })
  }, [keyword, roster, status])

  const approve = async (item) => {
    setBusyId(item.registrationId)
    setError('')
    setSuccess('')
    try {
      setRoster(await approveActivityRegistration(activity.id, item.registrationId))
      setSuccess(`已通过 ${item.studentName} 的报名申请`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '报名审核失败'))
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (item, comment) => {
    setBusyId(item.registrationId)
    setError('')
    setSuccess('')
    try {
      setRoster(await rejectActivityRegistration(activity.id, item.registrationId, comment))
      setRejectTarget(null)
      setSuccess(`已拒绝 ${item.studentName} 的报名申请`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '报名审核失败'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center text-sm text-stone-400">正在整理报名名单…</div>
  if (!roster) return <div className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error || '报名名单加载失败'}<button type="button" onClick={load} className="ml-3 font-bold">重试</button></div></div>

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-10">
      <button type="button" onClick={onBack} className="mb-5 rounded-xl px-3 py-2 text-sm font-bold text-stone-500 hover:bg-white">← 返回活动管理</button>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600"><span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-white">报</span>教师端 · 报名管理</div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">{roster.activityTitle}</h1>
          <p className="mt-2 text-sm text-stone-500">{formatDate(roster.startTime)} · {roster.location || '地点待定'}</p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 ${roster.approvalRequired ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
          <div className="text-sm font-black">{roster.approvalRequired ? '需要审核' : '先到先得'}</div>
          <p className="mt-1 max-w-lg text-xs leading-5 opacity-75">{roster.approvalRequired ? '学生提交后先进入待审核；通过后才占正式名额并获得签到资格。' : '学生提交后立即报名成功；正式名额满后自动停止报名，无需人工处理。'}</p>
        </div>
      </div>

      {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {success}</div>}

      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <Stat label="全部申请" value={roster.applicationCount} tone="indigo" />
        <Stat label="待审核" value={roster.pendingCount} tone="amber" />
        <Stat label="报名成功" value={roster.approvedCount} tone="emerald" />
        <Stat label="审核未通过" value={roster.rejectedCount} tone="red" />
        <Stat label="剩余名额" value={roster.remainingCapacity ?? '不限'} tone="stone" />
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex gap-2 overflow-x-auto">
          {[['ALL', '全部'], ['PENDING', '待审核'], ['APPROVED', '报名成功'], ['REJECTED', '未通过'], ['CANCELLED', '已取消']].map(([key, label]) => <button key={key} type="button" onClick={() => setStatus(key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${status === key ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>{label}</button>)}
        </div>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、学号或学院" className="form-input sm:max-w-xs" />
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead><tr className="bg-stone-50 text-xs text-stone-500"><Th>序号</Th><Th>学号/工号</Th><Th>姓名</Th><Th>学院</Th><Th>申请时间</Th><Th>报名状态</Th><Th>审核时间</Th><Th>审核意见</Th><Th>操作</Th></tr></thead>
            <tbody>{registrations.length === 0 ? <tr><td colSpan="9" className="px-5 py-16 text-center text-stone-400">暂无符合条件的报名</td></tr> : registrations.map((item, index) => (
              <tr key={item.registrationId} className="border-t border-stone-100">
                <Td>{index + 1}</Td><Td>{item.studentId}</Td><Td strong>{item.studentName}</Td><Td>{item.collegeName || '-'}</Td><Td>{formatDate(item.registeredAt, true)}</Td><Td><Status status={item.registrationStatus} /></Td><Td>{formatDate(item.reviewedAt, true)}</Td><Td><span className="block max-w-48 whitespace-normal leading-5">{item.reviewComment || '-'}</span></Td>
                <Td>{roster.approvalRequired && item.registrationStatus === 'PENDING' ? <div className="flex gap-2"><button type="button" disabled={busyId === item.registrationId} onClick={() => approve(item)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">通过</button><button type="button" disabled={busyId === item.registrationId} onClick={() => setRejectTarget(item)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">拒绝</button></div> : <span className="text-xs text-stone-300">—</span>}</Td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      {rejectTarget && <RejectDialog item={rejectTarget} busy={busyId === rejectTarget.registrationId} onClose={() => setRejectTarget(null)} onConfirm={(comment) => reject(rejectTarget, comment)} />}
    </div>
  )
}

function RejectDialog({ item, busy, onClose, onConfirm }) {
  const [comment, setComment] = useState('')
  return <div className="fixed inset-0 z-50 flex items-end bg-stone-950/60 p-0 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form onSubmit={(event) => { event.preventDefault(); if (comment.trim()) onConfirm(comment.trim()) }} className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"><h2 className="text-xl font-bold text-stone-900">拒绝报名申请</h2><p className="mt-2 text-sm text-stone-500">{item.studentName} · {item.studentId}</p><textarea autoFocus value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={4} placeholder="请填写拒绝原因，学生端会看到这条说明" className="form-input mt-5 resize-y" /><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl text-sm font-bold text-stone-500">取消</button><button type="submit" disabled={busy || !comment.trim()} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-40">{busy ? '正在处理…' : '确认拒绝'}</button></div></form></div>
}

function Status({ status }) { const meta = STATUS_META[status] || STATUS_META.CANCELLED; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.classes}`}>{meta.label}</span> }
function Stat({ label, value, tone }) { const tones = { indigo: 'bg-indigo-600 text-white', amber: 'bg-amber-50 text-amber-900', emerald: 'bg-emerald-50 text-emerald-900', red: 'bg-red-50 text-red-900', stone: 'bg-white text-stone-900' }; return <div className={`rounded-2xl border border-stone-200 p-4 shadow-sm ${tones[tone]}`}><div className="text-xs font-semibold opacity-65">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div> }
function Th({ children }) { return <th className="whitespace-nowrap px-3 py-3 font-bold">{children}</th> }
function Td({ children, strong }) { return <td className={`whitespace-nowrap px-3 py-3 text-stone-600 ${strong ? 'font-bold text-stone-900' : ''}`}>{children ?? '-'}</td> }
function formatDate(value, seconds = false) { return value ? String(value).replace('T', ' ').slice(0, seconds ? 19 : 16) : '-' }
