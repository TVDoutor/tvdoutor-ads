// Configuração de Deploy Automático
export const deployConfig = {
  // URLs de produção
  production: {
    appUrl: 'https://tvdoutor-ads.vercel.app',
    supabaseUrl: 'https://vaogzhwzucijiyvyglls.supabase.co',
    environment: 'production'
  },
  
  // URLs de preview
  preview: {
    appUrl: 'https://tvdoutor-ads-git-main.vercel.app',
    supabaseUrl: 'https://vaogzhwzucijiyvyglls.supabase.co',
    environment: 'preview'
  },
  
  // Configurações de build
  build: {
    outputDir: 'dist',
    sourcemap: false,
    minify: true,
    optimize: true
  },
  
  // Configurações do Vercel
  vercel: {
    projectName: 'tvdoutor-ads',
    teamId: null, // Adicione se necessário
    framework: 'vite'
  },
  
  // Configurações do Supabase
  supabase: {
    projectId: 'vaogzhwzucijiyvyglls',
    region: 'us-east-1'
  }
};

export default deployConfig;
