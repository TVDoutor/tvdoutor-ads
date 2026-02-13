-- ===============================
-- INSERT TEST DATA
-- Date: 2025-01-31
-- Inserir dados de teste para verificar se a view está funcionando
-- ===============================

BEGIN;

-- Inserir dados de teste na tabela screens
INSERT INTO public.screens (
    code, name, display_name, city, state, cep, address_raw, 
    lat, lng, class, specialty, active, board_format, category
) VALUES 
    ('P2001', 'TV Doutor Centro', 'TV Doutor Centro SP', 'São Paulo', 'SP', '01000-000', 'Rua Augusta, 123', 
     -23.5505, -46.6333, 'A', ARRAY['Shopping', 'Alimentação'], true, 'LED', 'Centro'),
    
    ('P1001', 'LG Paulista', 'LG Paulista', 'São Paulo', 'SP', '01310-100', 'Av Paulista, 1000', 
     -23.5615, -46.6565, 'AB', ARRAY['Comércio', 'Serviços'], true, 'LCD', 'Paulista'),
    
    ('P3001', 'Amil Copacabana', 'Amil Copacabana', 'Rio de Janeiro', 'RJ', '22000-000', 'Av Atlântica, 500', 
     -22.9712, -43.1822, 'B', ARRAY['Saúde', 'Fitness'], true, 'LED', 'Copacabana'),
    
    ('P2002', 'TV Doutor Shopping', 'TV Doutor Shopping', 'São Paulo', 'SP', '04551-000', 'Rua Oscar Freire, 456', 
     -23.5615, -46.6565, 'C', ARRAY['Moda', 'Luxo'], true, 'OLED', 'Vila Madalena'),
    
    ('P1002', 'LG Aeroporto', 'LG Aeroporto GRU', 'Guarulhos', 'SP', '07190-100', 'Rod Hélio Smidt, 1000', 
     -23.4356, -46.4731, 'D', ARRAY['Viagem', 'Transporte'], true, 'LED', 'Aeroporto')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    class = EXCLUDED.class,
    specialty = EXCLUDED.specialty,
    active = EXCLUDED.active,
    board_format = EXCLUDED.board_format,
    category = EXCLUDED.category;

COMMIT;
