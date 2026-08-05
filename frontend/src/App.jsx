import { useState } from 'react'
import { setApiIdentity } from './api/activity.js'
import AiSettingsDialog from './components/AiSettingsDialog.jsx'
import ApprovalWorkbench from './pages/ApprovalWorkbench.jsx'
import ActivityManagement from './pages/ActivityManagement.jsx'
import CreateActivity from './pages/CreateActivity.jsx'

const DEMO_IDENTITIES = [
  { id: 'test_teacher_001', role: 'PUBLISHER', college: 'INFORMATION_ENGINEERING', collegeName: '信息工程学院', name: '活动发布人', short: '发' },
  { id: 'review_teacher_001', role: 'COLLEGE_REVIEWER', college: 'INFORMATION_ENGINEERING', collegeName: '信息工程学院', name: '学院审核老师', short: '审' },
  { id: 'college_leader_001', role: 'COLLEGE_LEADER', college: 'INFORMATION_ENGINEERING', collegeName: '信息工程学院', name: '学院领导', short: '领' },
]

export default function App() {
  const [page, setPage] = useState('create')
  const [editingActivity, setEditingActivity] = useState(null)
  const [identity, setIdentity] = useState(DEMO_IDENTITIES[0])
  const [showAiSettings, setShowAiSettings] = useState(false)
  const isPublisher = identity.role === 'PUBLISHER'

  const navigate = (nextPage) => {
    setEditingActivity(null)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const changeIdentity = (id) => {
    const next = DEMO_IDENTITIES.find((item) => item.id === id) || DEMO_IDENTITIES[0]
    setIdentity(next)
    setApiIdentity(next)
    setEditingActivity(null)
    setPage(next.role === 'PUBLISHER' ? 'manage' : 'approvals')
  }

  const editActivity = (activity) => {
    setEditingActivity(activity)
    setPage('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`min-h-screen bg-[#f7f7f8] text-stone-900 ${isPublisher ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-0' : ''}`}>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-4">
          <button type="button" onClick={() => navigate(isPublisher ? 'create' : 'approvals')} className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:flex-none sm:gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-base font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl sm:text-lg">校</div>
            <div className="min-w-0"><div className="truncate text-sm font-bold tracking-wide text-stone-950 sm:text-base">学院活动工作台</div><div className="truncate text-[10px] text-stone-400 sm:text-[11px]">发布与两级审批</div></div>
          </button>

          <nav className="hidden items-center gap-1 rounded-xl bg-stone-100 p-1 sm:flex">
            {isPublisher ? (
              <>
                <NavButton active={page === 'create'} onClick={() => navigate('create')}>创建活动</NavButton>
                <NavButton active={page === 'manage'} onClick={() => navigate('manage')}>活动管理</NavButton>
              </>
            ) : (
              <NavButton active onClick={() => navigate('approvals')}>审批工作台</NavButton>
            )}
          </nav>

          <div className="flex w-full items-center gap-2 border-t border-stone-100 pt-2 sm:w-auto sm:border-0 sm:pt-0">
            <button type="button" onClick={() => setShowAiSettings(true)} className="shrink-0 whitespace-nowrap rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">AI 设置</button>
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-stone-200 bg-white py-1.5 pl-1.5 pr-2 sm:flex-none">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{identity.short}</span>
              <span className="sr-only">切换演示身份</span>
              <select value={identity.id} onChange={(event) => changeIdentity(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-stone-700 outline-none sm:flex-none">
                {DEMO_IDENTITIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main>
        {page === 'create' && isPublisher ? (
          <CreateActivity editingActivity={editingActivity} onActivityChanged={(activity, type) => { if (type === 'submitted') navigate('manage') }} onCancelEdit={() => navigate('manage')} />
        ) : page === 'manage' && isPublisher ? (
          <ActivityManagement onCreate={() => navigate('create')} onEdit={editActivity} />
        ) : (
          <ApprovalWorkbench identity={identity} />
        )}
      </main>

      {isPublisher && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-stone-200 bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(28,25,23,0.06)] backdrop-blur sm:hidden">
          <MobileNav active={page === 'create'} onClick={() => navigate('create')} icon="＋">创建活动</MobileNav>
          <MobileNav active={page === 'manage'} onClick={() => navigate('manage')} icon="☷">活动管理</MobileNav>
        </nav>
      )}
      {showAiSettings && <AiSettingsDialog onClose={() => setShowAiSettings(false)} />}
    </div>
  )
}

function NavButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>{children}</button>
}

function MobileNav({ active, onClick, icon, children }) {
  return <button type="button" onClick={onClick} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold ${active ? 'bg-indigo-50 text-indigo-600' : 'text-stone-400'}`}><span className="text-lg leading-5">{icon}</span>{children}</button>
}
