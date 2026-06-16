'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [testEmail, setTestEmail] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  async function sendTest() {
    if (!testEmail) return
    setTestStatus('sending')
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      })
      setTestStatus(res.ok ? 'ok' : 'error')
    } catch {
      setTestStatus('error')
    }
    setTimeout(() => setTestStatus('idle'), 4000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Parámetros del sistema GTL Rate Manager</p>
      </div>

      {/* Email notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-1">Email de Notificaciones</h2>
        <p className="text-xs text-gray-400 mb-4">
          Cuando el estado de una cotización cambia, se envía un email al cliente automáticamente (si tiene email registrado).
        </p>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Proveedor</span>
            <span className="text-sm font-medium text-gray-800">Resend (resend.com)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Variable de entorno</span>
            <span className="text-sm font-mono text-gray-700">RESEND_API_KEY</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Email remitente</span>
            <span className="text-sm font-mono text-gray-700">EMAIL_FROM</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-5">
          <strong>Para activar:</strong> Agrega <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> en las variables de entorno de Vercel.
          Regístrate en <strong>resend.com</strong> para obtener una API key gratuita (100 emails/día).
          Luego agrega <code className="bg-amber-100 px-1 rounded">EMAIL_FROM</code> con el remitente verificado, ej: <em>GTL Rate &lt;noreply@tudominio.com&gt;</em>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Enviar email de prueba</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d2d6b]"
            />
            <button
              onClick={sendTest}
              disabled={testStatus === 'sending' || !testEmail}
              className="px-4 py-2 text-sm font-medium bg-[#0d2d6b] text-white rounded-lg hover:bg-[#0a2456] disabled:opacity-50 transition-colors"
            >
              {testStatus === 'sending' ? 'Enviando...' : 'Enviar prueba'}
            </button>
          </div>
          {testStatus === 'ok' && <p className="text-green-600 text-xs mt-2">Email enviado correctamente.</p>}
          {testStatus === 'error' && <p className="text-red-600 text-xs mt-2">Error al enviar. Verifica que RESEND_API_KEY esté configurado.</p>}
        </div>
      </div>

      {/* Version info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Versión</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span>GTL Rate Manager</span><span className="font-mono text-gray-400">v0.3.0</span></div>
          <div className="flex justify-between"><span>Sprint</span><span className="text-gray-400">Sprint 3</span></div>
        </div>
      </div>
    </div>
  )
}
