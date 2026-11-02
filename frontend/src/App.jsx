import { useEffect, useState } from 'react'
import { api, clearToken, getToken } from './api.js'
import HomePage from './HomePage.jsx'
import LoginPage from './LoginPage.jsx'
import RegisterPage from './RegisterPage.jsx'

function pageFromPath(pathname) {
  if (pathname === '/register') return 'register'
  if (pathname === '/home') return 'home'
  return 'login'
}

export default function App() {
  const [page] = useState(() => pageFromPath(window.location.pathname))
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let active = true
    const token = getToken()
    if (!token) {
      if (page === 'home') {
        window.location.replace('/')
        return
      }
      setChecked(true)
      return
    }

    api('/api/me')
      .then((me) => {
        if (!active) return
        if (page === 'login' || page === 'register') {
          window.location.replace('/home')
          return
        }
        setUser(me)
        setChecked(true)
      })
      .catch(() => {
        clearToken()
        if (!active) return
        if (page === 'home') {
          window.location.replace('/')
          return
        }
        setChecked(true)
      })

    return () => {
      active = false
    }
  }, [page])

  if (!checked) {
    return <p className="status">確認しています。</p>
  }
  if (page === 'home' && user) {
    return <HomePage user={user} />
  }
  if (page === 'register') {
    return <RegisterPage />
  }
  return <LoginPage />
}
