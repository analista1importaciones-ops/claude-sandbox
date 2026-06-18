'use client'

import { useEffect, useState } from 'react'

const STAGES = [
  { value: 'PAUTA', label: 'Pauta' },
  { value: 'CONTACTADO', label: 'Contactado' },
  { value: 'COTIZADO', label: 'Cotizado' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
  { value: 'NEGOCIANDO', label: 'Negociando' },
  { value: 'CERRADO_GANADO', label: 'Cerrado Ganado' },
  { value: 'PERDIDO', label: 'Perdido' },
]

interface Template { id: string; name: string; body: string }
interface Workflow { id: string; name: string; trigger: string; stage: string | null; active: boolean; template: Template | null }

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [showWfForm, setShowWfForm] = useState(false)
  const [showTplForm, setShowTplForm] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfStage, setWfStage] = useState('COTIZADO')
  const [wfTemplateId, setWfTemplateId] = useState('')
  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState('')

  const load = async () => {
    const [wRes, tRes] = await Promise.all([fetch('/api/workflows'), fetch('/api/templates')])
    setWorkflows(await wRes.json())
    setTemplates(await tRes.json())
  }

  useEffect(() => { load() }, [])

  const saveWorkflow = async () => {
    if (!wfName || !wfTemplateId) return
    await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: wfName, trigger: 'DEAL_STAGE_CHANGED', stage: wfStage, templateId: wfTemplateId, active: true }),
    })
    setWfName(''); setWfStage('COTIZADO'); setWfTemplateId(''); setShowWfForm(false); load()
  }

  const saveTemplate = async () => {
    if (!tplName || !tplBody) return
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tplName, body: tplBody }),
    })
    setTplName(''); setTplBody(''); setShowTplForm(false); load()
  }

  const toggleWorkflow = async (wf: Workflow) => {
    await fetch(`/api/workflows/${wf.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !wf.active }) })
    load()
  }

  const deleteWorkflow = async (id: string) => { await fetch(`/api/workflows/${id}`, { method: 'DELETE' }); load() }
  const deleteTemplate = async (id: string) => { await fetch(`/api/templates/${id}`, { method: 'DELETE' }); load() }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Automatizaciones</h1>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Workflows</h2>
          <button onClick={() => setShowWfForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">+ Nuevo workflow</button>
        </div>
        {showWfForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
            <h3 className="font-medium text-gray-700">Nuevo workflow</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                <input value={wfName} onChange={e => setWfName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Mensaje cotización enviada" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cuando el deal pasa a</label>
                <select value={wfStage} onChange={e => setWfStage(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plantilla de mensaje</label>
              {templates.length === 0
                ? <p className="text-xs text-gray-400">Primero crea una plantilla abajo</p>
                : <select value={wfTemplateId} onChange={e => setWfTemplateId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecciona una plantilla</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowWfForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={saveWorkflow} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">Guardar</button>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {workflows.length === 0 && <p className="text-sm text-gray-400">No hay workflows configurados.</p>}
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{wf.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Deal → <span className="font-medium text-gray-600">{STAGES.find(s => s.value === wf.stage)?.label ?? wf.stage}</span>
                  {wf.template && <> · <span className="font-medium text-gray-600">{wf.template.name}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleWorkflow(wf)} className={`relative w-10 h-5 rounded-full transition-colors ${wf.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wf.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => deleteWorkflow(wf.id)} className="text-gray-400 hover:text-red-500 text-sm">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Plantillas de mensajes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Variables: <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{empresa}}'}</code></p>
          </div>
          <button onClick={() => setShowTplForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Nueva plantilla</button>
        </div>
        {showTplForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
            <h3 className="font-medium text-gray-700">Nueva plantilla</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre interno</label>
              <input value={tplName} onChange={e => setTplName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Cotización enviada" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mensaje</label>
              <textarea value={tplBody} onChange={e => setTplBody(e.target.value)} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Hola {{nombre}}, le hemos enviado su cotización..." />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTplForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={saveTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Guardar</button>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {templates.length === 0 && <p className="text-sm text-gray-400">No hay plantillas creadas.</p>}
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-800">{t.name}</p>
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{t.body}</p>
              </div>
              <button onClick={() => deleteTemplate(t.id)} className="text-gray-400 hover:text-red-500 text-sm ml-4 flex-shrink-0">Eliminar</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
