import { useState, useEffect } from 'react'
import { parseDocument, getApiErrorMessage } from '../api/activity.js'
import ActivityCard from '../components/ActivityCard.jsx'

const EMPTY = { creationMode: 'MANUAL', schedule: [], materials: [] }

export default function CreateActivity({ editingActivity, onActivityChanged, onCancelEdit }) {
  const [activity, setActivity] = useState(EMPTY)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => { setActivity(editingActivity || EMPTY) }, [editingActivity])

  const handleAiParse = async () => {
    if (!aiInput.trim()) return
    setAiLoading(true); setAiError('')
    try {
      const resp = await parseDocument(aiInput.trim())
      setActivity({ ...EMPTY, ...(resp.result || {}), creationMode: 'AI', rawDocument: aiInput.trim() })
      setAiInput('')
    } catch (e) { setAiError(getApiErrorMessage(e, 'AI 解析失败')) }
    finally { setAiLoading(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{editingActivity ? '编辑活动' : '发布新活动'}</h1>
          <p className="text-sm text-gray-500 mt-1">填写活动信息后提交</p>
        </div>
        <div className="flex gap-2">
          {editingActivity && <button className="btn-secondary" onClick={onCancelEdit}>返回管理</button>}
        </div>
      </div>

      {!editingActivity && (
        <div className="admin-card mb-6">
          <h3 className="font-medium text-gray-900 mb-2">AI 智能填写</h3>
          <p className="text-sm text-gray-500 mb-3">输入活动描述，AI 自动填充下方表单。不需要可留空直接手动填写。</p>
          <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} rows={3}
            placeholder="例：下周五下午2点，计算机学院在多功能厅举办编程竞赛，面向全院学生，预计100人参加"
            className="form-input mb-3" />
          {aiError && <div className="text-sm text-red-600 mb-2">{aiError}</div>}
          <button className="btn-primary" onClick={handleAiParse} disabled={aiLoading || !aiInput.trim()}>
            {aiLoading ? '解析中…' : '智能生成方案'}
          </button>
        </div>
      )}

      <ActivityCard parsedResult={activity} creationMode={editingActivity?.creationMode || activity.creationMode} onSaved={onActivityChanged} />
    </div>
  )
}
