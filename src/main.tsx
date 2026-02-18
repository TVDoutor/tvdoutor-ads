import { createRoot } from 'react-dom/client'
import './index.css'

// Verificar variáveis de ambiente ANTES de carregar o App (evita tela em branco)
const hasSupabaseConfig = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!hasSupabaseConfig) {
  const root = document.getElementById("root")!;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;padding:24px;background:#f8fafc">
      <div style="max-width:480px;background:white;padding:32px;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border:1px solid #e2e8f0">
        <h1 style="color:#dc2626;font-size:20px;margin:0 0 16px">⚠️ Configuração necessária</h1>
        <p style="color:#475569;line-height:1.6;margin:0 0 16px">
          As variáveis de ambiente do Supabase não estão configuradas. Crie um arquivo <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">.env</code> na raiz do projeto com:
        </p>
        <pre style="background:#f1f5f9;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;margin:0 0 16px">VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui</pre>
        <p style="color:#64748b;font-size:14px;margin:0">
          Depois execute <code style="background:#f1f5f9;padding:2px 6px">npm run dev</code> novamente.
        </p>
      </div>
    </div>
  `;
} else {
  import('./App.tsx').then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(<App />);
  }).catch((err) => {
    console.error('Erro ao carregar aplicação:', err);
    document.getElementById("root")!.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;padding:24px;background:#fef2f2">
        <div style="max-width:480px;padding:32px;text-align:center">
          <h1 style="color:#dc2626;margin-bottom:16px">Erro ao carregar</h1>
          <p style="color:#991b1b;margin-bottom:16px">${String(err?.message || err)}</p>
          <p style="color:#64748b;font-size:14px">Verifique o Console (F12) para mais detalhes.</p>
        </div>
      </div>
    `;
  });
}
