'use client'

import { useEffect, useState } from 'react'
import type { Agencia } from '../types'
import { criarAgencia, atualizarAgencia, listarAgencias, excluirAgencia } from '../lib/agencia-service'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function AgenciaForm() {
  const [lista, setLista] = useState<Agencia[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Partial<Agencia>>({ taxa_porcentagem: 0 })
  const [criarDealPadrao, setCriarDealPadrao] = useState(true)
  const [agenciaToDelete, setAgenciaToDelete] = useState<Agencia | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await listarAgencias()
      setLista(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    
    // Tratar campos numéricos especificamente
    if (name === 'taxa_porcentagem') {
      const numericValue = value === '' ? 0 : parseFloat(value) || 0
      setForm((s) => ({ ...s, [name]: numericValue }))
    } else {
      setForm((s) => ({ ...s, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Validações obrigatórias
      if (!form.nome_agencia?.trim()) {
        alert('Nome da agência é obrigatório')
        return
      }
      
      if (!form.cnpj?.trim()) {
        alert('CNPJ é obrigatório')
        return
      }
      
      // Validação básica de CNPJ (apenas números e tamanho)
      const cnpjNumbers = form.cnpj.replace(/\D/g, '')
      if (cnpjNumbers.length !== 14) {
        alert('CNPJ deve conter 14 dígitos')
        return
      }
      
      // Validação de email se fornecido
      if (form.email_empresa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_empresa)) {
        alert('Email inválido')
        return
      }
      
      // Validação de taxa
      if (form.taxa_porcentagem && (form.taxa_porcentagem < 0 || form.taxa_porcentagem > 100)) {
        alert('Taxa deve estar entre 0 e 100%')
        return
      }
      if (form.id) {
        await atualizarAgencia(form.id, form)
      } else {
        await criarAgencia(form, criarDealPadrao)
      }
      setForm({ taxa_porcentagem: 0 })
      await load()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleEdit(a: Agencia) {
    setForm(a)
  }

  const handleDeleteClick = (agencia: Agencia) => {
    setAgenciaToDelete(agencia)
  }

  const handleConfirmDelete = async () => {
    if (!agenciaToDelete) return
    
    setLoading(true)
    try {
      await excluirAgencia(agenciaToDelete.id)
      await load()
      setAgenciaToDelete(null)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-3 p-4 border rounded-2xl">
        <h2 className="text-xl font-semibold">Agência - Cadastro / Edição</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input 
            name="codigo_agencia" 
            value={form.codigo_agencia ?? ''} 
            onChange={handleChange} 
            placeholder="Código (A000) — deixe vazio para gerar" 
            className="border p-2 rounded" 
          />
          <input 
            name="nome_agencia" 
            value={form.nome_agencia ?? ''} 
            onChange={handleChange} 
            placeholder="Nome da Agência *" 
            className="border p-2 rounded" 
          />
          <input 
            name="cnpj" 
            value={form.cnpj ?? ''} 
            onChange={handleChange} 
            placeholder="CNPJ *" 
            className="border p-2 rounded" 
          />
          <input 
            name="site" 
            value={form.site ?? ''} 
            onChange={handleChange} 
            placeholder="Site" 
            className="border p-2 rounded" 
          />
          <input 
            name="cidade" 
            value={form.cidade ?? ''} 
            onChange={handleChange} 
            placeholder="Cidade" 
            className="border p-2 rounded" 
          />
          <input 
            name="estado" 
            value={form.estado ?? ''} 
            onChange={handleChange} 
            placeholder="Estado" 
            className="border p-2 rounded" 
          />
          <input 
            name="email_empresa" 
            value={form.email_empresa ?? ''} 
            onChange={handleChange} 
            placeholder="E-mail" 
            className="border p-2 rounded" 
          />
          <input 
            name="telefone_empresa" 
            value={form.telefone_empresa ?? ''} 
            onChange={handleChange} 
            placeholder="Telefone" 
            className="border p-2 rounded" 
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">Taxa (%)</label>
            <input 
              name="taxa_porcentagem" 
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.taxa_porcentagem ?? 0} 
              onChange={handleChange} 
              placeholder="0" 
              className="border p-2 rounded" 
            />
          </div>
        </div>
        {!form.id && (
          <label className="inline-flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={criarDealPadrao} 
              onChange={(e) => setCriarDealPadrao(e.target.checked)} 
            />
            <span>Criar Deal Principal automaticamente</span>
          </label>
        )}
        <div className="flex gap-2">
          <button 
            disabled={loading} 
            className="px-4 py-2 rounded bg-black text-white"
          >
            {form.id ? 'Atualizar' : 'Salvar'}
          </button>
          <button 
            type="button" 
            onClick={() => setForm({ taxa_porcentagem: 0 })} 
            className="px-4 py-2 rounded border"
          >
            Limpar
          </button>
        </div>
      </form>

      <div className="p-4 border rounded-2xl">
        <h3 className="text-lg font-semibold mb-3">Agências</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Código</th>
                <th className="p-2">Nome</th>
                <th className="p-2">CNPJ</th>
                <th className="p-2">Cidade</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Email</th>
                <th className="p-2">Telefone</th>
                <th className="p-2">Taxa (%)</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{a.codigo_agencia}</td>
                  <td className="p-2">{a.nome_agencia}</td>
                  <td className="p-2">{a.cnpj}</td>
                  <td className="p-2">{a.cidade}</td>
                  <td className="p-2">{a.estado}</td>
                  <td className="p-2">{a.email_empresa}</td>
                  <td className="p-2">{a.telefone_empresa}</td>
                  <td className="p-2">{a.taxa_porcentagem ?? 0}</td>
                  <td className="p-2 flex gap-2">
                    <button 
                      className="px-2 py-1 border rounded" 
                      onClick={() => handleEdit(a)}
                    >
                      Editar
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(a)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a agência <strong>{agenciaToDelete?.nome_agencia}</strong>?
                            <br />
                            <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setAgenciaToDelete(null)}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={loading}
                          >
                            {loading ? 'Excluindo...' : 'Excluir Agência'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
