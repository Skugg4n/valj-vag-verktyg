import { useAuth } from './AuthContext.jsx'
import { LogIn, LogOut, Cloud, CloudOff } from 'lucide-react'

export default function UserMenu() {
  const { user, loading, loginWithGoogle, logout } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <button
        className="btn ghost"
        onClick={loginWithGoogle}
        title="Sign in with Google to sync projects"
        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      >
        <LogIn className="h-4 w-4" />
        <CloudOff className="h-3 w-3" style={{ opacity: 0.5 }} />
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Cloud className="h-4 w-4" style={{ color: '#22c55e' }} title="Syncing to cloud" />
      <img
        src={user.photoURL}
        alt=""
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1px solid var(--panel)',
        }}
        title={user.displayName || user.email}
        referrerPolicy="no-referrer"
      />
      <button
        className="btn ghost"
        onClick={logout}
        title="Sign out"
        style={{ padding: '4px 6px' }}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}
