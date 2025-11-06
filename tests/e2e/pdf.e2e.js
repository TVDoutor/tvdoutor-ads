/**
 * Teste E2E simples usando Puppeteer para validar:
 * - Clique no botão de PDF ativa o contexto body.pdf-export
 * - Logs de console incluem orientação 'landscape'
 * - Existem marcadores de quebra de página no DOM
 *
 * Execute com: npm run test:e2e
 * Configure PROPOSAL_URL se necessário, ex.: PROPOSAL_URL=http://localhost:8082/proposta/1
 */

const puppeteer = require('puppeteer');

async function run() {
  const url = process.env.PROPOSAL_URL || 'http://localhost:8082/';
  console.log(`➡️ Abrindo URL: ${url}`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    // eco simplificado
    if (text.includes('Configurações do PDF customizado')) {
      console.log(`🖨️ ${text}`);
    }
  });

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Tenta localizar o botão de PDF pela classe usada no app
  const pdfButton = await page.$('.pdf-download-button');
  if (!pdfButton) {
    console.warn('⚠️ Botão de PDF não encontrado. Verifique se PROPOSAL_URL aponta para a página de detalhes da proposta.');
    await browser.close();
    process.exitCode = 1;
    return;
  }

  // Clique para gerar PDF
  await pdfButton.click();

  // Aguarda a classe no body indicar contexto de exportação (timeout curto para detectar regressão de UX)
  await page.waitForFunction(() => document.body.classList.contains('pdf-export'), { timeout: 3000 });
  console.log('✅ Contexto pdf-export ativado no body');

  // Valida que o botão de PDF está oculto durante a captura
  const isPdfButtonHiddenDuringExport = await page.evaluate(() => {
    const btn = document.querySelector('.pdf-download-button');
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0');
  });
  if (!isPdfButtonHiddenDuringExport) {
    console.error('❌ O botão de PDF não ficou oculto durante a captura.');
    await browser.close();
    process.exitCode = 1;
    return;
  }
  console.log('✅ Botão de PDF oculto durante a captura');

  // Aguarda restauração do body após geração
  await page.waitForFunction(() => !document.body.classList.contains('pdf-export'), { timeout: 15000 });
  console.log('✅ Contexto pdf-export removido após geração');

  // Valida orientação nos logs
  const hasLandscape = consoleMessages.some((m) => m.includes('orientation') && m.includes('landscape'));
  if (!hasLandscape) {
    console.error('❌ Não foi possível confirmar a orientação "landscape" nos logs.');
    await browser.close();
    process.exitCode = 1;
    return;
  }
  console.log('✅ Orientação "landscape" confirmada via logs');

  // Verifica se há marcadores de quebra de página no DOM
  const pageBreakCount = await page.evaluate(() => document.querySelectorAll('.page-break-before').length);
  if (pageBreakCount < 1) {
    console.warn('⚠️ Nenhum marcador .page-break-before encontrado. Considere adicionar marcadores em seções longas.');
  } else {
    console.log(`✅ Encontrados ${pageBreakCount} marcadores .page-break-before no DOM`);
  }

  // Verifica páginas de inventário e isolamento por página (se aplicável)
  const inventoryPageInfo = await page.evaluate(() => ({
    pages: Array.from(document.querySelectorAll('#proposal-print-area .inventory-page')).length,
  }));
  if (inventoryPageInfo.pages > 0) {
    console.log(`✅ Inventário renderizado em ${inventoryPageInfo.pages} bloco(s) de página`);
  } else {
    console.log('ℹ️ Inventário curto: nenhuma página segmentada detectada (ok).');
  }

  // Após a geração, valida que o botão de PDF reapareceu
  const isPdfButtonVisibleAfter = await page.evaluate(() => {
    const btn = document.querySelector('.pdf-download-button');
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });
  if (!isPdfButtonVisibleAfter) {
    console.error('❌ O botão de PDF não reapareceu após a geração.');
    await browser.close();
    process.exitCode = 1;
    return;
  }
  console.log('✅ Botão de PDF visível novamente após a geração');

  await browser.close();
}

run().catch((err) => {
  console.error('❌ Erro ao executar teste E2E de PDF:', err);
  process.exitCode = 1;
});
