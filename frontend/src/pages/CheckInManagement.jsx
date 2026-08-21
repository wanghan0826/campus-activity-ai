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
const METHOD_LABELS = { SELF_CODE: '学生现场签到', SELF_LOCATION: '雷达定位签到', MANUAL: '工作人员签到' }

export default function CheckInManagement({ activity, onBack }) {
  const [roster, setRoster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationRadius, setLocationRadius] = useState(100)
  const [rowBusy, setRowBusy] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('APPROVED')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const nextRoster = await getCheckInRoster(activity.id)
      setRoster(nextRoster)
      setLocationRadius(nextRoster.checkInRadiusMeters || 100)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '签到数据加载失败'))
    } finally {
      setLoading(false)
    }
  }, [activity.id])

  useEffect(() => { loadRoster() }, [loadRoster])

  useEffect(() => {
    if (!roster?.checkInOpen) return undefined
    const timer = window.setInterval(async () => {
      try { setRoster(await getCheckInRoster(activity.id)) } catch { /* 下一轮继续刷新 */ }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activity.id, roster?.checkInOpen])

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
      let updated
      if (roster.checkInOpen) {
        updated = await closeActivityCheckIn(activity.id)
      } else if (roster.checkInMode === 'LOCATION') {
        setLocating(true)
        const position = await getBrowserLocation()
        updated = await openActivityCheckIn(activity.id, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          radiusMeters: Number(locationRadius),
        })
      } else {
        updated = await openActivityCheckIn(activity.id)
      }
      setRoster(updated)
      setSuccess(updated.checkInOpen ? (updated.checkInMode === 'LOCATION' ? '雷达签到已开启' : '现场签到已开启') : '现场签到已关闭')
    } catch (requestError) {
      setError(requestError?.message === 'SECURE_CONTEXT_REQUIRED'
        ? '当前入口无法使用定位，请通过 HTTPS 地址打开平台'
        : typeof requestError?.code === 'number'
          ? locationErrorMessage(requestError)
          : getApiErrorMessage(requestError, '签到状态更新失败'))
    } finally {
      setBusy(false)
      setLocating(false)
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
            {roster.checkInMode === 'LOCATION' && !roster.checkInOpen && <label className="col-span-2 flex min-h-11 items-center justify-between rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-600"><span>有效范围</span><select value={locationRadius} onChange={(event) => setLocationRadius(Number(event.target.value))} className="bg-transparent text-sm font-bold text-indigo-700 outline-none"><option value="50">50 米</option><option value="100">100 米</option><option value="200">200 米</option><option value="300">300 米</option><option value="500">500 米</option></select></label>}
            {roster.checkInMode !== 'NONE' && <button type="button" disabled={busy || locating} onClick={toggleOpen} className={`col-span-2 min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${roster.checkInOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{busy || locating ? (locating ? '正在确定现场位置…' : '正在处理…') : roster.checkInOpen ? '关闭现场签到' : roster.checkInMode === 'LOCATION' ? '定位并开启雷达签到' : '开启现场签到'}</button>}
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
            <div><div className={`text-sm font-bold ${roster.checkInOpen ? 'text-emerald-800' : 'text-stone-700'}`}>{roster.checkInOpen ? '● 现场签到进行中' : '现场签到未开启'}</div><p className="mt-1 text-xs text-stone-500">{roster.checkInMode === 'QR' ? '开启后，学生在“我的报名”中输入现场签到码。' : roster.checkInMode === 'LOCATION' ? `学生进入现场 ${roster.checkInRadiusMeters || locationRadius} 米范围后完成雷达签到。` : roster.checkInMode === 'MANUAL' ? '由工作人员在下方名单中逐一签到。' : '该活动设置为无需签到。'}</p></div>
            {roster.checkInOpen && roster.checkInCode && <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-sm ring-1 ring-emerald-200"><div className="text-[11px] font-bold tracking-widest text-stone-400">现场签到码</div><div className="mt-1 font-mono text-3xl font-black tracking-[0.25em] text-emerald-700">{roster.checkInCode}</div></div>}
          </div>
        </section>

        {roster.checkInMode === 'LOCATION' && <LocationRadar roster={roster} />}

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
                  <Td>{index + 1}</Td><Td>{item.studentId}</Td><Td strong>{item.studentName}</Td><Td>{item.collegeName || '-'}</Td><Td>{STATUS_LABELS[item.registrationStatus] || item.registrationStatus}</Td><Td>{item.checkedIn ? '已签到' : '未签到'}</Td><Td>{formatDate(item.checkedInAt, true)}</Td><Td><div>{METHOD_LABELS[item.checkInMethod] || '-'}</div>{item.checkInDistanceMeters != null && <div className="mt-0.5 text-[10px] text-emerald-700">距签到点 {item.checkInDistanceMeters} 米</div>}</Td><Td><span className="block min-w-24 border-b border-stone-300 print:h-5 print:min-w-16" /></Td>
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

function LocationRadar({ roster }) {
  const checked = (roster.registrations || []).filter((item) => item.checkedIn)
  const radius = roster.checkInRadiusMeters || 100
  return (
    <section className="mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-full border border-emerald-300/30 bg-emerald-950 shadow-[inset_0_0_50px_rgba(16,185,129,0.2)]">
          {[82, 58, 34].map((size) => <span key={size} className="absolute left-1/2 top-1/2 rounded-full border border-emerald-300/30" style={{ width: `${size}%`, height: `${size}%`, transform: 'translate(-50%, -50%)' }} />)}
          <span className="absolute left-1/2 top-0 h-full w-px bg-emerald-300/15" /><span className="absolute left-0 top-1/2 h-px w-full bg-emerald-300/15" />
          <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-emerald-400 font-black text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.8)]">签</span>
          {checked.slice(0, 30).map((item) => {
            const ratio = Math.min((item.checkInDistanceMeters ?? radius * 0.35) / radius, 0.92)
            const angle = ((Number(item.registrationId) * 137.5) % 360) * Math.PI / 180
            const x = 50 + Math.cos(angle) * ratio * 43
            const y = 50 + Math.sin(angle) * ratio * 43
            return <span key={item.registrationId} title={`${item.studentName} · ${item.checkInDistanceMeters ?? '-'}米`} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-300 shadow-[0_0_10px_rgba(253,224,71,0.9)]" style={{ left: `${x}%`, top: `${y}%` }} />
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold tracking-[0.2em] text-emerald-300">现场雷达</div>
          <div className="mt-2 text-3xl font-black">{roster.checkedInCount}<span className="ml-2 text-base font-semibold text-white/60">/ {roster.approvedCount} 人到场</span></div>
          <p className="mt-3 text-sm leading-6 text-white/65">签到半径 {radius} 米 · 每 5 秒自动刷新。雷达点位用于展示到场情况，不代表学生真实方向。</p>
          {roster.checkInLocationAccuracyMeters != null && <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70">签到点定位精度约 {Math.round(roster.checkInLocationAccuracyMeters)} 米</div>}
        </div>
      </div>
    </section>
  )
}

function getBrowserLocation() {
  if (!window.isSecureContext || !navigator.geolocation) return Promise.reject(new Error('SECURE_CONTEXT_REQUIRED'))
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }))
}

function locationErrorMessage(error) {
  if (error?.code === 1) return '定位权限未开启，请在浏览器设置中允许访问位置'
  if (error?.code === 2) return '暂时无法获取位置，请打开手机定位后重试'
  if (error?.code === 3) return '定位超时，请移动到开阔处后重试'
  return error?.message || '定位失败，请稍后重试'
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
