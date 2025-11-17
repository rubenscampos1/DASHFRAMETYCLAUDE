-- Migration para adicionar colunas faltantes na tabela projetos
-- Execute este script diretamente no banco de dados de PRODUÇÃO do Render.com

-- Adicionar colunas NPS (se não existirem)
ALTER TABLE projetos 
ADD COLUMN IF NOT EXISTS nps_score integer,
ADD COLUMN IF NOT EXISTS nps_contact text,
ADD COLUMN IF NOT EXISTS nps_responsible text;

-- Adicionar outras colunas novas (se não existirem)
ALTER TABLE projetos 
ADD COLUMN IF NOT EXISTS duracao integer,
ADD COLUMN IF NOT EXISTS formato text,
ADD COLUMN IF NOT EXISTS captacao boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS roteiro boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locucao boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_interna timestamp,
ADD COLUMN IF NOT EXISTS data_meeting timestamp,
ADD COLUMN IF NOT EXISTS link_frame_io text,
ADD COLUMN IF NOT EXISTS caminho text,
ADD COLUMN IF NOT EXISTS referencias text,
ADD COLUMN IF NOT EXISTS informacoes_adicionais text;

-- Verificar se as colunas foram criadas com sucesso
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projetos' 
ORDER BY ordinal_position;
