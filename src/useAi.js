import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ai-settings'

export const defaultPrompt =
  'Du skriver en interaktiv berättelse. Här är tidigare noder...\n\n'

const defaultSettings = {
  enabled: false,
  apiKey: '',
  model: 'gpt-3.5-turbo',
  contextDepth: 3,
  maxTokens: 60,
  temperature: 0.7,
  customPrompt: defaultPrompt,
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
  const prompt = `${settings.customPrompt || defaultPrompt}${context}\n\nAktuell nod:\n#${current.id} ${current.data.title || ''}\nDu har skrivit: "${current.data.text || ''}"\n\nSkriv tre förslag på hur det kan fortsätta härifrån. Varje förslag bör vara 1–2 meningar.\nReturnera tre olika fortsättningar, börja varje med • och använd samma berättarstil som tidigare. Om du ger val, använd markdownlänkar som [#004].`

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
