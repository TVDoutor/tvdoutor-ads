import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

interface DiagnosticResult {
  category: string;
  test: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

class CLIDiagnostics {
  private supabase: any;
  private results: DiagnosticResult[] = [];

  constructor() {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  private addResult(category: string, test: string, status: 'success' | 'warning' | 'error', message: string, details?: any) {
    this.results.push({
      category,
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Teste de configurações de ambiente
  testEnvironmentConfig(): void {
    console.log('🔍 Verificando configurações de ambiente...');
    
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const envPath = path.join(process.cwd(), '.env');
    const envExists = fs.existsSync(envPath);
    
    if (!envExists) {
      this.addResult('Environment', '.env File', 'error', 
        'Arquivo .env não encontrado na raiz do projeto');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const missingVars: string[] = [];
    const presentVars: string[] = [];

    requiredEnvVars.forEach(varName => {
      if (envContent.includes(varName) && process.env[varName]) {
        presentVars.push(varName);
      } else {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      this.addResult('Environment', 'Required Variables', 'error', 
        `Variáveis ausentes: ${missingVars.join(', ')}`, { missingVars });
    } else {
      this.addResult('Environment', 'Required Variables', 'success', 
        'Todas as variáveis necessárias estão presentes', { presentVars });
    }
  }

  // Teste de conectividade com Supabase
  async testSupabaseConnection(): Promise<void> {
    if (!this.supabase) {
      this.addResult('Database', 'Supabase Connection', 'error', 
        'Cliente Supabase não inicializado - verifique as variáveis de ambiente');
      return;
    }

    try {
      console.log('🔍 Testando conexão com Supabase...');
      
      const { data, error } = await this.supabase
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

  // Teste de tabelas críticas
  async testCriticalTables(): Promise<void> {
    if (!this.supabase) return;

    const criticalTables = [
      'profiles', 'agencias', 'agencia_projetos', 'agencia_deals', 
      'agencia_contatos', 'email_stats', 'propostas', 'screens'
    ];

    for (const table of criticalTables) {
      try {
        console.log(`🔍 Verificando tabela: ${table}`);
        
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116') {
            this.addResult('Database', `Table ${table}`, 'error', 
              `Tabela ${table} não existe ou sem permissões`, error);
          } else {
            this.addResult('Database', `Table ${table}`, 'warning', 
              `Problema ao acessar ${table}: ${error.message}`, error);
          }
        } else {
          this.addResult('Database', `Table ${table}`, 'success', 
            `Tabela ${table} acessível`);
        }
      } catch (error) {
        this.addResult('Database', `Table ${table}`, 'error', 
          `Erro crítico ao verificar ${table}: ${error}`, error);
      }
    }
  }

  // Teste de arquivos críticos
  testCriticalFiles(): void {
    console.log('🔍 Verificando arquivos críticos...');
    
    const criticalFiles = [
      'src/lib/agencia-service.ts',
      'src/lib/email-service.ts',
      'src/contexts/AuthContext.tsx',
      'src/utils/error-handler.ts',
      'src/utils/secureLogger.ts',
      'supabase/migrations/20250106000000_add_debug_functions.sql'
    ];

    criticalFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        this.addResult('Files', `File ${path.basename(filePath)}`, 'success', 
          `Arquivo ${filePath} existe`);
      } else {
        this.addResult('Files', `File ${path.basename(filePath)}`, 'error', 
          `Arquivo ${filePath} não encontrado`);
      }
    });
  }

  // Executar diagnóstico completo
  async runFullDiagnostic(): Promise<void> {
    console.log('🚀 Iniciando diagnóstico completo via CLI...');
    
    this.results = [];
    const startTime = Date.now();

    // Executar todos os testes
    this.testEnvironmentConfig();
    this.testCriticalFiles();
    await this.testSupabaseConnection();
    await this.testCriticalTables();

    const executionTime = Date.now() - startTime;
    this.generateReport(executionTime);
  }

  // Gerar relatório
  private generateReport(executionTime: number): void {
    const summary = {
      total: this.results.length,
      success: this.results.filter(r => r.status === 'success').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      errors: this.results.filter(r => r.status === 'error').length,
      executionTime
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE DIAGNÓSTICO DO SISTEMA');
    console.log('='.repeat(60));
    console.log(`⏱️ Tempo de execução: ${executionTime}ms`);
    console.log(`📈 Total de testes: ${summary.total}`);
    console.log(`✅ Sucessos: ${summary.success}`);
    console.log(`⚠️ Avisos: ${summary.warnings}`);
    console.log(`❌ Erros: ${summary.errors}`);
    
    console.log('\n📋 RESULTADOS DETALHADOS:');
    
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n🔍 ${category}:`);
      const categoryResults = this.results.filter(r => r.category === category);
      
      categoryResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : 
                    result.status === 'warning' ? '⚠️' : '❌';
        console.log(`  ${icon} ${result.test}: ${result.message}`);
        
        if (result.details && result.status === 'error') {
          console.log(`    📝 Detalhes:`, result.details);
        }
      });
    });

    // Salvar relatório em arquivo
    const report = {
      summary,
      results: this.results,
      timestamp: new Date().toISOString()
    };

    const reportPath = path.join(process.cwd(), 'diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Relatório salvo em: ${reportPath}`);
    
    console.log('\n' + '='.repeat(60));
  }
}

// Executar diagnóstico se chamado diretamente
if (require.main === module) {
  const diagnostics = new CLIDiagnostics();
  diagnostics.runFullDiagnostic().catch(console.error);
}

export { CLIDiagnostics };