import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  Edit, 
  Share2,
  MoreHorizontal,
  ArrowUpDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRealProposals, type ProposalWithDetails } from "@/hooks/useRealProposals";

interface ProposalSort {
  field: keyof ProposalWithDetails;
  direction: 'asc' | 'desc';
}

interface ProposalsTableProps {
  proposals?: ProposalWithDetails[];
  sort?: ProposalSort;
  onSortChange?: (sort: ProposalSort) => void;
  onProposalClick?: (proposal: ProposalWithDetails) => void;
  onAction?: (action: 'view' | 'edit' | 'share', proposal: ProposalWithDetails) => void;
  limit?: number;
}

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  enviada: { label: 'Enviada', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  em_analise: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  aceita: { label: 'Aceita', color: 'bg-green-100 text-green-700 border-green-200' },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-100 text-red-700 border-red-200' },
};

export const ProposalsTable = ({
  proposals: propProposals,
  sort = { field: 'created_at', direction: 'desc' },
  onSortChange,
  onProposalClick,
  onAction,
  limit = 10
}: ProposalsTableProps) => {
  const { data: realProposals, isLoading, error } = useRealProposals(limit);
  const proposals = propProposals || realProposals || [];
  const [currentSort, setCurrentSort] = useState<ProposalSort>(sort);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Propostas Recentes</CardTitle>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Skeleton rows */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Propostas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-500">
            <p>Erro ao carregar propostas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (field: keyof ProposalWithDetails) => {
    const newSort: ProposalSort = {
      field,
      direction: currentSort.field === field && currentSort.direction === 'desc' ? 'asc' : 'desc'
    };
    setCurrentSort(newSort);
    onSortChange?.(newSort);
  };

  const getSortIcon = (field: keyof ProposalWithDetails) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return currentSort.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-gray-700" />
      : <ChevronDown className="h-4 w-4 text-gray-700" />;
  };

  const sortedProposals = [...proposals].sort((a, b) => {
    const aValue = a[currentSort.field];
    const bValue = b[currentSort.field];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return currentSort.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return currentSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('pt-BR', { month: 'short' }),
      year: date.getFullYear()
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Propostas Recentes
            </CardTitle>
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
              )}
              <Badge variant="outline" className="bg-gray-50">
                {proposals.length} {proposals.length === 1 ? 'proposta' : 'propostas'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      DATA
                      {getSortIcon('created_at')}
                    </div>
                  </Button>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                    onClick={() => handleSort('customer_name')}
                  >
                    <div className="flex items-center gap-1">
                      ORGANIZAÇÃO
                      {getSortIcon('customer_name')}
                    </div>
                  </Button>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                    onClick={() => handleSort('proposal_type')}
                  >
                    <div className="flex items-center gap-1">
                      TIPO
                      {getSortIcon('proposal_type')}
                    </div>
                  </Button>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                    onClick={() => handleSort('created_by')}
                  >
                    <div className="flex items-center gap-1">
                      RESPONSÁVEL
                      {getSortIcon('created_by')}
                    </div>
                  </Button>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      STATUS
                      {getSortIcon('status')}
                    </div>
                  </Button>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                    onClick={() => handleSort('net_calendar')}
                  >
                    <div className="flex items-center gap-1">
                      VALOR
                      {getSortIcon('net_calendar')}
                    </div>
                  </Button>
                </th>
                <th className="w-12 p-4"></th>
              </tr>
            </thead>
            <tbody>
              {sortedProposals.map((proposal, index) => {
                const dateInfo = formatDate(proposal.created_at);
                const statusInfo = statusConfig[proposal.status as keyof typeof statusConfig] || 
                  { label: proposal.status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
                
                return (
                  <tr 
                    key={proposal.id}
                    className={cn(
                      "border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    )}
                    onClick={() => onProposalClick?.(proposal)}
                  >
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {dateInfo.day} {dateInfo.month}
                        </div>
                        <div className="text-gray-500">
                          {dateInfo.year}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {proposal.organizationName || proposal.customer_name || 'Não informado'}
                        </div>
                        {proposal.city && (
                          <div className="text-gray-500">
                            {proposal.city}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-900">
                        {proposal.proposal_type || 'Não informado'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-900">
                        {proposal.created_by || 'Não informado'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(proposal.net_calendar || 0)}
                      </span>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAction?.('view', proposal)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction?.('edit', proposal)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction?.('share', proposal)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartilhar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};