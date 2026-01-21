# 📋 Guia Completo: Sistema de Gestão de Profissionais da Saúde

## ✅ Sistema Implementado com Sucesso!

Foi criado um **sistema completo de gestão de profissionais da saúde** integrado ao TVDoutor ADS.

---

## 🎯 Funcionalidades Implementadas

### 1. ✅ Cadastro de Profissionais
- Formulário completo com validação
- Campos:
  - Nome completo
  - Tipo de profissional (Médico, Enfermeiro, Dentista, etc.)
  - Tipo de registro (CRM, COREN, CRO, etc.)
  - Número do registro profissional
  - Email (opcional)
  - Telefone (opcional)
  - Status ativo/inativo

### 2. ✅ Gestão de Vínculos
- Vincular profissional a múltiplas unidades de saúde (venues)
- Definir cargo específico em cada unidade
- Remover vínculos
- Visualizar histórico de vínculos

### 3. ✅ Listagem e Busca
- Lista completa de profissionais
- Busca por nome, registro ou tipo
- Filtros em tempo real
- Estatísticas gerais

### 4. ✅ Interface Moderna
- Design profissional e responsivo
- Dialogs modais para formulários
- Confirmação de ações destrutivas
- Toast notifications para feedback

---

## 📁 Arquivos Criados

### Hooks (Camada de Dados)
```
src/hooks/
├── useProfissionaisSaude.ts          # CRUD completo de profissionais
├── useCorpoClinico.ts                # Visualização via view
└── useEmailStats.ts (exemplo)        # Exemplo de uso de view
```

### Páginas
```
src/pages/
└── ProfissionaisSaude.tsx            # Página principal de gestão
```

### Componentes
```
src/components/profissionais/
├── ProfissionalFormDialog.tsx        # Formulário de cadastro/edição
└── ProfissionalVinculoDialog.tsx     # Gerenciamento de vínculos
```

### Navegação
```
src/
├── App.tsx                           # ✅ Rota adicionada
└── components/Sidebar.tsx            # ✅ Menu atualizado
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Utilizadas

#### `profissionais_saude` (Tabela Principal)
```sql
- id: string (UUID)
- nome: string
- tipo_profissional: string
- tipo_registro: string | null
- registro_profissional: string
- email: string | null
- telefone: string | null
- ativo: boolean
- created_at: timestamp
- updated_at: timestamp
- created_by: string | null
```

#### `profissional_venue` (Vínculos)
```sql
- id: string (UUID)
- profissional_id: string (FK → profissionais_saude)
- venue_id: number (FK → venues)
- cargo_na_unidade: string | null
- created_at: timestamp
```

#### `profissional_especialidades` (Especialidades)
```sql
- profissional_id: string (FK → profissionais_saude)
- specialty_id: string (FK → specialties)
```

#### `view_detalhes_profissionais` (View Completa)
```sql
View que agrega:
- Dados do profissional
- Venues vinculados
- Especialidades
- Informações de localização
```

---

## 🚀 Como Usar

### 1. Acessar o Sistema

1. Faça login no TVDoutor ADS
2. No menu lateral, clique em **"Profissionais da Saúde"**
   - Localizado entre "Farmácias" e "Propostas"
   - Ícone: 🩺 Stethoscope

### 2. Cadastrar Novo Profissional

1. Clique no botão **"Novo Profissional"**
2. Preencha o formulário:
   - Nome completo **(obrigatório)**
   - Tipo de profissional **(obrigatório)**
   - Tipo de registro (opcional)
   - Número do registro **(obrigatório)**
   - Email (opcional)
   - Telefone (opcional)
   - Status ativo/inativo
3. Clique em **"Cadastrar"**

### 3. Editar Profissional

1. Na lista de profissionais, clique no menu (⋮)
2. Selecione **"Editar"**
3. Atualize os campos desejados
4. Clique em **"Atualizar"**

### 4. Vincular a Unidades de Saúde

1. Na lista de profissionais, clique no menu (⋮)
2. Selecione **"Gerenciar Vínculos"**
3. No dialog aberto:
   - Selecione a unidade de saúde
   - Informe o cargo (opcional)
   - Clique em **"Adicionar Vínculo"**
4. Para remover: clique no ícone 🗑️ ao lado do vínculo

### 5. Buscar Profissionais

1. Use a barra de busca no topo
2. Digite:
   - Nome do profissional
   - Número do registro
   - Tipo de profissional
3. Resultados filtrados em tempo real

### 6. Excluir Profissional

1. Na lista, clique no menu (⋮)
2. Selecione **"Excluir"**
3. Confirme a ação
   - ⚠️ **Atenção**: Todos os vínculos também serão removidos

---

## 💻 Para Desenvolvedores

### Hooks Disponíveis

```typescript
// Listar todos os profissionais
const { data, isLoading } = useProfissionaisSaude();

