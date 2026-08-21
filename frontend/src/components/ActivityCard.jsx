import { useEffect, useMemo, useState } from 'react'
import {
  createNotificationGroup,
  createActivity,
  generateCoverImage,
  getApiErrorMessage,
  getNotificationGroups,
  resolveApiAssetUrl,
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
      { key: 'registrationApprovalRequired', label: '报名方式', type: 'registrationMode' },
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
  notificationTargets: [],
}

const GROUP_AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

function groupAvatarColor(group) {
  const source = String(group?.id ?? group?.groupId ?? group?.name ?? group?.groupName ?? '')
  const checksum = [...source].reduce((total, character) => total + character.charCodeAt(0), 0)
  return GROUP_AVATAR_COLORS[checksum % GROUP_AVATAR_COLORS.length]
}

function groupAvatarText(group) {
  const name = String(group?.name ?? group?.groupName ?? '群').trim()
  const readableName = name.replace(/^\d{2,4}级/, '')
  return readableName.slice(0, 1) || name.slice(0, 1) || '群'
}

function GroupAvatar({ group, className = 'h-11 w-11', textClassName = 'text-sm' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl text-white shadow-sm ${groupAvatarColor(group)} ${className}`}>
      <span className={`font-semibold ${textClassName}`}>{groupAvatarText(group)}</span>
    </span>
  )
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
    notificationGroupIds: (activity.notificationTargets || [])
      .map((target) => Number(target.groupId ?? target.id))
      .filter((id) => Number.isFinite(id)),
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
  const [notificationGroups, setNotificationGroups] = useState([])
  const [showGroupPicker, setShowGroupPicker] = useState(false)
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

  useEffect(() => {
    let active = true
    getNotificationGroups()
      .then((groups) => { if (active) setNotificationGroups(groups || []) })
      .catch(() => { if (active) setNotificationGroups([]) })
    return () => { active = false }
  }, [])

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
    <div className="admin-card">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">活动表单</h2>
          {activity.id && <span className="text-xs text-gray-400">#{activity.id}</span>}
          <span className={`status-tag ${activity.status === 'DRAFT' ? 'draft' : activity.status === 'PUBLISHED' ? 'published' : 'pending'}`}>
            {activity.status === 'DRAFT' ? '草稿' : activity.status === 'PUBLISHED' ? '已发布' : activity.status === 'PENDING_APPROVAL' ? '审批中' : activity.status || '草稿'}
          </span>
        </div>
        <div className="flex gap-2">
          <button className={`btn-secondary btn-sm ${view === 'edit' ? 'bg-blue-50 border-blue-300' : ''}`} onClick={() => setView('edit')}>编辑</button>
          <button className={`btn-secondary btn-sm ${view === 'preview' ? 'bg-blue-50 border-blue-300' : ''}`} onClick={() => setView('preview')}>预览</button>
        </div>
      </div>

      {view === 'preview' ? (
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-xs text-gray-500 mb-3">学生端预览效果</div>
          <ActivityPreview activity={activity} />
        </div>
      ) : (
        <div className="space-y-6">
          {FIELD_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">{group.title}</h3>
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
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900">发布通知</h3>
            <button
              type="button"
              onClick={() => setShowGroupPicker(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {activity.notificationTargets?.length ? (
                  <div className="flex shrink-0 -space-x-2">
                    {activity.notificationTargets.slice(0, 3).map((target) => (
                      <GroupAvatar key={target.groupId ?? target.id} group={target} className="h-10 w-10 border-2 border-white" textClassName="text-xs" />
                    ))}
                    {activity.notificationTargets.length > 3 && (
                      <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-white bg-gray-100 text-xs font-semibold text-gray-500">
                        +{activity.notificationTargets.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl text-emerald-600">↗</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">发送范围</span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">
                    {activity.notificationTargets?.length
                      ? activity.notificationTargets.map((target) => target.groupName ?? target.name).join('、')
                      : '选择接收活动通知的群聊'}
                  </span>
                </span>
              </div>
              {activity.notificationTargets?.length ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">发布后发送</span>
              ) : null}
              <span className="shrink-0 text-xl leading-none text-gray-300">›</span>
            </button>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">活动流程</h3>
            <div className="space-y-2">
              {(activity.schedule || []).map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input value={item.time || ''} onChange={(e) => updateSchedule(index, 'time', e.target.value)} placeholder="时间" className="form-input w-32" />
                  <input value={item.content || ''} onChange={(e) => updateSchedule(index, 'content', e.target.value)} placeholder="环节内容" className="form-input flex-1" />
                  <button onClick={() => updateField('schedule', activity.schedule.filter((_, i) => i !== index))} className="btn-danger btn-sm">删除</button>
                </div>
              ))}
              <button onClick={() => updateField('schedule', [...(activity.schedule || []), { time: '', content: '' }])} className="btn-secondary btn-sm">+ 添加环节</button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">物料清单</h3>
            <div className="space-y-2">
              {(activity.materials || []).map((m, index) => (
                <div key={index} className="flex gap-2">
                  <input value={m} onChange={(e) => { const n = [...activity.materials]; n[index] = e.target.value; updateField('materials', n) }} placeholder={`物料 ${index + 1}`} className="form-input flex-1" />
                  <button onClick={() => updateField('materials', activity.materials.filter((_, i) => i !== index))} className="btn-danger btn-sm">删除</button>
                </div>
              ))}
              <button onClick={() => updateField('materials', [...(activity.materials || []), ''])} className="btn-secondary btn-sm">+ 添加物料</button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">审批备注</h3>
            <textarea value={approvalMessage} onChange={(e) => setApprovalMessage(e.target.value)} rows={2} maxLength={500} placeholder="给审批人的补充说明（选填）" className="form-input" />
          </section>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-end">
        {error && <div className="w-full rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        {success && <div className="w-full rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}
        <button onClick={handleSave} disabled={Boolean(submitting)} className="btn-secondary">{submitting === 'save' ? '保存中…' : '保存草稿'}</button>
        <button onClick={handleSubmit} disabled={Boolean(submitting) || activity.status === 'PENDING_APPROVAL'} className="btn-primary">{submitting === 'submit' ? '提交中…' : '提交审批'}</button>
      </div>
      {showGroupPicker && (
        <NotificationGroupPicker
          groups={notificationGroups}
          selectedTargets={activity.notificationTargets || []}
          onClose={() => setShowGroupPicker(false)}
          onGroupsChange={setNotificationGroups}
          onConfirm={(targets) => {
            updateField('notificationTargets', targets)
            setShowGroupPicker(false)
          }}
        />
      )}
    </div>
  )
}

function NotificationGroupPicker({ groups, selectedTargets, onClose, onGroupsChange, onConfirm }) {
  const [availableGroups, setAvailableGroups] = useState(groups.filter((group) => group.enabled))
  const [selectedIds, setSelectedIds] = useState(() => new Set(selectedTargets.map((target) => Number(target.groupId ?? target.id))))
  const [keyword, setKeyword] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const filteredGroups = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) return availableGroups
    return availableGroups.filter((group) => group.name.toLowerCase().includes(normalized))
  }, [availableGroups, keyword])

  const selectedGroups = useMemo(
    () => availableGroups.filter((group) => selectedIds.has(group.id)),
    [availableGroups, selectedIds],
  )

  const toggle = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addGroup = async () => {
    if (!name.trim() || !webhookUrl.trim()) {
      setFormError('请填写群聊名称和消息推送地址')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const created = await createNotificationGroup(name.trim(), webhookUrl.trim())
      const nextGroups = [...availableGroups, created].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
      setAvailableGroups(nextGroups)
      onGroupsChange((current) => [...current.filter((group) => group.id !== created.id), created])
      setSelectedIds((current) => new Set([...current, created.id]))
      setName('')
      setWebhookUrl('')
      setShowAdd(false)
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError, '群聊接入失败，请检查消息推送地址'))
    } finally {
      setSaving(false)
    }
  }

  const confirm = () => {
    onConfirm(availableGroups
      .filter((group) => selectedIds.has(group.id))
      .map((group) => ({ groupId: group.id, groupName: group.name })))
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-gray-950/45 p-0 backdrop-blur-[1px] sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex h-[94vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-[#f5f5f5] shadow-2xl sm:h-[700px] sm:max-h-[88vh] sm:max-w-[520px] sm:rounded-[24px]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200/80 bg-white px-4">
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-gray-600 transition hover:bg-gray-100">取消</button>
          <div className="font-semibold text-gray-950">选择群聊</div>
          <span className="min-w-[44px] text-right text-sm text-gray-400">{selectedIds.size ? `${selectedIds.size} 个` : ''}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedGroups.length > 0 && (
            <div className="border-b border-gray-200/80 bg-white px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">已选择</span>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-gray-700">清空</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {selectedGroups.map((group) => (
                  <button key={group.id} type="button" onClick={() => toggle(group.id)} className="group relative w-14 shrink-0 text-center" aria-label={`移除${group.name}`}>
                    <GroupAvatar group={group} className="mx-auto h-12 w-12" />
                    <span className="absolute -right-0.5 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-gray-500 text-[11px] leading-none text-white group-hover:bg-red-500">×</span>
                    <span className="mt-1.5 block truncate text-xs text-gray-600">{group.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white px-4 py-3">
            <label className="flex h-10 items-center gap-2 rounded-lg bg-[#f3f3f3] px-3">
              <span className="text-base text-gray-400">⌕</span>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索群聊" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400" autoFocus />
              {keyword && <button type="button" onClick={() => setKeyword('')} className="grid h-5 w-5 place-items-center rounded-full bg-gray-300 text-xs text-white">×</button>}
            </label>
          </div>

          <div className="px-4 pb-4 pt-5">
            <div className="mb-2 px-1 text-xs font-medium text-gray-500">可选群聊</div>
            <div className="overflow-hidden rounded-xl bg-white">
              {filteredGroups.map((group, index) => {
                const selected = selectedIds.has(group.id)
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggle(group.id)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${index ? 'border-t border-gray-100' : ''}`}
                  >
                    <GroupAvatar group={group} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-gray-900">{group.name}</span>
                      <span className="mt-0.5 block text-xs text-gray-400">发布后发送</span>
                    </span>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm font-bold transition ${selected ? 'border-[#07c160] bg-[#07c160] text-white' : 'border-gray-300 bg-white text-transparent'}`}>✓</span>
                  </button>
                )
              })}

              {!availableGroups.length && !showAdd && (
                <div className="px-5 py-10 text-center text-sm text-gray-400">还没有可选群聊</div>
              )}

              {availableGroups.length > 0 && !filteredGroups.length && (
                <div className="px-5 py-10 text-center text-sm text-gray-400">没有找到匹配的群聊</div>
              )}
            </div>

            {showAdd ? (
              <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">接入新群聊</div>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="群聊名称" className="form-input mt-3 bg-white" />
                <input type="password" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="消息推送地址" className="form-input mt-2 bg-white" />
                {formError && <div className="mt-2 text-xs font-medium text-red-600">{formError}</div>}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowAdd(false); setFormError('') }} className="btn-secondary btn-sm">取消</button>
                  <button type="button" disabled={saving} onClick={addGroup} className="btn-primary btn-sm">{saving ? '正在接入…' : '保存并选择'}</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAdd(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-600 transition hover:text-emerald-700">
                <span className="text-lg font-light">＋</span> 接入新群聊
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={confirm} className="w-full rounded-lg bg-[#07c160] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#06ad56] active:scale-[0.99]">
            {selectedIds.size ? `完成（${selectedIds.size}）` : '完成'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ field, value, missing, onChange }) {
  const cls = `form-input ${missing ? 'border-red-400 bg-red-50' : ''}`
  let ctrl
  if (field.type === 'textarea') {
    ctrl = <textarea rows={field.key === 'content' ? 5 : 2} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={cls} />
  } else if (field.type === 'category') {
    ctrl = <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} className={cls}>
      <option value="">请选择</option>
      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  } else if (field.type === 'registrationMode') {
    ctrl = <select value={String(value === true)} onChange={e => onChange(e.target.value === 'true')} className={cls}>
      <option value="false">先到先得</option><option value="true">需要审核</option>
    </select>
  } else if (field.type === 'boolean') {
    ctrl = <select value={String(value !== false)} onChange={e => onChange(e.target.value === 'true')} className={cls}>
      <option value="true">{field.trueLabel || '是'}</option><option value="false">{field.falseLabel || '否'}</option>
    </select>
  } else if (field.type === 'recognition') {
    ctrl = <select value={value || 'NONE'} onChange={e => onChange(e.target.value)} className={cls}>
      <option value="NONE">不做认定</option><option value="CREDIT">第二课堂学分</option><option value="VOLUNTEER">志愿时长</option><option value="BOTH">学分+时长</option>
    </select>
  } else if (field.type === 'checkIn') {
    ctrl = <select value={value || 'QR'} onChange={e => onChange(e.target.value)} className={cls}>
      <option value="QR">现场签到码</option><option value="LOCATION">雷达定位签到</option><option value="MANUAL">人工签到</option><option value="NONE">无需签到</option>
    </select>
  } else {
    ctrl = <input type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} step={field.step}
      value={field.type === 'datetime-local' ? toInputDateTime(value) : (value ?? '')}
      onChange={e => onChange(field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
      placeholder={field.placeholder} className={cls} />
  }
  return <label className={field.wide ? 'sm:col-span-2' : ''}>
    <span className="block mb-1 text-xs font-medium text-gray-600">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</span>
    {ctrl}
  </label>
}

function CoverImageEditor({ imageUrl, generating, onGenerate, onImageUrlChange }) {
  return (
    <div className="mt-4 border border-gray-200 rounded overflow-hidden sm:col-span-2">
      <div className="flex items-center gap-4 p-3 bg-gray-50">
        <div className="w-20 h-14 bg-gray-200 rounded overflow-hidden shrink-0">
          {imageUrl ? <img src={resolveApiAssetUrl(imageUrl)} alt="" className="w-full h-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-gray-400">无封面</div>}
        </div>
        <div className="flex-1">
          <input value={imageUrl || ''} onChange={e => onImageUrlChange(e.target.value)} placeholder="图片URL" className="form-input text-xs" />
        </div>
        <button onClick={onGenerate} disabled={generating} className="btn-secondary btn-sm shrink-0">{generating ? '生成中…' : 'AI 生成'}</button>
      </div>
    </div>
  )
}
