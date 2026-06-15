import { StrictMode, Component, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './workshopTheme.css'
import { AuthProvider } from './AuthContext.jsx'
import { parseRoute } from './routing.js'

const App = lazy(() => import('./App.jsx'))
const WorkshopApp = lazy(() => import('./WorkshopApp.jsx'))
const PublicReader = lazy(() => import('./PublicReader.jsx'))

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>Något gick fel</h1>
          <p>Appen kraschade. Prova att ladda om sidan.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: '1rem' }}>
            Ladda om
          </button>
          <details style={{ marginTop: '1rem', color: '#666' }}>
            <summary>Teknisk info</summary>
            <pre>{String(this.state.error)}</pre>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}

const route = parseRoute(window.location.pathname)
const fallback = <div style={{ padding: 24, fontFamily: 'sans-serif' }}>Laddar…</div>

function Root() {
  // Public reader — no auth required.
  if (route.name === 'play') {
    return (
      <Suspense fallback={fallback}>
        <PublicReader shareId={route.shareId} />
      </Suspense>
    )
  }
  if (route.name === 'workshop') {
    return (
      <AuthProvider>
        <Suspense fallback={fallback}>
          <WorkshopApp />
        </Suspense>
      </AuthProvider>
    )
  }
  return (
    <AuthProvider>
      <Suspense fallback={fallback}>
        <App />
      </Suspense>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
