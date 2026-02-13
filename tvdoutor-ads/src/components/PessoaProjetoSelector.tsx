import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PessoasProjetoService } from '@/lib/pessoas-projeto-service';
import { User } from 'lucide-react';
import type { PessoaProjeto } from '@/types/agencia';

interface PessoaProjetoSelectorProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  agenciaId?: string; // Opcional: filtrar por agência específica
}

export const PessoaProjetoSelector: React.FC<PessoaProjetoSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "Selecione uma pessoa",
  disabled = false,
  className = "",
  agenciaId
}) => {
  const [pessoas, setPessoas] = useState<PessoaProjeto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPessoas = async () => {
      try {
        setLoading(true);
        
        // Buscar pessoas da tabela pessoas_projeto
        const pessoasData = agenciaId 
          ? await PessoasProjetoService.listarPorAgencia(agenciaId)
          : await PessoasProjetoService.listar();

        setPessoas(pessoasData);
      } catch (error) {
        console.error('Erro ao carregar pessoas:', error);
        setPessoas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPessoas();
  }, [agenciaId]);

  const selectedPessoa = pessoas.find(pessoa => pessoa.id === value);

  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Carregando pessoas..." : placeholder}>
          {selectedPessoa && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {getInitials(selectedPessoa.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="truncate font-medium">{selectedPessoa.nome}</span>
                {selectedPessoa.cargo && (
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedPessoa.cargo}
                  </span>
                )}
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {pessoas.length === 0 && !loading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-2">
            <User className="h-4 w-4" />
            <span>Nenhuma pessoa encontrada</span>
          </div>
        ) : (
          pessoas.map(pessoa => (
            <SelectItem key={pessoa.id} value={pessoa.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(pessoa.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{pessoa.nome}</span>
                  <div className="flex flex-col text-xs text-muted-foreground">
                    {pessoa.cargo && <span>{pessoa.cargo}</span>}
                    {pessoa.email && <span>{pessoa.email}</span>}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
