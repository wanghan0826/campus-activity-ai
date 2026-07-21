import { useEffect, useMemo, useState } from 'react'
import { createActivity, getApiErrorMessage } from '../api/activity.js'

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
    fields: [
      { key: 'title', label: '活动标题', required: true, wide: true },
      { key: 'category', label: '活动分类', type: 'category' },
      { key: 'campus', label: '校区' },
      { key: 'location', label: '活动地点', required: true },
      { key: 'organizer', label: '组织者' },
      { key: 'maxParticipants', label: '人数上限', type: 'number' },
    ],
  },
  {
    title: '时间安排',
    fields: [
      { key: 'startTime', label: '开始时间', type: 'datetime-local', required: true },
      { key: 'endTime', label: '结束时间', type: 'datetime-local', required: true },
      { key: 'regStartTime', label: '报名开始', type: 'datetime-local' },
      { key: 'regEndTime', label: '报名截止', type: 'datetime-local' },
      { key: 'publishTime', label: '上架时间', type: 'datetime-local' },
      { key: 'offlineTime', label: '下架时间', type: 'datetime-local' },
    ],
  },
  {
    title: '内容与宣传',
    fields: [
      { key: 'content', label: '活动内容', type: 'textarea', wide: true },
      { key: 'coverImagePrompt', label: '封面图提示词', type: 'textarea', wide: true },
      { key: 'hasPromoMaterial', label: '是否有宣传品', type: 'boolean' },
      { key: 'promoApproved', label: '宣传品已审核', type: 'boolean' },
    ],
  },
]

const EMPTY_RESULT = {
  title: '',
  category: '',
  campus: '',
  location: '',
  organizer: '',
  coverImagePrompt: '',
  content: '',
  startTime: '',
  endTime: '',
  regStartTime: '',
  regEndTime: '',
  publishTime: '',
  offlineTime: '',
  maxParticipants: '',
  hasPromoMaterial: null,
  promoApproved: null,
  schedule: [],
  materials: [],
}

function toInputDateTime(value) {
  if (!value) return ''
  return String(value).slice(0, 16)
}

function toApiDateTime(value) {
  if (!value) return null
  return value.length === 16 ? `${value}:00` : value
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function displayValue(field, value) {
  if (field.type === 'boolean') {
    if (value === true) return '是'
    if (value === false) return '否'
    return '未设置'
  }
  if (field.type === 'category') return CATEGORY_LABELS[value] || value || '点击补充'
  if (field.type === 'datetime-local' && value) return String(value).replace('T', ' ').slice(0, 16)
  if (field.type === 'number' && !isBlank(value)) return `${value} 人`
  return isBlank(value) ? '点击补充' : value
}

function FieldEditor({ field, value, missing, onChange }) {
  const [editing, setEditing] = useState(false)
  const inputClass = `w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:ring-4 ${
    missing
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100'
  }`

  const stopEditing = () => setEditing(false)

  let control = null
  if (field.type === 'textarea') {
    control = (
      <textarea
        autoFocus
        rows={field.key === 'content' ? 6 : 3}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        onBlur={stopEditing}
        className={`${inputClass} resize-y leading-6`}
      />
    )
  } else if (field.type === 'category') {
    control = (
      <select
        autoFocus
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        onBlur={stopEditing}
        className={inputClass}
      >
        <option value="">未设置</option>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    )
  } else if (field.type === 'boolean') {
    control = (
      <select
        autoFocus
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue === '' ? null : nextValue === 'true')
        }}
        onBlur={stopEditing}
        className={inputClass}
      >
        <option value="">未设置</option>
        <option value="true">是</option>
        <option value="false">否</option>
      </select>
    )
  } else {
    control = (
      <input
        autoFocus
        type={field.type || 'text'}
        min={field.type === 'number' ? 1 : undefined}
        value={field.type === 'datetime-local' ? toInputDateTime(value) : (value ?? '')}
        onChange={(event) => {
          if (field.type === 'number') {
            onChange(event.target.value === '' ? null : Number(event.target.value))
          } else {
            onChange(event.target.value)
          }
        }}
        onBlur={stopEditing}
        onKeyDown={(event) => {
          if (event.key === 'Enter') stopEditing()
          if (event.key === 'Escape') stopEditing()
        }}
        className={inputClass}
      />
    )
  }

  return (
    <div className={field.wide ? 'sm:col-span-2' : ''}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </div>
      {editing ? (
        control
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`group min-h-11 w-full rounded-xl border px-3 py-2.5 text-left text-sm leading-6 transition ${
            missing
              ? 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-transparent bg-stone-50 text-stone-800 hover:border-stone-200 hover:bg-white'
          }`}
          title="点击编辑"
        >
          <span className={isBlank(value) ? 'text-stone-400' : ''}>{displayValue(field, value)}</span>
          <span className="float-right ml-2 text-xs text-stone-300 opacity-0 transition group-hover:opacity-100">编辑</span>
        </button>
      )}
    </div>
  )
}

