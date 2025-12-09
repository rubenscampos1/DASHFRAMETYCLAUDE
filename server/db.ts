import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use standard PostgreSQL for production (Render), Supabase, and local development
// Only use Neon serverless for Replit environment
const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = process.env.DATABASE_URL.includes('localhost') ||
                     process.env.DATABASE_URL.includes('127.0.0.1');
const isSupabase = process.env.DATABASE_URL.includes('supabase.com');

let pool: any;
let db: any;

if (isLocalhost || isProduction || isSupabase) {
  // Standard PostgreSQL connection for Render, Supabase, or Local Development
  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },

    // ========== CONFIGURAÇÃO OTIMIZADA DO POOL (FASE 1A) ==========
    // Ajustada para evitar "Connection terminated unexpectedly" e quedas do servidor

    // 1. max: 20 conexões simultâneas (antes era 10)
    //    - Supabase Pooler suporta 60+ conexões no plano pago
    //    - 20 é suficiente para múltiplos usuários sem saturar o Supabase
    //    - Evita pool esgotado quando há queries simultâneas (ex: portal com Promise.all)
    max: 20,

    // 2. idleTimeoutMillis: 30000 (30 segundos) - antes era 0 (nunca fechava)
    //    - Conexões ociosas são liberadas após 30s de inatividade
    //    - Evita acúmulo de conexões travadas ou vazamentos (leaks)
    //    - Supabase tem seu próprio timeout; precisamos liberar antes dele
    //    - Reduz uso de memória no servidor e no banco
    idleTimeoutMillis: 30000,

    // 3. connectionTimeoutMillis: 20000 (20 segundos) - FASE 4: aumentado de 10s
    //    - Espera até 20s para obter conexão do pool antes de falhar
    //    - Aumentado de 10s → 20s para evitar falhas em carga alta
    //    - Justificativa: queries podem levar até 30s (statement_timeout),
    //      então faz sentido esperar até 20s por uma conexão livre
    //    - Em carga alta (pool cheio), evita timeout prematuro quando conexão
    //      seria liberada em 15-20s
    connectionTimeoutMillis: 20000,

    // 4. statement_timeout: 30000ms (30 segundos)
    //    - Cancela queries SQL que demoram mais de 30s
    //    - Evita queries travadas segurando conexões indefinidamente
    //    - Protege contra queries mal otimizadas ou locks no banco
    //    - FASE 4: 30s é seguro para batch queries (portal com 50+ projetos)
    //    - Se precisar aumentar no futuro: SEMPRE < 60s (limite do Supabase pooler)
    //    - Se queries demorarem >30s consistentemente: investigar índices/otimização
    statement_timeout: 30000,

    // 5. query_timeout: 30000ms (30 segundos)
    //    - Timeout do lado do Node.js para queries lentas
    //    - Complementa o statement_timeout do PostgreSQL
    //    - Mantém sincronizado com statement_timeout
    query_timeout: 30000,

    // COMO ISSO RESOLVE OS PROBLEMAS:
    // ✅ Pool não esgota mais: max aumentado de 10 → 20
    // ✅ Conexões não ficam travadas: idle timeout de 30s libera automaticamente
    // ✅ Requests não ficam em fila infinita: connection timeout de 10s
    // ✅ Queries lentas não travam o pool: statement_timeout de 30s
    // ✅ "Connection terminated unexpectedly" reduzido: liberamos antes do Supabase
    // ================================================================
  });
  db = drizzlePg({ client: pool, schema });
} else {
  // Neon serverless connection for Replit
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
}

export { pool, db };
