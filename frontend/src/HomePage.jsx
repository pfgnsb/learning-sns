import { clearToken } from './api.js'

export default function HomePage({ user }) {
  function logout() {
    clearToken()
    window.location.assign('/')
  }

  return (
    <main className="card">
      <h1>Hello World</h1>
      <p>{user.displayName}</p>
      <p>@{user.username}</p>
      <button type="button" onClick={logout}>ログアウト</button>
    </main>
  )
}
