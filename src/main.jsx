import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
