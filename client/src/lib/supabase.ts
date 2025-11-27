import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL e chave padrão (será sobrescrita quando buscar do servidor)
const supabaseUrl = 'https://wgfpvlzpuqjenqumuxkx.supabase.co';

// Chave anônima temporária (empty string é válido para desenvolvimento)
// Em produção, isso será substituído pela chave real do servidor
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZnB2bHpwdXFqZW5xdW11eGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4MTcxOTksImV4cCI6MjA1MDM5MzE5OX0.rUFJLWc0GNBYZNDYo4ynZlcUF0kKQtKUGaM7WkwX7Ho';

// Criar cliente do Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Desabilitar auth do Supabase (usamos nosso próprio sistema de auth)
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    // Configurações de realtime
    params: {
      eventsPerSecond: 10, // Limitar eventos para não sobrecarregar
    },
  },
});

// Função para buscar configuração do servidor (opcional)
// Isso permite atualizar as credenciais dinamicamente se necessário
export async function fetchSupabaseConfig() {
  try {
    const response = await fetch('/api/config/supabase', {
      credentials: 'include',
    });

    if (response.ok) {
      const config = await response.json();
      console.log('[Supabase] Configuração recebida do servidor:', {
        url: config.supabaseUrl,
        hasKey: !!config.supabaseAnonKey,
      });

      // Nota: não é possível recriar o cliente depois de inicializado
      // Mas podemos validar se as credenciais estão corretas
      if (config.supabaseUrl !== supabaseUrl) {
        console.warn('[Supabase] URL diferente da esperada. Esperado:', supabaseUrl, 'Recebido:', config.supabaseUrl);
      }
    }
  } catch (error) {
    console.error('[Supabase] Erro ao buscar configuração:', error);
  }
}
