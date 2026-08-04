import { useEffect, useMemo, useState } from 'react'
import {
  createActivity,
  generateCoverImage,
  getApiErrorMessage,
  submitActivity,
  updateActivity,
} from '../api/activity.js'
import ActivityPreview from './ActivityPreview.jsx'

const CATEGORY_LABELS = {
  ART: '艺术类',
  SPORTS: '艺体类',
  PRACTICE: '实践类',
  LIFE: '生活类',
  FEATURE: '特色类',
}

const FIELD_GROUPS = [
  {
    title: '基本信息',
    description: '决定学生在活动列表中看到的主要内容',
    fields: [
      { key: 'title', label: '活动标题', required: true, wide: true, placeholder: '例如：校园艺术节开幕式' },
      { key: 'category', label: '活动分类', type: 'category', required: true },
      { key: 'campus', label: '校区', placeholder: '例如：粤海校区' },
      { key: 'location', label: '活动地点', required: true, placeholder: '例如：学生活动中心多功能厅' },
      { key: 'organizer', label: '主办单位', placeholder: '例如：学院团委' },
      { key: 'targetAudience', label: '面向对象', placeholder: '例如：全院本科生' },
      { key: 'contactInfo', label: '咨询方式', placeholder: '联系人及联系方式' },
      { key: 'maxParticipants', label: '人数上限', type: 'number', placeholder: '不限人数可留空' },
    ],
  },
  {
    title: '时间安排',
    description: '提交前会自动检查活动与报名时间是否冲突',
    fields: [
      { key: 'startTime', label: '活动开始', type: 'datetime-local', required: true },
      { key: 'endTime', label: '活动结束', type: 'datetime-local', required: true },
      { key: 'regStartTime', label: '报名开始', type: 'datetime-local' },
      { key: 'regEndTime', label: '报名截止', type: 'datetime-local' },
      { key: 'publishTime', label: '计划上架', type: 'datetime-local' },
      { key: 'offlineTime', label: '计划下架', type: 'datetime-local' },
    ],
  },
  {
    title: '方案内容',
    description: 'AI 生成内容仅作初稿，提交审批前请人工确认',
    fields: [
      { key: 'content', label: '活动简介', type: 'textarea', required: true, wide: true, placeholder: '介绍活动背景、内容和参与方式' },
      { key: 'coverImagePrompt', label: '封面画面描述', type: 'textarea', wide: true, placeholder: '例如：青春活力的校园夜跑，蓝紫色灯光，学生在操场奔跑，横版构图' },
      { key: 'budget', label: '预估预算（元）', type: 'number', placeholder: '0' },
    ],
  },
  {
    title: '报名与认定设置',
    description: '用于报名审核、现场签到以及第二课堂学分或志愿时长认定',
    fields: [
      { key: 'registrationRequired', label: '是否需要报名', type: 'boolean', trueLabel: '需要报名', falseLabel: '无需报名' },
      { key: 'registrationApprovalRequired', label: '报名是否需要审核', type: 'boolean', trueLabel: '需要教师审核', falseLabel: '报名后直接通过' },
      { key: 'recognitionType', label: '认定方式', type: 'recognition' },
      { key: 'checkInMode', label: '签到方式', type: 'checkIn' },
      { key: 'secondClassCredits', label: '第二课堂学分', type: 'number', step: '0.1', placeholder: '例如：0.5' },
      { key: 'volunteerHours', label: '志愿服务时长（小时）', type: 'number', step: '0.5', placeholder: '例如：2' },
      { key: 'participationRequirements', label: '参与及认定要求', type: 'textarea', wide: true, placeholder: '例如：完成签到并全程参与活动后予以认定' },
    ],
  },
]

const EMPTY_RESULT = {
  title: '', category: '', campus: '', location: '', organizer: '', targetAudience: '', contactInfo: '',
  coverImage: '', coverImagePrompt: '', content: '', rawDocument: '', creationMode: 'AI',
  startTime: '', endTime: '', regStartTime: '', regEndTime: '', publishTime: '', offlineTime: '',
  maxParticipants: '', budget: '', promoApproved: null, schedule: [], materials: [],
  registrationRequired: true, registrationApprovalRequired: false, recognitionType: 'NONE',
  secondClassCredits: '', volunteerHours: '', checkInMode: 'QR', participationRequirements: '',
}

const REQUIRED_FIELDS = ['title', 'category', 'location', 'content', 'startTime', 'endTime']

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function toInputDateTime(value) {
  return value ? String(value).slice(0, 16) : ''
}

function toApiDateTime(value) {
  if (!value) return null
  return value.length === 16 ? `${value}:00` : value
}

