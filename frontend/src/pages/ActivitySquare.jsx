import { useCallback, useEffect, useState } from 'react'
import { getStudentActivities, getApiErrorMessage } from '../api/activity.js'
import ActivityPreview from '../components/ActivityPreview.jsx'

const CAT_LABEL = { ART: '艺术', SPORTS: '体育', PRACTICE: '实践', LIFE: '生活', FEATURE: '特色' }
const STATUS_STYLE = { PUBLISHED: 'published', OFFLINE: 'offline' }
const STATUS_TEXT = { PUBLISHED: '进行中', OFFLINE: '已结束' }

export default function ActivitySquare({ user, onEdit }) {
  const [activities, setActivities] = useState([])
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setActivities((await getStudentActivities({ keyword, category: category === 'ALL' ? '' : category }))?.content || []) }
    catch (e) { setError(getApiErrorMessage(e, '加载失败')) }
    finally { setLoading(false) }
  }, [keyword, category])

  useEffect(() => { const t = setTimeout(load, keyword ? 300 : 0); return () => clearTimeout(t) }, [load, keyword])
  useEffect(() => { load() }, [category])

  // 排序：进行中的在前
  const sorted = [...activities].sort((a, b) => {
    if (a.status === 'PUBLISHED' && b.status !== 'PUBLISHED') return -1
    if (a.status !== 'PUBLISHED' && b.status === 'PUBLISHED') return 1
    return new Date(b.startTime || 0) - new Date(a.startTime || 0)
  })

  const cats = ['ALL', 'ART', 'SPORTS', 'PRACTICE', 'LIFE', 'FEATURE']

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">活动广场</h1>
      <p className="text-sm text-gray-500 mb-6">浏览已发布的活动，点击查看详情</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索活动标题、地点…" className="form-input max-w-xs" />
        <div className="flex gap-2 flex-wrap">
          {cats.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${category === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{c === 'ALL' ? '全部' : CAT_LABEL[c] || c}</button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">加载中…</div>
      ) : sorted.length === 0 ? (
        <div className="admin-card text-center py-16 text-gray-400 text-sm">暂无已发布的活动</div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead><tr>
              <th>活动标题</th><th>分类</th><th>时间</th><th>地点</th><th>主办方</th><th>状态</th><th>操作</th>
            </tr></thead>
            <tbody>
              {sorted.map(a => (
                <tr key={a.id}>
                  <td className="font-medium text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => setPreview(a)}>{a.title || '未命名'}</td>
                  <td>{CAT_LABEL[a.category] || a.category || '-'}</td>
                  <td className="text-sm">{fmtDate(a.startTime)} ~ {fmtDate(a.endTime)}</td>
                  <td className="text-sm">{a.location || '-'}</td>
                  <td className="text-sm">{a.organizer || '-'}</td>
                  <td><span className={`status-tag ${STATUS_STYLE[a.status] || 'draft'}`}>{STATUS_TEXT[a.status] || a.status}</span></td>
                  <td><button onClick={() => setPreview(a)} className="btn-secondary btn-sm">查看</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-10 pb-10 px-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setPreview(null) }}>
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-lg text-gray-900">{preview.title || '活动详情'}</h2>
              <button onClick={() => setPreview(null)} className="btn-secondary btn-sm">关闭</button>
            </div>
            <div className="p-4"><ActivityPreview activity={preview} /></div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtDate(v) { if (!v) return '待定'; const d = String(v).replace('T', ' '); return d.length > 16 ? d.slice(0, 16) : d }
