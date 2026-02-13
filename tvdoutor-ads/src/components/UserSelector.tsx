// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface UserSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "Selecione um usuário",
  disabled = false,
  className = ""
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Buscar usuários da tabela profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url')
          .order('display_name', { ascending: true });

        if (error) {
          console.error('Erro ao buscar usuários:', error);
          return;
        }

        setUsers(profiles || []);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const selectedUser = users.find(user => user.id === value);

  return (
    <Select value={value || ''} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Carregando usuários..." : placeholder}>
          {selectedUser && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {selectedUser.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUser.display_name || selectedUser.email}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {users.length === 0 && !loading ? (
          <SelectItem value="" disabled>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Nenhum usuário encontrado</span>
            </div>
          </SelectItem>
        ) : (
          users.map(user => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{user.display_name || 'Sem nome'}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};