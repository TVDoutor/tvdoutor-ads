# Instruções para Corrigir o Erro do Enum class_band

## Problema Identificado
O erro que está ocorrendo é:
```
Error updating screen: invalid input value for enum class_band: "AB"
```

Isso acontece porque o enum `class_band` no banco de dados não inclui o valor "AB", mas o código está tentando salvar esse valor.

## Solução

### 1. Executar Script SQL no Supabase

Acesse o painel do Supabase (https://supabase.com/dashboard) e vá para a seção **SQL Editor**. Execute o seguinte script:

```sql
-- Fix class_band enum to include all necessary values
-- Date: 2025-01-25

-- First, let's check if the enum exists and what values it has
DO $$
BEGIN
    -- Drop the enum if it exists to recreate with all values
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_band') THEN
        -- First, we need to change all columns using this enum to text temporarily
        ALTER TABLE public.screens ALTER COLUMN class TYPE text;
        
        -- Drop the enum
        DROP TYPE public.class_band;
    END IF;
END $$;

-- Create the enum with all necessary values
CREATE TYPE public.class_band AS ENUM (
    'ND',  -- Not Defined (default)
    'A',   -- Class A
    'AB',  -- Class AB  
    'B',   -- Class B
    'C',   -- Class C
    'D'    -- Class D
);

-- Change the column back to use the enum
ALTER TABLE public.screens ALTER COLUMN class TYPE class_band USING class::class_band;

-- Set default value for the enum
ALTER TABLE public.screens ALTER COLUMN class SET DEFAULT 'ND'::class_band;

-- Update any NULL values to the default
UPDATE public.screens SET class = 'ND'::class_band WHERE class IS NULL;

-- Add comment for documentation
COMMENT ON TYPE public.class_band IS 'Classification bands for screens: ND=Not Defined, A=Class A, AB=Class AB, B=Class B, C=Class C, D=Class D';

-- Verify the enum was created successfully
SELECT 'class_band enum created successfully with values: ' || array_to_string(enum_range(NULL::class_band), ', ') as status;
```

### 2. Verificar os Resultados

Após executar o script, você deve ver uma mensagem de sucesso mostrando os valores do enum:
```
class_band enum created successfully with values: ND, A, AB, B, C, D
```

### 3. Alterações no Código

Já corrigi o código TypeScript no arquivo `src/pages/Inventory.tsx` para incluir o valor "AB" nos tipos permitidos.

## Testando a Solução

Após executar o script SQL:

1. Recarregue a página do sistema
2. Tente editar uma tela e definir a classe como "AB"
3. O salvamento deve funcionar sem erros

## Arquivos Alterados

- `src/pages/Inventory.tsx` - Corrigido os tipos TypeScript para incluir "AB"
- `fix_class_band_enum.sql` - Script SQL para corrigir o enum no banco de dados

## Status das Tarefas

- ✅ Identificar o problema do enum class_band
- ✅ Criar script SQL para corrigir o enum
- ✅ Corrigir tipos TypeScript no código
- ⏳ Executar script SQL no Supabase (você precisa fazer isso)
- ⏳ Testar o salvamento com valor "AB"
