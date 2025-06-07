import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ai-settings'

export const defaultPrompt =
  'You are writing an interactive story. Here are the previous nodes...\n\n'

export const defaultProofPrompt =
  'Correct and improve the text below without changing the meaning:'

const defaultSettings = {
  enabled: false,
  apiKey: '',
  model: 'gpt-3.5-turbo',
  contextDepth: 3,
  maxTokens: 60,
  temperature: 0.7,
  customPrompt: defaultPrompt,
  proofPrompt: defaultProofPrompt,
}

export function useAiSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) }
      } catch {
        /* ignore */
      }
    }
    return defaultSettings
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  return [settings, setSettings]
}

export async function getSuggestions(nodes, currentId, settings) {
  if (!settings.enabled || !settings.apiKey) return []
  const current = nodes.find(n => n.id === currentId)
  if (!current) return []
  const history = []
  const ids = nodes
    .map(n => Number(n.id))
    .sort((a, b) => a - b)
    .filter(id => id < Number(currentId))
    .slice(-settings.contextDepth)
  for (const id of ids) {
    const node = nodes.find(n => n.id === id)
    if (node) history.push(node)
  }
  const context = history
    .map(n => `#${n.id} ${n.data.title || ''}\n${n.data.text || ''}`)
    .join('\n\n')
  const prompt = `${settings.customPrompt || defaultPrompt}${context}\n\nCurrent node:\n#${current.id} ${current.data.title || ''}\nYou wrote: "${current.data.text || ''}"\n\nWrite three suggestions for how the story could continue from here. Each suggestion should be 1–2 sentences.\nReturn three different continuations, start each with • and keep the same narrative style as before. If you offer choices, use markdown links like [#004].`

  const body = {
    model: settings.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: settings.maxTokens,
    temperature: settings.temperature,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return []
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  return text
    .split(/\n(?=\u2022)/)
    .map(t => t.trim())
    .filter(Boolean)
}

export async function proofreadText(nodes, currentId, settings) {
  if (!settings.enabled || !settings.apiKey) return null
  const node = nodes.find(n => n.id === currentId)
  if (!node) return null
  const prompt = `${settings.proofPrompt || defaultProofPrompt}\n\n${node.data.text}`

  const body = {
    model: settings.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: settings.maxTokens,
    temperature: settings.temperature,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const data = await res.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}
