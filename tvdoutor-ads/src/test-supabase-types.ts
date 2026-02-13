/**
 * Teste rápido para validar que os tipos do Supabase estão funcionando
 * Execute: npx ts-node src/test-supabase-types.ts
 */

import type { Views, Tables } from './integrations/supabase/client';

// ✅ Teste 1: Verificar se conseguimos importar tipos de Views
type EmailStats = Views<'email_stats'>;
type AuditAgencias = Views<'_audit_agencias_state_unmapped'>;

// ✅ Teste 2: Verificar se conseguimos importar tipos de Tables
type Usuarios = Tables<'usuarios'>;
type Propostas = Tables<'propostas'>;

// ✅ Teste 3: Criar função tipada que usa View
function processarEmailStats(stats: EmailStats[]) {
  return stats.map(stat => ({
    tipo: stat.email_type,
    total: stat.total,
    ultimos7Dias: stat.last_7_days
  }));
}

// ✅ Teste 4: Criar função tipada que usa Table
function processarProposta(proposta: Propostas) {
  return {
    id: proposta.id,
    titulo: proposta.titulo,
    status: proposta.status,
    valorTotal: proposta.valor_total
  };
}

// ✅ Teste 5: Verificar tipagem de campos nullable
function verificarCamposNullaveis(audit: AuditAgencias) {
  // Estes campos são nullable, então TypeScript permite undefined/null
  const cidade: string | null = audit.cidade;
  const estado: string | null = audit.raw_estado;
  
  // TypeScript força verificação de null antes de usar
  if (cidade) {
    console.log(`Cidade: ${cidade.toUpperCase()}`);
  }
  
  return { cidade, estado };
}

console.log('✅ Todos os tipos estão funcionando corretamente!');
console.log('📋 Views disponíveis testadas:');
console.log('   - email_stats');
console.log('   - _audit_agencias_state_unmapped');
console.log('📋 Tables disponíveis testadas:');
console.log('   - usuarios');
console.log('   - propostas');
console.log('');
console.log('🎉 Supabase CLI está funcionando perfeitamente!');
console.log('💡 Agora você pode usar npm run types:update sempre que modificar o banco de dados');

export { processarEmailStats, processarProposta, verificarCamposNullaveis };
