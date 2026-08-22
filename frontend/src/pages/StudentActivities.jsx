import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelActivityRegistration,
  getApiErrorMessage,
  getMyRegistrations,
  getStudentActivities,
  getStudentActivity,
  registerForActivity,
  resolveApiAssetUrl,
  studentCheckIn,
} from '../api/activity.js'
import ActivityPreview from '../components/ActivityPreview.jsx'

const CATEGORIES = [
  ['', '全部'], ['ART', '艺术'], ['SPORTS', '艺体'], ['PRACTICE', '实践'], ['LIFE', '生活'], ['FEATURE', '特色'],
]

const CATEGORY_LABELS = { ART: '艺术类', SPORTS: '艺体类', PRACTICE: '实践类', LIFE: '生活类', FEATURE: '特色类' }

const STATUS_META = {
  PENDING: { label: '待审核', classes: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: '报名成功', classes: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '未通过', classes: 'bg-red-100 text-red-700' },
  CANCELLED: { label: '已取消', classes: 'bg-stone-100 text-stone-500' },
}

export default function StudentActivities({ section = 'activities', onNavigate }) {
  const [activities, setActivities] = useState([])
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [registrationFilter, setRegistrationFilter] = useState('ACTIVE')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [checkInTarget, setCheckInTarget] = useState(null)
  const [checkInError, setCheckInError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (section === 'registrations') {
        setActivities(await getMyRegistrations())
      } else {
        const page = await getStudentActivities({ category, keyword, size: 50 })
        setActivities(page.content || [])
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, section === 'registrations' ? '报名记录加载失败' : '活动加载失败'))
    } finally {
      setLoading(false)
    }
  }, [category, keyword, section])

  useEffect(() => {
    const timer = window.setTimeout(loadData, section === 'activities' && keyword ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [loadData, keyword, section])

  useEffect(() => {
    setDetail(null)
    setCheckInTarget(null)
    setError('')
    setSuccess('')
  }, [section])

  const displayedActivities = useMemo(() => {
    if (section !== 'registrations') return activities
    if (registrationFilter === 'ALL') return activities
    if (['CANCELLED', 'REJECTED'].includes(registrationFilter)) return activities.filter((activity) => activity.registrationStatus === registrationFilter)
    return activities.filter((activity) => ['PENDING', 'APPROVED'].includes(activity.registrationStatus))
  }, [activities, registrationFilter, section])

  const updateActivity = (updated) => {
    setActivities((current) => current.map((activity) => activity.id === updated.id ? updated : activity))
    setDetail((current) => current?.id === updated.id ? updated : current)
  }

  const openDetail = async (activity) => {
    setDetail(activity)
    setError('')
    try {
      setDetail(await getStudentActivity(activity.id))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '活动详情加载失败'))
    }
  }

  const register = async (activity) => {
    setActionId(activity.id)
    setError('')
    setSuccess('')
    try {
      const updated = await registerForActivity(activity.id)
      updateActivity(updated)
      setSuccess(updated.registrationStatus === 'PENDING' ? '报名已提交，等待审核' : '报名成功')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '报名失败'))
    } finally {
      setActionId(null)
    }
  }

  const cancel = async (activity) => {
    if (!window.confirm(`确定取消“${activity.title || '该活动'}”的报名吗？`)) return
    setActionId(activity.id)
    setError('')
    setSuccess('')
    try {
      const updated = await cancelActivityRegistration(activity.id)
      updateActivity(updated)
      setSuccess('报名已取消，如名额仍开放可以重新报名')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '取消报名失败'))
    } finally {
      setActionId(null)
    }
  }

  const checkIn = async (activity, payload) => {
    setActionId(activity.id)
    setCheckInError('')
    setError('')
    setSuccess('')
    try {
      const updated = await studentCheckIn(activity.id, payload)
      updateActivity(updated)
      setCheckInTarget(null)
      setSuccess('签到成功，祝你活动愉快')
    } catch (requestError) {
      setCheckInError(getApiErrorMessage(requestError, '签到失败'))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-10">
      {section === 'activities' ? (
        <>
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-emerald-800 px-5 py-7 text-white shadow-xl sm:px-9 sm:py-10">
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_15%,white_0,transparent_25%),radial-gradient(circle_at_85%_10%,#fde68a_0,transparent_20%)]" />
            <div className="relative max-w-2xl">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">学生端 · 活动广场</span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">发现值得参加的校园活动</h1>
              <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">浏览已通过学院审批并正式发布的活动，查看活动安排与参与方式。</p>
            </div>
          </section>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-stone-400">⌕</span>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索活动名称、地点或主办方" className="form-input pl-9" />
            </label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map(([key, label]) => (
                <button key={key || 'ALL'} type="button" onClick={() => setCategory(key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${category === key ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{label}</button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600"><span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-white">✓</span>学生端 · 报名中心</div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">我的报名</h1>
            <p className="mt-2 text-sm text-stone-500">查看报名结果，也可以在活动开始前取消报名。</p>
          </div>
          <button type="button" onClick={() => onNavigate?.('activities')} className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white sm:w-auto">继续发现活动</button>
        </div>
      )}

      {section === 'registrations' && (
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {[['ACTIVE', '进行中'], ['REJECTED', '未通过'], ['CANCELLED', '已取消'], ['ALL', '全部']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setRegistrationFilter(key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${registrationFilter === key ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`}>{label}</button>
          ))}
        </div>
      )}

      {error && <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={loadData} className="shrink-0 font-bold">重试</button></div>}
      {success && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {success}</div>}

      {loading ? (
        <div className="grid min-h-72 place-items-center text-sm text-stone-400">正在加载…</div>
      ) : displayedActivities.length === 0 ? (
        <div className="mt-6 grid min-h-72 place-items-center rounded-3xl border border-stone-200 bg-white px-6 py-12 text-center">
          <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">◇</div><h2 className="mt-4 font-bold text-stone-800">{section === 'registrations' ? '暂无报名记录' : '暂无符合条件的活动'}</h2><p className="mt-2 text-sm text-stone-400">{section === 'registrations' ? '去活动广场看看最近发布的新活动。' : '发布人正式上架活动后会显示在这里。'}</p>{section === 'registrations' && <button type="button" onClick={() => onNavigate?.('activities')} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">浏览活动</button>}</div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayedActivities.map((activity) => (
            <StudentActivityCard key={activity.id} activity={activity} busy={actionId === activity.id} onOpen={() => openDetail(activity)} onRegister={() => register(activity)} onCancel={() => cancel(activity)} onCheckIn={() => { setCheckInError(''); setCheckInTarget(activity) }} />
          ))}
        </div>
      )}

      {detail && <ActivityDetailDialog activity={detail} busy={actionId === detail.id} onClose={() => setDetail(null)} onRegister={() => register(detail)} onCancel={() => cancel(detail)} onCheckIn={() => { setCheckInError(''); setCheckInTarget(detail) }} />}
      {checkInTarget && <CheckInDialog activity={checkInTarget} busy={actionId === checkInTarget.id} error={checkInError} onClose={() => setCheckInTarget(null)} onConfirm={(payload) => checkIn(checkInTarget, payload)} />}
    </div>
  )
}

function StudentActivityCard({ activity, busy, onOpen, onRegister, onCancel, onCheckIn }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-900 via-violet-800 to-emerald-700">
          {activity.coverImage ? <img src={resolveApiAssetUrl(activity.coverImage)} alt="" className="h-full w-full object-cover opacity-70" /> : <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_25%),radial-gradient(circle_at_80%_10%,#fde68a_0,transparent_22%)]" />}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-sm">{CATEGORY_LABELS[activity.category] || '校园活动'}</span>
            <div className="flex flex-col items-end gap-1">{activity.registrationStatus && <RegistrationBadge status={activity.registrationStatus} />}{activity.checkedIn && <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">已签到</span>}</div>
          </div>
        </div>
        <div className="p-4">
          <h2 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-stone-900">{activity.title || '未命名活动'}</h2>
          <p className="mt-2 text-xs font-semibold text-indigo-600">{formatDate(activity.startTime)}</p>
          <p className="mt-2 truncate text-sm text-stone-500">⌖ {activity.location || '地点待定'}</p>
          <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-400"><span>{activity.organizer || '主办方待定'}</span><span>{capacityText(activity)}</span></div>
        </div>
      </button>
      <div className="border-t border-stone-100 p-3">
        <RegistrationAction activity={activity} busy={busy} onRegister={onRegister} onCancel={onCancel} onCheckIn={onCheckIn} />
      </div>
    </article>
  )
}

function ActivityDetailDialog({ activity, busy, onClose, onRegister, onCancel, onCheckIn }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mx-auto my-2 max-w-3xl sm:my-8">
        <div className="mb-3 flex items-center justify-between gap-3"><div>{activity.registrationStatus && <RegistrationBadge status={activity.registrationStatus} />}</div><button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow">关闭</button></div>
        <ActivityPreview activity={activity} />
        <div className="sticky bottom-2 mt-3 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-stone-500"><span>{activity.registrationNotice}</span><span className="shrink-0">{capacityText(activity)}</span></div>
          <RegistrationAction activity={activity} busy={busy} onRegister={onRegister} onCancel={onCancel} onCheckIn={onCheckIn} />
        </div>
      </div>
    </div>
  )
}

function RegistrationAction({ activity, busy, onRegister, onCancel, onCheckIn }) {
  const active = ['PENDING', 'APPROVED'].includes(activity.registrationStatus)
  if (activity.checkedIn) {
    return <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700">✓ 已完成签到{activity.checkedInAt ? ` · ${formatDate(activity.checkedInAt)}` : ''}{activity.checkInDistanceMeters != null ? ` · 距签到点 ${activity.checkInDistanceMeters} 米` : ''}</div>
  }
  if (active) {
    return <div><div className="mb-2 text-center text-xs text-stone-400">{activity.checkInNotice}</div><div className={`grid gap-2 ${activity.canCheckIn ? 'grid-cols-2' : 'grid-cols-1'}`}>{activity.canCheckIn && <button type="button" disabled={busy} onClick={onCheckIn} className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{activity.checkInMode === 'LOCATION' ? '雷达签到' : '现场签到'}</button>}<button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{busy ? '正在处理…' : '取消报名'}</button></div></div>
  }
  if (activity.registrationStatus === 'REJECTED') {
    return <div className="space-y-2"><div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"><span className="font-bold">审核未通过</span>{activity.registrationReviewComment ? `：${activity.registrationReviewComment}` : ''}</div>{activity.canRegister ? <button type="button" disabled={busy} onClick={onRegister} className="min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">{busy ? '正在提交…' : '重新申请'}</button> : <button type="button" disabled className="min-h-11 w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-400">{activity.registrationNotice || '暂不可重新申请'}</button>}</div>
  }
  if (activity.canRegister) {
    return <button type="button" disabled={busy} onClick={onRegister} className="min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">{busy ? '正在报名…' : activity.registrationStatus === 'CANCELLED' ? '重新报名' : '立即报名'}</button>
  }
  return <button type="button" disabled className="min-h-11 w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-400">{activity.registrationNotice || '暂不可报名'}</button>
}

function CheckInDialog({ activity, busy, error, onClose, onConfirm }) {
  const [code, setCode] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (/^\d{6}$/.test(code)) onConfirm({ code })
  }
  const locate = async () => {
    setLocating(true)
    setLocationError('')
    try {
      const position = await getBrowserLocation()
      onConfirm({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy })
    } catch (locationFailure) {
      setLocationError(locationErrorMessage(locationFailure))
    } finally {
      setLocating(false)
    }
  }
  if (activity.checkInMode === 'LOCATION') {
    return (
      <div className="fixed inset-0 z-[60] flex items-end bg-stone-950/60 p-0 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
          <div className="relative mx-auto grid h-36 w-36 place-items-center overflow-hidden rounded-full bg-emerald-50 ring-1 ring-emerald-100">
            <span className="absolute h-24 w-24 rounded-full border border-emerald-300/70" /><span className="absolute h-14 w-14 rounded-full border border-emerald-400/80" /><span className="absolute h-px w-full bg-emerald-200" /><span className="absolute h-full w-px bg-emerald-200" />
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-lg text-white shadow-lg">⌖</span>
          </div>
          <h2 className="mt-5 text-center text-xl font-bold text-stone-900">雷达定位签到</h2>
          <p className="mt-2 text-center text-sm leading-6 text-stone-500">到达活动现场后获取一次定位，系统只记录你与签到点的距离。</p>
          {(locationError || error) && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{locationError || error}</div>}
          <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-bold text-stone-500 hover:bg-stone-100">取消</button><button type="button" disabled={busy || locating} onClick={locate} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">{busy || locating ? '正在定位…' : '开始雷达签到'}</button></div>
        </div>
      </div>
    )
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-stone-950/60 p-0 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl text-emerald-700">✓</div>
        <h2 className="mt-4 text-xl font-bold text-stone-900">现场签到</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">{activity.title} · 请输入工作人员现场展示的6位签到码。</p>
        <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="请输入6位签到码" className="form-input mt-5 min-h-14 text-center font-mono text-2xl font-black tracking-[0.3em]" />
        {error && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-bold text-stone-500 hover:bg-stone-100">取消</button><button type="submit" disabled={busy || code.length !== 6} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">{busy ? '正在签到…' : '确认签到'}</button></div>
      </form>
    </div>
  )
}

function getBrowserLocation() {
  if (!window.isSecureContext || !navigator.geolocation) {
    return Promise.reject(new Error('SECURE_CONTEXT_REQUIRED'))
  }
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  }))
}

function locationErrorMessage(error) {
  if (error?.message === 'SECURE_CONTEXT_REQUIRED') return '当前入口暂不支持定位，请使用 HTTPS 地址打开平台'
  if (error?.code === 1) return '定位权限未开启，请在浏览器设置中允许访问位置'
  if (error?.code === 2) return '暂时无法获取位置，请打开手机定位后重试'
  if (error?.code === 3) return '定位超时，请移动到开阔处后重试'
  return error?.message || '定位失败，请稍后重试'
}

function RegistrationBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.CANCELLED
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.classes}`}>{meta.label}</span>
}

function capacityText(activity) {
  if (activity.registrationRequired === false) return '无需报名'
  return activity.maxParticipants ? `${activity.registeredCount || 0}/${activity.maxParticipants} 人` : `${activity.registeredCount || 0} 人已报名`
}

function formatDate(value) {
  if (!value) return '时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}
