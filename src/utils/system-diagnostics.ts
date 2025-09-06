import { supabase } from '../integrations/supabase/client';
import { secureLogger } from './secureLogger';

// Interfaces para os resultados do diagnóstico
interface DiagnosticResult {
  category: string;
  test: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: unknown;
  timestamp: string;
}

interface DiagnosticReport {
  summary: {
    total: number;
    success: number;
    warnings: number;
    errors: number;
    executionTime: number;
  };
  results: DiagnosticResult[];
  recommendations: string[];
  timestamp: string;
}

class SystemDiagnostics {
  private results: DiagnosticResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  private addResult(category: string, test: string, status: 'success' | 'warning' | 'error', message: string, details?: unknown) {
    this.results.push({
      category,
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Teste de conectividade com Supabase
  async testSupabaseConnection(): Promise<void> {
    try {
      console.log('🔍 [DIAGNÓSTICO] Testando conexão com Supabase...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        this.addResult('Database', 'Supabase Connection', 'error', 
          `Erro na conexão: ${error.message}`, error);
      } else {
        this.addResult('Database', 'Supabase Connection', 'success', 
          'Conexão com Supabase estabelecida com sucesso');
      }
    } catch (error) {
      this.addResult('Database', 'Supabase Connection', 'error', 
        `Erro crítico na conexão: ${error}`, error);
    }
  }

  // Teste de existência de tabelas críticas
  async testCriticalTables(): Promise<void> {
    const criticalTables = [
      'profiles', 'agencias', 'agencia_projetos', 'agencia_deals', 
      'agencia_contatos', 'email_stats', 'propostas', 'screens'
    ];

    for (const table of criticalTables) {
      try {
        console.log(`🔍 [DIAGNÓSTICO] Verificando tabela: ${table}`);
        
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116') {
            this.addResult('Database', `Table ${table}`, 'error', 
              `Tabela ${table} não existe ou não tem permissões`, error);
          } else {
            this.addResult('Database', `Table ${table}`, 'warning', 
              `Problema ao acessar tabela ${table}: ${error.message}`, error);
          }
        } else {
          this.addResult('Database', `Table ${table}`, 'success', 
            `Tabela ${table} acessível`);
        }
      } catch (error) {
        this.addResult('Database', `Table ${table}`, 'error', 
          `Erro crítico ao verificar tabela ${table}: ${error}`, error);
      }
    }
  }

  // Teste de funções do banco de dados
  async testDatabaseFunctions(): Promise<void> {
    const functions = [
      { name: 'check_table_exists', params: ['profiles'] },
      { name: 'get_user_role', params: [] }
    ];

    for (const func of functions) {
      try {
        console.log(`🔍 [DIAGNÓSTICO] Testando função: ${func.name}`);
        
        const { data, error } = await supabase.rpc(func.name, 
          func.params.length > 0 ? { table_name: func.params[0] } : {});

        if (error) {
          this.addResult('Database', `Function ${func.name}`, 'error', 
            `Erro na função ${func.name}: ${error.message}`, error);
        } else {
          this.addResult('Database', `Function ${func.name}`, 'success', 
            `Função ${func.name} executada com sucesso`, data);
        }
      } catch (error) {
        this.addResult('Database', `Function ${func.name}`, 'error', 
          `Erro crítico na função ${func.name}: ${error}`, error);
      }
    }
  }

