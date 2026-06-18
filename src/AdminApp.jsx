import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { useAuth } from './AuthContext.jsx'
import { isAdminUid } from './adminConfig.js'
import './theme.css'
import './AdminApp.css'

const EVENT_LIMIT = 300
const TREND_DAYS = 14

// --- small pure helpers ---
const sumStat = (stats, type) => stats.reduce((acc, s) => acc + (Number(s[type]) || 0), 0)
const tsToDate = v => (v?.toDate?.() instanceof Date ? v.toDate() : null)
const fmtDate = d => (d ? d.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const short = uid => (uid ? uid.slice(0, 6) : '—')
const countBy = (arr, fn) => {
  const m = {}
  for (const x of arr) { const k = fn(x); if (k != null) m[k] = (m[k] || 0) + 1 }
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

function Shell({ children }) {
  return (
    <div className="ad-root">
      <header className="ad-header">
        <span className="ad-title">Välj Väg — Admin</span>
      </header>
      <main className="ad-main">{children}</main>
    </div>
  )
}

function Kpi({ label, value, sub }) {
  return (
    <div className="ad-kpi">
      <div className="ad-kpi-val">{value}</div>
      <div className="ad-kpi-label">{label}</div>
      {sub != null && <div className="ad-kpi-sub">{sub}</div>}
    </div>
  )
}

// Hand-rolled SVG bars — no chart dependency. Two series per day (visits/reads).
function Trends({ days }) {
  const max = Math.max(1, ...days.map(d => Math.max(d.visits, d.reads)))
  const W = 28
  return (
    <div className="ad-card">
      <div className="ad-card-h">Trender — senaste {days.length} dagarna</div>
      <div className="ad-legend">
        <span><i className="ad-dot v" /> Besök</span>
        <span><i className="ad-dot r" /> Läsningar</span>
      </div>
      <div className="ad-bars" style={{ height: 140 }}>
        {days.map(d => (
          <div className="ad-bargroup" key={d.date} style={{ width: W }} title={`${d.date}: ${d.visits} besök, ${d.reads} läsningar`}>
            <div className="ad-bar v" style={{ height: `${(d.visits / max) * 110}px` }} />
            <div className="ad-bar r" style={{ height: `${(d.reads / max) * 110}px` }} />
            <div className="ad-bar-x">{d.date.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StoriesTable({ stories, onDelete }) {
  const rows = [...stories].sort((a, b) => (tsToDate(b.createdAt)?.getTime() || 0) - (tsToDate(a.createdAt)?.getTime() || 0))
  return (
    <div className="ad-card">
      <div className="ad-card-h">Delade berättelser ({stories.length})</div>
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr><th>Titel</th><th>Författare</th><th>Skapad</th><th>Scener</th><th>Views</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id}>
                <td>{s.title || <span className="ad-dim">(utan titel)</span>}</td>
                <td className="ad-mono">{short(s.ownerUid)}</td>
                <td className="ad-dim">{fmtDate(tsToDate(s.createdAt))}</td>
                <td>{(s.nodes || []).length}</td>
                <td>{s.views || 0}{s.viewsUnique ? <span className="ad-dim"> ({s.viewsUnique} unika)</span> : null}</td>
                <td className="ad-actions">
                  <a className="ad-link" href={`/spela/${s.id}`} target="_blank" rel="noreferrer">Läs</a>
                  <button className="ad-del" onClick={() => onDelete(s)}>Radera</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="ad-dim">Inga publicerade berättelser ännu.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Insights({ stories, events }) {
  const topRead = [...stories].sort((a, b) => (b.views || 0) - (a.views || 0)).filter(s => (s.views || 0) > 0).slice(0, 5)
  const choices = events.filter(e => e.type === 'read_choice')
  const popularChoices = countBy(choices, e => e.payload?.toTitle || e.payload?.toScene).slice(0, 5)
  const byDevice = countBy(events, e => e.deviceType)
  const byBrowser = countBy(events, e => e.browser)
  return (
    <div className="ad-grid2">
      <div className="ad-card">
        <div className="ad-card-h">Mest lästa</div>
        {topRead.length === 0 ? <p className="ad-dim">Inga läsningar ännu.</p> : (
          <ol className="ad-list">{topRead.map(s => <li key={s.id}><span>{s.title || '(utan titel)'}</span><b>{s.views}</b></li>)}</ol>
        )}
      </div>
      <div className="ad-card">
        <div className="ad-card-h">Populäraste vägval</div>
        {popularChoices.length === 0 ? <p className="ad-dim">Samlar in data (loggas när läsare klickar val).</p> : (
          <ol className="ad-list">{popularChoices.map(([k, n]) => <li key={k}><span>{k}</span><b>{n}</b></li>)}</ol>
        )}
      </div>
      <div className="ad-card">
        <div className="ad-card-h">Enheter (urval)</div>
        <ol className="ad-list">{byDevice.map(([k, n]) => <li key={k}><span>{k}</span><b>{n}</b></li>)}</ol>
      </div>
      <div className="ad-card">
        <div className="ad-card-h">Webbläsare (urval)</div>
        <ol className="ad-list">{byBrowser.map(([k, n]) => <li key={k}><span>{k}</span><b>{n}</b></li>)}</ol>
      </div>
    </div>
  )
}

function EventLog({ events }) {
  return (
    <div className="ad-card">
      <div className="ad-card-h">Råa events (senaste {events.length})</div>
      <div className="ad-table-wrap" style={{ maxHeight: 320 }}>
        <table className="ad-table">
          <thead><tr><th>Tid</th><th>Typ</th><th>Vem</th><th>Vy</th><th>Enhet</th><th>Detalj</th></tr></thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td className="ad-dim">{fmtDate(tsToDate(e.ts))}</td>
                <td className="ad-mono">{e.type}</td>
                <td className="ad-mono">{short(e.anonId)}</td>
                <td className="ad-dim">{e.view}</td>
                <td className="ad-dim">{e.deviceType}/{e.browser}</td>
                <td className="ad-dim">{e.payload && Object.keys(e.payload).length ? JSON.stringify(e.payload) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Dashboard({ stories, stats, events, onDelete }) {
  const today = new Date()
  const days = useMemo(() => {
    const byDate = Object.fromEntries(stats.map(s => [s.date, s]))
    const out = []
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const s = byDate[key] || {}
      out.push({ date: key, visits: Number(s.app_open) || 0, reads: Number(s.read_open) || 0 })
    }
    return out
  }, [stats]) // eslint-disable-line react-hooks/exhaustive-deps

  const last7 = days.slice(-7)
  const authors = new Set(stories.map(s => s.ownerUid).filter(Boolean)).size
  const totalViews = stories.reduce((a, s) => a + (Number(s.views) || 0), 0)

  return (
    <Shell>
      <div className="ad-kpis">
        <Kpi label="Besök (totalt)" value={sumStat(stats, 'app_open')} sub={`${last7.reduce((a, d) => a + d.visits, 0)} senaste 7 dgr`} />
        <Kpi label="Läsningar" value={sumStat(stats, 'read_open')} sub={`${last7.reduce((a, d) => a + d.reads, 0)} senaste 7 dgr`} />
        <Kpi label="Publicerade" value={stories.length} />
        <Kpi label="Författare" value={authors} />
        <Kpi label="Totala views" value={totalViews} />
        <Kpi label="Publiceringar" value={sumStat(stats, 'publish')} />
      </div>
      <Trends days={days} />
      <StoriesTable stories={stories} onDelete={onDelete} />
      <Insights stories={stories} events={events} />
      <EventLog events={events} />
    </Shell>
  )
}

export default function AdminApp() {
  const { user, loading, loginWithGoogle } = useAuth()
  const admin = isAdminUid(user?.uid)
  const [data, setData] = useState({ loading: true })

  useEffect(() => {
    document.documentElement.setAttribute('data-app', 'admin')
    const prev = document.title
    document.title = 'Admin — Välj Väg'
    return () => { document.documentElement.removeAttribute('data-app'); document.title = prev }
  }, [])

  const load = useMemo(() => async () => {
    try {
      const [pubSnap, statsSnap, evSnap] = await Promise.all([
        getDocs(collection(db, 'published')),
        getDocs(collection(db, 'stats')),
        getDocs(query(collection(db, 'events'), orderBy('ts', 'desc'), limit(EVENT_LIMIT))),
      ])
      setData({
        loading: false,
        stories: pubSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        stats: statsSnap.docs.map(d => ({ date: d.id, ...d.data() })),
        events: evSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      })
    } catch (err) {
      setData({ loading: false, error: String(err?.message || err) })
    }
  }, [])

  useEffect(() => { if (admin) load() }, [admin, load])

  const onDelete = async story => {
    if (!window.confirm(`Radera "${story.title || 'utan titel'}"? Den publika länken slutar fungera.`)) return
    try {
      await deleteDoc(doc(db, 'published', story.id))
      setData(d => ({ ...d, stories: d.stories.filter(s => s.id !== story.id) }))
    } catch (err) {
      alert('Kunde inte radera: ' + (err?.message || err))
    }
  }

  if (loading) return <Shell><p className="ad-dim">Laddar…</p></Shell>
  if (!user || user.isAnonymous) {
    return (
      <Shell>
        <div className="ad-card ad-login">
          <p>Logga in med ditt admin-konto.</p>
          <button className="ad-btn" onClick={loginWithGoogle}>Logga in med Google</button>
        </div>
      </Shell>
    )
  }
  if (!admin) return <Shell><div className="ad-card"><p className="ad-dim">Inte behörig. Det här kontot har inte adminåtkomst.</p></div></Shell>
  if (data.loading) return <Shell><p className="ad-dim">Hämtar statistik…</p></Shell>
  if (data.error) return <Shell><div className="ad-card"><p className="ad-dim">Kunde inte ladda: {data.error}</p></div></Shell>

  return <Dashboard stories={data.stories} stats={data.stats} events={data.events} onDelete={onDelete} />
}
