// Configuração do Leaflet para resolver problemas com ícones
// Esta função deve ser chamada após importar o Leaflet dinamicamente

export async function configureLeaflet() {
  const L = await import('leaflet');
  
  // Importar CSS dinamicamente
  await import('leaflet/dist/leaflet.css');
  
  // Fix para ícones padrão do Leaflet
  delete (L.default.Icon.Default.prototype as any)._getIconUrl;

  L.default.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  return L.default;
}

