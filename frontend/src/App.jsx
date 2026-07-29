import { useState } from 'react'
import ActivityManagement from './pages/ActivityManagement.jsx'
import CreateActivity from './pages/CreateActivity.jsx'

export default function App() {
  const [page, setPage] = useState('create')
  const [editingActivity, setEditingActivity] = useState(null)

  const openCreate = () => {
    setEditingActivity(null)
    setPage('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openManagement = () => {
    setEditingActivity(null)
    setPage('manage')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editActivity = (activity) => {
    setEditingActivity(activity)
    setPage('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-16 text-stone-900 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button type="button" onClick={openCreate} className="flex items-center gap-3 text-left">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-lg font-bold text-white shadow-sm">校</div>
            <div><div className="text-sm font-bold tracking-wide text-stone-950 sm:text-base">学院活动工作台</div><div className="text-[11px] text-stone-400">企业微信应用 · 教师端</div></div>
          </button>

          <nav className="hidden items-center gap-1 rounded-xl bg-stone-100 p-1 sm:flex">
            <NavButton active={page === 'create'} onClick={openCreate}>创建活动</NavButton>
            <NavButton active={page === 'manage'} onClick={openManagement}>活动管理</NavButton>
          </nav>

          <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1.5 pl-1.5 pr-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">师</span>
            <div className="hidden text-left md:block"><div className="text-xs font-semibold text-stone-700">教师用户</div><div className="text-[10px] text-stone-400">企业微信工作台</div></div>
          </div>
        </div>
      </header>

      <main>
        {page === 'create' ? (
          <CreateActivity editingActivity={editingActivity} onActivityChanged={(activity, type) => { if (type === 'submitted') openManagement() }} onCancelEdit={openManagement} />
        ) : (
          <ActivityManagement onCreate={openCreate} onEdit={editActivity} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-stone-200 bg-white/95 p-2 backdrop-blur sm:hidden">
        <MobileNav active={page === 'create'} onClick={openCreate} icon="＋">创建活动</MobileNav>
        <MobileNav active={page === 'manage'} onClick={openManagement} icon="☷">活动管理</MobileNav>
      </nav>
    </div>
  )
}

function NavButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>{children}</button>
}

function MobileNav({ active, onClick, icon, children }) {
  return <button type="button" onClick={onClick} className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold ${active ? 'text-indigo-600' : 'text-stone-400'}`}><span className="text-lg leading-5">{icon}</span>{children}</button>
}
