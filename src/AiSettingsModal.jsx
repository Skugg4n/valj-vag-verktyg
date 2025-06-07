import { useState } from 'react'
import Button from './Button.jsx'
import { defaultPrompt, defaultProofPrompt } from './useAi.js'

export default function AiSettingsModal({ settings, onChange, onClose }) {
  const [local, setLocal] = useState(settings)

  const update = updates => {
    const next = { ...local, ...updates }
    setLocal(next)
  }

  const save = () => {
    onChange(local)
    onClose()
  }

  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <button
        id="closeModal"
        className="btn ghost"
        aria-label="Close"
        onClick={onClose}
      >
        Close
      </button>
      <div id="modalList">
        <h3>AI Settings</h3>
        <label>
          <input
            type="checkbox"
            checked={local.enabled}
            onChange={e => update({ enabled: e.target.checked })}
          />
          Enable AI features
        </label>
        <div>
          <label>API Key</label>
          <input
            type="password"
            value={local.apiKey}
            placeholder="sk-XXXX-YOUR-KEY-HERE"
            onChange={e => update({ apiKey: e.target.value })}
          />
        </div>
        <div>
          <label>Model</label>
          <select
            value={local.model}
            onChange={e => update({ model: e.target.value })}
          >
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-4">gpt-4</option>
          </select>
        </div>
        <div>
          <label>Context depth</label>
          <input
            type="number"
            min="1"
            max="5"
            value={local.contextDepth}
            onChange={e => update({ contextDepth: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Max tokens</label>
          <input
            type="number"
            min="10"
            max="500"
            value={local.maxTokens}
            onChange={e => update({ maxTokens: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={local.temperature}
            onChange={e => update({ temperature: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Base prompt</label>
          <textarea
            value={local.customPrompt}
            onChange={e => update({ customPrompt: e.target.value })}
            rows="8"
          />
          <Button
            className="reset-btn"
            type="button"
            onClick={() => update({ customPrompt: defaultPrompt })}
          >
            Reset to default
          </Button>
        </div>
        <div>
          <label>Proofread prompt</label>
          <textarea
            value={local.proofPrompt}
            onChange={e => update({ proofPrompt: e.target.value })}
            rows="6"
          />
          <Button
            className="reset-btn"
            type="button"
            onClick={() => update({ proofPrompt: defaultProofPrompt })}
          >
            Reset to default
          </Button>
        </div>
        <Button variant="primary" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  )
}
