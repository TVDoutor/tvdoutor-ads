import { Target, BarChart2, ShieldCheck } from 'lucide-react';

const benefits = [
  {
    name: 'Segmentação Precisa',
    description: 'Direcione sua campanha por especialidade médica, geolocalização e perfil de público para máximo impacto.',
    icon: Target,
    stat: '+1200 Pontos',
    stat_desc: 'Em +370 cidades e 25 estados.'
  },
  {
    name: 'ROI Comprovado',
    description: 'O POC gera ação. Nossas métricas conectam awareness a resultados, como prescrição e adesão ao tratamento.',
    icon: BarChart2,
    stat: '76%',
    stat_desc: 'Dos pacientes agem após ver a publicidade no consultório.'
  },
  {
    name: 'Ambiente de Confiança',
    description: 'Sua marca em um contexto 100% seguro (brand safe), associada a conteúdo de saúde e bem-estar credibilizado por parceiros institucionais.',
    icon: ShieldCheck,
    stat: '99%',
    stat_desc: 'Dos pacientes e acompanhantes aprovam o conteúdo saudável na espera.'
  }
];

export function DataDrivenBenefits() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">A Vantagem Estratégica do Point of Care</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Dados que transformam tempo de espera em tempo de impacto
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Muito além de uma tela: somos um ecossistema de comunicação que educa, influencia e gera resultados mensuráveis no ponto de cuidado.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {benefits.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <feature.icon className="h-5 w-5 flex-none text-indigo-600" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                  <p className="mt-6 text-2xl font-bold text-indigo-900">
                    {feature.stat}
                    <span className="ml-2 text-sm font-medium text-gray-500">{feature.stat_desc}</span>
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
