// Configuração de produção para fallback quando variáveis de ambiente não estão disponíveis
export const productionConfig = {
  supabase: {
    url: 'https://vaogzhwzucijiyvyglls.supabase.co',
    // A chave anônima será obtida das variáveis de ambiente
    // Se não estiver disponível, mostrará erro específico
  },
  app: {
    name: 'TV Doutor ADS',
    version: '1.1.0',
  }
};

// Função para verificar se as variáveis de ambiente estão configuradas
export const validateEnvironment = () => {
  const missingVars: string[] = [];
  
  if (!import.meta.env.VITE_SUPABASE_URL) {
    missingVars.push('VITE_SUPABASE_URL');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    missingVars.push('VITE_SUPABASE_ANON_KEY');
  }
  
  if (missingVars.length > 0) {
    console.error('🚨 Variáveis de ambiente não configuradas:', missingVars);
    console.error('📋 Configure as variáveis na Vercel: Settings → Environment Variables');
    return false;
  }
  
  return true;
};
