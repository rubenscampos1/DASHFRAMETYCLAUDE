-- Migration: Adicionar coluna sequencial_id na tabela projetos
-- Esta migration adiciona um ID sequencial automático para cada projeto (#SKY123, #SKY124, etc.)

-- Passo 1: Adicionar coluna temporária (permitindo NULL inicialmente)
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS sequencial_id INTEGER;

-- Passo 2: Numerar projetos existentes sequencialmente (ordenando por data de criação)
WITH numbered_projetos AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY data_criacao ASC) as seq_num
  FROM projetos
)
UPDATE projetos
SET sequencial_id = numbered_projetos.seq_num
FROM numbered_projetos
WHERE projetos.id = numbered_projetos.id;

-- Passo 3: Tornar a coluna NOT NULL agora que todos têm valores
ALTER TABLE projetos ALTER COLUMN sequencial_id SET NOT NULL;

-- Verificar resultado
SELECT COUNT(*) as total_projetos, MAX(sequencial_id) as max_sequencial_id FROM projetos;
