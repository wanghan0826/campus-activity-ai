import { useEffect, useState } from 'react'
import { getCurrentUser, hasStoredAuthToken, logout } from './api/activity.js'
import AiSettingsDialog from './components/AiSettingsDialog.jsx'
import ApprovalWorkbench from './pages/ApprovalWorkbench.jsx'
import ActivityManagement from './pages/ActivityManagement.jsx'
import ActivitySquare from './pages/ActivitySquare.jsx'
import CheckInManagement from './pages/CheckInManagement.jsx'
import CreateActivity from './pages/CreateActivity.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegistrationManagement from './pages/RegistrationManagement.jsx'

const ROLE_LABELS = { ADMIN: '管理员', PUBLISHER: '发布人', COLLEGE_REVIEWER: '审核老师', COLLEGE_LEADER: '学院领导', STUDENT: '学生' }

export default function App() {
  const [page, setPage] = useState('square')
  const [editingActivity, setEditingActivity] = useState(null)
  const [checkInActivity, setCheckInActivity] = useState(null)
  const [registrationActivity, setRegistrationActivity] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAiSettings, setShowAiSettings] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const isPublisher = user?.role === 'PUBLISHER' || isAdmin
  const isReviewer = user?.role === 'COLLEGE_REVIEWER' || user?.role === 'COLLEGE_LEADER' || isAdmin

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      if (!hasStoredAuthToken()) { setAuthLoading(false); return }
      try {
        const u = await getCurrentUser()
        if (active) setUser(u)
      } catch { if (active) setUser(null) }
      finally { if (active) setAuthLoading(false) }
    }
    window.addEventListener('campus-auth-expired', () => { setUser(null); setEditingActivity(null) })
    restoreSession()
    return () => { active = false }
  }, [])

  const navigate = (p) => { setEditingActivity(null); setCheckInActivity(null); setRegistrationActivity(null); setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const handleLogin = (u) => { setUser(u); setPage('square') }
  const handleLogout = async () => { await logout(); setUser(null) }

  if (authLoading) return <div className="grid min-h-screen place-items-center text-gray-400 text-sm">正在加载…</div>
  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="admin-header">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-blue-600 tracking-tight">校园活动平台</span>
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            <NavBtn active={page === 'square'} onClick={() => navigate('square')}>活动广场</NavBtn>
            <NavBtn active={page === 'create'} onClick={() => { setEditingActivity(null); navigate('create') }}>发布活动</NavBtn>
            {isAdmin && <NavBtn active={['manage', 'checkIn', 'registration'].includes(page)} onClick={() => navigate('manage')}>活动管理</NavBtn>}
            {isReviewer && <NavBtn active={page === 'approvals'} onClick={() => navigate('approvals')}>审批工作台</NavBtn>}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isPublisher && <button className="btn-secondary btn-sm" onClick={() => setShowAiSettings(true)}>AI 设置</button>}
          <span className="text-sm text-gray-600">{user.displayName}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{ROLE_LABELS[user.role] || user.role}</span>
          <button className="btn-secondary btn-sm" onClick={handleLogout}>退出</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {page === 'square' ? (
          <ActivitySquare user={user} onEdit={isPublisher ? (a) => { setEditingActivity(a); navigate('create') } : undefined} />
        ) : page === 'create' ? (
          <CreateActivity editingActivity={editingActivity} onActivityChanged={(a, type) => { if (type === 'submitted') navigate('manage') }} onCancelEdit={() => navigate('manage')} />
        ) : page === 'registration' && registrationActivity ? (
          <RegistrationManagement activity={registrationActivity} onBack={() => navigate('manage')} />
        ) : page === 'checkIn' && checkInActivity ? (
          <CheckInManagement activity={checkInActivity} onBack={() => navigate('manage')} />
        ) : page === 'manage' && isAdmin ? (
          <ActivityManagement
            user={user}
            onCreate={() => { setEditingActivity(null); navigate('create') }}
            onEdit={(a) => { setEditingActivity(a); navigate('create') }}
            onCheckIn={(a) => { setCheckInActivity(a); navigate('checkIn') }}
            onRegistrations={(a) => { setRegistrationActivity(a); navigate('registration') }}
          />
        ) : (
          <ApprovalWorkbench identity={user} />
        )}
      </main>

      {/* Mobile nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 sm:hidden bg-white border-t border-gray-200 grid grid-cols-4 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <MobNav active={page === 'square'} onClick={() => navigate('square')} icon="◇">广场</MobNav>
        <MobNav active={page === 'create'} onClick={() => { setEditingActivity(null); navigate('create') }} icon="＋">发布</MobNav>
        <MobNav active={['manage','checkIn','registration'].includes(page)} onClick={() => navigate('manage')} icon="☰">管理</MobNav>
        <MobNav active={page === 'approvals'} onClick={() => navigate('approvals')} icon="✓">审批</MobNav>
      </nav>

      {showAiSettings && <AiSettingsDialog onClose={() => setShowAiSettings(false)} />}
    </div>
  )
}

function NavBtn({ active, onClick, children }) {
  return <button onClick={onClick} className={`px-3 py-1.5 text-sm font-medium rounded transition ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{children}</button>
}
function MobNav({ active, onClick, icon, children }) {
  return <button onClick={onClick} className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[11px] font-semibold ${active ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-base leading-5">{icon}</span>{children}</button>
}