function toPayload(activity) {
  return {
    title: activity.title || null,
    category: activity.category || null,
    campus: activity.campus || null,
    location: activity.location || null,
    organizer: activity.organizer || null,
    targetAudience: activity.targetAudience || null,
    contactInfo: activity.contactInfo || null,
    coverImage: activity.coverImage || null,
    coverImagePrompt: activity.coverImagePrompt || null,
    content: activity.content || null,
    rawDocument: activity.rawDocument || null,
    creationMode: activity.creationMode || 'AI',
    startTime: toApiDateTime(activity.startTime),
    endTime: toApiDateTime(activity.endTime),
    regStartTime: toApiDateTime(activity.regStartTime),
    regEndTime: toApiDateTime(activity.regEndTime),
    publishTime: toApiDateTime(activity.publishTime),
    offlineTime: toApiDateTime(activity.offlineTime),
    maxParticipants: isBlank(activity.maxParticipants) ? null : Number(activity.maxParticipants),
    budget: isBlank(activity.budget) ? null : Number(activity.budget),
    registrationRequired: activity.registrationRequired !== false,
    registrationApprovalRequired: activity.registrationApprovalRequired === true,
    recognitionType: activity.recognitionType || 'NONE',
    secondClassCredits: isBlank(activity.secondClassCredits) ? null : Number(activity.secondClassCredits),
    volunteerHours: isBlank(activity.volunteerHours) ? null : Number(activity.volunteerHours),
    checkInMode: activity.checkInMode || 'QR',
    participationRequirements: activity.participationRequirements || null,
    promoApproved: activity.promoApproved,
    schedule: (activity.schedule || []).filter((item) => item.time || item.content),
    materials: (activity.materials || []).map((item) => item.trim()).filter(Boolean),
  }
}

