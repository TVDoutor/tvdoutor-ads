// Versão simplificada da Edge Function para copiar no dashboard do Supabase
// Cole este código em: Dashboard → Edge Functions → pdf-proposal-pro

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { 
        status: 405,
        headers: corsHeaders 
      })
    }
    
    const { proposalId, logoUrl } = await req.json();
    console.log('Generating PDF for proposal:', proposalId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar dados da proposta
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        proposal_screens (
          id,
          screen_id,
          custom_cpm,
          screens (
            id,
            name,
            city,
            state,
            class
          )
        )
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError) {
      return new Response(JSON.stringify({ error: proposalError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    if (!proposalData) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Por enquanto, retornar apenas os dados sem gerar PDF real
    // TODO: Implementar geração do PDF com pdf-lib
    const mockPdfUrl = `https://example.com/proposta-${proposalId}.pdf`;

    return new Response(JSON.stringify({ 
      ok: true, 
      pdf_url: mockPdfUrl, 
      pdf_path: `proposta-${proposalId}.pdf`,
      data: {
        proposal: proposalData.customer_name,
        screens: proposalData.proposal_screens?.length || 0,
        message: "PDF generation em desenvolvimento - dados carregados com sucesso"
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (e) {
    console.error('PDF generation error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
