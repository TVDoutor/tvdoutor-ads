# Sistema de Equipes com Funções - Documentação

## Visão Geral

O sistema de equipes foi atualizado para incluir quatro funções hierárquicas distintas:

- **Membro**: Acesso básico ao projeto
- **Coordenador**: Responsável por organizar atividades
- **Gerente**: Responsabilidades de gestão e tomada de decisões
- **Diretor**: Autoridade máxima no projeto

## Estrutura do Banco de Dados

### Tabela `agencia_projeto_equipe`

```sql
CREATE TABLE agencia_projeto_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES agencia_projetos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  papel VARCHAR(50) DEFAULT 'membro' CHECK (papel IN ('membro', 'coordenador', 'gerente', 'diretor')),
  data_entrada DATE DEFAULT CURRENT_DATE,
  data_saida DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(projeto_id, usuario_id)
);
```

### Views Criadas

1. **`vw_equipe_projeto_completa`**: View completa com dados dos membros, projeto e agência
2. **`vw_projetos_completos`**: View atualizada com contadores por função
3. **`get_equipe_stats`**: Função para obter estatísticas de equipe por projeto

## Componentes React

### 1. TeamMemberForm

Componente para adicionar novos membros à equipe com seleção de função.

**Características:**
- Busca de usuários disponíveis
- Seleção visual de função com ícones e cores
- Validação de usuários já existentes na equipe
- Interface intuitiva com resumo da seleção

**Uso:**
```tsx
<TeamMemberForm
  projetoId="uuid-do-projeto"
  projetoNome="Nome do Projeto"
  onMemberAdded={() => console.log('Membro adicionado')}
  onClose={() => setShowModal(false)}
/>
```

### 2. ProjectTeamManager

Componente completo para gerenciar a equipe de um projeto.

**Características:**
- Estatísticas da equipe por função
- Lista de membros com funções visuais
- Alteração de função inline
- Remoção de membros
- Integração com TeamMemberForm

**Uso:**
```tsx
<ProjectTeamManager
  projetoId="uuid-do-projeto"
  projetoNome="Nome do Projeto"
  onTeamUpdate={() => console.log('Equipe atualizada')}
/>
```

## Serviços TypeScript

### equipeService

Serviço completo para gerenciar equipes com as novas funcionalidades:

```typescript
// Adicionar membro
await equipeService.adicionarMembro(supabase, {
  projeto_id: 'uuid',
  usuario_id: 'uuid',
  papel: 'coordenador',
  data_entrada: '2024-01-20'
});

// Listar equipe com dados completos
const equipe = await equipeService.listarPorProjeto(supabase, 'projeto-id');

// Obter estatísticas
const stats = await equipeService.obterEstatisticas(supabase, 'projeto-id');

// Verificar se usuário já está na equipe
const existe = await equipeService.verificarMembroExistente(supabase, 'projeto-id', 'usuario-id');
```

## Tipos TypeScript

### FuncaoEquipe
```typescript
export type FuncaoEquipe = 'membro' | 'coordenador' | 'gerente' | 'diretor';
```

### EstatisticasEquipe
```typescript
export interface EstatisticasEquipe {
  total_membros: number;
  total_coordenadores: number;
  total_gerentes: number;
  total_diretores: number;
  membros_ativos: number;
}
```

### EquipeCompleta
```typescript
export interface EquipeCompleta extends Equipe {
  nome_projeto: string;
  status_projeto: string;
  cliente_final: string;
  nome_agencia: string;
  codigo_agencia: string;
  nome_deal: string;
  nivel_hierarquia: number;
  status_membro: string;
}
```

## Configuração Visual das Funções

Cada função possui uma configuração visual única:

```typescript
const FUNCOES_CONFIG = {
  membro: {
    label: 'Membro',
    icon: User,
    color: 'bg-blue-100 text-blue-800',
    description: 'Membro da equipe com acesso básico ao projeto'
  },
  coordenador: {
    label: 'Coordenador',
    icon: Target,
    color: 'bg-green-100 text-green-800',
    description: 'Coordenador responsável por organizar atividades'
  },
  gerente: {
    label: 'Gerente',
    icon: Shield,
    color: 'bg-purple-100 text-purple-800',
    description: 'Gerente com responsabilidades de gestão e tomada de decisões'
  },
  diretor: {
    label: 'Diretor',
    icon: Crown,
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Diretor com autoridade máxima no projeto'
  }
};
```

## Migração

Para aplicar as mudanças no banco de dados, execute a migração:

```bash
# Aplicar migração
supabase db push

# Ou executar o arquivo SQL diretamente
psql -f supabase/migrations/20250120000000_update_equipe_functions.sql
```

## Funcionalidades Implementadas

✅ **Migração do banco de dados** com novas funções
✅ **Tipos TypeScript** atualizados
✅ **Componente de cadastro** com seleção visual de função
✅ **Interface de gerenciamento** de equipes
✅ **Estatísticas** por função
✅ **Validações** de usuários duplicados
✅ **Design responsivo** e intuitivo
✅ **Integração completa** com o sistema existente

## Próximos Passos

1. **Aplicar a migração** no banco de dados
2. **Testar** a funcionalidade em ambiente de desenvolvimento
3. **Treinar usuários** sobre as novas funções
4. **Implementar permissões** baseadas em função (opcional)
5. **Adicionar notificações** para mudanças de função (opcional)

## Exemplo de Uso Completo

```tsx
import { ProjectTeamManager } from '@/components/ProjectTeamManager';

function ProjetoPage() {
  const [projeto] = useState({
    id: 'uuid-do-projeto',
    nome: 'Campanha Verão 2024'
  });

  return (
    <div>
      <h1>Gerenciar Projeto: {projeto.nome}</h1>
      <ProjectTeamManager
        projetoId={projeto.id}
        projetoNome={projeto.nome}
        onTeamUpdate={() => {
          // Atualizar dados do projeto
          console.log('Equipe atualizada!');
        }}
      />
    </div>
  );
}
```

Este sistema oferece uma gestão completa e visual das equipes de projeto, com hierarquia clara e interface intuitiva para todos os usuários.

