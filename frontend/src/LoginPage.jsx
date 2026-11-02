import { useState } from 'react'
import { api, setToken } from './api.js'

export default function LoginPage() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ loginId, password }),
      })
      setToken(result.token)
      window.location.assign('/home')
    } catch (error) {
      setMessage(error.message)
      setPending(false)
    }
  }

  return (
    <main className="card">
      <h1>ログイン</h1>
      <form onSubmit={submit}>
        <label>
          ユーザー名またはメールアドレス
          <input
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {message ? <p className="message">{message}</p> : null}
        <button type="submit" disabled={pending}>ログイン</button>
      </form>
      <a href="/register">新規登録へ</a>
    </main>
  )
}
