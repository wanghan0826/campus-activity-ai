import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  closeActivityCheckIn,
  downloadCheckInCsv,
  getApiErrorMessage,
  getCheckInRoster,
  manualCheckIn,
  openActivityCheckIn,
  undoManualCheckIn,
} from '../api/activity.js'

const STATUS_LABELS = { APPROVED: '报名成功', PENDING: '待审核', REJECTED: '未通过', CANCELLED: '已取消' }
const METHOD_LABELS = { SELF_CODE: '学生现场签到', MANUAL: '工作人员签到' }

export default function CheckInManagement({ activity, onBack }) {
  const [roster, setRoster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('APPROVED')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRoster(await getCheckInRoster(activity.id))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '签到数据加载失败'))
    } finally {
      setLoading(false)
    }
  }, [activity.id])

  useEffect(() => { loadRoster() }, [loadRoster])

  const registrations = useMemo(() => {
    const source = roster?.registrations || []
    const normalizedKeyword = keyword.trim().toLowerCase()
    return source.filter((item) => {
      const matchesStatus = status === 'ALL' || item.registrationStatus === status
      const matchesKeyword = !normalizedKeyword || [item.studentId, item.studentName, item.collegeName]
        .some((value) => String(value || '').toLowerCase().includes(normalizedKeyword))
      return matchesStatus && matchesKeyword
    })
  }, [keyword, roster, status])

  const toggleOpen = async () => {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const updated = roster.checkInOpen
        ? await closeActivityCheckIn(activity.id)
        : await openActivityCheckIn(activity.id)
      setRoster(updated)
      setSuccess(updated.checkInOpen ? '现场签到已开启' : '现场签到已关闭')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '签到状态更新失败'))
    } finally {
      setBusy(false)
    }
  }

  const togglePerson = async (item) => {
    setRowBusy(item.registrationId)
    setError('')
    setSuccess('')
    try {
      const updated = item.checkedIn
        ? await undoManualCheckIn(activity.id, item.registrationId)
        : await manualCheckIn(activity.id, item.registrationId)
      setRoster(updated)
      setSuccess(item.checkedIn ? `已撤销 ${item.studentName} 的签到` : `${item.studentName} 签到成功`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '签到处理失败'))
    } finally {
      setRowBusy(null)
    }
  }

  const exportCsv = async () => {
    setBusy(true)
    setError('')
    try {
      const safeTitle = String(roster.activityTitle || `活动-${activity.id}`).replace(/[\\/:*?"<>|]/g, '-')
      await downloadCheckInCsv(activity.id, `${safeTitle}-签到表.csv`)
      setSuccess('电子签到表已导出')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '签到表导出失败'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center text-sm text-stone-400">正在整理签到数据…</div>

  if (!roster) {
    return <div className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error || '签到数据加载失败'}<button type="button" onClick={loadRoster} className="ml-3 font-bold">重试</button></div></div>
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <div className="print:hidden">
        <button type="button" onClick={onBack} className="mb-5 rounded-xl px-3 py-2 text-sm font-bold text-stone-500 hover:bg-white">← 返回活动管理</button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600"><span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-white">签</span>教师端 · 签到管理</div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">{roster.activityTitle}</h1>
            <p className="mt-2 text-sm text-stone-500">{formatDate(roster.startTime)} · {roster.location || '地点待定'}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" disabled={busy} onClick={exportCsv} className="min-h-11 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50">导出电子表</button>
            <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">打印纸质表</button>
            {roster.checkInMode !== 'NONE' && <button type="button" disabled={busy} onClick={toggleOpen} className={`col-span-2 min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${roster.checkInOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{busy ? '正在处理…' : roster.checkInOpen ? '关闭现场签到' : '开启现场签到'}</button>}
          </div>
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {success}</div>}

        <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-6">
          <Stat label="有效报名" value={roster.totalCount} tone="indigo" />
          <Stat label="报名成功" value={roster.approvedCount} tone="stone" />
          <Stat label="已签到" value={roster.checkedInCount} tone="emerald" />
          <Stat label="未签到" value={roster.absentCount} tone="amber" />
          <Stat label="未通过" value={roster.rejectedCount} tone="stone" />
          <Stat label="已取消" value={roster.cancelledCount} tone="stone" />
        </div>

        <section className={`mt-5 rounded-3xl border p-5 sm:p-6 ${roster.checkInOpen ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className={`text-sm font-bold ${roster.checkInOpen ? 'text-emerald-800' : 'text-stone-700'}`}>{roster.checkInOpen ? '● 现场签到进行中' : '现场签到未开启'}</div><p className="mt-1 text-xs text-stone-500">{roster.checkInMode === 'QR' ? '开启后，学生在“我的报名”中输入现场签到码。' : roster.checkInMode === 'MANUAL' ? '由工作人员在下方名单中逐一签到。' : '该活动设置为无需签到。'}</p></div>
            {roster.checkInOpen && roster.checkInCode && <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-sm ring-1 ring-emerald-200"><div className="text-[11px] font-bold tracking-widest text-stone-400">现场签到码</div><div className="mt-1 font-mono text-3xl font-black tracking-[0.25em] text-emerald-700">{roster.checkInCode}</div></div>}
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex gap-2 overflow-x-auto">
            {[['APPROVED', '报名成功'], ['PENDING', '待审核'], ['REJECTED', '未通过'], ['CANCELLED', '已取消'], ['ALL', '全部']].map(([key, label]) => <button key={key} type="button" onClick={() => setStatus(key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${status === key ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>{label}</button>)}
          </div>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、学号或学院" className="form-input sm:max-w-xs" />
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white print:mt-0 print:rounded-none print:border-0 print:shadow-none">
        <div className="hidden border-b-2 border-stone-900 pb-4 text-center print:block">
          <h1 className="text-2xl font-bold">{roster.activityTitle}签到表</h1>
          <p className="mt-2 text-sm">活动时间：{formatDate(roster.startTime)}　活动地点：{roster.location || '待定'}　打印时间：{formatDate(new Date().toISOString())}</p>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm print:min-w-0 print:text-[10px]">
            <thead><tr className="bg-stone-50 text-xs text-stone-500 print:bg-white print:text-black"><Th>序号</Th><Th>学号/工号</Th><Th>姓名</Th><Th>学院</Th><Th>报名状态</Th><Th>签到状态</Th><Th>签到时间</Th><Th>签到方式</Th><Th>现场签名</Th><Th printHidden>后台操作</Th></tr></thead>
            <tbody>
              {registrations.length === 0 ? <tr><td colSpan="10" className="px-5 py-16 text-center text-stone-400">暂无符合条件的名单</td></tr> : registrations.map((item, index) => (
                <tr key={item.registrationId} className="border-t border-stone-200 print:border-stone-700">
                  <Td>{index + 1}</Td><Td>{item.studentId}</Td><Td strong>{item.studentName}</Td><Td>{item.collegeName || '-'}</Td><Td>{STATUS_LABELS[item.registrationStatus] || item.registrationStatus}</Td><Td>{item.checkedIn ? '已签到' : '未签到'}</Td><Td>{formatDate(item.checkedInAt, true)}</Td><Td>{METHOD_LABELS[item.checkInMethod] || '-'}</Td><Td><span className="block min-w-24 border-b border-stone-300 print:h-5 print:min-w-16" /></Td>
                  <Td printHidden><button type="button" disabled={rowBusy === item.registrationId || item.registrationStatus !== 'APPROVED'} onClick={() => togglePerson(item)} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-30 ${item.checkedIn ? 'text-red-600 hover:bg-red-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{rowBusy === item.registrationId ? '处理中…' : item.checkedIn ? '撤销签到' : '手动签到'}</button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hidden pt-6 text-xs print:flex print:justify-between"><span>工作人员签名：________________</span><span>负责人签名：________________</span><span>共 {registrations.length} 人</span></div>
      </section>
    </div>
  )
}

function Stat({ label, value, tone }) {
  const tones = { indigo: 'bg-indigo-600 text-white', emerald: 'bg-emerald-50 text-emerald-900', amber: 'bg-amber-50 text-amber-900', stone: 'bg-white text-stone-900' }
  return <div className={`rounded-2xl border border-stone-200 p-4 shadow-sm ${tones[tone]}`}><div className="text-xs font-semibold opacity-65">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>
}

function Th({ children, printHidden }) {
  return <th className={`whitespace-nowrap px-3 py-3 font-bold print:border print:border-stone-700 print:px-1.5 print:py-2 ${printHidden ? 'print:hidden' : ''}`}>{children}</th>
}

function Td({ children, strong, printHidden }) {
  return <td className={`whitespace-nowrap px-3 py-3 text-stone-600 print:border print:border-stone-700 print:px-1.5 print:py-2 print:text-black ${strong ? 'font-bold text-stone-900' : ''} ${printHidden ? 'print:hidden' : ''}`}>{children || '-'}</td>
}

function formatDate(value, includeSeconds = false) {
  if (!value) return '-'
  const text = String(value).replace('T', ' ')
  return text.slice(0, includeSeconds ? 19 : 16)
}
