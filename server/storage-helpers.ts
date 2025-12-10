import { supabaseAdmin, LOCUTORES_AUDIO_BUCKET } from './supabase-client';
import path from 'path';

/**
 * Parâmetros para upload de áudio de locutor
 */
interface UploadLocutorAudioParams {
  locutorId: string;
  amostraId: string;
  originalName: string;
  buffer: Buffer;
  contentType: string;
}

/**
 * Resultado do upload de áudio
 */
interface UploadLocutorAudioResult {
  storagePath: string;  // Path relativo: "locutores/{locutorId}/{amostraId}.mp3"
  publicUrl: string;    // URL completa (para logs/debug)
}

/**
 * Faz upload de áudio de locutor para o Supabase Storage
 *
 * Path gerado: locutores/{locutorId}/{amostraId}.mp3
 *
 * @param params - Parâmetros do upload
 * @returns Promise com storagePath (para salvar no banco) e publicUrl (para logs)
 * @throws Error se o upload falhar
 *
 * Exemplo:
 * ```typescript
 * const result = await uploadLocutorAudioToSupabase({
 *   locutorId: "550e8400-e29b-41d4-a716-446655440000",
 *   amostraId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
 *   originalName: "voz-comercial.mp3",
 *   buffer: req.file.buffer,
 *   contentType: "audio/mpeg"
 * });
 * console.log("Path:", result.storagePath);
 * // => "locutores/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7.mp3"
 * ```
 */
export async function uploadLocutorAudioToSupabase(
  params: UploadLocutorAudioParams
): Promise<UploadLocutorAudioResult> {
  const { locutorId, amostraId, originalName, buffer, contentType } = params;

  // Extrair extensão do arquivo original (.mp3, .wav, .ogg, etc)
  const ext = path.extname(originalName).toLowerCase();

  // Montar path: locutores/{locutorId}/{amostraId}.mp3
  const storagePath = `locutores/${locutorId}/${amostraId}${ext}`;

  console.log('[Supabase Upload] Starting upload...');
  console.log('[Supabase Upload] Path:', storagePath);
  console.log('[Supabase Upload] Size:', (buffer.length / 1024 / 1024).toFixed(2), 'MB');
  console.log('[Supabase Upload] Type:', contentType);

  // Upload para Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from(LOCUTORES_AUDIO_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false, // Não sobrescrever se já existir (evita acidentes)
      cacheControl: '3600', // Cache de 1 hora
    });

  if (error) {
    console.error('[Supabase Upload] ❌ Error:', error);
    throw new Error(`Falha ao fazer upload para Supabase Storage: ${error.message}`);
  }

  console.log('[Supabase Upload] ✅ Success:', data);

  // Montar URL pública (para logs/debug)
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${LOCUTORES_AUDIO_BUCKET}/${storagePath}`;

  console.log('[Supabase Upload] Public URL:', publicUrl);

  return {
    storagePath,
    publicUrl,
  };
}

/**
 * Deleta áudio de locutor do Supabase Storage
 *
 * ⚠️ ESTRATÉGIA DEFENSIVA:
 * - Se arquivo não existir → NÃO quebra (retorna sucesso)
 * - Se der erro de rede → loga mas NÃO quebra
 *
 * Por quê? Porque deletar do banco é mais importante que deletar do Storage.
 * Pior caso: sobra arquivo "órfão" no Storage (pode limpar depois manualmente).
 *
 * @param storagePath - Path relativo do arquivo (ex: "locutores/{locutorId}/{amostraId}.mp3")
 * @returns Promise<void>
 *
 * Exemplo:
 * ```typescript
 * await deleteLocutorAudioFromSupabase(
 *   "locutores/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7.mp3"
 * );
 * ```
 */
export async function deleteLocutorAudioFromSupabase(
  storagePath: string
): Promise<void> {
  console.log('[Supabase Delete] Deleting:', storagePath);

  const { data, error } = await supabaseAdmin.storage
    .from(LOCUTORES_AUDIO_BUCKET)
    .remove([storagePath]); // API aceita array de paths

  if (error) {
    // ⚠️ Se arquivo não existe, Supabase retorna erro
    // Mas queremos continuar (não queremos quebrar o delete do banco)
    console.warn('[Supabase Delete] ⚠️ Warning (non-fatal):', error.message);

    // Se for "Object not found", ignorar (já foi deletado antes)
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      console.log('[Supabase Delete] File already deleted, continuing...');
      return;
    }

    // Outros erros (permissão, rede), logar mas não quebrar
    console.error('[Supabase Delete] Error (but continuing):', error);
    return;
  }

  console.log('[Supabase Delete] ✅ Success:', data);
}
