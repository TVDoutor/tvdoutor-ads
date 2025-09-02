import { useEffect, useState } from 'react';

export const useHtml2pdf = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHtml2pdf = async () => {
      try {
        // Verificar se já está carregado
        if (window.html2pdf) {
          setIsLoaded(true);
          return;
        }

        // Carregar dinamicamente
        const html2pdf = await import('html2pdf.js');
        window.html2pdf = html2pdf.default;
        
        setIsLoaded(true);
      } catch (err) {
        console.error('Erro ao carregar html2pdf:', err);
        setError('Falha ao carregar biblioteca de PDF');
      }
    };

    loadHtml2pdf();
  }, []);

  return { isLoaded, error };
};
