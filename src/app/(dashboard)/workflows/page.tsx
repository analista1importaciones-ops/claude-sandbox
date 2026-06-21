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

const PANELS = [
  { key: 'templates', label: '1. Plantillas', help: 'Mensaje y adjunto que se enviará.' },
  { key: 'workflows', label: '2. Workflows', help: 'Una regla: cuando pase algo, enviar una plantilla.' },
  { key: 'sequences', label: '3. Secuencias', help: 'Varios mensajes en tiempos diferentes.' },
]

interface Template { id: string; name: string; body: string; mediaUrl: string | null; mediaType: string | null; mediaName: string | null }
interface Workflow { id: string; name: string; trigger: string; stage: string | null; serviceTag: string | null; delayDays: number; delayMinutes: number; active: boolean; template: Template | null }
interface SequenceStep { delayDays: string; delayHours: string; delayMinutes: string; templateId: string }

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
  const [wfDelayHours, setWfDelayHours] = useState('0')
  const [wfDelayMinutes, setWfDelayMinutes] = useState('0')
  const [wfTemplateId, setWfTemplateId] = useState('')
  const [sequenceName, setSequenceName] = useState('')
  const [sequenceTrigger, setSequenceTrigger] = useState('DEAL_STAGE_CHANGED')
  const [sequenceStage, setSequenceStage] = useState('COTIZADO')
  const [sequenceServiceTag, setSequenceServiceTag] = useState('Cursos')
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([
    { delayDays: '0', delayHours: '0', delayMinutes: '0', templateId: '' },
    { delayDays: '0', delayHours: '0', delayMinutes: '15', templateId: '' },
    { delayDays: '1', delayHours: '0', delayMinutes: '0', templateId: '' },
  ])
  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState('')
  const [tplFile, setTplFile] = useState<File | null>(null)
  const [removeTplMedia, setRemoveTplMedia] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [activePanel, setActivePanel] = useState('templates')
  const [sequenceStatus, setSequenceStatus] = useState('')
  const [savingSequence, setSavingSequence] = useState(false)

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
        delayHours: Number(wfDelayHours) || 0,
        delayMinutes: Number(wfDelayMinutes) || 0,
        templateId: wfTemplateId,
        active: true,
      }),
    })
    setWfName(''); setWfTrigger('DEAL_STAGE_CHANGED'); setWfStage('COTIZADO'); setWfServiceTag('Todos'); setWfDelayDays('0'); setWfDelayHours('0'); setWfDelayMinutes('0'); setWfTemplateId(''); setShowWfForm(false); load()
  }

  const saveSequence = async () => {
    const validSteps = sequenceSteps.filter(step => step.templateId)
    if (!sequenceName.trim()) {
      setSequenceStatus('Ponle un nombre a la secuencia.')
      return
    }
    if (validSteps.length === 0) {
      setSequenceStatus('Selecciona al menos una plantilla en un paso.')
      return
    }

    setSavingSequence(true)
    setSequenceStatus('')
    let created = 0
    for (let index = 0; index < validSteps.length; index += 1) {
      const step = validSteps[index]
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${sequenceName.trim()} · Paso ${index + 1}`,
          trigger: sequenceTrigger,
          stage: sequenceTrigger === 'DEAL_STAGE_CHANGED' ? sequenceStage : null,
          serviceTag: sequenceServiceTag === 'Todos' ? null : sequenceServiceTag,
          delayDays: Number(step.delayDays) || 0,
          delayHours: Number(step.delayHours) || 0,
          delayMinutes: Number(step.delayMinutes) || 0,
          templateId: step.templateId,
          active: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setSavingSequence(false)
        setSequenceStatus(`No se pudo guardar el paso ${index + 1}. ${data?.error ?? 'Revisa la plantilla e intenta de nuevo.'}`)
        return
      }
      created += 1
    }

    setSequenceName('')
    setSequenceTrigger('DEAL_STAGE_CHANGED')
    setSequenceStage('COTIZADO')
    setSequenceServiceTag('Cursos')
    setSequenceSteps([
      { delayDays: '0', delayHours: '0', delayMinutes: '0', templateId: '' },
      { delayDays: '0', delayHours: '0', delayMinutes: '15', templateId: '' },
      { delayDays: '1', delayHours: '0', delayMinutes: '0', templateId: '' },
    ])
    await load()
    setSavingSequence(false)
    setSequenceStatus(`Secuencia creada: ${created} workflow${created === 1 ? '' : 's'} guardado${created === 1 ? '' : 's'}.`)
    setActivePanel('workflows')
  }

  const saveTemplate = async () => {
    if (!tplName || !tplBody) return
    const fd = new FormData()
    fd.append('name', tplName)
    fd.append('body', tplBody)
    if (tplFile) fd.append('file', tplFile)
    if (removeTplMedia) fd.append('removeMedia', 'true')

    await fetch(editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates', {
      method: editingTemplate ? 'PATCH' : 'POST',
      body: fd,
    })
    setTplName('')
    setTplBody('')
    setTplFile(null)
    setRemoveTplMedia(false)
    setEditingTemplate(null)
    setShowTplForm(false)
    load()
  }

  const toggleWorkflow = async (wf: Workflow) => {
    await fetch(`/api/workflows/${wf.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !wf.active }) })
    load()
  }

  const deleteWorkflow = async (id: string) => { await fetch(`/api/workflows/${id}`, { method: 'DELETE' }); load() }
  const toggleWorkflowGroup = async (items: Workflow[]) => {
    const shouldActivate = items.some(item => !item.active)
    await Promise.all(items.map(item => fetch(`/api/workflows/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: shouldActivate }),
    })))
    load()
  }
  const deleteWorkflowGroup = async (items: Workflow[]) => {
    await Promise.all(items.map(item => fetch(`/api/workflows/${item.id}`, { method: 'DELETE' })))
    load()
  }
  const deleteTemplate = async (id: string) => { await fetch(`/api/templates/${id}`, { method: 'DELETE' }); load() }
  const startEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setTplName(template.name)
    setTplBody(template.body)
    setTplFile(null)
    setRemoveTplMedia(false)
    setShowTplForm(true)
  }
  const cancelTemplateForm = () => {
    setShowTplForm(false)
    setEditingTemplate(null)
    setTplName('')
    setTplBody('')
    setTplFile(null)
    setRemoveTplMedia(false)
  }
  const runPending = async () => {
    const res = await fetch('/api/scheduled-messages/run', { method: 'POST' })
    const data = await res.json()
    alert(`Mensajes revisados: ${data.checked}. Enviados: ${data.sent}.`)
  }

  const updateSequenceStep = (index: number, data: Partial<SequenceStep>) => {
    setSequenceSteps(steps => steps.map((step, i) => i === index ? { ...step, ...data } : step))
  }

  const addSequenceStep = () => {
    setSequenceSteps(steps => [...steps, { delayDays: '0', delayHours: '1', delayMinutes: '0', templateId: '' }])
  }

  const removeSequenceStep = (index: number) => {
    setSequenceSteps(steps => steps.filter((_, i) => i !== index))
  }

  const formatDelay = (days: number, minutes: number) => {
    const totalMinutes = (days * 24 * 60) + (minutes || 0)
    if (totalMinutes <= 0) return 'Inmediato'
    const d = Math.floor(totalMinutes / 1440)
    const h = Math.floor((totalMinutes % 1440) / 60)
    const m = totalMinutes % 60
    return [
      d > 0 ? `${d} día${d === 1 ? '' : 's'}` : '',
      h > 0 ? `${h} hora${h === 1 ? '' : 's'}` : '',
      m > 0 ? `${m} min` : '',
    ].filter(Boolean).join(' ') + ' después'
  }

  const describeTrigger = (trigger: string, stage: string | null) => {
    if (trigger === 'CONTACT_CREATED') return 'Cuando se crea un contacto'
    return `Cuando un cliente pasa a ${STAGES.find(s => s.value === stage)?.label ?? stage ?? 'una etapa'}`
  }

  const selectedWorkflowTemplate = templates.find(t => t.id === wfTemplateId)
  const getSequenceName = (name: string) => name.includes('· Paso') ? name.split('· Paso')[0].trim() : null
  const getStepNumber = (name: string) => Number(name.match(/· Paso\s+(\d+)/)?.[1] ?? 0)
  const sequenceGroups = Array.from(
    workflows.reduce((map, workflow) => {
      const sequenceName = getSequenceName(workflow.name)
      if (!sequenceName) return map
      const items = map.get(sequenceName) ?? []
      items.push(workflow)
      map.set(sequenceName, items)
      return map
    }, new Map<string, Workflow[]>())
  ).map(([name, items]) => ({
    name,
    items: items.sort((a, b) => getStepNumber(a.name) - getStepNumber(b.name)),
  }))
  const singleWorkflows = workflows.filter(workflow => !getSequenceName(workflow.name))

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automatizaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aquí decides qué mensaje se envía, cuándo se activa y cuánto tiempo espera antes de salir por WhatsApp.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {PANELS.map(panel => (
          <button
            key={panel.key}
            type="button"
            onClick={() => setActivePanel(panel.key)}
            className={`text-left rounded-xl border p-4 transition-colors ${
              activePanel === panel.key
                ? 'border-gtl-orange bg-orange-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <p className="font-semibold text-gray-900">{panel.label}</p>
            <p className="text-xs text-gray-500 mt-1">{panel.help}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Cómo leerlo:</strong> una plantilla es el contenido. Un workflow es una regla simple. Una secuencia crea varios workflows juntos para seguimiento.
      </div>

      {activePanel === 'sequences' && (
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Secuencia por servicio</h2>
            <p className="text-sm text-gray-500 mt-1">Úsala cuando quieres varios mensajes automáticos: por ejemplo, ahora, en 15 minutos y mañana.</p>
          </div>
          <button onClick={saveSequence} disabled={savingSequence} className="px-4 py-2 bg-gtl-navy text-white rounded-lg text-sm font-medium hover:bg-gtl-navy-dark disabled:opacity-50">
            {savingSequence ? 'Guardando...' : 'Crear secuencia'}
          </button>
        </div>

        {sequenceStatus && (
          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
            {sequenceStatus}
          </div>
        )}

        {templates.length === 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Primero crea una plantilla en la pestaña “Plantillas”. Luego podrás usarla en cada paso.
          </div>
        )}

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
            <div key={index} className="grid md:grid-cols-[80px_80px_80px_1fr_auto] gap-3 items-end rounded-lg border border-gray-100 p-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Días</label>
                <input type="number" min="0" value={step.delayDays} onChange={e => updateSequenceStep(index, { delayDays: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Horas</label>
                <input type="number" min="0" value={step.delayHours} onChange={e => updateSequenceStep(index, { delayHours: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input type="number" min="0" max="59" value={step.delayMinutes} onChange={e => updateSequenceStep(index, { delayMinutes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
      )}

      {activePanel === 'workflows' && (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Workflows</h2>
            <p className="text-sm text-gray-500 mt-1">Úsalo para una sola acción automática: “cuando pase esto, envía este mensaje”.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={runPending} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Enviar pendientes</button>
            <button onClick={() => setShowWfForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">+ Nuevo workflow</button>
          </div>
        </div>
        {templates.length === 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Crea una plantilla primero. El workflow necesita saber qué mensaje enviar.
          </div>
        )}
        <div className="mb-4 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          Cuando una secuencia se activa, el paso con espera 0 se envía de inmediato por WhatsApp. Los pasos con minutos/horas se guardan como pendientes y salen cuando corre el cron o cuando presionas “Enviar pendientes”.
        </div>
        {showWfForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
            <h3 className="font-medium text-gray-700">Nuevo workflow</h3>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600">
              <p><strong>1. Activador:</strong> {describeTrigger(wfTrigger, wfTrigger === 'DEAL_STAGE_CHANGED' ? wfStage : null)}.</p>
              <p><strong>2. Espera:</strong> {formatDelay(Number(wfDelayDays) || 0, ((Number(wfDelayHours) || 0) * 60) + (Number(wfDelayMinutes) || 0))}.</p>
              <p><strong>3. Envía:</strong> {selectedWorkflowTemplate ? selectedWorkflowTemplate.name : 'selecciona una plantilla'}{selectedWorkflowTemplate?.mediaUrl ? ' con adjunto' : ''}.</p>
            </div>
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
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" min="0" value={wfDelayDays} onChange={e => setWfDelayDays(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Días" />
                  <input type="number" min="0" value={wfDelayHours} onChange={e => setWfDelayHours(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Horas" />
                  <input type="number" min="0" max="59" value={wfDelayMinutes} onChange={e => setWfDelayMinutes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Min" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">0 = sale inmediato. Para probar usa 1 o 5 minutos.</p>
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
          {sequenceGroups.map(group => {
            const first = group.items[0]
            const allActive = group.items.every(item => item.active)
            return (
              <div key={group.name} className="bg-white border border-purple-100 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{group.name}</p>
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">Secuencia</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="font-medium text-gray-600">{describeTrigger(first.trigger, first.stage)}</span>
                      {' '}· <span className="font-medium text-gray-600">{first.serviceTag ?? 'Todos los servicios'}</span>
                      {' '}· <span className="font-medium text-gray-600">{group.items.length} paso{group.items.length === 1 ? '' : 's'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleWorkflowGroup(group.items)} className={`relative w-10 h-5 rounded-full transition-colors ${allActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => deleteWorkflowGroup(group.items)} className="text-gray-400 hover:text-red-500 text-sm">Eliminar</button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {group.items.map((wf, index) => (
                    <div key={wf.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <span className="font-medium text-gray-800">Paso {index + 1}</span>
                      {' '}· {formatDelay(wf.delayDays, wf.delayMinutes)}
                      {wf.template && <> · {wf.template.name}</>}
                      {wf.template?.mediaUrl && <> · con adjunto</>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {singleWorkflows.map(wf => (
            <div key={wf.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{wf.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="font-medium text-gray-600">{describeTrigger(wf.trigger, wf.stage)}</span>
                  {' '}· <span className="font-medium text-gray-600">{formatDelay(wf.delayDays, wf.delayMinutes)}</span>
                  {' '}· <span className="font-medium text-gray-600">{wf.serviceTag ?? 'Todos los servicios'}</span>
                  {wf.template && <> · <span className="font-medium text-gray-600">{wf.template.name}</span></>}
                  {wf.template?.mediaUrl && <> · <span className="font-medium text-gray-600">con adjunto</span></>}
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
      )}

      {activePanel === 'templates' && (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Plantillas de mensajes</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Variables: <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{empresa}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{ia_mensaje}}'}</code>
            </p>
            <p className="text-sm text-gray-500 mt-1">La plantilla es lo que se envía por WhatsApp. Puede incluir foto, video, audio o documento.</p>
          </div>
          <button onClick={() => { setEditingTemplate(null); setTplName(''); setTplBody(''); setTplFile(null); setRemoveTplMedia(false); setShowTplForm(true) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Nueva plantilla</button>
        </div>
        {showTplForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
            <h3 className="font-medium text-gray-700">{editingTemplate ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre interno</label>
              <input value={tplName} onChange={e => setTplName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Cotización enviada" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mensaje</label>
              <textarea value={tplBody} onChange={e => setTplBody(e.target.value)} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Hola {{nombre}}, le hemos enviado su cotización... o usa {{ia_mensaje}}" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Adjunto para WhatsApp</label>
              <input
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={e => setTplFile(e.target.files?.[0] ?? null)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              {editingTemplate?.mediaUrl && !removeTplMedia && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  <a href={editingTemplate.mediaUrl} target="_blank" rel="noreferrer" className="underline">
                    Adjunto actual: {editingTemplate.mediaName ?? 'ver archivo'}
                  </a>
                  <button type="button" onClick={() => setRemoveTplMedia(true)} className="text-red-500 hover:text-red-600">Quitar</button>
                </div>
              )}
              {removeTplMedia && <p className="text-xs text-amber-600 mt-2">El adjunto actual se quitará al guardar.</p>}
              <p className="text-xs text-gray-400 mt-1">El workflow enviará este archivo junto con el texto de la plantilla.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={cancelTemplateForm} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={saveTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{editingTemplate ? 'Actualizar' : 'Guardar'}</button>
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
                {t.mediaUrl && (
                  <a href={t.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex mt-2 text-xs text-blue-600 underline">
                    Adjunto: {t.mediaName ?? 'ver archivo'}
                  </a>
                )}
              </div>
              <div className="flex gap-3 ml-4 flex-shrink-0">
                <button onClick={() => startEditTemplate(t)} className="text-gray-500 hover:text-blue-600 text-sm">Editar</button>
                <button onClick={() => deleteTemplate(t.id)} className="text-gray-400 hover:text-red-500 text-sm">Eliminar</button>
              </div>
            </div>
            ))}
        </div>
      </section>
      )}
    </div>
  )
}
