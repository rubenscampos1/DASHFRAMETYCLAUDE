/**
 * Script de teste para validar conexão com Supabase Storage
 *
 * Como usar:
 * 1. Criar um arquivo de áudio de teste: test-audio.mp3 (na raiz do projeto)
 * 2. Rodar: npx tsx server/test-supabase-storage.ts
 * 3. Verificar no Supabase Dashboard se o arquivo apareceu
 * 4. Rodar novamente para testar delete
 */

// Carregar variáveis de ambiente do arquivo .env
import dotenv from 'dotenv';
dotenv.config();

import { uploadLocutorAudioToSupabase, deleteLocutorAudioFromSupabase } from './storage-helpers';
import fs from 'fs';
import path from 'path';

async function testSupabaseStorage() {
  console.log('\n🧪 ========== TESTE SUPABASE STORAGE ==========\n');

  // IDs de teste
  const testLocutorId = 'test-locutor-id';
  const testAmostraId = 'test-amostra-id';

  try {
    // ========== TESTE 1: UPLOAD ==========
    console.log('📤 TESTE 1: Upload de áudio...\n');

    // Criar um buffer de teste (arquivo fake de 1KB)
    const testBuffer = Buffer.alloc(1024, 'A'); // 1KB de dados
    const testFilename = 'test-audio.mp3';

    const uploadResult = await uploadLocutorAudioToSupabase({
      locutorId: testLocutorId,
      amostraId: testAmostraId,
      originalName: testFilename,
      buffer: testBuffer,
      contentType: 'audio/mpeg',
    });

    console.log('\n✅ Upload bem-sucedido!');
    console.log('   Storage Path:', uploadResult.storagePath);
    console.log('   Public URL:', uploadResult.publicUrl);

    // ========== TESTE 2: DELETE ==========
    console.log('\n🗑️  TESTE 2: Delete de áudio...\n');

    await deleteLocutorAudioFromSupabase(uploadResult.storagePath);

    console.log('\n✅ Delete bem-sucedido!');

    // ========== TESTE 3: DELETE DE ARQUIVO QUE NÃO EXISTE ==========
    console.log('\n🗑️  TESTE 3: Delete de arquivo inexistente (não deve quebrar)...\n');

    await deleteLocutorAudioFromSupabase('locutores/fake-id/fake-file.mp3');

    console.log('\n✅ Delete de arquivo inexistente não quebrou!');

    console.log('\n\n🎉 ========== TODOS OS TESTES PASSARAM! ==========\n');
    console.log('✅ Supabase Storage está funcionando corretamente!');
    console.log('✅ Você pode avançar para a FASE 3 (refatorar rotas).\n');

  } catch (error) {
    console.error('\n\n❌ ========== TESTE FALHOU ==========\n');
    console.error('Erro:', error);
    console.error('\nVerifique:');
    console.error('1. Variáveis de ambiente no .env estão corretas');
    console.error('2. Bucket "locutores-audio" existe no Supabase');
    console.error('3. Políticas de acesso (RLS) estão configuradas');
    console.error('4. service_role_key está correta\n');
    process.exit(1);
  }
}

// Rodar teste
testSupabaseStorage();
