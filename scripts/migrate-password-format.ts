import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function migratePasswordFormat() {
  console.log('🔄 Migrando formato de senhas...');
  
  try {
    // Buscar todos os usuários
    const allUsers = await db.select().from(users);
    
    console.log(`📊 Encontrados ${allUsers.length} usuários`);
    
    let migratedCount = 0;
    let alreadyCorrectCount = 0;
    
    for (const user of allUsers) {
      // Verificar se a senha está no formato antigo (salt:hash) ou novo (hash.salt)
      if (user.password.includes(':')) {
        // Formato antigo: salt:hash
        const [salt, hash] = user.password.split(':');
        // Converter para novo formato: hash.salt
        const newPassword = `${hash}.${salt}`;
        
        await db.update(users)
          .set({ password: newPassword })
          .where(eq(users.id, user.id));
        
        console.log(`✅ Migrado: ${user.email}`);
        migratedCount++;
      } else if (user.password.includes('.')) {
        // Formato novo: hash.salt (já correto)
        console.log(`⏭️  Já correto: ${user.email}`);
        alreadyCorrectCount++;
      } else {
        console.log(`⚠️  Formato desconhecido: ${user.email}`);
      }
    }
    
    console.log('\n📊 Resumo:');
    console.log(`   ✅ Migrados: ${migratedCount}`);
    console.log(`   ⏭️  Já corretos: ${alreadyCorrectCount}`);
    console.log(`   Total: ${allUsers.length}`);
    console.log('\n🎉 Migração concluída!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migratePasswordFormat();
