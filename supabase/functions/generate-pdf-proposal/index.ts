// supabase/functions/generate-pdf-proposal/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ✅ GARANTA QUE ESTA CONSTANTE ESTEJA AQUI
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Para DEV. Em produção, troque '*' pelo seu domínio.
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // ✅ GARANTA QUE ESTE BLOCO 'OPTIONS' SEJA A PRIMEIRA COISA DENTRO DO 'SERVE'
  // Ele lida com a requisição "pre-flight" do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🌐 Nova requisição recebida:', req.method, req.url);
    
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { 
        status: 405,
        headers: corsHeaders 
      })
    }
    
    const body = await req.json();
    console.log('📥 Request body received:', JSON.stringify(body, null, 2));
    
    const { proposalId } = body;
    console.log('🎯 Proposal ID extraído:', proposalId);
    
    if (!proposalId) {
      return new Response(JSON.stringify({ error: "proposalId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('🔍 Buscando dados da proposta:', proposalId);

    // 1. Buscar os dados da proposta usando a função SQL
    const { data, error } = await supabase
      .rpc('get_proposal_details', { p_proposal_id: proposalId })
      .single();

    if (error) {
      console.error('❌ Erro ao buscar dados:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Dados da proposta encontrados:', data);

    // 2. Gerar o HTML com os dados (simplificado para teste)
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Proposta Comercial - ${data.proposal.name}</title>
      </head>
      <body>
        <h1>Proposta Comercial</h1>
        <p>ID: ${data.proposal.id}</p>
        <p>Cliente: ${data.proposal.client_name}</p>
        <p>Valor Total: R$ ${data.proposal.total_value}</p>
        <p>Telas: ${data.proposal.screens_count}</p>
      </body>
      </html>
    `;

    // 3. Simular geração de PDF (para teste)
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Proposta ${data.proposal.id} - ${data.proposal.name}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;

    // 4. Salvar no Storage do Supabase
    const bucket = "proposals";
    const path = `pdf/proposal_${proposalId}_simple.pdf`;
    
    // Criar bucket se não existir
    await supabase.storage.createBucket(bucket).catch(() => {});
    
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, pdfContent, {
      contentType: "application/pdf", 
      upsert: true
    });
    
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // URL assinada válida por 30 dias
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30);
    const pdfUrl = signed?.signedUrl ?? null;

    // Atualizar proposta com URL do PDF
    await supabase.from("proposals")
      .update({ pdf_path: path, pdf_url: pdfUrl })
      .eq("id", proposalId);

    console.log('✅ PDF gerado com sucesso!');

    // Exemplo de resposta de sucesso com os headers
    return new Response(JSON.stringify({ 
      ok: true, 
      pdf_url: pdfUrl, 
      pdf_path: path,
      message: "PDF gerado com sucesso!"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Erro na geração do PDF:', error);
    // Exemplo de resposta de erro com os headers
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})