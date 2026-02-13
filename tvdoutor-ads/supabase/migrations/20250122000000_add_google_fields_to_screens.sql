-- Adicionar campos do Google Geocoding API à tabela screens
-- Only if screens table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        ALTER TABLE public.screens 
        ADD COLUMN IF NOT EXISTS google_place_id TEXT,
        ADD COLUMN IF NOT EXISTS google_formatted_address TEXT;

        -- Criar índices para melhor performance
        CREATE INDEX IF NOT EXISTS idx_screens_google_place_id ON public.screens(google_place_id);
        CREATE INDEX IF NOT EXISTS idx_screens_lat_lng ON public.screens(lat, lng);

        -- Comentários para documentação
        COMMENT ON COLUMN public.screens.google_place_id IS 'Google Place ID para identificação única do local';
        COMMENT ON COLUMN public.screens.google_formatted_address IS 'Endereço formatado retornado pela Google Geocoding API';
    END IF;
END $$;
