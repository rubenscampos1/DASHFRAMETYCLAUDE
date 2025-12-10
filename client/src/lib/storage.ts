/**
 * Utilitários para Supabase Storage
 */

/**
 * Converte path relativo do Supabase Storage para URL pública completa
 *
 * @param path - Path relativo, ex: "locutores/{locutorId}/{amostraId}.mp3"
 * @returns URL completa, ex: "https://xyz.supabase.co/storage/v1/object/public/locutores-audio/locutores/..."
 *
 * @example
 * ```typescript
 * const url = getLocutorAudioUrl("locutores/123/456.mp3");
 * // => "https://xyz.supabase.co/storage/v1/object/public/locutores-audio/locutores/123/456.mp3"
 * ```
 *
 * ⚠️ MIGRAÇÃO GRADUAL:
 * Durante a migração, pode haver amostras antigas com:
 * - Path local: "/uploads/locutores/123.mp3"
 * - URL completa já migrada: "https://..."
 *
 * Este helper detecta automaticamente e retorna a URL correta.
 */
export function getLocutorAudioUrl(path: string): string {
  if (!path) return '';

  // Se já for URL completa (http:// ou https://), retornar direto
  // Casos:
  // - Amostras antigas já migradas
  // - URLs de outros CDNs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Se for path local antigo (/uploads/...), tentar acessar do servidor
  // ⚠️ Isso NÃO funcionará em produção no Render (disco efêmero)
  // Mantido apenas para desenvolvimento local com dados antigos
  if (path.startsWith('/uploads/')) {
    console.warn('[Storage] Path local detectado (pode não funcionar em produção):', path);
    return path; // Retorna como está (Express pode servir localmente)
  }

  // Path relativo do Supabase Storage
  // Ex: "locutores/{locutorId}/{amostraId}.mp3"
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucket = 'locutores-audio';

  if (!supabaseUrl) {
    console.error('[Storage] VITE_SUPABASE_URL não configurada!');
    return path; // Retorna path original (fallback)
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
