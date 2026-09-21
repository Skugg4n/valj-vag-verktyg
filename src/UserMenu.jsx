import { useAuth } from './AuthContext.jsx'
import { LogIn, LogOut, Cloud, CloudOff, BarChart3 } from 'lucide-react'
import { isAdminUid } from './adminConfig.js'

export default function UserMenu() {
  const { user, loading, loginWithGoogle, logout } = useAuth()

  if (loading) return null

  // Anonymous (silent) identities are an implementation detail used for
  // sharing/analytics — show them the sign-in affordance, not a "synced" state.
  if (!user || user.isAnonymous) {
    return (
      <button
        className="btn ghost"
        onClick={() => loginWithGoogle().catch((err) => { console.error(err); if (err?.message) window.alert(err.message) })}
        title="Logga in med Google för att spara i molnet"
        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      >
        <LogIn className="h-4 w-4" />
        <CloudOff className="h-3 w-3" style={{ opacity: 0.5 }} />
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {isAdminUid(user.uid) && (
        <a
          className="btn ghost"
          href="/admin"
          title="Admin"
          style={{ display: 'flex', alignItems: 'center', padding: '4px 6px' }}
        >
          <BarChart3 className="h-4 w-4" />
        </a>
      )}
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
