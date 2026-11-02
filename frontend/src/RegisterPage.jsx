import { useState } from 'react'
import { api, setToken } from './api.js'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      const result = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ displayName, username, email, password }),
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
      <h1>新規登録</h1>
      <form onSubmit={submit}>
        <label>
          表示名
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="nickname"
          />
        </label>
        <label>
          ユーザー名
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          メールアドレス
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        {message ? <p className="message">{message}</p> : null}
        <button type="submit" disabled={pending}>登録</button>
      </form>
      <a href="/">ログインへ</a>
    </main>
  )
}
