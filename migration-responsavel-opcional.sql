-- Migration: Tornar campo responsavel_id opcional
-- Execute este script no banco de dados de produção do Render

-- Tornar a coluna responsavel_id nullable
ALTER TABLE projetos 
ALTER COLUMN responsavel_id DROP NOT NULL;

-- Verificar que a mudança foi aplicada
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'projetos' 
  AND column_name = 'responsavel_id';
