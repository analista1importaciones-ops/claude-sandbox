'use client'

import { useEffect, useMemo, useState } from 'react'

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

interface Template { id: string; name: string; body: string; mediaUrl?: string | null; mediaType?: string | null; mediaName?: string | null }
interface Funnel { id: string; name: string; stages: { id: string; name: string }[] }
interface WorkflowStep { id: string; order: number; delayDays: number; delayHours: number; delayMinutes: number; template: Template | null; templateId?: string | null }
interface WorkflowRun { id: string; status: string; startedAt: string; completedAt?: string | null; cancelledAt?: string | null; contact?: { name: string; phone: string | null } | null }
interface Workflow { id: string; name: string; trigger: string; stage: string | null; serviceTag: string | null; funnelId: string | null; funnelStageId: string | null; delayDays: number; delayHours: number; delayMinutes: number; templateId?: string | null; active: boolean; template: Template | null; funnel?: { name: string } | null; funnelStage?: { name: string } | null; steps?: WorkflowStep[]; runs?: WorkflowRun[] }
interface SequenceStep { delayDays: string; delayHours: string; delayMinutes: string; templateId: string }

type Tab = 'workflows' | 'secuencias' | 'plantillas'

function formatDelay(days = 0, hours = 0, minutes = 0) {
  const parts = [
    days > 0 ? `${days}d` : '',
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}min` : '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Inmediato'
}

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('workflows')

  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [showWfForm, setShowWfForm] = useState(false)
  const [showTplForm, setShowTplForm] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfTrigger, setWfTrigger] = useState('DEAL_STAGE_CHANGED')
  const [wfStage, setWfStage] = useState('COTIZADO')
  const [wfServiceTag, setWfServiceTag] = useState('Todos')
  const [wfFunnelId, setWfFunnelId] = useState('')
  const [wfFunnelStageId, setWfFunnelStageId] = useState('')
  const [wfDelayDays, setWfDelayDays] = useState('0')
  const [wfDelayHours, setWfDelayHours] = useState('0')
  const [wfDelayMinutes, setWfDelayMinutes] = useState('0')
  const [wfTemplateId, setWfTemplateId] = useState('')
  const [sequenceName, setSequenceName] = useState('')
  const [sequenceTrigger, setSequenceTrigger] = useState('DEAL_STAGE_CHANGED')
  const [sequenceServiceTag, setSequenceServiceTag] = useState('Cursos')
  const [sequenceFunnelId, setSequenceFunnelId] = useState('')
  const [sequenceFunnelStageId, setSequenceFunnelStageId] = useState('')
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([
    { delayDays: '0', delayHours: '0', delayMinutes: '0', templateId: '' },
    { delayDays: '0', delayHours: '0', delayMinutes: '15', templateId: '' },
    { delayDays: '1', delayHours: '0', delayMinutes: '0', templateId: '' },
  ])
  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState('')
  const [tplMedia, setTplMedia] = useState<Pick<Template, 'mediaUrl' | 'mediaType' | 'mediaName'>>({})
  const [tplFile, setTplFile] = useState<File | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    const [wRes, tRes, fRes, rRes] = await Promise.all([fetch('/api/workflows'), fetch('/api/templates'), fetch('/api/crm/funnels'), fetch('/api/workflows/runs')])
    setWorkflows(await wRes.json())
    setTemplates(await tRes.json())
    if (rRes.ok) setWorkflowRuns(await rRes.json())
    const funnelData = await fRes.json()
    setFunnels(funnelData)
    const first = funnelData.find((funnel: Funnel) => funnel.name === 'CARGAS') ?? funnelData[0]
    setWfFunnelId(current => current || first?.id || '')
    setWfFunnelStageId(current => current || first?.stages[0]?.id || '')
    setSequenceFunnelId(current => current || first?.id || '')
    setSequenceFunnelStageId(current => current || first?.stages[0]?.id || '')
  }

  useEffect(() => { load() }, [])

  const saveWorkflow = async () => {
    if (!wfName || !wfTemplateId || (wfTrigger === 'DEAL_STAGE_CHANGED' && !wfFunnelStageId)) {
      setNotice('Completa el nombre, la etapa del embudo y la plantilla.')
      return
    }
    setSaving(true)
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: wfName,
        trigger: wfTrigger,
        stage: wfTrigger === 'DEAL_STAGE_CHANGED' && !wfFunnelId ? wfStage : null,
        serviceTag: wfFunnelId || wfServiceTag === 'Todos' ? null : wfServiceTag,
        funnelId: wfFunnelId || null,
        funnelStageId: wfTrigger === 'DEAL_STAGE_CHANGED' ? wfFunnelStageId || null : null,
        delayDays: Number(wfDelayDays) || 0,
        delayHours: Number(wfDelayHours) || 0,
        delayMinutes: Number(wfDelayMinutes) || 0,
        templateId: wfTemplateId,
        steps: [{
          delayDays: Number(wfDelayDays) || 0,
          delayHours: Number(wfDelayHours) || 0,
          delayMinutes: Number(wfDelayMinutes) || 0,
          templateId: wfTemplateId,
        }],
        active: true,
      }),
    })
    setSaving(false)
    if (!response.ok) {
      setNotice((await response.json()).error || 'No se pudo guardar el workflow.')
      return
    }
    setNotice('Workflow guardado correctamente.')
    setWfName(''); setWfTrigger('DEAL_STAGE_CHANGED'); setWfStage('COTIZADO'); setWfServiceTag('Todos'); setWfDelayDays('0'); setWfDelayHours('0'); setWfDelayMinutes('0'); setWfTemplateId(''); setShowWfForm(false); load()
  }

  const saveSequence = async () => {
    const validSteps = sequenceSteps.filter(step => step.templateId)
    if (!sequenceName || validSteps.length === 0 || (sequenceTrigger === 'DEAL_STAGE_CHANGED' && !sequenceFunnelStageId)) {
      setNotice('Completa el nombre, la etapa del embudo y al menos una plantilla.')
      return
    }

    setSaving(true)
    const wasEditing = Boolean(editingWorkflowId)
    const response = await fetch(editingWorkflowId ? `/api/workflows/${editingWorkflowId}` : '/api/workflows', {
      method: editingWorkflowId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sequenceName,
        trigger: sequenceTrigger,
        stage: null,
        serviceTag: sequenceFunnelId || sequenceServiceTag === 'Todos' ? null : sequenceServiceTag,
        funnelId: sequenceFunnelId || null,
        funnelStageId: sequenceTrigger === 'DEAL_STAGE_CHANGED' ? sequenceFunnelStageId || null : null,
        active: true,
        steps: validSteps.map(step => ({
          delayDays: Number(step.delayDays) || 0,
          delayHours: Number(step.delayHours) || 0,
          delayMinutes: Number(step.delayMinutes) || 0,
          templateId: step.templateId,
        })),
        delayDays: Number(validSteps[0]?.delayDays) || 0,
        delayHours: Number(validSteps[0]?.delayHours) || 0,
        delayMinutes: Number(validSteps[0]?.delayMinutes) || 0,
        templateId: validSteps[0]?.templateId,
      }),
    })
    setSaving(false)
    if (!response.ok) {
      setNotice('No se pudo guardar la secuencia completa. Revisa la etapa y las plantillas.')
      load()
      return
    }

    setSequenceName('')
    setEditingWorkflowId(null)
    setSequenceTrigger('DEAL_STAGE_CHANGED')
    setSequenceServiceTag('Cursos')
    setSequenceSteps([
      { delayDays: '0', delayHours: '0', delayMinutes: '0', templateId: '' },
      { delayDays: '0', delayHours: '0', delayMinutes: '15', templateId: '' },
      { delayDays: '1', delayHours: '0', delayMinutes: '0', templateId: '' },
    ])
    setNotice(wasEditing ? 'Secuencia actualizada.' : 'Secuencia guardada como una sola automatización.')
    load()
  }

  const saveTemplate = async () => {
    if (!tplName || !tplBody) return
    setSaving(true)
    try {
      let media = tplMedia
      if (tplFile) {
        if (tplFile.size > 64 * 1024 * 1024) throw new Error('El video supera el límite de 64 MB.')
        const form = new FormData()
        form.append('file', tplFile)
        const upload = await fetch('/api/templates/media', { method: 'POST', body: form })
        const uploadData = await upload.json().catch(() => null)
        if (!upload.ok) {
          throw new Error(upload.status === 413
            ? 'El servidor rechazó el video por tamaño. Debe habilitarse 64 MB en Nginx.'
            : uploadData?.error || 'No se pudo subir el archivo.')
        }
        media = uploadData
      }
      const response = await fetch(editingTemplateId ? `/api/templates/${editingTemplateId}` : '/api/templates', {
        method: editingTemplateId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tplName, body: tplBody, ...media }),
      })
      const responseData = await response.json().catch(() => null)
      if (!response.ok) throw new Error(responseData?.error || 'No se pudo guardar la plantilla.')
      closeTemplateForm()
      setNotice('Plantilla y adjunto guardados correctamente. El workflow enviará ambos.')
      load()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar la plantilla.')
    } finally {
      setSaving(false)
    }
  }

  const closeTemplateForm = () => {
    setTplName(''); setTplBody(''); setTplMedia({}); setTplFile(null); setEditingTemplateId(null); setShowTplForm(false)
  }

  const editTemplate = (template: Template) => {
    setTplName(template.name)
    setTplBody(template.body)
    setTplMedia({ mediaUrl: template.mediaUrl, mediaType: template.mediaType, mediaName: template.mediaName })
    setTplFile(null)
    setEditingTemplateId(template.id)
    setShowTplForm(true)
    setActiveTab('plantillas')
  }

  const toggleWorkflow = async (wf: Workflow) => {
    await fetch(`/api/workflows/${wf.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !wf.active }) })
    load()
  }

  const deleteWorkflow = async (id: string) => { await fetch(`/api/workflows/${id}`, { method: 'DELETE' }); load() }
  const deleteTemplate = async (id: string) => { await fetch(`/api/templates/${id}`, { method: 'DELETE' }); load() }
  const toggleSequence = async (workflow: Workflow) => {
    await fetch(`/api/workflows/${workflow.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !workflow.active }) })
    load()
  }
  const deleteSequence = async (workflow: Workflow) => {
    if (!confirm('¿Eliminar esta secuencia y todos sus pasos?')) return
    await fetch(`/api/workflows/${workflow.id}`, { method: 'DELETE' })
    load()
  }
  const editSequence = (workflow: Workflow) => {
    setEditingWorkflowId(workflow.id)
    setSequenceName(workflow.name)
    setSequenceTrigger(workflow.trigger)
    setSequenceServiceTag(workflow.serviceTag || 'Todos')
    setSequenceFunnelId(workflow.funnelId || '')
    setSequenceFunnelStageId(workflow.funnelStageId || '')
    const steps: SequenceStep[] = workflow.steps?.length
      ? workflow.steps.map(step => ({
        delayDays: String(step.delayDays || 0),
        delayHours: String(step.delayHours || 0),
        delayMinutes: String(step.delayMinutes || 0),
        templateId: step.template?.id || step.templateId || '',
      }))
      : [{
        delayDays: String(workflow.delayDays || 0),
        delayHours: String(workflow.delayHours || 0),
        delayMinutes: String(workflow.delayMinutes || 0),
        templateId: workflow.template?.id || workflow.templateId || '',
      }]
    setSequenceSteps(steps.map(step => ({
      delayDays: step.delayDays,
      delayHours: step.delayHours,
      delayMinutes: step.delayMinutes,
      templateId: step.templateId,
    })))
    setActiveTab('secuencias')
    setNotice('Editando secuencia. Ajusta los pasos y guarda.')
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

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'workflows', label: 'Workflows', count: workflows.length },
    { id: 'secuencias', label: 'Secuencias', count: workflows.filter(workflow => (workflow.steps?.length || 0) > 1).length },
    { id: 'plantillas', label: 'Plantillas', count: templates.length },
  ]

  const wfFunnel = funnels.find(funnel => funnel.id === wfFunnelId)
  const sequenceFunnel = funnels.find(funnel => funnel.id === sequenceFunnelId)
  const sequences = useMemo(() => workflows.filter(workflow => (workflow.steps?.length || 0) > 1), [workflows])

  return (
    <div className="p-0 sm:p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Automatizaciones</h1>
        {activeTab === 'workflows' && (
          <div className="flex flex-wrap gap-2">
            <button onClick={runPending} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Enviar pendientes</button>
            <button onClick={() => setShowWfForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">+ Nuevo workflow</button>
          </div>
        )}
        {activeTab === 'plantillas' && (
          <button onClick={() => { closeTemplateForm(); setShowTplForm(true) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Nueva plantilla</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-4 sm:mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gtl-navy text-gtl-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-gtl-navy/10 text-gtl-navy' : 'bg-gray-100 text-gray-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button>
        </div>
      )}

      {/* TAB: Workflows */}
      {activeTab === 'workflows' && (
        <section className="space-y-4">
          {showWfForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="font-medium text-gray-700">Nuevo workflow</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {wfTrigger === 'DEAL_STAGE_CHANGED' && !wfFunnelId && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cuando el deal pasa a</label>
                  <select value={wfStage} onChange={e => setWfStage(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                )}
                {!wfFunnelId && <div>
                  <label className="block text-xs text-gray-500 mb-1">Servicio / etiqueta</label>
                  <select value={wfServiceTag} onChange={e => setWfServiceTag(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {SERVICE_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                </div>}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Embudo</label>
                  <select value={wfFunnelId} onChange={e => {
                    const funnel = funnels.find(item => item.id === e.target.value)
                    setWfFunnelId(e.target.value)
                    setWfFunnelStageId(funnel?.stages[0]?.id ?? '')
                  }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Sin embudo</option>
                    {funnels.map(funnel => <option key={funnel.id} value={funnel.id}>{funnel.name}</option>)}
                  </select>
                </div>
                {wfTrigger === 'DEAL_STAGE_CHANGED' && wfFunnel && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Etapa del embudo</label>
                    <select value={wfFunnelStageId} onChange={e => setWfFunnelStageId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {wfFunnel.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Días</label>
                    <input type="number" min="0" value={wfDelayDays} onChange={e => setWfDelayDays(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Horas</label>
                    <input type="number" min="0" value={wfDelayHours} onChange={e => setWfDelayHours(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min</label>
                    <input type="number" min="0" value={wfDelayMinutes} onChange={e => setWfDelayMinutes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plantilla de mensaje</label>
                {templates.length === 0
                  ? <p className="text-xs text-gray-400">Primero crea una plantilla en la pestaña Plantillas</p>
                  : <select value={wfTemplateId} onChange={e => setWfTemplateId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <option value="">Selecciona una plantilla</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>}
                <p className="text-xs text-gray-400 mt-1">Si la plantilla usa {'{{ia_mensaje}}'}, ChatGPT redacta el texto antes de enviarlo.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowWfForm(false)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
                <button disabled={saving} onClick={saveWorkflow} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          )}

          {workflows.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">No hay workflows configurados.</p>
            </div>
          )}
          {workflows.map(wf => {
            const steps = wf.steps?.length ? wf.steps : [{ id: wf.id, order: 1, delayDays: wf.delayDays, delayHours: wf.delayHours, delayMinutes: wf.delayMinutes, template: wf.template }]
            return (
            <div key={wf.id} className="bg-white border border-gray-200 rounded-lg px-4 sm:px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-gray-800">{wf.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {wf.trigger === 'CONTACT_CREATED'
                    ? <>Contacto creado</>
                    : <>Al entrar en <span className="font-medium text-gray-600">{wf.funnel?.name ? `${wf.funnel.name} / ${wf.funnelStage?.name || 'etapa'}` : STAGES.find(s => s.value === wf.stage)?.label ?? wf.stage}</span></>}
                  {' '}· <span className="font-medium text-gray-600">{steps.length} paso{steps.length === 1 ? '' : 's'}</span>
                  {!wf.funnelId && <> · <span className="font-medium text-gray-600">{wf.serviceTag ?? 'Todos los servicios'}</span></>}
                  {steps[0]?.template && <> · <span className="font-medium text-gray-600">{steps[0].template.name}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleWorkflow(wf)} className={`relative w-10 h-5 rounded-full transition-colors ${wf.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wf.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => editSequence(wf)} className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                <button onClick={() => deleteWorkflow(wf.id)} className="text-gray-400 hover:text-red-500 text-sm">Eliminar</button>
              </div>
            </div>
            )
          })}
        </section>
      )}

      {/* TAB: Secuencias */}
      {activeTab === 'secuencias' && (
        <section className="space-y-4">
          {sequences.length > 0 && (
            <div className="space-y-3">
              {sequences.map(sequence => {
                const first = sequence.steps?.[0]
                return (
                  <div key={sequence.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{sequence.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {sequence.funnel?.name || sequence.serviceTag || 'Todos'} / {sequence.funnelStage?.name || STAGES.find(stage => stage.value === sequence.stage)?.label || 'Contacto creado'} · {sequence.steps?.length || 0} pasos
                        </p>
                        {sequence.runs?.[0] && (
                          <p className="mt-1 text-xs text-gray-400">
                            Última ejecución: {sequence.runs[0].status} · {sequence.runs[0].contact?.name || 'cliente'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleSequence(sequence)} className={`relative h-5 w-10 rounded-full ${sequence.active ? 'bg-green-500' : 'bg-gray-300'}`} aria-label={sequence.active ? 'Desactivar secuencia' : 'Activar secuencia'}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${sequence.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <button onClick={() => editSequence(sequence)} className="text-sm text-blue-600 hover:text-blue-800">Editar</button>
                        <button onClick={() => deleteSequence(sequence)} className="text-sm text-gray-400 hover:text-red-500">Eliminar</button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {sequence.steps?.map((step, index) => (
                        <div key={step.id} className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          <span className="font-medium">Paso {index + 1}</span> · {formatDelay(step.delayDays, step.delayHours, step.delayMinutes)}<br />
                          <span className="text-gray-400">{step.template?.name || 'Sin plantilla'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Secuencia por servicio</h2>
              <p className="text-sm text-gray-500 mt-1">Elige un embudo y la etapa que inicia el seguimiento. Los pasos se ejecutan una sola vez en los tiempos indicados.</p>
            </div>
            <button disabled={saving} onClick={saveSequence} className="px-4 py-2 bg-gtl-navy text-white rounded-lg text-sm font-medium hover:bg-gtl-navy-dark whitespace-nowrap disabled:opacity-50">{saving ? 'Guardando...' : editingWorkflowId ? 'Actualizar secuencia' : 'Crear secuencia'}</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre de la secuencia</label>
              <input value={sequenceName} onChange={e => setSequenceName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Remarketing cursos" />
            </div>
            {!sequenceFunnelId && <div>
              <label className="block text-xs text-gray-500 mb-1">Servicio / etiqueta</label>
              <select value={sequenceServiceTag} onChange={e => setSequenceServiceTag(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {SERVICE_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Embudo</label>
              <select value={sequenceFunnelId} onChange={e => {
                const funnel = funnels.find(item => item.id === e.target.value)
                setSequenceFunnelId(e.target.value)
                setSequenceFunnelStageId(funnel?.stages[0]?.id ?? '')
              }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Sin embudo</option>
                {funnels.map(funnel => <option key={funnel.id} value={funnel.id}>{funnel.name}</option>)}
              </select>
            </div>
            {sequenceTrigger === 'DEAL_STAGE_CHANGED' && sequenceFunnel && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Etapa del embudo</label>
                <select value={sequenceFunnelStageId} onChange={e => setSequenceFunnelStageId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {sequenceFunnel.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Se activa cuando</label>
              <select value={sequenceTrigger} onChange={e => setSequenceTrigger(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="DEAL_STAGE_CHANGED">Deal cambia de etapa</option>
                <option value="CONTACT_CREATED">Contacto creado</option>
              </select>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">Pasos de la secuencia</p>
          <div className="space-y-2">
            {sequenceSteps.map((step, index) => (
              <div key={index} className="grid md:grid-cols-[90px_90px_90px_1fr_auto] gap-3 items-end rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Días</label>
                  <input type="number" min="0" value={step.delayDays} onChange={e => updateSequenceStep(index, { delayDays: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Horas</label>
                  <input type="number" min="0" value={step.delayHours} onChange={e => updateSequenceStep(index, { delayHours: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min</label>
                  <input type="number" min="0" value={step.delayMinutes} onChange={e => updateSequenceStep(index, { delayMinutes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Plantilla del paso {index + 1}</label>
                  <select value={step.templateId} onChange={e => updateSequenceStep(index, { templateId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">Selecciona una plantilla</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <button onClick={() => removeSequenceStep(index)} disabled={sequenceSteps.length <= 1} className="px-3 py-2 text-sm text-gray-400 hover:text-red-500 disabled:opacity-40">Eliminar</button>
              </div>
            ))}
          </div>

          <button onClick={addSequenceStep} className="mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">+ Añadir paso</button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-gray-800">Historial reciente</h2>
            <p className="mt-1 text-sm text-gray-500">Últimas ejecuciones de secuencias por cliente.</p>
            <div className="mt-3 space-y-2">
              {workflowRuns.length === 0 && <p className="text-xs text-gray-400">Todavía no hay ejecuciones registradas.</p>}
              {workflowRuns.slice(0, 12).map(run => (
                <div key={run.id} className="flex flex-col gap-1 rounded-md bg-gray-50 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-gray-700">{run.contact?.name || 'Cliente'} {run.contact?.phone ? `· ${run.contact.phone}` : ''}</span>
                  <span className={`font-semibold ${
                    run.status === 'COMPLETED' ? 'text-green-600' :
                    run.status === 'CANCELLED' ? 'text-amber-600' :
                    run.status === 'FAILED' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>{run.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB: Plantillas */}
      {activeTab === 'plantillas' && (
        <section className="space-y-4">
          <p className="text-xs text-gray-400">
            Variables: <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{empresa}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{ia_mensaje}}'}</code>
          </p>

          {showTplForm && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
              <h3 className="font-medium text-gray-700">{editingTemplateId ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre interno</label>
                <input value={tplName} onChange={e => setTplName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Cotización enviada" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mensaje</label>
                <textarea value={tplBody} onChange={e => setTplBody(e.target.value)} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Hola {{nombre}}, le hemos enviado su cotización... o usa {{ia_mensaje}}" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Adjunto opcional</label>
                <input
                  type="file"
                  accept="image/*,audio/*,video/*,.pdf"
                  onChange={event => {
                    const file = event.target.files?.[0] || null
                    if (file && file.size > 64 * 1024 * 1024) {
                      setNotice('El video supera el límite de 64 MB.')
                      event.target.value = ''
                      return
                    }
                    setTplFile(file)
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700"
                />
                {(tplFile || tplMedia.mediaUrl) && (
                  <div className="mt-2 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <span>Adjunto: {tplFile?.name || tplMedia.mediaName || 'archivo'}</span>
                    <button onClick={() => { setTplFile(null); setTplMedia({}) }} className="text-red-500">Quitar</button>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-400">Imagen, audio, video o PDF. Máximo 64 MB.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={closeTemplateForm} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
                <button disabled={saving} onClick={saveTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          )}

          {templates.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">No hay plantillas creadas.</p>
            </div>
          )}
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg px-4 sm:px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{t.name}</p>
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{t.body}</p>
                {t.mediaUrl && <p className="mt-2 text-xs font-medium text-blue-600">Adjunto: {t.mediaName || t.mediaType || 'archivo'}</p>}
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => editTemplate(t)} className="text-sm text-blue-600 hover:text-blue-800">Editar</button>
                <button onClick={() => deleteTemplate(t.id)} className="text-gray-400 hover:text-red-500 text-sm">Eliminar</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
