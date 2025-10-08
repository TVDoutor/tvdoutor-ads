import { AgenciaForm } from '../components/AgenciaForm'
import { DashboardLayout } from '@/components/DashboardLayout'

export default function Agencias() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto grid gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Agências</h1>
          <p className="text-gray-600 mt-2">
            Cadastre, edite e gerencie suas agências parceiras e seus projetos
          </p>
        </div>
        
        <AgenciaForm />
      </div>
    </DashboardLayout>
  )
}