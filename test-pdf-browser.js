// Teste rápido no browser (sem depender da Edge)
// Cole este código no console do navegador na tela da proposta

// simular retorno base64
(async () => {
  console.log('🧪 Iniciando teste de PDF no browser...');
  
  try {
    const resp = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    const ab = await resp.arrayBuffer();
    const bin = String.fromCharCode(...new Uint8Array(ab));
    const b64 = btoa(bin);
    
    console.log('✅ PDF de teste carregado, tamanho base64:', b64.length);
    
    // Função para abrir PDF a partir de base64
    window.__open = (pdfBase64) => {
      try {
        const bin = atob(pdfBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        console.log('✅ PDF aberto em nova aba');
      } catch (error) {
        console.error('❌ Erro ao abrir PDF:', error);
      }
    };
    
    // Testar abertura
    window.__open(b64);
    
    console.log('🎯 Teste concluído! Se abriu em nova aba, a UI está pronta para base64/Blob.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
})();

// Função adicional para testar diferentes formatos
window.__testPDFFormats = {
  // Teste com Blob
  testBlob: async () => {
    const resp = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    console.log('✅ Teste Blob concluído');
  },
  
  // Teste com ArrayBuffer
  testArrayBuffer: async () => {
    const resp = await fetch('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    const arrayBuffer = await resp.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    console.log('✅ Teste ArrayBuffer concluído');
  },
  
  // Teste com URL
  testURL: () => {
    window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
    console.log('✅ Teste URL concluído');
  }
};

console.log('🔧 Funções de teste disponíveis:');
console.log('- __open(base64String) - Testa abertura com base64');
console.log('- __testPDFFormats.testBlob() - Testa com Blob');
console.log('- __testPDFFormats.testArrayBuffer() - Testa com ArrayBuffer');
console.log('- __testPDFFormats.testURL() - Testa com URL');
