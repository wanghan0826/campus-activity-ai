import { resolveApiAssetUrl } from '../api/activity.js'

const CATEGORY_LABELS = {
  ART: '艺术类',
  SPORTS: '艺体类',
  PRACTICE: '实践类',
  LIFE: '生活类',
  FEATURE: '特色类',
}

const RECOGNITION_LABELS = {
  NONE: '无学分或时长认定',
  CREDIT: '第二课堂学分',
  VOLUNTEER: '志愿服务时长',
  BOTH: '第二课堂学分 + 志愿服务时长',
}

const CHECK_IN_LABELS = {
  QR: '现场签到码',
  MANUAL: '人工签到',
  NONE: '无需签到',
}

function formatDateTime(value) {
  if (!value) return '待定'
  return String(value).replace('T', ' ').slice(0, 16)
}

export default function ActivityPreview({ activity = {}, compact = false }) {
  const schedule = activity.schedule || []
  const materials = activity.materials || []

  return (
    <div className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm sm:rounded-3xl ${compact ? 'max-w-2xl' : ''}`}>
      <div className="relative min-h-44 overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-emerald-800 px-5 py-6 text-white sm:min-h-48 sm:px-8 sm:py-7">
        {activity.coverImage ? (
          <img src={resolveApiAssetUrl(activity.coverImage)} alt="活动封面" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        ) : (
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_28%),radial-gradient(circle_at_80%_10%,#fcd34d_0,transparent_22%)]" />
        )}
        <div className="relative">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
            {CATEGORY_LABELS[activity.category] || '校园活动'}
          </span>
          <h2 className="mt-4 max-w-2xl text-2xl font-bold leading-tight sm:text-3xl">
            {activity.title || '待补充活动标题'}
          </h2>
          <p className="mt-3 text-sm text-white/75">{activity.organizer || '主办方待定'}</p>
        </div>
      </div>

      <div className="space-y-7 px-5 py-6 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Info label="活动时间" value={`${formatDateTime(activity.startTime)} 起`} />
          <Info label="活动地点" value={activity.location || '待定'} />
          <Info label="面向对象" value={activity.targetAudience || '全院师生'} />
        </div>

        <section>
          <SectionTitle>活动简介</SectionTitle>
          <p className="whitespace-pre-wrap text-sm leading-7 text-stone-600">
            {activity.content || '活动介绍将在这里展示。'}
          </p>
        </section>

        {schedule.length > 0 && (
          <section>
            <SectionTitle>活动流程</SectionTitle>
            <div className="space-y-3">
              {schedule.map((item, index) => (
                <div key={`${item.time}-${index}`} className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-3">
                  <span className="font-semibold text-emerald-700 sm:min-w-24">{item.time || `环节 ${index + 1}`}</span>
                  <span className="text-stone-600">{item.content || '待补充'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {materials.length > 0 && (
          <section>
            <SectionTitle>活动准备</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {materials.filter(Boolean).map((material, index) => (
                <span key={`${material}-${index}`} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs text-amber-800 ring-1 ring-amber-200">
                  {material}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-3 border-t border-stone-100 pt-5 text-sm sm:grid-cols-2">
          <Info label="报名时间" value={`${formatDateTime(activity.regStartTime)} — ${formatDateTime(activity.regEndTime)}`} />
          <Info label="人数上限" value={activity.maxParticipants ? `${activity.maxParticipants} 人` : '不限'} />
          <Info label="报名方式" value={activity.registrationRequired === false ? '无需报名，直接参与' : (activity.registrationApprovalRequired ? '报名后需教师审核' : '报名后直接通过')} />
          <Info label="签到方式" value={CHECK_IN_LABELS[activity.checkInMode] || '现场签到码'} />
          <Info label="活动认定" value={RECOGNITION_LABELS[activity.recognitionType] || RECOGNITION_LABELS.NONE} />
          {(activity.recognitionType === 'CREDIT' || activity.recognitionType === 'BOTH') && <Info label="第二课堂学分" value={`${activity.secondClassCredits || 0} 分`} />}
          {(activity.recognitionType === 'VOLUNTEER' || activity.recognitionType === 'BOTH') && <Info label="志愿服务时长" value={`${activity.volunteerHours || 0} 小时`} />}
          {activity.contactInfo && <Info label="咨询方式" value={activity.contactInfo} />}
          {activity.budget !== null && activity.budget !== undefined && activity.budget !== '' && <Info label="预估预算" value={`¥ ${activity.budget}`} />}
        </div>
        {activity.participationRequirements && (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4">
            <SectionTitle>参与及认定要求</SectionTitle>
            <p className="whitespace-pre-wrap text-sm leading-6 text-emerald-900">{activity.participationRequirements}</p>
          </section>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h3 className="mb-3 text-sm font-bold text-stone-900">{children}</h3>
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{label}</div>
      <div className="mt-1 text-sm font-medium leading-6 text-stone-700">{value}</div>
    </div>
  )
}
