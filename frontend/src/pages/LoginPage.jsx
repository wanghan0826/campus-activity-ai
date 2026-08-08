import { useState } from 'react'
import { getApiErrorMessage, login } from '../api/activity.js'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await login(username.trim(), password)
      onLogin(result.user)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '登录失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] p-3 sm:grid sm:place-items-center sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-indigo-950/10 sm:min-h-[680px] sm:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-slate-900 p-12 text-white sm:block">
          <img src="/campus-login-cover.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-900/20 to-slate-950/75" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/20">校</div>
              <div><div className="text-sm font-bold tracking-[0.22em]">AI 荔行</div><div className="mt-1 text-[10px] tracking-[0.18em] text-white/45">CAMPUS LIFE</div></div>
            </div>
            <div className="my-auto pb-8">
              <p className="text-xs font-bold tracking-[0.3em] text-white/45">在校园</p>
              <h1 className="mt-5 text-5xl font-bold leading-[1.22] tracking-tight drop-shadow-lg">遇见更好的<br />我们。</h1>
            </div>
            <div className="flex items-center justify-between border-t border-white/15 pt-5 text-[11px] font-semibold tracking-[0.18em] text-white/45">
              <span>AI LIXING</span>
              <span>2026</span>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-1.5rem)] flex-col justify-center px-6 py-10 sm:min-h-0 sm:px-12">
          <div className="mb-10 flex items-center gap-3 sm:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-lg font-black text-white">校</div>
            <div><div className="font-bold text-stone-950">AI 荔行</div><div className="text-xs text-stone-400">校园活动平台</div></div>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-stone-950">欢迎回来</h2>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">用户名</span>
              <input
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入用户名"
                className="form-input min-h-12"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">密码</span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  className="form-input min-h-12 pr-16"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-3 text-xs font-bold text-indigo-600">{showPassword ? '隐藏' : '显示'}</button>
              </span>
            </label>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{loading ? '正在登录…' : '登录'}</button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-stone-400">账号由学校或学院统一管理</p>
        </section>
      </div>
    </main>
  )
}
