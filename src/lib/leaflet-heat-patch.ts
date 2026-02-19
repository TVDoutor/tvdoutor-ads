/**
 * Patch do Leaflet + leaflet.heat para evitar
 * "TypeError: Cannot add property HeatLayer, object is not extensible".
 *
 * Deve ser importado no início do App, antes de qualquer componente que use o mapa.
 * O leaflet.heat espera L global; ao carregar aqui, L ainda é extensível.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet.heat';
