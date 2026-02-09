import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente (se ainda não foram carregadas)
dotenv.config();

/**
 * Cliente Supabase com service_role key (permissões de admin)
 *
 * ⚠️ IMPORTANTE: Este client APENAS deve ser usado no backend (server-side)
 * NUNCA exponha o service_role_key no frontend!
 *
 * Usa service_role_key para:
 * - Bypass Row Level Security (RLS)
 * - Upload/delete de arquivos no Storage
 * - Operações administrativas
 */

const hasSupabaseConfig = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = hasSupabaseConfig
  ? createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

/**
 * Nome do bucket para áudios de locutores
 * Configurável via variável de ambiente
 */
export const LOCUTORES_AUDIO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_LOCUTORES || 'locutores-audio';

if (hasSupabaseConfig) {
  console.log('[Supabase Client] ✅ Initialized');
  console.log('[Supabase Client] URL:', process.env.SUPABASE_URL);
  console.log('[Supabase Client] Bucket:', LOCUTORES_AUDIO_BUCKET);
} else {
  console.log('[Supabase Client] ⚠️  Running without Supabase (development mode)');
  console.log('[Supabase Client] Storage features will be limited');
}
