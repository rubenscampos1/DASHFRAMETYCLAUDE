import { 
  users, 
  projetos, 
  tiposDeVideo, 
  tags, 
  logsDeStatus,
  clientes,
  empreendimentos,
  comentarios,
  type User, 
  type InsertUser, 
  type Projeto,
  type InsertProjeto,
  type TipoVideo,
  type InsertTipoVideo,
  type Tag,
  type InsertTag,
  type LogStatus,
  type InsertLogStatus,
  type Cliente,
  type InsertCliente,
  type Empreendimento,
  type InsertEmpreendimento,
  type EmpreendimentoWithRelations,
  type ProjetoWithRelations,
  type Comentario,
  type InsertComentario,
  type ComentarioWithRelations
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, asc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: any;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Projetos
  getProjetos(filters?: {
    status?: string;
    responsavelId?: string;
    tipoVideoId?: string;
    prioridade?: string;
    search?: string;
  }): Promise<ProjetoWithRelations[]>;
  getProjeto(id: string): Promise<ProjetoWithRelations | undefined>;
  createProjeto(projeto: InsertProjeto): Promise<Projeto>;
  updateProjeto(id: string, projeto: Partial<InsertProjeto>): Promise<Projeto>;
  deleteProjeto(id: string): Promise<void>;
  
  // Tipos de Video
  getTiposDeVideo(): Promise<TipoVideo[]>;
  createTipoVideo(tipo: InsertTipoVideo): Promise<TipoVideo>;
  updateTipoVideo(id: string, tipo: Partial<InsertTipoVideo>): Promise<TipoVideo>;
  deleteTipoVideo(id: string): Promise<void>;
  
  // Tags
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, tag: Partial<InsertTag>): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  
  // Clientes
  getClientes(): Promise<Cliente[]>;
  getCliente(id: string): Promise<Cliente | undefined>;
  createCliente(cliente: InsertCliente): Promise<Cliente>;
  updateCliente(id: string, cliente: Partial<InsertCliente>): Promise<Cliente>;
  deleteCliente(id: string): Promise<void>;
  
  // Empreendimentos
  getEmpreendimentos(): Promise<EmpreendimentoWithRelations[]>;
  getEmpreendimento(id: string): Promise<EmpreendimentoWithRelations | undefined>;
  createEmpreendimento(empreendimento: InsertEmpreendimento): Promise<Empreendimento>;
  updateEmpreendimento(id: string, empreendimento: Partial<InsertEmpreendimento>): Promise<Empreendimento>;
  deleteEmpreendimento(id: string): Promise<void>;
  
  // Logs de Status
  createLogStatus(log: InsertLogStatus): Promise<LogStatus>;
  getLogsByProjeto(projetoId: string): Promise<LogStatus[]>;
  
  // Comentários
  getComentariosByProjeto(projetoId: string): Promise<ComentarioWithRelations[]>;
  createComentario(comentario: InsertComentario): Promise<Comentario>;
  updateComentario(id: string, comentario: Partial<InsertComentario>): Promise<Comentario>;
  deleteComentario(id: string): Promise<void>;
  
  // Métricas
  getMetricas(): Promise<{
    totalProjetos: number;
    projetosAprovados: number;
    projetosAtivos: number;
    videosPorCliente: Record<string, number>;
    projetosPorStatus: Record<string, number>;
    projetosPorResponsavel: Record<string, number>;
    projetosPorTipo: Record<string, number>;
    projetosAtrasados: number;
  }>;
  
  // Seeds
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: "session"
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.ativo, true));
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    // Hash password if it's being updated
    if (updates.password) {
      const crypto = await import("crypto");
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(updates.password, salt, 64).toString("hex");
      updates.password = `${hash}.${salt}`;
    }

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // Check if user has projects as responsible
    const userProjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(eq(projetos.responsavelId, id));
    
    const projectCount = Number(userProjects[0]?.count) || 0;
    if (projectCount > 0) {
      throw new Error(`Não é possível excluir este usuário pois ele é responsável por ${projectCount} projeto(s). Reatribua os projetos primeiro.`);
    }

    // Use soft delete to preserve historical data (comments, logs, etc.)
    // Mark user as inactive instead of deleting
    await db
      .update(users)
      .set({ ativo: false })
      .where(eq(users.id, id));
  }

  async getProjetos(filters?: {
    status?: string;
    responsavelId?: string;
    tipoVideoId?: string;
    prioridade?: string;
    search?: string;
  }): Promise<ProjetoWithRelations[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(projetos.status, filters.status as any));
    }
    if (filters?.responsavelId) {
      conditions.push(eq(projetos.responsavelId, filters.responsavelId));
    }
    if (filters?.tipoVideoId) {
      conditions.push(eq(projetos.tipoVideoId, filters.tipoVideoId));
    }
    if (filters?.prioridade) {
      conditions.push(eq(projetos.prioridade, filters.prioridade as any));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(projetos.titulo, `%${filters.search}%`),
          like(projetos.descricao, `%${filters.search}%`),
          like(clientes.nome, `%${filters.search}%`)
        )
      );
    }

    let query = db
      .select()
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .leftJoin(empreendimentos, eq(projetos.empreendimentoId, empreendimentos.id))
      .orderBy(desc(projetos.dataCriacao));

    if (conditions.length > 0) {
      query = db
        .select()
        .from(projetos)
        .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
        .leftJoin(users, eq(projetos.responsavelId, users.id))
        .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
        .leftJoin(empreendimentos, eq(projetos.empreendimentoId, empreendimentos.id))
        .where(and(...conditions))
        .orderBy(desc(projetos.dataCriacao));
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.projetos,
      tipoVideo: row.tipos_de_video!,
      responsavel: row.users!,
      cliente: row.clientes || undefined,
      empreendimento: row.empreendimentos || undefined,
    }));
  }

  async getProjeto(id: string): Promise<ProjetoWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .leftJoin(empreendimentos, eq(projetos.empreendimentoId, empreendimentos.id))
      .where(eq(projetos.id, id));

    if (!result) return undefined;

    return {
      ...result.projetos,
      tipoVideo: result.tipos_de_video!,
      responsavel: result.users!,
      cliente: result.clientes || undefined,
      empreendimento: result.empreendimentos || undefined,
    };
  }

  async createProjeto(projeto: InsertProjeto): Promise<Projeto> {
    const [newProjeto] = await db
      .insert(projetos)
      .values(projeto)
      .returning();
    return newProjeto;
  }

  async updateProjeto(id: string, projeto: Partial<InsertProjeto>): Promise<Projeto> {
    const [updatedProjeto] = await db
      .update(projetos)
      .set(projeto)
      .where(eq(projetos.id, id))
      .returning();
    return updatedProjeto;
  }

  async deleteProjeto(id: string): Promise<void> {
    // Use transaction to ensure atomic deletion (all-or-nothing)
    await db.transaction(async (tx) => {
      // First delete all related comments
      await tx.delete(comentarios).where(eq(comentarios.projetoId, id));
      
      // Then delete all related status logs
      await tx.delete(logsDeStatus).where(eq(logsDeStatus.projetoId, id));
      
      // Finally delete the project
      await tx.delete(projetos).where(eq(projetos.id, id));
    });
  }

  async getTiposDeVideo(): Promise<TipoVideo[]> {
    return await db.select().from(tiposDeVideo).orderBy(asc(tiposDeVideo.nome));
  }

  async createTipoVideo(tipo: InsertTipoVideo): Promise<TipoVideo> {
    const [newTipo] = await db
      .insert(tiposDeVideo)
      .values(tipo)
      .returning();
    return newTipo;
  }

  async updateTipoVideo(id: string, tipo: Partial<InsertTipoVideo>): Promise<TipoVideo> {
    const [updatedTipo] = await db
      .update(tiposDeVideo)
      .set(tipo)
      .where(eq(tiposDeVideo.id, id))
      .returning();
    return updatedTipo;
  }

  async deleteTipoVideo(id: string): Promise<void> {
    // Verificar se há projetos associados a este tipo de vídeo
    const projetosDoTipo = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(eq(projetos.tipoVideoId, id));
    
    const count = projetosDoTipo[0]?.count || 0;
    if (count > 0) {
      throw new Error(`Não é possível excluir este tipo de vídeo pois ele possui ${count} projeto(s) associado(s). Remova os projetos primeiro.`);
    }
    
    await db.delete(tiposDeVideo).where(eq(tiposDeVideo.id, id));
  }

  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(asc(tags.nome));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db
      .insert(tags)
      .values(tag)
      .returning();
    return newTag;
  }

  async updateTag(id: string, tag: Partial<InsertTag>): Promise<Tag> {
    const [updatedTag] = await db
      .update(tags)
      .set(tag)
      .where(eq(tags.id, id))
      .returning();
    return updatedTag;
  }

  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  async getClientes(): Promise<Cliente[]> {
    return await db.select().from(clientes).orderBy(asc(clientes.nome));
  }

  async getCliente(id: string): Promise<Cliente | undefined> {
    const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));
    return cliente;
  }

  async createCliente(cliente: InsertCliente): Promise<Cliente> {
    const [newCliente] = await db
      .insert(clientes)
      .values(cliente)
      .returning();
    return newCliente;
  }

  async updateCliente(id: string, cliente: Partial<InsertCliente>): Promise<Cliente> {
    const [updatedCliente] = await db
      .update(clientes)
      .set(cliente)
      .where(eq(clientes.id, id))
      .returning();
    return updatedCliente;
  }

  async deleteCliente(id: string): Promise<void> {
    // Verificar se há projetos associados a este cliente
    const projetosDoCliente = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(eq(projetos.clienteId, id));
    
    const count = projetosDoCliente[0]?.count || 0;
    if (count > 0) {
      throw new Error(`Não é possível excluir este cliente pois ele possui ${count} projeto(s) associado(s). Remova os projetos primeiro.`);
    }
    
    // Verificar se há empreendimentos associados a este cliente
    const empreendimentosDoCliente = await db
      .select({ count: sql<number>`count(*)` })
      .from(empreendimentos)
      .where(eq(empreendimentos.clienteId, id));
    
    const countEmpreendimentos = empreendimentosDoCliente[0]?.count || 0;
    if (countEmpreendimentos > 0) {
      throw new Error(`Não é possível excluir este cliente pois ele possui ${countEmpreendimentos} empreendimento(s) associado(s). Remova os empreendimentos primeiro.`);
    }
    
    await db.delete(clientes).where(eq(clientes.id, id));
  }

  async getEmpreendimentos(): Promise<EmpreendimentoWithRelations[]> {
    const result = await db
      .select()
      .from(empreendimentos)
      .leftJoin(clientes, eq(empreendimentos.clienteId, clientes.id))
      .orderBy(asc(empreendimentos.nome));
    
    return result.map(row => ({
      ...row.empreendimentos,
      cliente: row.clientes!,
    }));
  }

  async getEmpreendimento(id: string): Promise<EmpreendimentoWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(empreendimentos)
      .leftJoin(clientes, eq(empreendimentos.clienteId, clientes.id))
      .where(eq(empreendimentos.id, id));

    if (!result) return undefined;

    return {
      ...result.empreendimentos,
      cliente: result.clientes!,
    };
  }

  async createEmpreendimento(empreendimento: InsertEmpreendimento): Promise<Empreendimento> {
    const [newEmpreendimento] = await db
      .insert(empreendimentos)
      .values(empreendimento)
      .returning();
    return newEmpreendimento;
  }

  async updateEmpreendimento(id: string, empreendimento: Partial<InsertEmpreendimento>): Promise<Empreendimento> {
    const [updatedEmpreendimento] = await db
      .update(empreendimentos)
      .set(empreendimento)
      .where(eq(empreendimentos.id, id))
      .returning();
    return updatedEmpreendimento;
  }

  async deleteEmpreendimento(id: string): Promise<void> {
    // Verificar se há projetos associados a este empreendimento (quando implementarmos)
    // Por enquanto, apenas deletar o empreendimento
    await db.delete(empreendimentos).where(eq(empreendimentos.id, id));
  }

  async createLogStatus(log: InsertLogStatus): Promise<LogStatus> {
    const [newLog] = await db
      .insert(logsDeStatus)
      .values(log)
      .returning();
    return newLog;
  }

  async getLogsByProjeto(projetoId: string): Promise<LogStatus[]> {
    return await db
      .select()
      .from(logsDeStatus)
      .where(eq(logsDeStatus.projetoId, projetoId))
      .orderBy(desc(logsDeStatus.dataHora));
  }

  async getComentariosByProjeto(projetoId: string): Promise<ComentarioWithRelations[]> {
    const results = await db
      .select()
      .from(comentarios)
      .leftJoin(users, eq(comentarios.autorId, users.id))
      .where(eq(comentarios.projetoId, projetoId))
      .orderBy(desc(comentarios.createdAt));

    return results.map(row => ({
      ...row.comentarios,
      autor: row.users!,
    }));
  }

  async createComentario(comentario: InsertComentario): Promise<Comentario> {
    const [newComentario] = await db
      .insert(comentarios)
      .values(comentario)
      .returning();
    return newComentario;
  }

  async updateComentario(id: string, comentario: Partial<InsertComentario>): Promise<Comentario> {
    const [updatedComentario] = await db
      .update(comentarios)
      .set(comentario)
      .where(eq(comentarios.id, id))
      .returning();
    return updatedComentario;
  }

  async deleteComentario(id: string): Promise<void> {
    await db.delete(comentarios).where(eq(comentarios.id, id));
  }

  async getMetricas() {
    // Total de Projetos: total menos "Aprovado"
    const totalProjetos = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(sql`${projetos.status} != 'Aprovado'`);

    // Projetos Aprovados: apenas os "Aprovado"
    const projetosAprovados = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(sql`${projetos.status} = 'Aprovado'`);

    // Projetos Ativos: total menos "Aprovado" e "Briefing"
    const projetosAtivos = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(sql`${projetos.status} NOT IN ('Aprovado', 'Briefing')`);

    // Vídeos por Cliente: contagem agrupada por cliente (excluindo Aprovados)
    const videosPorCliente = await db
      .select({
        cliente: clientes.nome,
        count: sql<number>`count(*)`
      })
      .from(projetos)
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .where(sql`${projetos.status} != 'Aprovado'`)
      .groupBy(clientes.nome);

    // Resumo por Status: todos os status
    const projetosPorStatus = await db
      .select({
        status: projetos.status,
        count: sql<number>`count(*)`
      })
      .from(projetos)
      .groupBy(projetos.status);

    // Por Responsável: excluindo projetos Aprovados
    const projetosPorResponsavel = await db
      .select({
        responsavel: users.nome,
        count: sql<number>`count(*)`
      })
      .from(projetos)
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .where(sql`${projetos.status} != 'Aprovado'`)
      .groupBy(users.nome);

    // Por Tipo de Vídeo: excluindo projetos Aprovados
    const projetosPorTipo = await db
      .select({
        tipo: tiposDeVideo.nome,
        count: sql<number>`count(*)`
      })
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .where(sql`${projetos.status} != 'Aprovado'`)
      .groupBy(tiposDeVideo.nome);

    const projetosAtrasados = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(
        and(
          sql`DATE(${projetos.dataPrevistaEntrega}) < CURRENT_DATE`,
          sql`${projetos.status} NOT IN ('Aprovado', 'Cancelado')`
        )
      );

    return {
      totalProjetos: totalProjetos[0]?.count || 0,
      projetosAprovados: projetosAprovados[0]?.count || 0,
      projetosAtivos: projetosAtivos[0]?.count || 0,
      videosPorCliente: Object.fromEntries(
        videosPorCliente.map(item => [item.cliente || "Sem cliente", item.count])
      ),
      projetosPorStatus: Object.fromEntries(
        projetosPorStatus.map(item => [item.status, item.count])
      ),
      projetosPorResponsavel: Object.fromEntries(
        projetosPorResponsavel.map(item => [item.responsavel || "Sem responsável", item.count])
      ),
      projetosPorTipo: Object.fromEntries(
        projetosPorTipo.map(item => [item.tipo || "Sem tipo", item.count])
      ),
      projetosAtrasados: projetosAtrasados[0]?.count || 0,
    };
  }

  async seedData(): Promise<void> {
    // Seed tipos de video
    const tiposData = [
      { nome: "Institucional", backgroundColor: "#2563eb", textColor: "#ffffff" },
      { nome: "Comercial", backgroundColor: "#dc2626", textColor: "#ffffff" },
      { nome: "Tutorial", backgroundColor: "#16a34a", textColor: "#ffffff" },
      { nome: "Evento", backgroundColor: "#9333ea", textColor: "#ffffff" },
      { nome: "Webinar", backgroundColor: "#ea580c", textColor: "#ffffff" }
    ];

    for (const tipo of tiposData) {
      try {
        await this.createTipoVideo(tipo);
      } catch (error) {
        // Ignore if already exists
      }
    }

    // Seed tags
    const tagsData = [
      { nome: "Marketing", backgroundColor: "#ef4444", textColor: "#ffffff" },
      { nome: "Vendas", backgroundColor: "#10b981", textColor: "#ffffff" },
      { nome: "Educação", backgroundColor: "#3b82f6", textColor: "#ffffff" },
      { nome: "Produto", backgroundColor: "#8b5cf6", textColor: "#ffffff" },
      { nome: "Evento", backgroundColor: "#f59e0b", textColor: "#000000" },
      { nome: "Tech", backgroundColor: "#6b7280", textColor: "#ffffff" },
      { nome: "Q1", backgroundColor: "#06b6d4", textColor: "#ffffff" },
      { nome: "Promo", backgroundColor: "#ec4899", textColor: "#ffffff" }
    ];

    for (const tag of tagsData) {
      try {
        await this.createTag(tag);
      } catch (error) {
        // Ignore if already exists
      }
    }
  }
}

export const storage = new DatabaseStorage();
