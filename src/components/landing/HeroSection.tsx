import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

const clientLogos = [
  // Linha 1 - Farmacêuticas Globais
  { name: 'Pfizer', src: '/logos/pfizer.svg', category: 'pharma' },
  { name: 'Johnson & Johnson', src: '/logos/jnj.svg', category: 'pharma' },
  { name: 'Sanofi', src: '/logos/sanofi.svg', category: 'pharma' },
  { name: 'GSK', src: '/logos/gsk.svg', category: 'pharma' },
  { name: 'Roche', src: '/logos/roche.svg', category: 'pharma' },
  { name: 'AstraZeneca', src: '/logos/astrazeneca.svg', category: 'pharma' },
  
  // Linha 2 - Consumo e Saúde  
  { name: 'Danone', src: '/logos/danone.svg', category: 'consumer' },
  { name: 'Unilever', src: '/logos/unilever.svg', category: 'consumer' },
  { name: 'Nestlé', src: '/logos/nestle.svg', category: 'consumer' },
  { name: 'Wickbold', src: '/logos/wickbold.svg', category: 'consumer' },
  { name: 'Legrand', src: '/logos/legrand.svg', category: 'consumer' },
  { name: 'P&G', src: '/logos/pg.svg', category: 'consumer' },

  // Linha 3 - Saúde Nacional
  { name: 'Libbs', src: '/logos/libbs.svg', category: 'health-br' },
  { name: 'Fleury', src: '/logos/fleury.svg', category: 'health-br' },
  { name: 'DASA', src: '/logos/dasa.svg', category: 'health-br' },
  { name: 'Amil', src: '/logos/amil.svg', category: 'health-br' },
  { name: 'O Boticário', src: '/logos/oboticario.svg', category: 'health-br' },
  { name: 'Itaú', src: '/logos/itau.svg', category: 'health-br' },

  // Linha 4 - Biotecnologia
  { name: 'AbbVie', src: '/logos/abbvie.svg', category: 'biotech' },
  { name: 'Novo Nordisk', src: '/logos/novo-nordisk.svg', category: 'biotech' },
  { name: 'Janssen', src: '/logos/janssen.svg', category: 'biotech' },
  { name: 'FQM', src: '/logos/fqm.svg', category: 'biotech' },
  { name: 'Grupo DPSP', src: '/logos/grupo-dpsp.svg', category: 'biotech' }
];

const HeroSection = () => {
  return (
    <div className="bg-slate-50">
      {/* Hero Principal */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        {/* Background decorativo */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100 opacity-70" />
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 transform">
            <div className="h-64 w-64 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 opacity-20 blur-3xl" />
          </div>
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 transform">
            <div className="h-96 w-96 rounded-full bg-gradient-to-br from-purple-400 to-blue-600 opacity-20 blur-3xl" />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Sua Marca no Momento da{" "}
              <span className="text-blue-600">Decisão Médica</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              A maior plataforma de Digital Out-of-Home em ambientes de saúde do Brasil. 
              Conecte-se com pacientes e médicos onde a saúde acontece.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700" asChild>
                <Link to="/login">Começar Grátis</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                Falar com um especialista
              </Button>
            </div>
          </div>

          {/* Preview da Plataforma */}
          <div className="mt-16 flow-root sm:mt-24">
            <Card className="overflow-hidden shadow-2xl bg-gradient-to-br from-blue-50 to-slate-100">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-slate-200 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">TV Doutor ADS</h3>
                  <p className="text-gray-600">Plataforma DOOH para ambientes de saúde</p>
                  <div className="mt-4 flex justify-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-100"></div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Seção de Logos dos Clientes */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="text-2xl font-bold leading-8 text-gray-900 mb-4">
              Grandes nomes já estão conosco
            </h2>
            <p className="text-gray-600">
              Líderes globais em saúde, farmacêutica e bem-estar confiam na nossa plataforma
            </p>
          </div>

          {/* Grid Organizado por Categoria */}
          <div className="space-y-12">
            
            {/* Farmacêuticas Globais */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 text-center mb-6 uppercase tracking-wider">
                Farmacêuticas Globais
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center">
                {clientLogos.filter(logo => logo.category === 'pharma').map((logo) => (
                  <div key={logo.name} className="flex justify-center">
                    <img
                      className="h-10 w-auto object-contain transition-all duration-300 hover:scale-110"
                      src={logo.src}
                      alt={logo.name}
                      title={logo.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs font-medium text-gray-500 text-center block">${logo.name}</span>`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Consumo e Saúde */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 text-center mb-6 uppercase tracking-wider">
                Consumo e Bem-Estar
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center">
                {clientLogos.filter(logo => logo.category === 'consumer').map((logo) => (
                  <div key={logo.name} className="flex justify-center">
                    <img
                      className="h-10 w-auto object-contain transition-all duration-300 hover:scale-110"
                      src={logo.src}
                      alt={logo.name}
                      title={logo.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs font-medium text-gray-500 text-center block">${logo.name}</span>`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Saúde Nacional */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 text-center mb-6 uppercase tracking-wider">
                Saúde Nacional
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center">
                {clientLogos.filter(logo => logo.category === 'health-br').map((logo) => (
                  <div key={logo.name} className="flex justify-center">
                    <img
                      className="h-10 w-auto object-contain transition-all duration-300 hover:scale-110"
                      src={logo.src}
                      alt={logo.name}
                      title={logo.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs font-medium text-gray-500 text-center block">${logo.name}</span>`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Biotecnologia */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 text-center mb-6 uppercase tracking-wider">
                Biotecnologia e Especialidades
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center">
                {clientLogos.filter(logo => logo.category === 'biotech').map((logo) => (
                  <div key={logo.name} className="flex justify-center">
                    <img
                      className="h-10 w-auto object-contain transition-all duration-300 hover:scale-110"
                      src={logo.src}
                      alt={logo.name}
                      title={logo.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs font-medium text-gray-500 text-center block">${logo.name}</span>`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Estatística Final */}
          <div className="mt-16 text-center">
            <Card className="inline-block p-6 bg-blue-50 border-blue-200">
              <p className="text-2xl font-bold text-blue-900">23+ Grandes Marcas</p>
              <p className="text-blue-700 text-sm">Confiam na TV Doutor para suas campanhas de saúde</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;