'use client'

import { useEffect, useState } from 'react'
import { listarAgencias } from '../lib/agencia-service'
import type { Agencia } from '../types'

export function AgenciaSelect({ value, onChange }: { value?: string | null; onChange: (id: string | null) => void }) {
  const [lista, setLista] = useState<Agencia[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await listarAgencias()
        setLista(data)
      } catch (error) {
        console.error('Erro ao carregar agências:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium">Agência</label>
      <select 
        className="border p-2 rounded w-full" 
        value={value ?? ''} 
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
      >
        <option value="">Selecione uma agência</option>
        {lista.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome_agencia} ({a.codigo_agencia})
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-gray-500">Carregando agências...</span>}
    </div>
  )
}
