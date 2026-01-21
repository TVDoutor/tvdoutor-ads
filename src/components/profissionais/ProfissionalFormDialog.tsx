/**
 * Diálogo de Formulário para Cadastro/Edição de Profissionais
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useCreateProfissional,
  useUpdateProfissional,
  type ProfissionalSaude,
  type ProfissionalFormData
} from '@/hooks/useProfissionaisSaude';

interface ProfissionalFormDialogProps {
  profissional?: ProfissionalSaude | null;
  open: boolean;
  onClose: () => void;
}

export function ProfissionalFormDialog({ profissional, open, onClose }: ProfissionalFormDialogProps) {
  const isEdit = !!profissional;
  const createProfissional = useCreateProfissional();
  const updateProfissional = useUpdateProfissional();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProfissionalFormData>({
    defaultValues: {
      nome: '',
      tipo_profissional: '',
      tipo_registro: '',
      registro_profissional: '',
      email: '',
      telefone: '',
      ativo: true
    }
  });

  const ativo = watch('ativo');

  // Resetar formulário quando abrir/fechar ou mudar profissional
  useEffect(() => {
    if (open) {
      if (profissional) {
        reset({
          nome: profissional.nome,
          tipo_profissional: profissional.tipo_profissional,
          tipo_registro: profissional.tipo_registro || '',
          registro_profissional: profissional.registro_profissional,
          email: profissional.email || '',
          telefone: profissional.telefone || '',
          ativo: profissional.ativo ?? true
        });
      } else {
        reset({
          nome: '',
          tipo_profissional: '',
          tipo_registro: '',
          registro_profissional: '',
          email: '',
          telefone: '',
          ativo: true
        });
      }
    }
  }, [open, profissional, reset]);

  const onSubmit = async (data: ProfissionalFormData) => {
    try {
      if (isEdit) {
        await updateProfissional.mutateAsync({
          id: profissional.id,
          data
        });
      } else {
        await createProfissional.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar profissional:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Profissional' : 'Novo Profissional'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              {...register('nome', { required: 'Nome é obrigatório' })}
              placeholder="Ex: Dr. João Silva"
            />
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome.message}</p>
            )}
          </div>

          {/* Tipo de Profissional */}
          <div className="space-y-2">
            <Label htmlFor="tipo_profissional">Tipo de Profissional *</Label>
            <Select
              value={watch('tipo_profissional') || ''}
              onValueChange={(value) => setValue('tipo_profissional', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Médico">Médico</SelectItem>
                <SelectItem value="Enfermeiro">Enfermeiro</SelectItem>
                <SelectItem value="Dentista">Dentista</SelectItem>
                <SelectItem value="Farmacêutico">Farmacêutico</SelectItem>
                <SelectItem value="Fisioterapeuta">Fisioterapeuta</SelectItem>
                <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                <SelectItem value="Psicólogo">Psicólogo</SelectItem>
                <SelectItem value="Técnico de Enfermagem">Técnico de Enfermagem</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo_profissional && (
              <p className="text-sm text-red-600">{errors.tipo_profissional.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Registro */}
            <div className="space-y-2">
              <Label htmlFor="tipo_registro">Tipo de Registro</Label>
              <Select
                value={watch('tipo_registro') || ''}
                onValueChange={(value) => setValue('tipo_registro', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ex: CRM, COREN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRM">CRM - Médico</SelectItem>
                  <SelectItem value="COREN">COREN - Enfermeiro</SelectItem>
                  <SelectItem value="CRO">CRO - Dentista</SelectItem>
                  <SelectItem value="CRF">CRF - Farmacêutico</SelectItem>
                  <SelectItem value="CREFITO">CREFITO - Fisioterapeuta</SelectItem>
                  <SelectItem value="CRN">CRN - Nutricionista</SelectItem>
                  <SelectItem value="CRP">CRP - Psicólogo</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número do Registro */}
            <div className="space-y-2">
              <Label htmlFor="registro_profissional">Número do Registro *</Label>
              <Input
                id="registro_profissional"
                {...register('registro_profissional', { required: 'Registro é obrigatório' })}
                placeholder="Ex: 123456-SP"
              />
              {errors.registro_profissional && (
                <p className="text-sm text-red-600">{errors.registro_profissional.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register('telefone')}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={ativo ?? true}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
            <Label htmlFor="ativo" className="cursor-pointer">
              Profissional Ativo
            </Label>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : isEdit ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
