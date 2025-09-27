import { 
  users, 
  projetos, 
  tiposDeVideo, 
  tags, 
  logsDeStatus,
  clientes,
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
  type ProjetoWithRelations
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
  
  // Tags
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  
  // Clientes
  getClientes(): Promise<Cliente[]>;
  getCliente(id: string): Promise<Cliente | undefined>;
  createCliente(cliente: InsertCliente): Promise<Cliente>;
  updateCliente(id: string, cliente: Partial<InsertCliente>): Promise<Cliente>;
  deleteCliente(id: string): Promise<void>;
  
  // Logs de Status
  createLogStatus(log: InsertLogStatus): Promise<LogStatus>;
  getLogsByProjeto(projetoId: string): Promise<LogStatus[]>;
  
  // Métricas
  getMetricas(): Promise<{
    totalProjetos: number;
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

  async getProjetos(filters?: {
    status?: string;
    responsavelId?: string;
    tipoVideoId?: string;
    prioridade?: string;
    search?: string;
  }): Promise<ProjetoWithRelations[]> {
    let query = db
      .select()
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id));

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

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(desc(projetos.dataCriacao));
    
    return result.map(row => ({
      ...row.projetos,
      tipoVideo: row.tipos_de_video!,
      responsavel: row.users!,
      cliente: row.clientes || undefined,
    }));
  }

  async getProjeto(id: string): Promise<ProjetoWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .where(eq(projetos.id, id));

    if (!result) return undefined;

    return {
      ...result.projetos,
      tipoVideo: result.tipos_de_video!,
      responsavel: result.users!,
      cliente: result.clientes || undefined,
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
    // First delete all related status logs
    await db.delete(logsDeStatus).where(eq(logsDeStatus.projetoId, id));
    
    // Then delete the project
    await db.delete(projetos).where(eq(projetos.id, id));
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
    await db.delete(clientes).where(eq(clientes.id, id));
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

  async getMetricas() {
    // Contar apenas projetos ativos (excluindo "Aprovado")
    const totalProjetos = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(sql`${projetos.status} != 'Aprovado'`);

    const projetosPorStatus = await db
      .select({
        status: projetos.status,
        count: sql<number>`count(*)`
      })
      .from(projetos)
      .groupBy(projetos.status);

    const projetosPorResponsavel = await db
      .select({
        responsavel: users.nome,
        count: sql<number>`count(*)`
      })
      .from(projetos)
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .groupBy(users.nome);

    const projetosPorTipo = await db
      .select({
        tipo: tiposDeVideo.nome,
        count: sql<number>`count(*)`
      })
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .groupBy(tiposDeVideo.nome);

    const projetosAtrasados = await db
      .select({ count: sql<number>`count(*)` })
      .from(projetos)
      .where(
        and(
          sql`${projetos.dataPrevistaEntrega} < NOW()`,
          sql`${projetos.status} NOT IN ('Aprovado', 'Cancelado')`
        )
      );

    return {
      totalProjetos: totalProjetos[0]?.count || 0,
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
      { nome: "Institucional" },
      { nome: "Comercial" },
      { nome: "Tutorial" },
      { nome: "Evento" },
      { nome: "Webinar" }
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
      { nome: "Marketing" },
      { nome: "Vendas" },
      { nome: "Educação" },
      { nome: "Produto" },
      { nome: "Evento" },
      { nome: "Tech" },
      { nome: "Q1" },
      { nome: "Promo" }
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