export default function ActivityCard({
  parsedResult = {},
  missingFields = [],
  sourceDocument = '',
  creationMode = 'AI',
  onSaved,
}) {
  const [activity, setActivity] = useState({ ...EMPTY_RESULT, ...parsedResult })
  const [view, setView] = useState('edit')
  const [approvalMessage, setApprovalMessage] = useState(parsedResult.approvalMessage || '')
  const [submitting, setSubmitting] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setActivity({
      ...EMPTY_RESULT,
      ...parsedResult,
      rawDocument: parsedResult.rawDocument || sourceDocument || '',
      creationMode: parsedResult.creationMode || creationMode,
    })
    setApprovalMessage(parsedResult.approvalMessage || '')
    setSuccess('')
    setError('')
    setView('edit')
  }, [parsedResult, sourceDocument, creationMode])

  const activeMissingFields = useMemo(() => {
    const required = new Set([...missingFields, ...REQUIRED_FIELDS])
    return [...required].filter((key) => isBlank(activity[key]))
  }, [activity, missingFields])

  const updateField = (key, value) => {
    setActivity((current) => ({ ...current, [key]: value }))
    setSuccess('')
    setError('')
  }

  const handleGenerateCover = async () => {
    const prompt = activity.coverImagePrompt?.trim()
      || [activity.title, activity.content].filter(Boolean).join('。').trim()
    if (!prompt) {
      setError('请先填写活动标题或封面画面描述')
      return
    }

    setGeneratingImage(true)
    setError('')
    setSuccess('')
    try {
      const generated = await generateCoverImage(prompt)
      updateField('coverImage', generated.imageUrl)
      setSuccess('活动封面已生成，可以在学生视角中预览')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '封面生成失败，请稍后重试'))
    } finally {
      setGeneratingImage(false)
    }
  }

  const persistDraft = async () => {
    const payload = toPayload(activity)
    const saved = activity.id
      ? await updateActivity(activity.id, payload)
      : await createActivity(payload)
    setActivity((current) => ({ ...current, ...saved }))
    return saved
  }

  const handleSave = async () => {
    setSubmitting('save')
    setError('')
    try {
      const saved = await persistDraft()
      setSuccess('草稿已保存，可在“活动管理”中继续编辑')
      onSaved?.(saved, 'draft')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '草稿保存失败，请稍后重试'))
    } finally {
      setSubmitting('')
    }
  }

  const handleSubmit = async () => {
    if (activeMissingFields.length) {
      setView('edit')
      setError('请先补齐标有“必填”的活动信息')
      return
    }

    setSubmitting('submit')
    setError('')
    try {
      const saved = await persistDraft()
      const submitted = await submitActivity(saved.id, approvalMessage)
      setActivity((current) => ({ ...current, ...submitted }))
      setSuccess('已提交学院审核老师，审批通过后可发布')
      onSaved?.(submitted, 'submitted')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '提交审批失败，请检查活动信息'))
    } finally {
      setSubmitting('')
    }
  }

  const updateSchedule = (index, key, value) => {
    const next = [...(activity.schedule || [])]
    next[index] = { ...next[index], [key]: value }
    updateField('schedule', next)
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_18px_60px_rgba(28,25,23,0.08)]">
      <div className="border-b border-stone-100 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {activity.creationMode === 'MANUAL' ? '手动创建' : 'AI 方案卡片'}
              </span>
              {activity.id && <span className="text-xs text-stone-400">草稿 #{activity.id}</span>}
            </div>
            <h2 className="mt-3 text-xl font-bold text-stone-900 sm:text-2xl">完善活动方案</h2>
            <p className="mt-1 text-sm text-stone-500">编辑完成后可先预览学生视角，再保存或提交审批</p>
          </div>
          <div className="inline-flex rounded-xl bg-stone-100 p-1">
            <ViewButton active={view === 'edit'} onClick={() => setView('edit')}>编辑方案</ViewButton>
            <ViewButton active={view === 'preview'} onClick={() => setView('preview')}>学生视角</ViewButton>
          </div>
        </div>
      </div>

      {view === 'preview' ? (
        <div className="bg-stone-50 p-4 sm:p-7">
          <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            这是活动审批通过后，学生端看到的内容预览。
          </div>
          <ActivityPreview activity={activity} />
        </div>
      ) : (
        <div className="space-y-8 px-5 py-6 sm:px-7">
          {FIELD_GROUPS.map((group) => (
            <section key={group.title}>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-stone-900">{group.title}</h3>
                <p className="mt-1 text-xs text-stone-400">{group.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    value={activity[field.key]}
                    missing={activeMissingFields.includes(field.key)}
                    onChange={(value) => updateField(field.key, value)}
                  />
                ))}
              </div>
              {group.title === '方案内容' && (
                <CoverImageEditor
                  imageUrl={activity.coverImage}
                  generating={generatingImage}
                  onGenerate={handleGenerateCover}
                  onImageUrlChange={(value) => updateField('coverImage', value)}
                />
              )}
            </section>
          ))}

          <section>
            <SectionHeader title="活动流程" description="列出主要环节，学生预览和审批材料会同步更新">
              <button type="button" onClick={() => updateField('schedule', [...(activity.schedule || []), { time: '', content: '' }])} className="small-action">
                + 添加环节
              </button>
            </SectionHeader>
            <div className="space-y-2">
              {(activity.schedule || []).map((item, index) => (
                <div key={index} className="grid gap-2 rounded-2xl bg-stone-50 p-3 sm:grid-cols-[140px_1fr_auto]">
                  <input value={item.time || ''} onChange={(event) => updateSchedule(index, 'time', event.target.value)} placeholder="例如 14:00-14:20" className="form-input" />
                  <input value={item.content || ''} onChange={(event) => updateSchedule(index, 'content', event.target.value)} placeholder="环节内容" className="form-input" />
                  <button type="button" onClick={() => updateField('schedule', activity.schedule.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl px-3 text-xs text-stone-400 hover:bg-red-50 hover:text-red-600">删除</button>
                </div>
              ))}
              {(activity.schedule || []).length === 0 && <EmptyAction onClick={() => updateField('schedule', [{ time: '', content: '' }])}>添加活动流程</EmptyAction>}
            </div>
          </section>

          <section>
            <SectionHeader title="物料清单" description="用于审批和活动筹备，可逐项补充">
              <button type="button" onClick={() => updateField('materials', [...(activity.materials || []), ''])} className="small-action">+ 添加物料</button>
            </SectionHeader>
            <div className="space-y-2">
              {(activity.materials || []).map((material, index) => (
                <div key={index} className="flex gap-2">
                  <input value={material} onChange={(event) => {
                    const next = [...activity.materials]
                    next[index] = event.target.value
                    updateField('materials', next)
                  }} placeholder={`物料 ${index + 1}`} className="form-input flex-1" />
                  <button type="button" onClick={() => updateField('materials', activity.materials.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl px-3 text-xs text-stone-400 hover:bg-red-50 hover:text-red-600">删除</button>
                </div>
              ))}
              {(activity.materials || []).length === 0 && <EmptyAction onClick={() => updateField('materials', [''])}>添加第一项物料</EmptyAction>}
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <h3 className="text-sm font-bold text-amber-900">审批备注</h3>
            <p className="mt-1 text-xs leading-5 text-amber-700">提交后将依次由学院审核老师、学院领导审批；两级通过后由发布人确认上架。</p>
            <textarea value={approvalMessage} onChange={(event) => setApprovalMessage(event.target.value)} rows={3} maxLength={500} placeholder="给审批人的补充说明（选填）" className="form-input mt-3 resize-y bg-white" />
          </section>
        </div>
      )}

      <div className="border-t border-stone-100 bg-stone-50 px-5 py-5 sm:px-7">
        {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">✓ {success}</div>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleSave} disabled={Boolean(submitting) || activity.status === 'PENDING_APPROVAL'} className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting === 'save' ? '正在保存…' : '保存草稿'}
          </button>
          <button type="button" onClick={() => setView(view === 'preview' ? 'edit' : 'preview')} className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">
            {view === 'preview' ? '返回编辑' : '预览学生视角'}
          </button>
          <button type="button" onClick={handleSubmit} disabled={Boolean(submitting) || activity.status === 'PENDING_APPROVAL'} className="rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-stone-300">
            {submitting === 'submit' ? '正在提交…' : '提交审批'}
          </button>
        </div>
      </div>
    </article>
  )
}

function Field({ field, value, missing, onChange }) {
  const classes = `form-input ${missing ? 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-100' : ''}`
  let control
  if (field.type === 'textarea') {
    control = <textarea rows={field.key === 'content' ? 7 : 3} value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} className={`${classes} resize-y leading-6`} />
  } else if (field.type === 'category') {
    control = (
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value || null)} className={classes}>
        <option value="">请选择活动分类</option>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    )
  } else if (field.type === 'boolean') {
    control = (
      <select value={String(value !== false)} onChange={(event) => onChange(event.target.value === 'true')} className={classes}>
        <option value="true">{field.trueLabel || '是'}</option>
        <option value="false">{field.falseLabel || '否'}</option>
      </select>
    )
  } else if (field.type === 'recognition') {
    control = (
      <select value={value || 'NONE'} onChange={(event) => onChange(event.target.value)} className={classes}>
        <option value="NONE">不做认定</option>
        <option value="CREDIT">第二课堂学分</option>
        <option value="VOLUNTEER">志愿服务时长</option>
        <option value="BOTH">学分 + 志愿时长</option>
      </select>
    )
  } else if (field.type === 'checkIn') {
    control = (
      <select value={value || 'QR'} onChange={(event) => onChange(event.target.value)} className={classes}>
        <option value="QR">二维码签到</option>
        <option value="MANUAL">人工签到</option>
        <option value="NONE">无需签到</option>
      </select>
    )
  } else {
    control = (
      <input
        type={field.type || 'text'}
        min={field.type === 'number' ? 0 : undefined}
        step={field.step}
        value={field.type === 'datetime-local' ? toInputDateTime(value) : (value ?? '')}
        onChange={(event) => onChange(field.type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value)}
        placeholder={field.placeholder}
        className={classes}
      />
    )
  }
  return (
    <label className={field.wide ? 'sm:col-span-2' : ''}>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-stone-600">
        {field.label}{field.required && <span className="text-red-500">必填</span>}
      </span>
      {control}
    </label>
  )
}

function ViewButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>{children}</button>
}

function CoverImageEditor({ imageUrl, generating, onGenerate, onImageUrlChange }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 sm:col-span-2">
      <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
        <div className="relative min-h-36 overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-emerald-800">
          {imageUrl ? (
            <img src={imageUrl} alt="活动封面预览" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-36 place-items-center px-4 text-center text-xs leading-5 text-white/65">生成后的活动封面会显示在这里</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h4 className="text-sm font-bold text-stone-900">活动封面</h4><p className="mt-1 text-xs leading-5 text-stone-500">根据上方画面描述生成，也可以使用已有图片。</p></div>
            <button type="button" onClick={onGenerate} disabled={generating} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
              {generating ? '正在生成封面…' : imageUrl ? '重新生成' : 'AI 生成封面'}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input value={imageUrl || ''} onChange={(event) => onImageUrlChange(event.target.value)} placeholder="或粘贴已有图片地址" className="form-input flex-1 bg-white text-xs" />
            {imageUrl && <button type="button" onClick={() => onImageUrlChange('')} className="rounded-xl px-3 text-xs font-semibold text-stone-400 hover:bg-red-50 hover:text-red-600">移除</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, description, children }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div><h3 className="text-sm font-bold text-stone-900">{title}</h3><p className="mt-1 text-xs text-stone-400">{description}</p></div>
      {children}
    </div>
  )
}

function EmptyAction({ onClick, children }) {
  return <button type="button" onClick={onClick} className="w-full rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-sm text-stone-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">{children}</button>
}
