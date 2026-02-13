'use client'

import { useEffect, useState } from 'react'
import { listarProjetosPorAgencia } from '../lib/agencia-service'

export function ProjetoSelect({ 
  agenciaId, 
  value, 
  onChange 
}: { 
  agenciaId?: string | null; 
  value?: string | null; 
  onChange: (id: string | null) => void 
}) {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!agenciaId) {
        setOptions([])
        onChange(null)
        return
      }
      setLoading(true)
      try {
        const list = await listarProjetosPorAgencia(agenciaId)
        setOptions(list.map((p) => ({ 
          id: p.id, 
          label: `${p.nome_projeto} (Deal: ${p.nome_deal})` 
        })))
      } catch (error) {
        console.error('Erro ao carregar projetos:', error)
        setOptions([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [agenciaId, onChange])

  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium">Projeto</label>
      <select
        className="border p-2 rounded w-full"
        disabled={!agenciaId || loading}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">
          {!agenciaId 
            ? 'Selecione uma agência primeiro' 
            : 'Selecione um projeto'
          }
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-gray-500">Carregando projetos...</span>}
      {agenciaId && options.length === 0 && !loading && (
        <span className="text-xs text-gray-500">Nenhum projeto encontrado para esta agência</span>
      )}
    </div>
  )
}
