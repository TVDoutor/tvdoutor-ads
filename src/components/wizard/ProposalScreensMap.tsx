import { useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { parseLatLng } from '@/lib/geo';

export interface ProposalScreenMapPoint {
  id: number;
  lat?: number | null;
  lng?: number | null;
  code?: string;
  display_name?: string;
  name?: string;
}

export interface ProposalScreensMapProps {
  screens: ProposalScreenMapPoint[];
  /** IDs já adicionados à proposta */
  addedToProposalIds: number[];
  /** Seleção temporária (checkbox) na lista atual */
  tempSelectedIds: number[];
  /** Círculo de busca por raio (último endereço geocodificado) */
  centerCircle?: { lat: number; lng: number; radiusKm: number } | null;
  height?: number;
  className?: string;
  /** Quando true, todos os pontos usam estilo "na proposta" (ex.: resumo) */
  allSelectedStyle?: boolean;
  /** Visão geral do inventário (muitos pontos): limita zoom ao ajustar o mapa */
  overviewMode?: boolean;
}

const heartSvg = (fill: string) =>
  `<svg width="12" height="12" viewBox="0 0 24 24" fill="${fill}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

function markerHtml(backgroundColor: string) {
  const size = 22;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;background:${backgroundColor};">${heartSvg('white')}</div>`;
}

function colorForScreen(
  id: number,
  added: Set<number>,
  temp: Set<number>,
  allSelectedStyle: boolean
): string {
  if (allSelectedStyle) return '#10b981';
  if (added.has(id)) return '#10b981';
  if (temp.has(id)) return '#f59e0b';
  return '#06b6d4';
}

function scheduleInvalidate(map: any) {
  const run = () => {
    try {
      map.invalidateSize({ animate: false });
    } catch {
      /* ignore */
    }
  };
  run();
  requestAnimationFrame(run);
  setTimeout(run, 80);
  setTimeout(run, 300);
}

