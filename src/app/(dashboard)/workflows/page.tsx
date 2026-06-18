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

const SERVICE_TAGS = [
  'Todos',
  'Cursos',
  'Carga',
  'Asesorías',
  'Inspecciones',
  'Búsqueda de proveedores',
  'Courier',
  'Nacionalización',
  'Transporte pesado',
  'Seguro de carga',
]

interface Template { id: string; name: string; body: string }
interface Workflow { id: string; name: string; trigger: string; stage: string | null; serviceTag: string | null; delayDays: number; active: boolean; template: Template | null }
interface SequenceStep { delayDays: string; templateId: string }

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [showWfForm, setShowWfForm] = useState(false)
  const [showTplForm, setShowTplForm] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfTrigger, setWfTrigger] = useState('DEAL_STAGE_CHANGED')
  const [wfStage, setWfStage] = useState('COTIZADO')
  const [wfServiceTag, setWfServiceTag] = useState('Todos')
  const [wfDelayDays, setWfDelayDays] = useState('0')
  const [wfTemplateId, setWfTemplateId] = useState('')
  const [sequenceName, setSequenceName] = useState('')
  const [sequenceTrigger, setSequenceTrigger] = useState('DEAL_STAGE_CHANGED')
  const [sequenceStage, setSequenceStage] = useState('COTIZADO')
  const [sequenceServiceTag, setSequenceServiceTag] = useState('Cursos')
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([
    { delayDays: '0', templateId: '' },
    { delayDays: '3', templateId: '' },
    { delayDays: '7', templateId: '' },
  ])
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
      body: JSON.stringify({
        name: wfName,
        trigger: wfTrigger,
        stage: wfTrigger === 'DEAL_STAGE_CHANGED' ? wfStage : null,
        serviceTag: wfServiceTag === 'Todos' ? null : wfServiceTag,
        delayDays: Number(wfDelayDays) || 0,
        templateId: wfTemplateId,
        active: true,
      }),
    })
    setWfName(''); setWfTrigger('DEAL_STAGE_CHANGED'); setWfStage('COTIZADO'); setWfServiceTag('Todos'); setWfDelayDays('0'); setWfTemplateId(''); setShowWfForm(false); load()
  }

  const saveSequence = async () => {
    const validSteps = sequenceSteps.filter(step => step.templateId)
    if (!sequenceName || validSteps.length === 0) return

    await Promise.all(validSteps.map((step, index) => fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${sequenceName} · Paso ${index + 1}`,
        trigger: sequenceTrigger,
        stage: sequenceTrigger === 'DEAL_STAGE_CHANGED' ? sequenceStage : null,
        serviceTag: sequenceServiceTag === 'Todos' ? null : sequenceServiceTag,
        delayDays: Number(step.delayDays) || 0,
        templateId: step.templateId,
        active: true,
      }),
    })))

    setSequenceName('')
    setSequenceTrigger('DEAL_STAGE_CHANGED')
    setSequenceStage('COTIZADO')
    setSequenceServiceTag('Cursos')
    setSequenceSteps([
      { delayDays: '0', templateId: '' },
      { delayDays: '3', templateId: '' },
      { delayDays: '7', templateId: '' },
    ])
    load()
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
  const runPending = async () => {
    const res = await fetch('/api/scheduled-messages/run', { method: 'POST' })
    const data = await res.json()
    alert(`Mensajes revisados: ${data.checked}. Enviados: ${data.sent}.`)
  }

  const updateSequenceStep = (index: number, data: Partial<SequenceStep>) => {
    setSequenceSteps(steps => steps.map((step, i) => i === index ? { ...step, ...data } : step))
  }

  const addSequenceStep = () => {
    setSequenceSteps(steps => [...steps, { delayDays: '14', templateId: '' }])
  }

  const removeSequenceStep = (index: number) => {
    setSequenceSteps(steps => steps.filter((_, i) => i !== index))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Automatizaciones</h1>
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Secuencia por servicio</h2>
            <p className="text-sm text-gray-500 mt-1">Crea varios pasos de seguimiento para una etiqueta de cliente. Cada paso programa su mensaje según los días configurados.</p>
          </div>
          <button onClick={saveSequence} className="px-4 py-2 bg-gtl-navy text-white rounded-lg text-sm font-medium hover:bg-gtl-navy-dark">Crear secuencia</button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre de la secuencia</label>
            <input value={sequenceName} onChange={e => setSequenceName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Remarketing cursos" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Servicio / etiqueta</label>
            <select value={sequenceServiceTag} onChange={e => setSequenceServiceTag(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {SERVICE_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Se activa cuando</label>
            <select value={sequenceTrigger} onChange={e => setSequenceTrigger(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="DEAL_STAGE_CHANGED">Deal cambia de etapa</option>
              <option value="CONTACT_CREATED">Contacto creado</option>
            </select>
          </div>
          {sequenceTrigger === 'DEAL_STAGE_CHANGED' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Etapa</label>
              <select value={sequenceStage} onChange={e => setSequenceStage(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {sequenceSteps.map((step, index) => (
            <div key={index} className="grid md:grid-cols-[120px_1fr_auto] gap-3 items-end rounded-lg border border-gray-100 p-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Día</label>
                <input type="number" min="0" value={step.delayDays} onChange={e => updateSequenceStep(index, { delayDays: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plantilla del paso {index + 1}</label>
                <select value={step.templateId} onChange={e => updateSequenceStep(index, { templateId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecciona una plantilla</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button onClick={() => removeSequenceStep(index)} disabled={sequenceSteps.length <= 1} className="px-3 py-2 text-sm text-gray-400 hover:text-red-500 disabled:opacity-40">Eliminar</button>
            </div>
          ))}
        </div>

        <button onClick={addSequenceStep} className="mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">+ Añadir paso</button>
      </section>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Workflows</h2>
          <div className="flex gap-2">
            <button onClick={runPending} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Enviar pendientes</button>
            <button onClick={() => setShowWfForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">+ Nuevo workflow</button>
          </div>
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
                <label className="block text-xs text-gray-500 mb-1">Se activa cuando</label>
                <select value={wfTrigger} onChange={e => setWfTrigger(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="DEAL_STAGE_CHANGED">Deal cambia de etapa</option>
                  <option value="CONTACT_CREATED">Contacto creado</option>
                </select>
              </div>
              {wfTrigger === 'DEAL_STAGE_CHANGED' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cuando el deal pasa a</label>
                <select value={wfStage} onChange={e => setWfStage(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Servicio / etiqueta</label>
                <select value={wfServiceTag} onChange={e => setWfServiceTag(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {SERVICE_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Enviar después de</label>
                <input type="number" min="0" value={wfDelayDays} onChange={e => setWfDelayDays(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0 días" />
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
              <p className="text-xs text-gray-400 mt-1">Si la plantilla usa {'{{ia_mensaje}}'}, ChatGPT redacta el texto antes de enviarlo.</p>
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
                  {wf.trigger === 'CONTACT_CREATED'
                    ? <>Contacto creado</>
                    : <>Deal → <span className="font-medium text-gray-600">{STAGES.find(s => s.value === wf.stage)?.label ?? wf.stage}</span></>}
                  {' '}· <span className="font-medium text-gray-600">{wf.delayDays > 0 ? `${wf.delayDays} día(s) después` : 'Inmediato'}</span>
                  {' '}· <span className="font-medium text-gray-600">{wf.serviceTag ?? 'Todos los servicios'}</span>
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
            <p className="text-xs text-gray-400 mt-0.5">
              Variables: <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{empresa}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{ia_mensaje}}'}</code>
            </p>
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
              <textarea value={tplBody} onChange={e => setTplBody(e.target.value)} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Hola {{nombre}}, le hemos enviado su cotización... o usa {{ia_mensaje}}" />
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
