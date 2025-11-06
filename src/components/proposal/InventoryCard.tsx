import { useMemo } from "react";

interface ScreenItem {
  screen_id: number;
  screens?: {
    id?: number;
    name?: string;
    formatted_address?: string;
    screen_type?: string;
    city?: string;
    state?: string;
    class?: string;
  };
}

type ViewMode = "list" | "grouped";

interface InventoryCardProps {
  filteredScreens: ScreenItem[];
  groupedByCityState?: Record<string, ScreenItem[]>;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  showAddress: boolean;
  setShowAddress: (v: boolean) => void;
  showScreenId: boolean;
  setShowScreenId: (v: boolean) => void;
  showScreenType: boolean;
  setShowScreenType: (v: boolean) => void;
  filterCity?: string;
  setFilterCity?: (v: string) => void;
  filterState?: string;
  setFilterState?: (v: string) => void;
  filterClass?: string;
  setFilterClass?: (v: string) => void;
  searchQuery?: string;
  setSearchQuery?: (v: string) => void;
  formatCurrency: (value?: number | null) => string;
}

export function InventoryCard({
  filteredScreens,
  groupedByCityState,
  viewMode,
  setViewMode,
  showAddress,
  setShowAddress,
  showScreenId,
  setShowScreenId,
  showScreenType,
  setShowScreenType,
  filterCity,
  setFilterCity,
  filterState,
  setFilterState,
  filterClass,
  setFilterClass,
  searchQuery,
  setSearchQuery,
  formatCurrency,
}: InventoryCardProps) {
  const totalByClass = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredScreens.forEach((ps) => {
      const cls = ps.screens?.class || "-";
      acc[cls] = (acc[cls] || 0) + 1;
    });
    return acc;
  }, [filteredScreens]);

  // Modo PDF: quando o body possui a classe 'pdf-export', aplicamos paginação simples por quantidade de linhas
  const isPDFExport = typeof document !== 'undefined' && document.body.classList.contains('pdf-export');
  const ROWS_PER_PAGE = isPDFExport ? 24 : Number.MAX_SAFE_INTEGER; // paisagem A4 ~ 24 linhas por página (ajustável)

  const chunkList = (items: ScreenItem[], size: number): ScreenItem[][] => {
    if (!items?.length) return [];
    const chunks: ScreenItem[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  };

  return (
    <div id="inventario-selecionado" className="rounded-xl border border-orange-200 bg-white overflow-hidden pdf-tight-card">
      {/* Controles (ocultos no PDF para foco na listagem) */}
      <div className="p-4 space-y-3 hide-on-pdf">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAddress} onChange={(e) => setShowAddress(e.target.checked)} />
            Mostrar endereço
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showScreenId} onChange={(e) => setShowScreenId(e.target.checked)} />
            Mostrar ID do ponto
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showScreenType} onChange={(e) => setShowScreenType(e.target.checked)} />
            Mostrar tipo de tela
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" className={`px-3 py-1.5 rounded-lg border text-sm ${viewMode === 'list' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-800 border-slate-300'}`} onClick={() => setViewMode('list')}>Lista</button>
            <button type="button" className={`px-3 py-1.5 rounded-lg border text-sm ${viewMode === 'grouped' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-800 border-slate-300'}`} onClick={() => setViewMode('grouped')}>Agrupado</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Filtrar cidade" value={filterCity ?? ''} onChange={(e) => setFilterCity?.(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Filtrar estado" value={filterState ?? ''} onChange={(e) => setFilterState?.(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Filtrar classe" value={filterClass ?? ''} onChange={(e) => setFilterClass?.(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Buscar por nome/endereço" value={searchQuery ?? ''} onChange={(e) => setSearchQuery?.(e.target.value)} />
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-orange-50 text-orange-900 font-semibold text-sm">
        <div className="col-span-5">Nome do Ponto</div>
        <div className="col-span-2">Cidade</div>
        <div className="col-span-2">Estado</div>
        <div className="col-span-1">Classe</div>
        <div className="col-span-2 text-right">ID</div>
      </div>

      {/* Corpo */}
      {viewMode === "grouped" && groupedByCityState ? (
        <div>
          {Object.entries(groupedByCityState).map(([groupKey, items], groupIndex) => {
            const [city, state] = groupKey.split("|");
            return (
              <div key={groupKey} className="border-t border-orange-100 inventory-page avoid-break-inside">
                {isPDFExport && groupIndex > 0 && (<div className="page-break-before" aria-hidden="true" />)}
                <div className="p-3 bg-white">
                  <div className="font-semibold text-slate-900">
                    {city} / {state}
                  </div>
                  <div className="text-sm text-slate-600">{items.length} pontos</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {chunkList(filteredScreens, ROWS_PER_PAGE).map((pageItems, pageIndex) => (
            <div key={`inventory-page-${pageIndex}`} className="inventory-page avoid-break-inside">
              {isPDFExport && pageIndex > 0 && (<div className="page-break-before" aria-hidden="true" />)}
              {pageItems.map((ps, idx) => (
                <div key={`${ps.screen_id}-${idx}`} className="grid grid-cols-12 gap-2 p-3 border-t border-orange-100 text-sm">
                  <div className="col-span-5 text-slate-900">
                    {ps.screens?.name || `Ponto #${ps.screen_id}`}
                    {showAddress && (
                      <div className="text-xs text-slate-600">{ps.screens?.formatted_address || '-'}</div>
                    )}
                    {showScreenType && (
                      <div className="text-xs text-slate-600">Tipo: {ps.screens?.screen_type || '-'}</div>
                    )}
                  </div>
                  <div className="col-span-2 text-slate-700">{ps.screens?.city || '-'}</div>
                  <div className="col-span-2 text-slate-700">{ps.screens?.state || '-'}</div>
                  <div className="col-span-1 text-slate-700">{(ps.screens as any)?.class || '-'}</div>
                  <div className="col-span-2 text-right text-slate-700">{showScreenId ? ps.screens?.id ?? ps.screen_id : '-'}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Rodapé com resumo por classe */}
      <div className="p-3 bg-orange-50 border-t border-orange-100">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-700">Total por classe:</span>
          {Object.entries(totalByClass).map(([cls, total]) => (
            <span key={cls} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-white border border-orange-200 text-slate-800">
              <span className="font-semibold">{cls}</span>
              <span className="text-slate-700">{total}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