export function ProposalScreensMap({
  screens,
  addedToProposalIds,
  tempSelectedIds,
  centerCircle,
  height = 400,
  className = '',
  allSelectedStyle = false,
  overviewMode = false,
}: ProposalScreensMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeObservedElRef = useRef<HTMLElement | null>(null);

  const addedKey = useMemo(
    () => JSON.stringify([...(addedToProposalIds ?? [])].map(Number).sort((a, b) => a - b)),
    [addedToProposalIds]
  );
  const tempKey = useMemo(
    () => JSON.stringify([...(tempSelectedIds ?? [])].map(Number).sort((a, b) => a - b)),
    [tempSelectedIds]
  );
  const added = useMemo(
    () => new Set((addedToProposalIds ?? []).map((n) => Number(n))),
    [addedKey]
  );
  const temp = useMemo(
    () => new Set((tempSelectedIds ?? []).map((n) => Number(n))),
    [tempKey]
  );

  const centerCircleKey = useMemo(
    () =>
      centerCircle
        ? `${centerCircle.lat},${centerCircle.lng},${centerCircle.radiusKm}`
        : '',
    [centerCircle]
  );

  const validPoints = useMemo(
    () =>
      (screens ?? []).filter((s) => {
        const lat = parseLatLng(s.lat);
        const lng = parseLatLng(s.lng);
        return lat !== undefined && lng !== undefined;
      }),
    [screens]
  );

  const validPointsKey = useMemo(
    () =>
      JSON.stringify(
        validPoints.map((s) => [Number(s.id), parseLatLng(s.lat), parseLatLng(s.lng)])
      ),
    [validPoints]
  );

  /** Atualiza camadas; mantém uma única instância de mapa (não remove no cleanup deste efeito). */
  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;

    const run = async () => {
      const L = await import('leaflet');
      const leaflet = L.default ?? L;

      if (cancelled || !mapRef.current) return;

      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const el = mapRef.current;

      if (!mapInstanceRef.current) {
        const map = leaflet.map(el, { zoomControl: true }).setView([-14.235, -51.925], 4);
        mapInstanceRef.current = map;
        leaflet
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19,
          })
          .addTo(map);
        markersLayerRef.current = leaflet.layerGroup().addTo(map);

        map.whenReady(() => scheduleInvalidate(map));

        if (!resizeObserverRef.current && el) {
          resizeObservedElRef.current = el;
          resizeObserverRef.current = new ResizeObserver(() => {
            if (mapInstanceRef.current) scheduleInvalidate(mapInstanceRef.current);
          });
          resizeObserverRef.current.observe(el);
        }
      }

      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;
      if (!map || !markersLayer) return;

      markersLayer.clearLayers();
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
      if (centerMarkerRef.current) {
        map.removeLayer(centerMarkerRef.current);
        centerMarkerRef.current = null;
      }

      if (centerCircle && centerCircle.radiusKm > 0) {
        const { lat, lng, radiusKm } = centerCircle;
        circleRef.current = leaflet
          .circle([lat, lng], {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            radius: radiusKm * 1000,
          })
          .addTo(map);

        const cm = leaflet.marker([lat, lng], {
          icon: leaflet.divIcon({
            className: 'proposal-map-center',
            html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.95);border:3px solid #3b82f6;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563eb"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        }).addTo(map);
        centerMarkerRef.current = cm;
        cm.bindPopup(`<div class="text-xs">Centro da busca<br/>Raio: ${radiusKm} km</div>`);
      }

      const latLngs: [number, number][] = [];

      for (const s of validPoints) {
        const lat = parseLatLng(s.lat);
        const lng = parseLatLng(s.lng);
        if (lat === undefined || lng === undefined) continue;
        const id = Number(s.id);
        const bg = colorForScreen(id, added, temp, allSelectedStyle);
        const icon = leaflet.divIcon({
          className: 'proposal-screen-marker',
          html: markerHtml(bg),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const m = leaflet.marker([lat, lng], { icon }).addTo(markersLayer);
        const label = s.display_name || s.name || `Tela #${id}`;
        const code = s.code ?? '';
        m.bindPopup(
          `<div class="text-xs"><strong>${code}</strong><br/>${label}</div>`
        );
        latLngs.push([lat, lng]);
      }

      if (centerCircle) {
        latLngs.push([centerCircle.lat, centerCircle.lng]);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 13);
      } else if (latLngs.length > 1) {
        map.fitBounds(leaflet.latLngBounds(latLngs as any), {
          padding: [28, 28],
          maxZoom: overviewMode ? 6 : 14,
        });
      } else if (centerCircle) {
        map.setView([centerCircle.lat, centerCircle.lng], Math.min(12, map.getMaxZoom()));
      }

      scheduleInvalidate(map);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    validPointsKey,
    validPoints,
    addedKey,
    added,
    tempKey,
    temp,
    centerCircleKey,
    centerCircle,
    allSelectedStyle,
    overviewMode,
  ]);

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      resizeObservedElRef.current = null;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          /* ignore */
        }
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        circleRef.current = null;
        centerMarkerRef.current = null;
      }
    };
  }, []);

  if (!screens?.length && !centerCircle) {
    return (
      <div
        className={`rounded-lg border border-dashed bg-muted/30 flex items-center justify-center text-sm text-muted-foreground ${className}`}
        style={{ minHeight: height }}
      >
        Nenhum ponto para o mapa. Use Buscar Telas ou aguarde o carregamento do inventário.
      </div>
    );
  }

  if (validPoints.length === 0 && !centerCircle) {
    return (
      <div
        className={`rounded-lg border border-dashed bg-muted/30 flex items-center justify-center text-sm text-muted-foreground px-4 text-center ${className}`}
        style={{ minHeight: height }}
      >
        Nenhuma das telas listadas tem coordenadas (lat/lng) para exibir no mapa.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        ref={mapRef}
        className="rounded-lg overflow-hidden border relative z-[1] w-full leaflet-wizard-map"
        style={{ height, minHeight: height }}
      />
      {!allSelectedStyle && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-[#10b981] border border-white shadow" />
            Na proposta
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b] border border-white shadow" />
            Seleção temporária
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-[#06b6d4] border border-white shadow" />
            {overviewMode ? 'Demais telas' : 'Resultado da busca'}
          </span>
        </div>
      )}
    </div>
  );
}
