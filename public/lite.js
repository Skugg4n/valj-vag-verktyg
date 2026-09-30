/* Simple reader for old browsers (written in ES5 on purpose: no let/const,
   arrow functions, template strings, fetch or modules). Runs on the same
   /las/:id and /spela/:id addresses as the full app, when the browser cannot
   run the app or when the address has ?enkel. Reads the shared story straight
   from the Firestore REST API. Scene is kept in the #hash so the browser's
   back button works. */
(function () {
  'use strict'

  var PROJECT = 'valj-vag-verktyg'
  var KEY = 'AIzaSyChwl6YmRGzaaWYqUPJ9WxG0U-9Em4EzMM'
  var REF_G = /\[#(\d{3})\]|#(\d{3})/g

  // ── Firestore REST value -> plain JS ─────────────────────────────────────
  function decode(v) {
    if (!v) return null
    if (v.stringValue !== undefined) return v.stringValue
    if (v.integerValue !== undefined) return Number(v.integerValue)
    if (v.doubleValue !== undefined) return v.doubleValue
    if (v.booleanValue !== undefined) return v.booleanValue
    if (v.arrayValue) {
      var arr = v.arrayValue.values || []
      var out = []
      for (var i = 0; i < arr.length; i++) out.push(decode(arr[i]))
      return out
    }
    if (v.mapValue) return decodeFields(v.mapValue.fields)
    return null
  }
  function decodeFields(fields) {
    var o = {}
    for (var k in fields || {}) {
      if (Object.prototype.hasOwnProperty.call(fields, k)) o[k] = decode(fields[k])
    }
    return o
  }

  // ── Text -> HTML ─────────────────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  function inline(s) {
    return esc(s)
      .replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>')
      .replace(/\{([^{}]*)\}/g, function (_m, t) { t = t.replace(/^\s+|\s+$/g, ''); return t ? '<span class="vl-cue">' + t + '</span>' : '' })
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
  }
  function bodyOf(text) {
    return String(text || '')
      .replace(/\\\n/g, '\n')
      .replace(/\\([\[\]])/g, '$1')
      .replace(REF_G, '')
      .replace(/[ \t]+([.,!?;:…»)\]])/g, '$1')
      .replace(/ {2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/^\s+|\s+$/g, '')
  }
  function choicesOf(text, byId) {
    var out = []
    var seen = {}
    var m
    REF_G.lastIndex = 0
    while ((m = REF_G.exec(String(text || '')))) {
      var id = m[1] || m[2]
      if (seen[id]) continue
      seen[id] = true
      out.push({ id: id, label: (byId[id] && byId[id].title) || ('Gå till #' + id), exists: !!byId[id] })
    }
    return out
  }
  function sceneHtml(node, byId) {
    var html = ''
    if (node.title) html += '<h1>' + esc(node.title) + '</h1>'
    var paras = bodyOf(node.text).split(/\n{2,}/)
    for (var i = 0; i < paras.length; i++) {
      if (paras[i].replace(/\s/g, '')) html += '<p>' + inline(paras[i]) + '</p>'
    }
    var ch = choicesOf(node.text, byId)
    html += '<div class="vl-choices">'
    if (!ch.length) html += '<a class="vl-choice" href="#start">Slut · Börja om</a>'
    for (var j = 0; j < ch.length; j++) {
      if (ch[j].exists) html += '<a class="vl-choice vl-c' + (j < 2 ? j : 2) + '" href="#' + ch[j].id + '">' + esc(ch[j].label) + '</a>'
    }
    html += '</div>'
    return html
  }

  var api = { decode: decode, decodeFields: decodeFields, inline: inline, bodyOf: bodyOf, choicesOf: choicesOf, sceneHtml: sceneHtml }
  window.VVLite = api

  // ── Page ─────────────────────────────────────────────────────────────────
  var CSS =
    'html,body{margin:0;padding:0;background:#f6f1e7 !important;color:#1c1a17 !important;}' +
    'body{font-family:Georgia,"Times New Roman",serif;-webkit-text-size-adjust:100%;}' +
    '#root{display:none !important;}' +
    '#vl{max-width:720px;margin:0 auto;padding:0 18px 60px;}' +
    '#vl-bar{padding:10px 0;border-bottom:1px solid #d8cfbd;margin-bottom:8px;font-family:Helvetica,Arial,sans-serif;font-size:15px;}' +
    '#vl-bar:after{content:"";display:table;clear:both;}' +
    '#vl-bar a,#vl-bar button{display:inline-block;margin:3px 6px 3px 0;padding:8px 12px;border:1px solid #b9ae98;border-radius:6px;background:#fffaf0;color:#1c1a17;text-decoration:none;font:inherit;-webkit-appearance:none;}' +
    '#vl-num{float:right;margin:0 0 0 8px !important;padding:4px 12px !important;font-size:30px !important;font-weight:bold;letter-spacing:.04em;font-family:Helvetica,Arial,sans-serif;}' +
    '#vl-jump{display:none;padding:8px 0 4px;border-bottom:1px solid #d8cfbd;margin-bottom:8px;font-family:Helvetica,Arial,sans-serif;}' +
    '#vl-jump.open{display:block;}' +
    '#vl-jump a{display:inline-block;-webkit-box-sizing:border-box;box-sizing:border-box;width:48%;margin:0 2% 8px 0;padding:8px 10px;border:1px solid #d8cfbd;border-radius:6px;background:#fffaf0;color:#1c1a17;text-decoration:none;font-size:14px;line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;vertical-align:top;}' +
    '#vl-jump a.now{border-color:#1c1a17;font-weight:bold;}' +
    '#vl-jump a b{display:inline-block;min-width:34px;color:#7a705f;font-weight:normal;}' +
    '#vl-foot{margin-top:40px;padding-top:10px;border-top:1px solid #d8cfbd;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#7a705f;}' +
    '#vl-foot p{margin:4px 0;}' +
    '#vl-off{color:#2f7d46;}' +
    '#vl-scene h1{font-size:1.5em;margin:0.6em 0 0.5em;line-height:1.2;}' +
    '#vl-scene p{line-height:1.55;margin:0 0 1em;}' +
    '#vl-scene mark{background:#ffe680;color:inherit;padding:0 2px;}' +
    '.vl-cue{display:inline-block;background:#e8dcc2;border:1px solid #cdbd98;border-radius:10px;padding:0 8px;font-family:Helvetica,Arial,sans-serif;font-size:0.8em;line-height:1.5;}' +
    '.vl-choices{margin-top:1.4em;}' +
    '.vl-choice{display:block;margin:0 0 12px;padding:14px 16px;border:2px solid #b9ae98;border-radius:8px;background:#fffaf0;color:#1c1a17;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-weight:bold;}' +
    '.vl-c0{border-color:#3d9a57;background:#e9f6ec;}' +
    '.vl-c1{border-color:#c4483e;background:#fbebe9;}' +
    '.vl-msg{font-family:Helvetica,Arial,sans-serif;padding:30px 0;}'

  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key)
      window.localStorage.setItem(key, val)
    } catch (e) { /* private mode */ }
    return null
  }

  function start(kind, shareId, canRunFull) {
    var style = document.createElement('style')
    style.appendChild(document.createTextNode(CSS))
    document.getElementsByTagName('head')[0].appendChild(style)

    var root = document.createElement('div')
    root.id = 'vl'
    root.innerHTML =
      '<div id="vl-bar">' +
        '<button type="button" id="vl-num" title="Visa alla scener">···</button>' +
        '<a href="#" id="vl-back">‹ Tillbaka</a>' +
        '<a href="#start">Börja om</a>' +
        '<button type="button" id="vl-minus">A−</button>' +
        '<button type="button" id="vl-plus">A+</button>' +
      '</div>' +
      '<div id="vl-jump"></div>' +
      '<div id="vl-scene"><p class="vl-msg">Laddar berättelsen…</p></div>' +
      '<div id="vl-foot">' +
        '<p id="vl-name"></p>' +
        '<p id="vl-off"></p>' +
        (canRunFull ? '<p><a href="/' + kind + '/' + encodeURIComponent(shareId) + '" id="vl-full">Full version</a></p>' : '') +
      '</div>'
    document.body.appendChild(root)

    var scene = document.getElementById('vl-scene')
    var nameEl = document.getElementById('vl-name')
    var size = Number(store('vv-lite-size')) || 20
    function applySize() { scene.style.fontSize = size + 'px' }
    applySize()
    document.getElementById('vl-minus').onclick = function () { size = Math.max(14, size - 2); store('vv-lite-size', String(size)); applySize() }
    document.getElementById('vl-plus').onclick = function () { size = Math.min(40, size + 2); store('vv-lite-size', String(size)); applySize() }
    document.getElementById('vl-back').onclick = function (e) {
      if (e && e.preventDefault) e.preventDefault()
      window.history.back()
      return false
    }

    // Tells the reader when the page itself is stored on the device (old
    // browsers with an application cache), so it can be checked before leaving.
    var ac = window.applicationCache
    if (ac && ac.addEventListener) {
      var offEl = document.getElementById('vl-off')
      var ready = function () { offEl.innerHTML = 'Sidan är sparad på enheten. Fungerar utan nät.' }
      ac.addEventListener('cached', ready, false)
      ac.addEventListener('noupdate', ready, false)
      ac.addEventListener('updateready', function () { try { ac.swapCache() } catch (e) { /* ignore */ } ready() }, false)
      if (ac.status === 1 || ac.status === 4) ready()
    }

    function fail(text) { scene.innerHTML = '<p class="vl-msg">' + text + '</p>' }

    var byId = {}
    var firstId = null
    var allIds = []
    // Big scene number top right; tap it for a list of every scene to jump to.
    var numEl = document.getElementById('vl-num')
    var jumpEl = document.getElementById('vl-jump')
    numEl.onclick = function () {
      if (jumpEl.className === 'open') { jumpEl.className = ''; return }
      var html = ''
      var now = (window.location.hash || '').replace(/^#/, '')
      for (var i = 0; i < allIds.length; i++) {
        var n = byId[allIds[i]]
        html += '<a href="#' + n.id + '"' + (n.id === now ? ' class="now"' : '') + '><b>' + esc(n.id) + '</b> ' + esc(n.title || '') + '</a>'
      }
      jumpEl.innerHTML = html
      jumpEl.className = 'open'
    }
    function show() {
      var id = (window.location.hash || '').replace(/^#/, '')
      if (!byId[id]) id = firstId
      if (!id) return fail('Berättelsen är tom.')
      scene.innerHTML = sceneHtml(byId[id], byId)
      numEl.innerHTML = esc(id)
      jumpEl.className = ''
      window.scrollTo(0, 0)
    }

    function use(story, note) {
      // The working link shows highlights and cues (rich copy); the public link the plain copy.
      var nodes = (kind === 'las' && story.rich && story.rich.nodes && story.rich.nodes.length) ? story.rich.nodes : (story.nodes || [])
      var ids = []
      byId = {}
      for (var i = 0; i < nodes.length; i++) { byId[nodes[i].id] = nodes[i]; ids.push(nodes[i].id) }
      ids.sort()
      allIds = ids
      firstId = ids[0] || null
      if (story.title) document.title = story.title
      nameEl.innerHTML = ''
      nameEl.appendChild(document.createTextNode((story.title || 'Berättelse') + ' · enkel version' + (note ? ' · ' + note : '')))
      window.onhashchange = show
      show()
    }

    // Offline: the last fetched copy is kept on the device and used when the
    // network is gone (the page itself is kept by the app cache, see enkel.html).
    var saveKey = 'vv-lite-story-' + kind + '-' + shareId
    function saved() {
      try { var o = JSON.parse(store(saveKey) || 'null'); return o && o.story ? o : null } catch (e) { return null }
    }
    function useSaved(fallbackText) {
      var o = saved()
      if (!o) return fail(fallbackText)
      use(o.story, 'utan nät, sparad kopia från ' + o.at)
    }
    function stamp() {
      var d = new Date()
      function two(n) { return (n < 10 ? '0' : '') + n }
      return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes())
    }

    var xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://firestore.googleapis.com/v1/projects/' + PROJECT +
      '/databases/(default)/documents/published/' + encodeURIComponent(shareId) + '?key=' + KEY, true)
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return
      if (xhr.status === 404) return fail('Berättelsen hittades inte. Be den som gjorde berättelsen om en ny länk.')
      if (xhr.status !== 200) return useSaved('Kunde inte hämta berättelsen (fel ' + xhr.status + '). Kontrollera nätet och ladda om sidan.')
      var story
      try { story = decodeFields(JSON.parse(xhr.responseText).fields) } catch (e) { return useSaved('Kunde inte läsa berättelsen.') }
      var kept = false
      try {
        window.localStorage.setItem(saveKey, JSON.stringify({ at: stamp(), story: { title: story.title, nodes: story.nodes, rich: story.rich } }))
        kept = !!saved()
      } catch (e) { kept = false }
      use(story, kept ? 'sparad för läsning utan nät' : '')
    }
    xhr.send(null)
  }

  var boot = window.__VV_LITE__
  if (boot && boot.shareId) start(boot.kind, boot.shareId, boot.canRunFull)
})()
