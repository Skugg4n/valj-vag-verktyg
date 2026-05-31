// Pure structural analysis of a CYOA story graph.
//
// Operates directly on ReactFlow node objects as used in App.jsx:
//   { id, type, position, data: { text, title, color, isIdea }, ... }
//
// Idea notes (data.isIdea) and section containers (type === 'group') are
// excluded — only real scenes count toward the story structure. Adjacency is
// derived from the same reference pattern the graph uses for edges, so the
// analysis always agrees with what the user sees as connections.
//
// Ported from the design handoff's c-analysis.js, adapted to the real node
// shape and returning slim { id, title, color } objects so the UI stays
// decoupled from the full node model.

const REF_RE = /\[#(\d{3})]|#(\d{3})/g

function isIdea(node) {
  return !!node?.data?.isIdea || String(node?.id).startsWith('idea-')
}

function isScene(node) {
  return node && !isIdea(node) && node.type !== 'group'
}

function slim(node) {
  return {
    id: node.id,
    title: node.data?.title || '',
    color: node.data?.color || '#1f2937',
  }
}

function idOrder(id) {
  return /^\d+$/.test(id) ? Number(id) : Number.POSITIVE_INFINITY
}

// Unique, valid outgoing scene ids referenced from a node's text.
export function outgoing(node, validIds) {
  const text = node?.data?.text || ''
  const out = []
  const seen = new Set()
  REF_RE.lastIndex = 0
  let m
  while ((m = REF_RE.exec(text))) {
    const id = m[1] || m[2]
    if (!seen.has(id) && (!validIds || validIds.has(id))) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

export function analyzeStory(allNodes) {
  const scenes = (allNodes || []).filter(isScene)
  const ideaCount = (allNodes || []).filter(n => n && n.type !== 'group' && isIdea(n)).length
  const ids = new Set(scenes.map(n => n.id))
  const byId = new Map(scenes.map(n => [n.id, n]))

  const adj = {}     // id -> [target ids]
  const indeg = {}   // id -> incoming count
  scenes.forEach(n => { adj[n.id] = []; indeg[n.id] = 0 })
  scenes.forEach(n => {
    for (const to of outgoing(n, ids)) {
      adj[n.id].push(to)
      indeg[to] = (indeg[to] || 0) + 1
    }
  })

  // Start = lowest numeric id (typically #001), falling back to first scene.
  const ordered = [...scenes].sort((a, b) => idOrder(a.id) - idOrder(b.id))
  const startId = ordered[0]?.id || null

  // Reachable from start (BFS).
  const reachable = new Set()
  if (startId) {
    const queue = [startId]
    reachable.add(startId)
    while (queue.length) {
      const id = queue.shift()
      for (const to of adj[id] || []) {
        if (!reachable.has(to)) { reachable.add(to); queue.push(to) }
      }
    }
  }

  const deadEnds = scenes.filter(n => (adj[n.id] || []).length === 0)
  const unreachable = scenes.filter(n => !reachable.has(n.id))
  const orphans = scenes.filter(n => indeg[n.id] === 0 && n.id !== startId)
  const empty = scenes.filter(n => !(n.data?.text || '').trim())

  // Longest path from start (DFS with cycle guard) — returns ids.
  let longest = []
  if (startId) {
    const memo = {}
    const onStack = new Set()
    const dfs = id => {
      if (onStack.has(id)) return [] // cycle — stop without re-listing the node
      if (memo[id]) return memo[id]
      onStack.add(id)
      let best = []
      for (const to of adj[id] || []) {
        const path = dfs(to)
        if (path.length > best.length) best = path
      }
      onStack.delete(id)
      memo[id] = [id, ...best]
      return memo[id]
    }
    longest = dfs(startId)
  }

  // Cycle detection (any back-edge during DFS).
  let hasCycle = false
  {
    const color = {} // undefined=unvisited, 1=in-progress, 2=done
    const visit = id => {
      color[id] = 1
      for (const to of adj[id] || []) {
        if (color[to] === 1) hasCycle = true
        else if (!color[to]) visit(to)
      }
      color[id] = 2
    }
    scenes.forEach(n => { if (!color[n.id]) visit(n.id) })
  }

  const totalWords = scenes.reduce(
    (sum, n) => sum + (n.data?.text || '').split(/\s+/).filter(Boolean).length,
    0
  )
  const totalChoices = scenes.reduce((sum, n) => sum + (adj[n.id] || []).length, 0)

  return {
    sceneCount: scenes.length,
    ideaCount,
    edgeCount: totalChoices,
    totalWords,
    avgChoices: scenes.length ? totalChoices / scenes.length : 0,
    startId,
    deadEnds: deadEnds.map(slim),
    unreachable: unreachable.map(slim),
    orphans: orphans.map(slim),
    empty: empty.map(slim),
    longest: longest.map(id => byId.get(id)).filter(Boolean).map(slim),
    hasCycle,
    endings: deadEnds.length,
  }
}
