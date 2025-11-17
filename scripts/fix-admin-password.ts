import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    console.log('❌ Hash inválido (formato errado)');
    return false;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

async function fixAdminPassword() {
  const databaseUrl = process.argv[2];
  
  if (!databaseUrl) {
    console.error('❌ Por favor, forneça a DATABASE_URL do Render como argumento');
    console.log('\nUso: tsx scripts/fix-admin-password.ts "postgresql://..."');
    process.exit(1);
  }

  console.log('🔄 Conectando ao banco de dados do Render...');
  
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const db = drizzle(pool, { schema });
    
    console.log('✅ Conectado!');
    console.log('\n🔍 Buscando usuário admin@framety.com...');
    
    const adminUsers = await db.select().from(users).where(eq(users.email, 'admin@framety.com'));
    
    if (adminUsers.length === 0) {
      console.log('❌ Usuário admin@framety.com não encontrado!');
      console.log('📝 Criando usuário admin...');
      
      const hashedPassword = await hashPassword('admin123');
      
      await db.insert(users).values({
        nome: 'Admin',
        email: 'admin@framety.com',
        password: hashedPassword,
        papel: 'Admin',
        ativo: true
      });
      
      console.log('✅ Usuário admin criado com sucesso!');
    } else {
      const admin = adminUsers[0];
      console.log(`✅ Usuário encontrado: ${admin.nome} (${admin.email})`);
      console.log(`   Papel: ${admin.papel}`);
      console.log(`   Ativo: ${admin.ativo}`);
      console.log(`   Hash atual: ${admin.password.substring(0, 30)}...`);
      
      console.log('\n🔐 Testando senha atual...');
      const passwordWorks = await comparePasswords('admin123', admin.password);
      
      if (passwordWorks) {
        console.log('✅ Senha "admin123" funciona corretamente!');
      } else {
        console.log('❌ Senha "admin123" NÃO funciona com o hash atual');
        console.log('🔧 Atualizando senha...');
        
        const newHashedPassword = await hashPassword('admin123');
        
        await db.update(users)
          .set({ password: newHashedPassword })
          .where(eq(users.email, 'admin@framety.com'));
        
        console.log('✅ Senha atualizada com sucesso!');
        
        // Testar novamente
        const updatedUsers = await db.select().from(users).where(eq(users.email, 'admin@framety.com'));
        const testAgain = await comparePasswords('admin123', updatedUsers[0].password);
        
        if (testAgain) {
          console.log('✅ Verificado: Senha "admin123" agora funciona!');
        } else {
          console.log('❌ ERRO: Ainda não funciona. Problema no algoritmo de hash.');
        }
      }
    }
    
    console.log('\n📧 Credenciais:');
    console.log('   Email: admin@framety.com');
    console.log('   Senha: admin123');
    console.log('\n🎉 Pronto! Tente fazer login agora.');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAdminPassword();
