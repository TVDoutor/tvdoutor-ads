import { Monitor } from "lucide-react";

interface ScreenItem {
  screen_id: number;
  screens?: {
    id?: number;
    name?: string;
    formatted_address?: string;
    screen_type?: string;
    city?: string;
    state?: string;
    ambiente?: string | null;
    aceita_convenio?: boolean | null;
  };
}

interface InventoryPreviewProps {
  filteredScreens: ScreenItem[];
  showAddress?: boolean;
  showScreenType?: boolean;
}

export function InventoryPreview({ filteredScreens, showAddress, showScreenType }: InventoryPreviewProps) {
  if (!filteredScreens || filteredScreens.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
          <Monitor className="h-5 w-5 text-orange-600" />
          Pontos escolhidos
        </h4>
        <a href="#inventario-selecionado" className="text-orange-600 text-sm font-semibold hover:underline">
          Ver todos
        </a>
      </div>
      <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
        {/* Cabeçalho compacto */}
        <div className="grid grid-cols-12 gap-2 p-3 bg-orange-50 text-orange-900 font-semibold text-sm">
          <div className="col-span-6">Nome do Ponto</div>
          <div className="col-span-3">Cidade</div>
          <div className="col-span-3">Estado</div>
        </div>
        {/* Lista limitada para caber nesta área */}
        <div className="max-h-60 overflow-auto">
          {filteredScreens.slice(0, 15).map((ps, idx) => (
            <div key={`${ps.screen_id}-${idx}`} className="grid grid-cols-12 gap-2 p-3 border-t border-orange-100 text-sm">
              <div className="col-span-6 text-slate-900">
                {ps.screens?.name || `Ponto #${ps.screen_id}`}
                {showAddress && (
                  <div className="text-xs text-slate-600">{ps.screens?.formatted_address || '-'}</div>
                )}
                {showScreenType && (
                  <div className="text-xs text-slate-600">Tipo: {ps.screens?.screen_type || '-'}</div>
                )}
                {(ps.screens as any)?.ambiente && (
                  <div className="text-xs text-slate-600">Ambiente: {(ps.screens as any).ambiente}</div>
                )}
                {(ps.screens as any)?.aceita_convenio != null && (
                  <div className="text-xs text-slate-600">Convênio: {(ps.screens as any).aceita_convenio ? 'Sim' : 'Não'}</div>
                )}
              </div>
              <div className="col-span-3 text-slate-700">{ps.screens?.city || '-'}</div>
              <div className="col-span-3 text-slate-700">{ps.screens?.state || '-'}</div>
            </div>
          ))}
        </div>
        {/* Rodapé informativo */}
        <div className="flex items-center justify-between p-3 bg-orange-50 text-sm">
          <span>
            Mostrando <span className="font-bold">{Math.min(filteredScreens.length, 15)}</span> de <span className="font-bold">{filteredScreens.length}</span> pontos
          </span>
          <a href="#inventario-selecionado" className="text-orange-700 font-semibold hover:underline">
            Ver inventário completo
          </a>
        </div>
      </div>
    </div>
  );
}