function EditableText({ value, placeholder, onChange, className = '' }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <input
        autoFocus
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => event.key === 'Enter' && setEditing(false)}
        className={`rounded-lg border border-emerald-400 bg-white px-2.5 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100 ${className}`}
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-stone-100 ${className}`}
    >
      {value || <span className="text-stone-400">{placeholder}</span>}
    </button>
  )
}

const SectionTitle = ({ children }) => (
  <div className="mb-3 flex items-center gap-2">
    <span className="h-4 w-1 rounded-full bg-emerald-500" />
    <h3 className="text-sm font-semibold text-stone-800">{children}</h3>
  </div>
)

export default function ActivityCard({ parsedResult, missingFields = [] }) {
  const [activity, setActivity] = useState({ ...EMPTY_RESULT, ...parsedResult })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setActivity({ ...EMPTY_RESULT, ...parsedResult })
    setSuccess(null)
    setError('')
  }, [parsedResult])

  const activeMissingFields = useMemo(() => {
    const required = new Set([...missingFields, 'title', 'location', 'startTime', 'endTime'])
    return [...required].filter((key) => isBlank(activity[key]))
  }, [activity, missingFields])

  const updateField = (key, value) => {
    setActivity((current) => ({ ...current, [key]: value }))
    setSuccess(null)
    setError('')
  }

  const updateSchedule = (index, key, value) => {
    const next = [...(activity.schedule || [])]
    next[index] = { ...next[index], [key]: value }
    updateField('schedule', next)
  }

  const removeSchedule = (index) => {
    updateField(
      'schedule',
      (activity.schedule || []).filter((_, itemIndex) => itemIndex !== index),
    )
  }

  const updateMaterial = (index, value) => {
    const next = [...(activity.materials || [])]
    next[index] = value
    updateField('materials', next)
  }

  const handleCreate = async () => {
    if (activeMissingFields.length) {
      setError('请先补齐红色标注的必填信息')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess(null)
    try {
      const payload = {
        ...activity,
        startTime: toApiDateTime(activity.startTime),
        endTime: toApiDateTime(activity.endTime),
        regStartTime: toApiDateTime(activity.regStartTime),
        regEndTime: toApiDateTime(activity.regEndTime),
        publishTime: toApiDateTime(activity.publishTime),
        offlineTime: toApiDateTime(activity.offlineTime),
        maxParticipants: isBlank(activity.maxParticipants) ? null : Number(activity.maxParticipants),
      }
      const created = await createActivity(payload)
      setSuccess(created)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '活动创建失败，请检查信息后重试'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_16px_50px_rgba(28,25,23,0.08)]">
      <div className="border-b border-stone-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="mb-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              AI 解析结果
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
              {activity.title || '待补充活动标题'}
            </h2>
            <p className="mt-1.5 text-sm text-stone-500">点击任意字段即可修改，确认无误后创建活动</p>
          </div>
          <div
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              activeMissingFields.length
                ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            }`}
          >
            {activeMissingFields.length ? `缺少 ${activeMissingFields.length} 项必填信息` : '必填信息完整'}
          </div>
        </div>
      </div>

      <div className="space-y-7 px-5 py-6 sm:px-7">
        {FIELD_GROUPS.map((group) => (
          <section key={group.title}>
            <SectionTitle>{group.title}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.fields.map((field) => (
                <FieldEditor
                  key={field.key}
                  field={field}
                  value={activity[field.key]}
                  missing={activeMissingFields.includes(field.key)}
                  onChange={(value) => updateField(field.key, value)}
                />
              ))}
            </div>
          </section>
        ))}

        <section>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>活动流程建议</SectionTitle>
            <button
              type="button"
              onClick={() => updateField('schedule', [...(activity.schedule || []), { time: '', content: '' }])}
              className="mb-3 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              + 添加流程
            </button>
          </div>
          {(activity.schedule || []).length ? (
            <div className="space-y-1 rounded-2xl bg-stone-50 p-2">
              {activity.schedule.map((item, index) => (
                <div key={index} className="grid items-center gap-1 sm:grid-cols-[130px_1fr_auto]">
                  <EditableText
                    value={item.time}
                    placeholder="时间"
                    onChange={(value) => updateSchedule(index, 'time', value)}
                    className="w-full font-medium text-emerald-700"
                  />
                  <EditableText
                    value={item.content}
                    placeholder="流程内容"
                    onChange={(value) => updateSchedule(index, 'content', value)}
                    className="w-full text-stone-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeSchedule(index)}
                    className="rounded-lg px-2.5 py-2 text-xs text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`删除第 ${index + 1} 项流程`}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => updateField('schedule', [{ time: '', content: '' }])}
              className="w-full rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-sm text-stone-400 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700"
            >
              暂无流程，点击添加
            </button>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>物料清单</SectionTitle>
            <button
              type="button"
              onClick={() => updateField('materials', [...(activity.materials || []), ''])}
              className="mb-3 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              + 添加物料
            </button>
          </div>
          {(activity.materials || []).length ? (
            <div className="flex flex-wrap gap-2">
              {activity.materials.map((material, index) => (
                <div key={index} className="group flex items-center rounded-full bg-amber-50 pl-1 text-amber-800 ring-1 ring-amber-200">
                  <EditableText
                    value={material}
                    placeholder="物料名称"
                    onChange={(value) => updateMaterial(index, value)}
                    className="max-w-52 rounded-full py-1.5 text-amber-800 hover:bg-amber-100"
                  />
                  <button
                    type="button"
                    onClick={() => updateField('materials', activity.materials.filter((_, itemIndex) => itemIndex !== index))}
                    className="mr-1 rounded-full px-2 py-1 text-amber-400 hover:bg-white hover:text-red-500"
                    aria-label={`删除物料 ${material || index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => updateField('materials', [''])}
              className="w-full rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-sm text-stone-400 transition hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700"
            >
              暂无物料，点击添加
            </button>
          )}
        </section>
      </div>

      <div className="border-t border-stone-100 bg-stone-50/80 px-5 py-5 sm:px-7">
        {error && (
          <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            ✅ 活动创建成功{success.id ? `，活动编号：${success.id}` : ''}
          </div>
        )}
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting || Boolean(success)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              正在创建...
            </>
          ) : success ? (
            '活动已创建'
          ) : (
            '确认创建'
          )}
        </button>
      </div>
    </article>
  )
}
