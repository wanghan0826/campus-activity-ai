import { useEffect, useState } from 'react'
import { getCurrentUser, hasStoredAuthToken, logout } from './api/activity.js'
import ApprovalWorkbench from './pages/ApprovalWorkbench.jsx'
import ActivityManagement from './pages/ActivityManagement.jsx'
import ActivitySquare from './pages/ActivitySquare.jsx'
import CheckInManagement from './pages/CheckInManagement.jsx'
import CreateActivity from './pages/CreateActivity.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegistrationManagement from './pages/RegistrationManagement.jsx'
import StudentActivities from './pages/StudentActivities.jsx'

const ROLE_LABELS = { PUBLISHER: '发布人', COLLEGE_REVIEWER: '审核老师', COLLEGE_LEADER: '学院领导', STUDENT: '学生' }

function homePageForRole(role) {
  if (role === 'STUDENT') return 'studentActivities'
  if (role === 'PUBLISHER') return 'square'
  return 'approvals'
}

export default function App() {
  const [page, setPage] = useState('square')
  const [editingActivity, setEditingActivity] = useState(null)
  const [checkInActivity, setCheckInActivity] = useState(null)
  const [registrationActivity, setRegistrationActivity] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const isPublisher = user?.role === 'PUBLISHER'
  const isStudent = user?.role === 'STUDENT'
  const isReviewer = user?.role === 'COLLEGE_REVIEWER' || user?.role === 'COLLEGE_LEADER'

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      if (!hasStoredAuthToken()) { setAuthLoading(false); return }
      try {
        const u = await getCurrentUser()
        if (active) {
          setUser(u)
          setPage(homePageForRole(u.role))
        }
      } catch { if (active) setUser(null) }
      finally { if (active) setAuthLoading(false) }
    }
    window.addEventListener('campus-auth-expired', () => { setUser(null); setEditingActivity(null) })
    restoreSession()
    return () => { active = false }
  }, [])

  const navigate = (p) => { setEditingActivity(null); setCheckInActivity(null); setRegistrationActivity(null); setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const handleLogin = (u) => { setUser(u); setPage(homePageForRole(u.role)) }
  const handleLogout = async () => { await logout(); setUser(null) }

  if (authLoading) return <div className="grid min-h-screen place-items-center text-gray-400 text-sm">正在加载…</div>
  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="admin-header">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-blue-600 tracking-tight">校园活动平台</span>
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            {isPublisher && <NavBtn active={page === 'square'} onClick={() => navigate('square')}>活动广场</NavBtn>}
            {isPublisher && <NavBtn active={page === 'create'} onClick={() => { setEditingActivity(null); navigate('create') }}>发布活动</NavBtn>}
            {isPublisher && <NavBtn active={['manage', 'checkIn', 'registration'].includes(page)} onClick={() => navigate('manage')}>活动管理</NavBtn>}
            {isStudent && <NavBtn active={page === 'studentActivities'} onClick={() => navigate('studentActivities')}>活动广场</NavBtn>}
            {isStudent && <NavBtn active={page === 'studentRegistrations'} onClick={() => navigate('studentRegistrations')}>我的报名</NavBtn>}
            {isReviewer && <NavBtn active={page === 'approvals'} onClick={() => navigate('approvals')}>审批工作台</NavBtn>}
            {isReviewer && <NavBtn active={page === 'manage'} onClick={() => navigate('manage')}>活动列表</NavBtn>}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.displayName}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{ROLE_LABELS[user.role] || user.role}</span>
          <button className="btn-secondary btn-sm" onClick={handleLogout}>退出</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isStudent ? (
          <StudentActivities section={page === 'studentRegistrations' ? 'registrations' : 'activities'} onNavigate={(section) => navigate(section === 'registrations' ? 'studentRegistrations' : 'studentActivities')} />
        ) : page === 'square' && isPublisher ? (
          <ActivitySquare user={user} onEdit={isPublisher ? (a) => { setEditingActivity(a); navigate('create') } : undefined} />
        ) : page === 'create' && isPublisher ? (
          <CreateActivity editingActivity={editingActivity} onActivityChanged={(a, type) => { if (type === 'submitted') navigate('manage') }} onCancelEdit={() => navigate('manage')} />
        ) : page === 'registration' && isPublisher && registrationActivity ? (
          <RegistrationManagement activity={registrationActivity} onBack={() => navigate('manage')} />
        ) : page === 'checkIn' && isPublisher && checkInActivity ? (
          <CheckInManagement activity={checkInActivity} onBack={() => navigate('manage')} />
        ) : page === 'manage' && (isPublisher || isReviewer) ? (
          <ActivityManagement
            user={user}
            defaultScope={isReviewer ? 'COLLEGE' : 'MINE'}
            readOnly={isReviewer}
            onCreate={isPublisher ? () => { setEditingActivity(null); navigate('create') } : undefined}
            onEdit={isPublisher ? (a) => { navigate('create'); setEditingActivity(a) } : undefined}
            onCheckIn={isPublisher ? (a) => { navigate('checkIn'); setCheckInActivity(a) } : undefined}
            onRegistrations={isPublisher ? (a) => { navigate('registration'); setRegistrationActivity(a) } : undefined}
          />
        ) : (
          <ApprovalWorkbench identity={user} />
        )}
      </main>

      {/* Mobile nav */}
      {isPublisher ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 sm:hidden bg-white border-t border-gray-200 grid grid-cols-3 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <MobNav active={page === 'square'} onClick={() => navigate('square')} icon="◇">广场</MobNav>
          <MobNav active={page === 'create'} onClick={() => { setEditingActivity(null); navigate('create') }} icon="＋">发布</MobNav>
          <MobNav active={['manage','checkIn','registration'].includes(page)} onClick={() => navigate('manage')} icon="☰">管理</MobNav>
        </nav>
      ) : isStudent ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 sm:hidden bg-white border-t border-gray-200 grid grid-cols-2 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <MobNav active={page === 'studentActivities'} onClick={() => navigate('studentActivities')} icon="◇">广场</MobNav>
          <MobNav active={page === 'studentRegistrations'} onClick={() => navigate('studentRegistrations')} icon="◎">报名</MobNav>
        </nav>
      ) : isReviewer ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 sm:hidden bg-white border-t border-gray-200 grid grid-cols-2 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <MobNav active={page === 'approvals'} onClick={() => navigate('approvals')} icon="◎">审批</MobNav>
          <MobNav active={page === 'manage'} onClick={() => navigate('manage')} icon="☰">活动</MobNav>
        </nav>
      ) : null}

    </div>
  )
}

function NavBtn({ active, onClick, children }) {
  return <button onClick={onClick} className={`px-3 py-1.5 text-sm font-medium rounded transition ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{children}</button>
}
function MobNav({ active, onClick, icon, children }) {
  return <button onClick={onClick} className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[11px] font-semibold ${active ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-base leading-5">{icon}</span>{children}</button>
}