  // Teste de autenticação
  async testAuthentication(): Promise<void> {
    try {
      console.log('🔍 [DIAGNÓSTICO] Verificando autenticação...');
      
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        this.addResult('Authentication', 'Session Check', 'error', 
          `Erro ao verificar sessão: ${error.message}`, error);
      } else if (!session) {
        this.addResult('Authentication', 'Session Check', 'warning', 
          'Nenhuma sessão ativa encontrada');
      } else {
        this.addResult('Authentication', 'Session Check', 'success', 
          `Sessão ativa para usuário: ${session.user.email}`, {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at
          });
      }
    } catch (error) {
      this.addResult('Authentication', 'Session Check', 'error', 
        `Erro crítico na autenticação: ${error}`, error);
    }
  }

  // Teste de serviços da aplicação
  async testApplicationServices(): Promise<void> {
    // Teste do serviço de agências
    try {
      console.log('🔍 [DIAGNÓSTICO] Testando serviço de agências...');
      
      const { listarAgencias } = await import('../lib/agencia-service');
      const agencias = await listarAgencias();
      
      this.addResult('Services', 'Agencia Service', 'success', 
        `Serviço de agências funcionando. ${agencias.length} agências encontradas`);
    } catch (error) {
      this.addResult('Services', 'Agencia Service', 'error', 
        `Erro no serviço de agências: ${error}`, error);
    }

    // Teste do serviço de email
    try {
      console.log('🔍 [DIAGNÓSTICO] Testando serviço de email...');
      
      const { emailService } = await import('../lib/email-service');
      const stats = await emailService.getEmailStats();
      
      this.addResult('Services', 'Email Service', 'success', 
        'Serviço de email funcionando', stats);
    } catch (error) {
      this.addResult('Services', 'Email Service', 'error', 
        `Erro no serviço de email: ${error}`, error);
    }
  }

  // Teste de configurações de ambiente
  testEnvironmentConfig(): void {
    console.log('🔍 [DIAGNÓSTICO] Verificando configurações de ambiente...');
    
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const missingVars: string[] = [];
    const presentVars: string[] = [];

    requiredEnvVars.forEach(varName => {
      if (import.meta.env[varName]) {
        presentVars.push(varName);
      } else {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      this.addResult('Environment', 'Required Variables', 'error', 
        `Variáveis de ambiente ausentes: ${missingVars.join(', ')}`, { missingVars });
    } else {
      this.addResult('Environment', 'Required Variables', 'success', 
        `Todas as variáveis de ambiente necessárias estão presentes`, { presentVars });
    }

    // Verificar se as URLs estão válidas
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        new URL(supabaseUrl);
        this.addResult('Environment', 'Supabase URL', 'success', 
          'URL do Supabase é válida');
      } catch {
        this.addResult('Environment', 'Supabase URL', 'error', 
          'URL do Supabase é inválida');
      }
    }
  }

  // Executar diagnóstico completo
  async runFullDiagnostic(): Promise<DiagnosticReport> {
    console.log('🚀 [DIAGNÓSTICO] Iniciando diagnóstico completo do sistema...');
    
    this.results = [];
    this.startTime = Date.now();

    // Executar todos os testes
    this.testEnvironmentConfig();
    await this.testSupabaseConnection();
    await this.testCriticalTables();
    await this.testDatabaseFunctions();
    await this.testAuthentication();
    await this.testApplicationServices();

    return this.generateReport();
  }

  // Executar diagnóstico rápido (apenas testes críticos)
  async runQuickDiagnostic(): Promise<DiagnosticReport> {
    console.log('⚡ [DIAGNÓSTICO] Iniciando diagnóstico rápido...');
    
    this.results = [];
    this.startTime = Date.now();

    this.testEnvironmentConfig();
    await this.testSupabaseConnection();
    await this.testAuthentication();

    return this.generateReport();
  }

  // Gerar relatório final
  private generateReport(): DiagnosticReport {
    const executionTime = Date.now() - this.startTime;
    const summary = {
      total: this.results.length,
      success: this.results.filter(r => r.status === 'success').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      errors: this.results.filter(r => r.status === 'error').length,
      executionTime
    };

    const recommendations = this.generateRecommendations();

    const report: DiagnosticReport = {
      summary,
      results: this.results,
      recommendations,
      timestamp: new Date().toISOString()
    };

    // Salvar no localStorage para análise posterior
    try {
      localStorage.setItem('system-diagnostic-report', JSON.stringify(report));
    } catch (error) {
      console.warn('Não foi possível salvar o relatório no localStorage:', error);
    }

    return report;
  }

  // Gerar recomendações baseadas nos resultados
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const errors = this.results.filter(r => r.status === 'error');
    const warnings = this.results.filter(r => r.status === 'warning');

    if (errors.length > 0) {
      recommendations.push(`🚨 ${errors.length} erro(s) crítico(s) encontrado(s) que precisam de atenção imediata`);
      
      const dbErrors = errors.filter(r => r.category === 'Database');
      if (dbErrors.length > 0) {
        recommendations.push('🔧 Verificar configurações do banco de dados e executar migrações pendentes');
      }

      const authErrors = errors.filter(r => r.category === 'Authentication');
      if (authErrors.length > 0) {
        recommendations.push('🔐 Verificar configurações de autenticação e políticas RLS');
      }

      const serviceErrors = errors.filter(r => r.category === 'Services');
      if (serviceErrors.length > 0) {
        recommendations.push('⚙️ Revisar implementação dos serviços da aplicação');
      }
    }

    if (warnings.length > 0) {
      recommendations.push(`⚠️ ${warnings.length} aviso(s) encontrado(s) que podem afetar o desempenho`);
    }

    if (errors.length === 0 && warnings.length === 0) {
      recommendations.push('✅ Sistema funcionando corretamente. Nenhuma ação necessária.');
    }

    return recommendations;
  }

  // Método para imprimir relatório formatado no console
  static printReport(report: DiagnosticReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE DIAGNÓSTICO DO SISTEMA');
    console.log('='.repeat(60));
    console.log(`⏱️ Tempo de execução: ${report.summary.executionTime}ms`);
    console.log(`📈 Total de testes: ${report.summary.total}`);
    console.log(`✅ Sucessos: ${report.summary.success}`);
    console.log(`⚠️ Avisos: ${report.summary.warnings}`);
    console.log(`❌ Erros: ${report.summary.errors}`);
    console.log('\n📋 RESULTADOS DETALHADOS:');
    
    const categories = [...new Set(report.results.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n🔍 ${category}:`);
      const categoryResults = report.results.filter(r => r.category === category);
      
      categoryResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : 
                    result.status === 'warning' ? '⚠️' : '❌';
        console.log(`  ${icon} ${result.test}: ${result.message}`);
        
        if (result.details && result.status === 'error') {
          console.log(`    📝 Detalhes:`, result.details);
        }
      });
    });

    console.log('\n💡 RECOMENDAÇÕES:');
    report.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });
    
    console.log('\n' + '='.repeat(60));
  }
}

// Funções de conveniência para uso direto
export async function runFullSystemDiagnostic(): Promise<DiagnosticReport> {
  const diagnostics = new SystemDiagnostics();
  const report = await diagnostics.runFullDiagnostic();
  SystemDiagnostics.printReport(report);
  return report;
}

export async function runQuickSystemDiagnostic(): Promise<DiagnosticReport> {
  const diagnostics = new SystemDiagnostics();
  const report = await diagnostics.runQuickDiagnostic();
  SystemDiagnostics.printReport(report);
  return report;
}

export { SystemDiagnostics };
export type { DiagnosticResult, DiagnosticReport };