import { useEffect, useState } from 'react'
import { getCurrentUser, hasStoredAuthToken, logout } from './api/activity.js'
import AiSettingsDialog from './components/AiSettingsDialog.jsx'
import ApprovalWorkbench from './pages/ApprovalWorkbench.jsx'
import ActivityManagement from './pages/ActivityManagement.jsx'
import CheckInManagement from './pages/CheckInManagement.jsx'
import CreateActivity from './pages/CreateActivity.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegistrationManagement from './pages/RegistrationManagement.jsx'
import StudentActivities from './pages/StudentActivities.jsx'

const ROLE_LABELS = { PUBLISHER: '活动发布人', COLLEGE_REVIEWER: '学院审核老师', COLLEGE_LEADER: '学院领导', STUDENT: '学生' }

function homePageForRole(role) {
  if (role === 'STUDENT') return 'studentActivities'
  if (role === 'PUBLISHER') return 'manage'
  return 'approvals'
}

export default function App() {
  const [page, setPage] = useState('manage')
  const [editingActivity, setEditingActivity] = useState(null)
  const [checkInActivity, setCheckInActivity] = useState(null)
  const [registrationActivity, setRegistrationActivity] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const isPublisher = user?.role === 'PUBLISHER'
  const isStudent = user?.role === 'STUDENT'
  const hasMobileNav = isPublisher || isStudent

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      if (!hasStoredAuthToken()) {
        setAuthLoading(false)
        return
      }
      try {
        const currentUser = await getCurrentUser()
        if (active) {
          setUser(currentUser)
          setPage(homePageForRole(currentUser.role))
        }
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setAuthLoading(false)
      }
    }
    const handleExpired = () => {
      setUser(null)
      setEditingActivity(null)
      setCheckInActivity(null)
      setRegistrationActivity(null)
      setShowAiSettings(false)
    }
    window.addEventListener('campus-auth-expired', handleExpired)
    restoreSession()
    return () => {
      active = false
      window.removeEventListener('campus-auth-expired', handleExpired)
    }
  }, [])

  const navigate = (nextPage) => {
    setEditingActivity(null)
    setCheckInActivity(null)
    setRegistrationActivity(null)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)
    setPage(homePageForRole(loggedInUser.role))
    setEditingActivity(null)
    setCheckInActivity(null)
    setRegistrationActivity(null)
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setEditingActivity(null)
    setCheckInActivity(null)
    setRegistrationActivity(null)
    setShowAiSettings(false)
  }

  const editActivity = (activity) => {
    setEditingActivity(activity)
    setCheckInActivity(null)
    setRegistrationActivity(null)
    setPage('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openCheckIn = (activity) => {
    setCheckInActivity(activity)
    setEditingActivity(null)
    setRegistrationActivity(null)
    setPage('checkIn')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openRegistrations = (activity) => {
    setRegistrationActivity(activity)
    setEditingActivity(null)
    setCheckInActivity(null)
    setPage('registration')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f4f7] text-sm font-semibold text-stone-400">正在进入校园活动平台…</div>
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className={`min-h-screen bg-[#f7f7f8] text-stone-900 ${hasMobileNav ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-0' : ''}`}>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-4">
          <button type="button" onClick={() => navigate(isPublisher ? 'create' : isStudent ? 'studentActivities' : 'approvals')} className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:flex-none sm:gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-base font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl sm:text-lg">校</div>
            <div className="min-w-0"><div className="truncate text-sm font-bold tracking-wide text-stone-950 sm:text-base">{isStudent ? '校园活动中心' : '学院活动工作台'}</div><div className="truncate text-[10px] text-stone-400 sm:text-[11px]">{isStudent ? '发现活动 · 在线报名' : '发布与两级审批'}</div></div>
          </button>

          <nav className="hidden items-center gap-1 rounded-xl bg-stone-100 p-1 sm:flex">
            {isPublisher ? (
              <>
                <NavButton active={page === 'create'} onClick={() => navigate('create')}>创建活动</NavButton>
                <NavButton active={['manage', 'checkIn', 'registration'].includes(page)} onClick={() => navigate('manage')}>活动管理</NavButton>
              </>
            ) : isStudent ? (
              <>
                <NavButton active={page === 'studentActivities'} onClick={() => navigate('studentActivities')}>活动广场</NavButton>
                <NavButton active={page === 'studentRegistrations'} onClick={() => navigate('studentRegistrations')}>我的报名</NavButton>
              </>
            ) : (
              <NavButton active onClick={() => navigate('approvals')}>审批工作台</NavButton>
            )}
          </nav>

          <div className="flex w-full items-center justify-end gap-2 border-t border-stone-100 pt-2 sm:w-auto sm:border-0 sm:pt-0">
            {isPublisher && <button type="button" onClick={() => setShowAiSettings(true)} className="shrink-0 whitespace-nowrap rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">AI 设置</button>}
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-stone-200 bg-white py-1.5 pl-1.5 pr-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{user.displayName?.slice(0, 1) || '用'}</span>
              <span className="min-w-0"><span className="block max-w-24 truncate text-xs font-bold text-stone-700">{user.displayName}</span><span className="hidden text-[10px] text-stone-400 sm:block">{ROLE_LABELS[user.role] || user.role}</span></span>
            </div>
            <button type="button" onClick={handleLogout} className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800">退出</button>
          </div>
        </div>
      </header>

      <main>
        {isStudent ? (
          <StudentActivities section={page === 'studentRegistrations' ? 'registrations' : 'activities'} onNavigate={(section) => navigate(section === 'registrations' ? 'studentRegistrations' : 'studentActivities')} />
        ) : page === 'registration' && isPublisher && registrationActivity ? (
          <RegistrationManagement activity={registrationActivity} onBack={() => navigate('manage')} />
        ) : page === 'checkIn' && isPublisher && checkInActivity ? (
          <CheckInManagement activity={checkInActivity} onBack={() => navigate('manage')} />
        ) : page === 'create' && isPublisher ? (
          <CreateActivity editingActivity={editingActivity} onActivityChanged={(activity, type) => { if (type === 'submitted') navigate('manage') }} onCancelEdit={() => navigate('manage')} />
        ) : page === 'manage' && isPublisher ? (
          <ActivityManagement onCreate={() => navigate('create')} onEdit={editActivity} onCheckIn={openCheckIn} onRegistrations={openRegistrations} />
        ) : (
          <ApprovalWorkbench identity={user} />
        )}
      </main>

      {hasMobileNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-stone-200 bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(28,25,23,0.06)] backdrop-blur sm:hidden print:hidden">
          {isStudent ? (
            <>
              <MobileNav active={page === 'studentActivities'} onClick={() => navigate('studentActivities')} icon="◇">活动广场</MobileNav>
              <MobileNav active={page === 'studentRegistrations'} onClick={() => navigate('studentRegistrations')} icon="✓">我的报名</MobileNav>
            </>
          ) : (
            <>
              <MobileNav active={page === 'create'} onClick={() => navigate('create')} icon="＋">创建活动</MobileNav>
              <MobileNav active={['manage', 'checkIn', 'registration'].includes(page)} onClick={() => navigate('manage')} icon="☷">活动管理</MobileNav>
            </>
          )}
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