// Buscar profissional específico
const { data: profissional } = useProfissional(profissionalId);

// Criar novo profissional
const createMutation = useCreateProfissional();
await createMutation.mutateAsync(formData);

// Atualizar profissional
const updateMutation = useUpdateProfissional();
await updateMutation.mutateAsync({ id, data });

// Deletar profissional
const deleteMutation = useDeleteProfissional();
await deleteMutation.mutateAsync(profissionalId);

// Buscar vínculos
const { data: vinculos } = useProfissionalVenues(profissionalId);

// Vincular a venue
const vincularMutation = useVincularProfissionalVenue();
await vincularMutation.mutateAsync({
  profissional_id,
  venue_id,
  cargo_na_unidade
});

// Desvincular
const desvincularMutation = useDesvincularProfissionalVenue();
await desvincularMutation.mutateAsync(vinculoId);

// Buscar especialidades
const { data: especialidades } = useEspecialidades();

// Especialidades do profissional
const { data: profEsp } = useProfissionalEspecialidades(profissionalId);
```

### Exemplo de Uso em Componente

```typescript
import { useProfissionaisSaude } from '@/hooks/useProfissionaisSaude';

function MeuComponente() {
  const { data: profissionais, isLoading } = useProfissionaisSaude();

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      {profissionais?.map(prof => (
        <div key={prof.id}>
          <h3>{prof.nome}</h3>
          <p>{prof.tipo_profissional}</p>
          <p>{prof.tipo_registro} {prof.registro_profissional}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 Estatísticas Disponíveis

A página mostra automaticamente:

1. **Total de Profissionais** - Quantidade total cadastrada
2. **Ativos** - Profissionais com status ativo
3. **Tipos de Profissionais** - Quantidade de tipos diferentes

---

## 🔐 Permissões

**Acesso:** Qualquer usuário autenticado pode visualizar e gerenciar profissionais.

Para restringir acesso, você pode adicionar `requiredRole` na rota:

```typescript
// App.tsx
<Route path="/profissionais-saude" element={
  <ProtectedRoute requiredRole="manager">  // Apenas gerentes
    <ProfissionaisSaude />
  </ProtectedRoute>
} />
```

---

## 🎨 Customização

### Adicionar Novos Tipos de Profissionais

Edite `ProfissionalFormDialog.tsx`:

```typescript
<Select>
  <SelectContent>
    <SelectItem value="Médico">Médico</SelectItem>
    <SelectItem value="Novo Tipo">Novo Tipo</SelectItem> // Adicione aqui
  </SelectContent>
</Select>
```

### Adicionar Novos Tipos de Registro

Edite `ProfissionalFormDialog.tsx`:

```typescript
<Select>
  <SelectContent>
    <SelectItem value="CRM">CRM - Médico</SelectItem>
    <SelectItem value="NOVO">NOVO - Descrição</SelectItem> // Adicione aqui
  </SelectContent>
</Select>
```

---

## 🧪 Teste o Sistema

1. Acesse `http://localhost:8080/profissionais-saude`
2. Cadastre um profissional de teste
3. Vincule a uma unidade
4. Teste a busca
5. Edite e exclua

---

## 📝 Checklist de Implementação

- [x] Tabelas criadas no Supabase
- [x] View `view_detalhes_profissionais` criada
- [x] Tipos atualizados com `npm run types:update`
- [x] Hooks de gerenciamento criados
- [x] Página principal implementada
- [x] Formulário de cadastro/edição
- [x] Gerenciamento de vínculos
- [x] Rota adicionada no App.tsx
- [x] Menu atualizado no Sidebar
- [x] Zero erros de linting
- [x] Totalmente tipado com TypeScript

---

## 🎉 Próximos Passos (Opcionais)

1. **Adicionar fotos** - Upload de foto do profissional
2. **Relatórios** - Gerar relatórios de profissionais por unidade
3. **Escalas** - Sistema de escalas de trabalho
4. **Documentos** - Anexar documentos (diplomas, certificados)
5. **Histórico** - Log de alterações de cada profissional

---

## 🐛 Troubleshooting

### Erro ao carregar profissionais
- Verifique se as tabelas existem no Supabase
- Execute `npm run types:update`
- Verifique as permissões RLS no Supabase

### Menu não aparece
- Limpe o cache do navegador
- Verifique se o usuário está autenticado
- Confirme que `Stethoscope` foi importado no Sidebar

### Formulário não salva
- Abra o console e veja os erros
- Verifique as permissões de INSERT no Supabase
- Confirme que todos os campos obrigatórios estão preenchidos

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Logs do Supabase
3. Tipos estão atualizados (`npm run types:update`)

---

**Sistema criado e testado em:** 20/01/2026  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para produção
