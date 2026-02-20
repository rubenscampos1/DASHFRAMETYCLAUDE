import {
  users,
  projetos,
  tiposDeVideo,
  tags,
  logsDeStatus,
  clientes,
  empreendimentos,
  comentarios,
  notas,
  timelapses,
  locutores,
  estilosLocucao,
  amostrasLocutores,
  projetoMusicas,
  projetoLocutores,
  respostasNps,
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
  type ComentarioWithRelations,
  type Nota,
  type InsertNota,
  type Timelapse,
  type InsertTimelapse,
  type TimelapseWithRelations,
  type Locutor,
  type InsertLocutor,
  type LocutorWithRelations,
  type EstiloLocucao,
  type InsertEstiloLocucao,
  type AmostraLocutor,
  type InsertAmostraLocutor,
  type ProjetoMusica,
  type InsertProjetoMusica,
  type ProjetoLocutor,
  type InsertProjetoLocutor,
  type ProjetoLocutorWithRelations,
  type RespostaNps,
  type InsertRespostaNps,
  roteiroComentarios,
  type RoteiroComentario,
  type InsertRoteiroComentario,
  videosProjeto,
  videoComentarios,
  videoPastas,
  type VideoProjeto,
  type InsertVideoProjeto,
  type VideoProjetoWithRelations,
  type VideoComentario,
  type InsertVideoComentario,
  type VideoComentarioWithRelations,
  type VideoPasta,
  type InsertVideoPasta,
  type VideoPastaWithRelations,
  type ProjetoKanbanLight, // FASE 2B: Tipo leve para Kanban
  tokensAcesso,
  type TokenAcesso,
  type InsertTokenAcesso,
  captadorLinks,
  captadorUploads,
  type CaptadorLink,
  type InsertCaptadorLink,
  type CaptadorUpload,
  type InsertCaptadorUpload,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, asc, sql, gte, lte, lt, max, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { nanoid } from "nanoid";

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
    dataInicioAprovacao?: string;
    dataFimAprovacao?: string;
  }): Promise<ProjetoWithRelations[]>;
  getProjeto(id: string): Promise<ProjetoWithRelations | undefined>;

  // FASE 2B: Endpoint leve para Kanban (apenas campos necessários para cards)
  getProjetosKanbanLight(filters?: {
    status?: string;
    responsavelId?: string;
    tipoVideoId?: string;
    prioridade?: string;
    search?: string;
  }): Promise<ProjetoKanbanLight[]>;

  createProjeto(projeto: InsertProjeto): Promise<Projeto>;
  updateProjeto(id: string, projeto: Partial<InsertProjeto>): Promise<Projeto>;
  deleteProjeto(id: string): Promise<void>;
  duplicarProjeto(id: string): Promise<Projeto>;

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

  // Notas
  getNotas(usuarioId?: string, filters?: { tipo?: string; categoria?: string; favorito?: boolean }): Promise<Nota[]>;
  getNota(id: string): Promise<Nota | undefined>;
  createNota(nota: InsertNota): Promise<Nota>;
  updateNota(id: string, nota: Partial<InsertNota>): Promise<Nota>;
  deleteNota(id: string): Promise<void>;

  // Métricas
  getMetricas(): Promise<{
    totalProjetos: number;
    projetosAprovados: number;
    projetosAtivos: number;
    projetosPorCliente: Record<string, number>;
    projetosPorStatus: Record<string, number>;
    projetosPorResponsavel: Record<string, number>;
    projetosPorTipoVideo: Record<string, number>;
    projetosAtrasados: number;
  }>;

  // Estilos de Locução
  getEstilosLocucao(): Promise<EstiloLocucao[]>;
  getEstiloLocucao(id: string): Promise<EstiloLocucao | undefined>;
  createEstiloLocucao(estilo: InsertEstiloLocucao): Promise<EstiloLocucao>;
  updateEstiloLocucao(id: string, estilo: Partial<InsertEstiloLocucao>): Promise<EstiloLocucao>;
  deleteEstiloLocucao(id: string): Promise<void>;

  // Locutores
  getLocutores(filters?: { genero?: string; faixaEtaria?: string; idioma?: string }): Promise<LocutorWithRelations[]>;
  getLocutor(id: string): Promise<LocutorWithRelations | undefined>;
  createLocutor(locutor: InsertLocutor): Promise<Locutor>;
  updateLocutor(id: string, locutor: Partial<InsertLocutor>): Promise<Locutor>;
  deleteLocutor(id: string): Promise<void>;

  // Amostras de Locutores
  getAmostrasLocutor(locutorId: string): Promise<AmostraLocutor[]>;
  getAmostraLocutor(id: string): Promise<AmostraLocutor | undefined>;
  createAmostraLocutor(amostra: InsertAmostraLocutor): Promise<AmostraLocutor>;
  updateAmostraLocutor(id: string, amostra: Partial<InsertAmostraLocutor>): Promise<AmostraLocutor>;
  deleteAmostraLocutor(id: string): Promise<void>;

  // Músicas do Projeto
  getProjetoMusicas(projetoId: string): Promise<ProjetoMusica[]>;
  getProjetoMusica(id: string): Promise<ProjetoMusica | undefined>;
  createProjetoMusica(musica: InsertProjetoMusica): Promise<ProjetoMusica>;
  updateProjetoMusica(id: string, musica: Partial<InsertProjetoMusica>): Promise<ProjetoMusica>;
  deleteProjetoMusica(id: string): Promise<void>;

  // Locutores do Projeto
  getProjetoLocutores(projetoId: string): Promise<ProjetoLocutorWithRelations[]>;
  getProjetoLocutor(id: string): Promise<ProjetoLocutor | undefined>;
  createProjetoLocutor(locutor: InsertProjetoLocutor): Promise<ProjetoLocutor>;
  updateProjetoLocutor(id: string, locutor: Partial<InsertProjetoLocutor>): Promise<ProjetoLocutor>;
  deleteProjetoLocutor(id: string): Promise<void>;

  // FASE 3: Batch queries para Portal do Cliente (evita N+1)
  getProjetosMusicasForProjetos(projetoIds: string[]): Promise<Record<string, ProjetoMusica[]>>;
  getProjetosLocutoresForProjetos(projetoIds: string[]): Promise<Record<string, ProjetoLocutorWithRelations[]>>;

  // Roteiro Comentários
  getRoteiroComentarios(projetoId: string): Promise<RoteiroComentario[]>;
  createRoteiroComentarios(projetoId: string, comentarios: Array<{ secao: string; comentario: string; sugestao?: string }>): Promise<RoteiroComentario[]>;

  // Portal do Cliente
  getProjetoByClientToken(token: string): Promise<ProjetoWithRelations | undefined>;
  getClienteByPortalToken(token: string): Promise<{ cliente: Cliente; projetos: ProjetoWithRelations[] } | undefined>;
  aprovarMusica(token: string, aprovado: boolean, feedback?: string): Promise<Projeto>;
  aprovarLocucao(token: string, aprovado: boolean, feedback?: string): Promise<Projeto>;
  aprovarVideoFinal(token: string, aprovado: boolean, feedback?: string): Promise<Projeto>;
  aprovarRoteiro(token: string, aprovado: boolean, feedback?: string, comentariosData?: Array<{ secao: string; comentario: string; sugestao?: string }>): Promise<Projeto>;
  reenviarRoteiro(projetoId: string): Promise<Projeto>;
  regenerarClientToken(projetoId: string): Promise<string>;

  // Tokens de Acesso (API)
  getTokensAcesso(): Promise<TokenAcesso[]>;
  getTokenAcessoByToken(token: string): Promise<TokenAcesso | undefined>;
  createTokenAcesso(data: InsertTokenAcesso): Promise<TokenAcesso>;
  updateTokenAcesso(id: string, data: Partial<InsertTokenAcesso>): Promise<TokenAcesso>;
  deleteTokenAcesso(id: string): Promise<void>;

  // Captador Links
  getCaptadorLinkByToken(token: string): Promise<CaptadorLink | undefined>;
  getCaptadorLinksByProjeto(projetoId: string): Promise<CaptadorLink[]>;
  createCaptadorLink(link: InsertCaptadorLink): Promise<CaptadorLink>;
  updateCaptadorLink(id: string, data: Partial<InsertCaptadorLink>): Promise<CaptadorLink>;
  deleteCaptadorLink(id: string): Promise<void>;

  // Captador Uploads
  getCaptadorUploadsByLink(linkId: string): Promise<CaptadorUpload[]>;
  getCaptadorUploadsByProjeto(projetoId: string): Promise<CaptadorUpload[]>;
  createCaptadorUpload(upload: InsertCaptadorUpload): Promise<CaptadorUpload>;
  deleteCaptadorUpload(id: string): Promise<void>;

  // Seeds
  seedData(): Promise<void>;
}

// ========== FASE 4: HELPER PARA CONSISTÊNCIA BATCH VS N+1 ==========
// Função auxiliar para garantir que batch e N+1 retornem exatamente o mesmo formato
function buildProjetoLocutorWithRelations(
  projetoLocutor: ProjetoLocutor,
  locutor: Locutor,
  amostras: AmostraLocutor[]
): ProjetoLocutorWithRelations {
  return {
    ...projetoLocutor,
    projeto: {} as Projeto, // Projeto não é usado no portal, mantém vazio por compatibilidade
    locutor: {
      ...locutor,
      amostras,
    },
  };
}
// =================================================================

export class DatabaseStorage implements IStorage {
  public sessionStore: any;
  private db: typeof db;

  constructor() {
    this.db = db;
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
    dataInicioAprovacao?: string;
    dataFimAprovacao?: string;
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
      const searchConditions = [
        like(projetos.titulo, `%${filters.search}%`),
        like(projetos.descricao, `%${filters.search}%`),
        like(clientes.nome, `%${filters.search}%`)
      ];

      // Extract numeric value from search (supports #SKY42, SKY42, or 42)
      const numericMatch = filters.search.match(/\d+/);
      if (numericMatch) {
        const searchNumber = parseInt(numericMatch[0], 10);
        searchConditions.push(eq(projetos.sequencialId, searchNumber));
      }

      conditions.push(or(...searchConditions));
    }
    if (filters?.dataInicioAprovacao) {
      conditions.push(gte(projetos.dataAprovacao, new Date(filters.dataInicioAprovacao)));
    }
    if (filters?.dataFimAprovacao) {
      // Add one day to include the full end date
      const endDate = new Date(filters.dataFimAprovacao);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(projetos.dataAprovacao, endDate));
    }

    // Otimização: SELECT explícito excluindo campos pesados desnecessários
    // Campos excluídos: descricao, informacoesAdicionais, referencias, caminho
    // Reduz ~20-30% do volume de dados trafegados
    const selectFields = {
      id: projetos.id,
      sequencialId: projetos.sequencialId,
      titulo: projetos.titulo,
      // descricao: EXCLUÍDO (texto longo, carregado apenas no drawer)
      tipoVideoId: projetos.tipoVideoId,
      tags: projetos.tags,
      status: projetos.status,
      statusChangedAt: projetos.statusChangedAt,
      responsavelId: projetos.responsavelId,
      dataCriacao: projetos.dataCriacao,
      dataPrevistaEntrega: projetos.dataPrevistaEntrega,
      dataAprovacao: projetos.dataAprovacao,
      prioridade: projetos.prioridade,
      clienteId: projetos.clienteId,
      empreendimentoId: projetos.empreendimentoId,
      anexos: projetos.anexos,
      linkYoutube: projetos.linkYoutube,
      duracao: projetos.duracao,
      formato: projetos.formato,
      captacao: projetos.captacao,
      roteiro: projetos.roteiro,
      locucao: projetos.locucao,
      dataInterna: projetos.dataInterna,
      dataMeeting: projetos.dataMeeting,
      linkFrameIo: projetos.linkFrameIo,
      // caminho: EXCLUÍDO (path de arquivo, desnecessário)
      // referencias: EXCLUÍDO (texto longo, desnecessário)
      // informacoesAdicionais: EXCLUÍDO (texto longo, carregado apenas no drawer)
      npsScore: projetos.npsScore,
      npsContact: projetos.npsContact,
      npsResponsible: projetos.npsResponsible,
      clientToken: projetos.clientToken,
      musicaUrl: projetos.musicaUrl,
      musicaAprovada: projetos.musicaAprovada,
      musicaFeedback: projetos.musicaFeedback,
      musicaDataAprovacao: projetos.musicaDataAprovacao,
      musicaVisualizadaEm: projetos.musicaVisualizadaEm,
      locucaoUrl: projetos.locucaoUrl,
      locucaoAprovada: projetos.locucaoAprovada,
      locucaoFeedback: projetos.locucaoFeedback,
      locucaoDataAprovacao: projetos.locucaoDataAprovacao,
      locucaoVisualizadaEm: projetos.locucaoVisualizadaEm,
      videoFinalUrl: projetos.videoFinalUrl,
      videoFinalAprovado: projetos.videoFinalAprovado,
      videoFinalFeedback: projetos.videoFinalFeedback,
      videoFinalDataAprovacao: projetos.videoFinalDataAprovacao,
      videoFinalVisualizadoEm: projetos.videoFinalVisualizadoEm,
      enviadoCliente: projetos.enviadoCliente,
      // Roteiro
      roteiroLink: projetos.roteiroLink,
      roteiroAprovado: projetos.roteiroAprovado,
      roteiroFeedback: projetos.roteiroFeedback,
      roteiroDataAprovacao: projetos.roteiroDataAprovacao,
      roteiroVisualizadoEm: projetos.roteiroVisualizadoEm,
      // Contatos
      contatosEmail: projetos.contatosEmail,
      contatosWhatsapp: projetos.contatosWhatsapp,
      contatosGrupos: projetos.contatosGrupos,
    };

    let query = db
      .select({
        projetos: selectFields,
        tipos_de_video: tiposDeVideo,
        users: users,
        clientes: clientes,
        empreendimentos: empreendimentos,
        respostas_nps: respostasNps,
      })
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .leftJoin(empreendimentos, eq(projetos.empreendimentoId, empreendimentos.id))
      .leftJoin(respostasNps, eq(projetos.id, respostasNps.projetoId))
      .orderBy(desc(projetos.dataCriacao));

    if (conditions.length > 0) {
      query = db
        .select({
          projetos: selectFields,
          tipos_de_video: tiposDeVideo,
          users: users,
          clientes: clientes,
          empreendimentos: empreendimentos,
          respostas_nps: respostasNps,
        })
        .from(projetos)
        .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
        .leftJoin(users, eq(projetos.responsavelId, users.id))
        .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
        .leftJoin(empreendimentos, eq(projetos.empreendimentoId, empreendimentos.id))
        .leftJoin(respostasNps, eq(projetos.id, respostasNps.projetoId))
        .where(and(...conditions))
        .orderBy(desc(projetos.dataCriacao));
    }

    const startTime = performance.now();
    const result = await query;
    const duration = (performance.now() - startTime).toFixed(2);

    console.log(`⏱️ [SQL Performance] getProjetos: ${duration}ms (${result.length} projetos, ${conditions.length} filtros)`);

    return result.map(row => ({
      ...row.projetos,
      tipoVideo: row.tipos_de_video!,
      responsavel: row.users!,
      cliente: row.clientes || undefined,
      empreendimento: row.empreendimentos || undefined,
      respostaNps: row.respostas_nps || null,
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

  // ========== FASE 2B: ENDPOINT LEVE PARA KANBAN ==========
  // Query otimizada com SELECT apenas dos campos necessários para renderizar cards
  // Reduz drasticamente o volume de dados e acelera o processamento
  async getProjetosKanbanLight(filters?: {
    status?: string;
    responsavelId?: string;
    tipoVideoId?: string;
    prioridade?: string;
    search?: string;
  }): Promise<ProjetoKanbanLight[]> {
    const conditions = [];

    // Aplicar filtros (igual ao getProjetos original)
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
      const searchConditions = [
        like(projetos.titulo, `%${filters.search}%`),
        like(clientes.nome, `%${filters.search}%`)
      ];

      const numericMatch = filters.search.match(/\d+/);
      if (numericMatch) {
        const searchNumber = parseInt(numericMatch[0], 10);
        searchConditions.push(eq(projetos.sequencialId, searchNumber));
      }

      conditions.push(or(...searchConditions));
    }

    // Query otimizada: SELECT apenas campos necessários (não SELECT *)
    const startTime = performance.now();

    let query = db
      .select({
        // Campos do projeto (apenas os necessários)
        id: projetos.id,
        sequencialId: projetos.sequencialId,
        titulo: projetos.titulo,
        status: projetos.status,
        prioridade: projetos.prioridade,
        dataCriacao: projetos.dataCriacao,
        dataPrevistaEntrega: projetos.dataPrevistaEntrega,
        dataAprovacao: projetos.dataAprovacao,

        // Campos de aprovação do cliente (para badge de notificação)
        musicaAprovada: projetos.musicaAprovada,
        musicaVisualizadaEm: projetos.musicaVisualizadaEm,
        locucaoAprovada: projetos.locucaoAprovada,
        locucaoVisualizadaEm: projetos.locucaoVisualizadaEm,
        videoFinalAprovado: projetos.videoFinalAprovado,
        videoFinalVisualizadoEm: projetos.videoFinalVisualizadoEm,
        roteiroAprovado: projetos.roteiroAprovado,
        roteiroVisualizadoEm: projetos.roteiroVisualizadoEm,

        // Tipo de vídeo (apenas nome e cores)
        tipoVideoNome: tiposDeVideo.nome,
        tipoVideoBackgroundColor: tiposDeVideo.backgroundColor,
        tipoVideoTextColor: tiposDeVideo.textColor,

        // Responsável (apenas id e nome)
        responsavelId: users.id,
        responsavelNome: users.nome,

        // Cliente (apenas id e nome)
        clienteId: clientes.id,
        clienteNome: clientes.nome,
      })
      .from(projetos)
      // JOINs apenas das tabelas necessárias (tipoVideo, responsavel, cliente)
      // Sem join de empreendimentos (não usado no Kanban)
      // Sem join de respostasNps (não usado no Kanban)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .orderBy(desc(projetos.dataCriacao));

    // Aplicar filtros se houver
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    const duration = (performance.now() - startTime).toFixed(2);

    console.log(`⏱️ [SQL Performance] getProjetosKanbanLight: ${duration}ms (${result.length} projetos, ${conditions.length} filtros)`);

    // 🔔 DEBUG SININHO: Verificar se campos de aprovação estão vindo do banco
    const projetosComAprovacao = result.filter(r => r.musicaAprovada || r.locucaoAprovada || r.videoFinalAprovado || r.roteiroAprovado);

    // Mapear resultados para o tipo ProjetoKanbanLight
    return result.map(row => ({
      id: row.id,
      sequencialId: row.sequencialId,
      titulo: row.titulo,
      status: row.status,
      prioridade: row.prioridade,
      dataCriacao: row.dataCriacao,
      dataPrevistaEntrega: row.dataPrevistaEntrega,
      dataAprovacao: row.dataAprovacao,
      musicaAprovada: row.musicaAprovada,
      musicaVisualizadaEm: row.musicaVisualizadaEm,
      locucaoAprovada: row.locucaoAprovada,
      locucaoVisualizadaEm: row.locucaoVisualizadaEm,
      videoFinalAprovado: row.videoFinalAprovado,
      videoFinalVisualizadoEm: row.videoFinalVisualizadoEm,
      roteiroAprovado: row.roteiroAprovado,
      roteiroVisualizadoEm: row.roteiroVisualizadoEm,
      tipoVideo: {
        nome: row.tipoVideoNome!,
        backgroundColor: row.tipoVideoBackgroundColor!,
        textColor: row.tipoVideoTextColor!,
      },
      responsavel: {
        id: row.responsavelId!,
        nome: row.responsavelNome!,
      },
      cliente: row.clienteId ? {
        id: row.clienteId,
        nome: row.clienteNome!,
      } : null,
    }));
  }
  // ===========================================================

  async createProjeto(projeto: InsertProjeto): Promise<Projeto> {
    // Buscar o maior sequencialId existente
    const result = await db
      .select({ maxId: max(projetos.sequencialId) })
      .from(projetos);

    const maxSequencialId = result[0]?.maxId || 0;
    const nextSequencialId = maxSequencialId + 1;

    // Gerar token único para o cliente
    const clientToken = nanoid(32); // Token de 32 caracteres

    // Criar projeto com o próximo sequencialId e token do cliente
    const [newProjeto] = await db
      .insert(projetos)
      .values({
        ...projeto,
        sequencialId: nextSequencialId,
        clientToken,
      })
      .returning();

    // 🔥 BUSCAR projeto completo com TODOS os relacionamentos (tipoVideo, cliente, etc)
    const projetoCompleto = await this.getProjeto(newProjeto.id);
    return projetoCompleto || newProjeto;
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

  async duplicarProjeto(id: string): Promise<Projeto> {
    // Buscar projeto original
    const [projetoOriginal] = await db
      .select()
      .from(projetos)
      .where(eq(projetos.id, id));

    if (!projetoOriginal) {
      throw new Error("Projeto não encontrado");
    }

    // Criar cópia do projeto (novo ID, nova data de criação, mas MANTÉM o mesmo sequencialId)
    const novoProjeto = {
      titulo: projetoOriginal.titulo,
      descricao: projetoOriginal.descricao,
      tipoVideoId: projetoOriginal.tipoVideoId,
      tags: projetoOriginal.tags,
      status: projetoOriginal.status,
      responsavelId: projetoOriginal.responsavelId,
      dataPrevistaEntrega: projetoOriginal.dataPrevistaEntrega,
      prioridade: projetoOriginal.prioridade,
      clienteId: projetoOriginal.clienteId,
      empreendimentoId: projetoOriginal.empreendimentoId,
      anexos: projetoOriginal.anexos,
      linkYoutube: projetoOriginal.linkYoutube,
      duracao: projetoOriginal.duracao,
      formato: projetoOriginal.formato,
      captacao: projetoOriginal.captacao,
      roteiro: projetoOriginal.roteiro,
      locucao: projetoOriginal.locucao,
      dataInterna: projetoOriginal.dataInterna,
      dataMeeting: projetoOriginal.dataMeeting,
      linkFrameIo: projetoOriginal.linkFrameIo,
      caminho: projetoOriginal.caminho,
      referencias: projetoOriginal.referencias,
      informacoesAdicionais: projetoOriginal.informacoesAdicionais,
      npsScore: projetoOriginal.npsScore,
      npsContact: projetoOriginal.npsContact,
      npsResponsible: projetoOriginal.npsResponsible,
      sequencialId: projetoOriginal.sequencialId, // MANTÉM o mesmo ID sequencial
    };

    // Inserir projeto duplicado
    const [projetoDuplicado] = await db
      .insert(projetos)
      .values(novoProjeto)
      .returning();

    return projetoDuplicado;
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
    // Gerar portalToken único para o cliente acessar portal unificado
    const portalToken = nanoid(32);

    const [newCliente] = await db
      .insert(clientes)
      .values({
        ...cliente,
        portalToken, // Adicionar token do portal unificado
      })
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

  async getNotas(usuarioId?: string, filters?: { tipo?: string; categoria?: string; favorito?: boolean }): Promise<Nota[]> {
    const conditions = [];

    // Se usuarioId for passado, filtrar por ele (não usado mais, mas mantemos compatibilidade)
    if (usuarioId) {
      conditions.push(eq(notas.usuarioId, usuarioId));
    }

    if (filters?.tipo) {
      conditions.push(eq(notas.tipo, filters.tipo as any));
    }
    if (filters?.categoria) {
      conditions.push(eq(notas.categoria, filters.categoria));
    }
    if (filters?.favorito !== undefined) {
      conditions.push(eq(notas.favorito, filters.favorito));
    }

    const query = db.select().from(notas);
    const results = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(notas.updatedAt))
      : await query.orderBy(desc(notas.updatedAt));

    return results;
  }

  async getNota(id: string): Promise<Nota | undefined> {
    const [nota] = await db.select().from(notas).where(eq(notas.id, id));
    return nota;
  }

  async createNota(nota: InsertNota): Promise<Nota> {
    const [newNota] = await db.insert(notas).values(nota).returning();
    return newNota;
  }

  async updateNota(id: string, nota: Partial<InsertNota>): Promise<Nota> {
    const [updatedNota] = await db
      .update(notas)
      .set({ ...nota, updatedAt: new Date() })
      .where(eq(notas.id, id))
      .returning();
    return updatedNota;
  }

  async deleteNota(id: string): Promise<void> {
    await db.delete(notas).where(eq(notas.id, id));
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
      totalProjetos: Number(totalProjetos[0]?.count) || 0,
      projetosAprovados: Number(projetosAprovados[0]?.count) || 0,
      projetosAtivos: Number(projetosAtivos[0]?.count) || 0,
      projetosPorCliente: Object.fromEntries(
        videosPorCliente.map(item => [item.cliente || "Sem cliente", Number(item.count)])
      ),
      projetosPorStatus: Object.fromEntries(
        projetosPorStatus.map(item => [item.status, Number(item.count)])
      ),
      projetosPorResponsavel: Object.fromEntries(
        projetosPorResponsavel.map(item => [item.responsavel || "Sem responsável", Number(item.count)])
      ),
      projetosPorTipoVideo: Object.fromEntries(
        projetosPorTipo.map(item => [item.tipo || "Sem tipo", Number(item.count)])
      ),
      projetosAtrasados: Number(projetosAtrasados[0]?.count) || 0,
    };
  }

  // Timelapses
  async getTimelapses(): Promise<schema.TimelapseWithRelations[]> {
    return await this.db.query.timelapses.findMany({
      with: {
        cliente: true,
        empreendimento: {
          with: {
            cliente: true,
          },
        },
      },
      orderBy: (timelapses, { desc }) => [desc(timelapses.createdAt)],
    });
  }

  async getTimelapseById(id: string): Promise<TimelapseWithRelations | undefined> {
    return await this.db.query.timelapses.findFirst({
      where: eq(timelapses.id, id),
      with: {
        cliente: true,
        empreendimento: {
          with: {
            cliente: true,
          },
        },
      },
    });
  }

  async createTimelapse(data: InsertTimelapse): Promise<Timelapse> {
    const [timelapse] = await this.db
      .insert(timelapses)
      .values(data)
      .returning();
    return timelapse;
  }

  async updateTimelapse(id: string, data: Partial<InsertTimelapse>): Promise<Timelapse | undefined> {
    const [updated] = await this.db
      .update(timelapses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(timelapses.id, id))
      .returning();
    return updated;
  }

  async deleteTimelapse(id: string): Promise<void> {
    await this.db
      .delete(timelapses)
      .where(eq(timelapses.id, id));
  }

  // Estilos de Locução
  async getEstilosLocucao(): Promise<EstiloLocucao[]> {
    return await this.db.select().from(estilosLocucao);
  }

  async getEstiloLocucao(id: string): Promise<EstiloLocucao | undefined> {
    const [estilo] = await this.db
      .select()
      .from(estilosLocucao)
      .where(eq(estilosLocucao.id, id));
    return estilo;
  }

  async createEstiloLocucao(estilo: InsertEstiloLocucao): Promise<EstiloLocucao> {
    const [novoEstilo] = await this.db
      .insert(estilosLocucao)
      .values(estilo)
      .returning();
    return novoEstilo;
  }

  async updateEstiloLocucao(id: string, estilo: Partial<InsertEstiloLocucao>): Promise<EstiloLocucao> {
    const [updatedEstilo] = await this.db
      .update(estilosLocucao)
      .set(estilo)
      .where(eq(estilosLocucao.id, id))
      .returning();
    return updatedEstilo;
  }

  async deleteEstiloLocucao(id: string): Promise<void> {
    await this.db
      .delete(estilosLocucao)
      .where(eq(estilosLocucao.id, id));
  }

  // Locutores
  async getLocutores(filters?: { genero?: string; faixaEtaria?: string; idioma?: string }): Promise<LocutorWithRelations[]> {
    let query = this.db
      .select()
      .from(locutores)
      .leftJoin(amostrasLocutores, eq(locutores.id, amostrasLocutores.locutorId))
      .orderBy(sql`${locutores.nomeFicticio}`);

    if (filters?.genero) {
      query = query.where(eq(locutores.genero, filters.genero as any));
    }
    if (filters?.faixaEtaria) {
      query = query.where(eq(locutores.faixaEtaria, filters.faixaEtaria as any));
    }
    // Note: idioma filtering needs to be done in-memory since it's an array column
    // We'll filter after the query

    const results = await query;

    // Group amostras by locutor
    const locutoresMap = new Map<string, LocutorWithRelations>();

    for (const row of results) {
      const locutor = row.locutores;
      const amostra = row.amostras_locutores;

      if (!locutoresMap.has(locutor.id)) {
        locutoresMap.set(locutor.id, {
          ...locutor,
          amostras: [],
        });
      }

      if (amostra) {
        locutoresMap.get(locutor.id)!.amostras.push(amostra);
      }
    }

    let locutoresList = Array.from(locutoresMap.values());

    // Filter by idioma if specified (in-memory filtering for array column)
    if (filters?.idioma) {
      locutoresList = locutoresList.filter(locutor =>
        locutor.idiomas && locutor.idiomas.includes(filters.idioma!)
      );
    }

    return locutoresList;
  }

  async getLocutor(id: string): Promise<LocutorWithRelations | undefined> {
    const [locutor] = await this.db
      .select()
      .from(locutores)
      .where(eq(locutores.id, id));

    if (!locutor) return undefined;

    const amostras = await this.db
      .select()
      .from(amostrasLocutores)
      .where(eq(amostrasLocutores.locutorId, id))
      .orderBy(amostrasLocutores.ordem);

    return {
      ...locutor,
      amostras,
    };
  }

  async createLocutor(locutor: InsertLocutor): Promise<Locutor> {
    const [novoLocutor] = await this.db
      .insert(locutores)
      .values(locutor)
      .returning();
    return novoLocutor;
  }

  async updateLocutor(id: string, locutor: Partial<InsertLocutor>): Promise<Locutor> {
    const [updatedLocutor] = await this.db
      .update(locutores)
      .set({ ...locutor, updatedAt: new Date() })
      .where(eq(locutores.id, id))
      .returning();
    return updatedLocutor;
  }

  async deleteLocutor(id: string): Promise<void> {
    // Get all amostras to delete audio files from Supabase Storage
    const amostras = await this.db
      .select()
      .from(amostrasLocutores)
      .where(eq(amostrasLocutores.locutorId, id));

    // Delete audio files from Supabase Storage
    const { deleteLocutorAudioFromSupabase } = await import('./storage-helpers');
    for (const amostra of amostras) {
      await deleteLocutorAudioFromSupabase(amostra.arquivoUrl);
    }

    // Delete locutor (CASCADE will delete amostras and projeto_locutores in DB)
    await this.db
      .delete(locutores)
      .where(eq(locutores.id, id));
  }

  // Amostras de Locutores
  async getAmostrasLocutor(locutorId: string): Promise<AmostraLocutor[]> {
    return await this.db
      .select()
      .from(amostrasLocutores)
      .where(eq(amostrasLocutores.locutorId, locutorId))
      .orderBy(amostrasLocutores.ordem);
  }

  async getAmostraLocutor(id: string): Promise<AmostraLocutor | undefined> {
    const [amostra] = await this.db
      .select()
      .from(amostrasLocutores)
      .where(eq(amostrasLocutores.id, id));
    return amostra;
  }

  async createAmostraLocutor(amostra: InsertAmostraLocutor): Promise<AmostraLocutor> {
    const [novaAmostra] = await this.db
      .insert(amostrasLocutores)
      .values(amostra)
      .returning();
    return novaAmostra;
  }

  async updateAmostraLocutor(id: string, amostra: Partial<InsertAmostraLocutor>): Promise<AmostraLocutor> {
    const [updatedAmostra] = await this.db
      .update(amostrasLocutores)
      .set(amostra)
      .where(eq(amostrasLocutores.id, id))
      .returning();
    return updatedAmostra;
  }

  async deleteAmostraLocutor(id: string): Promise<void> {
    await this.db
      .delete(amostrasLocutores)
      .where(eq(amostrasLocutores.id, id));
  }

  // Músicas do Projeto
  async getProjetoMusicas(projetoId: string): Promise<ProjetoMusica[]> {
    return await this.db
      .select()
      .from(projetoMusicas)
      .where(eq(projetoMusicas.projetoId, projetoId))
      .orderBy(projetoMusicas.ordem);
  }

  async getProjetoMusica(id: string): Promise<ProjetoMusica | undefined> {
    const [musica] = await this.db
      .select()
      .from(projetoMusicas)
      .where(eq(projetoMusicas.id, id));
    return musica;
  }

  async createProjetoMusica(musica: InsertProjetoMusica): Promise<ProjetoMusica> {
    const [novaMusica] = await this.db
      .insert(projetoMusicas)
      .values(musica)
      .returning();
    return novaMusica;
  }

  async updateProjetoMusica(id: string, musica: Partial<InsertProjetoMusica>): Promise<ProjetoMusica> {
    const [updatedMusica] = await this.db
      .update(projetoMusicas)
      .set(musica)
      .where(eq(projetoMusicas.id, id))
      .returning();
    return updatedMusica;
  }

  async deleteProjetoMusica(id: string): Promise<void> {
    await this.db
      .delete(projetoMusicas)
      .where(eq(projetoMusicas.id, id));
  }

  // Locutores do Projeto
  async getProjetoLocutores(projetoId: string): Promise<ProjetoLocutorWithRelations[]> {
    const result = await this.db
      .select({
        projetoLocutores,
        locutores,
      })
      .from(projetoLocutores)
      .leftJoin(locutores, eq(projetoLocutores.locutorId, locutores.id))
      .where(eq(projetoLocutores.projetoId, projetoId))
      .orderBy(projetoLocutores.ordem);

    // FASE 4: Buscar amostras de áudio para cada locutor
    // Usando helper para garantir consistência com batch query
    const locutoresWithAmostras = await Promise.all(
      result.map(async (row) => {
        const amostras = await this.db
          .select()
          .from(amostrasLocutores)
          .where(eq(amostrasLocutores.locutorId, row.locutores!.id))
          .orderBy(amostrasLocutores.ordem);

        return buildProjetoLocutorWithRelations(
          row.projetoLocutores,
          row.locutores!,
          amostras
        );
      })
    );

    return locutoresWithAmostras;
  }

  async getProjetoLocutor(id: string): Promise<ProjetoLocutor | undefined> {
    const [locutor] = await this.db
      .select()
      .from(projetoLocutores)
      .where(eq(projetoLocutores.id, id));
    return locutor;
  }

  async createProjetoLocutor(locutor: InsertProjetoLocutor): Promise<ProjetoLocutor> {
    const [novoLocutor] = await this.db
      .insert(projetoLocutores)
      .values(locutor)
      .returning();
    return novoLocutor;
  }

  async updateProjetoLocutor(id: string, locutor: Partial<InsertProjetoLocutor>): Promise<ProjetoLocutor> {
    const [updatedLocutor] = await this.db
      .update(projetoLocutores)
      .set(locutor)
      .where(eq(projetoLocutores.id, id))
      .returning();
    return updatedLocutor;
  }

  async deleteProjetoLocutor(id: string): Promise<void> {
    await this.db
      .delete(projetoLocutores)
      .where(eq(projetoLocutores.id, id));
  }

  // ========== FASE 3B: BATCH QUERY PARA MÚSICAS ==========
  // Busca músicas de múltiplos projetos em uma única query
  // Evita N+1 ao buscar músicas projeto por projeto
  async getProjetosMusicasForProjetos(projetoIds: string[]): Promise<Record<string, ProjetoMusica[]>> {
    if (projetoIds.length === 0) {
      return {};
    }

    const startTime = performance.now();

    // Single query for all músicas of all projects
    const result = await this.db
      .select()
      .from(projetoMusicas)
      .where(inArray(projetoMusicas.projetoId, projetoIds))
      .orderBy(projetoMusicas.ordem);

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`⏱️ [SQL Performance - Batch] getProjetosMusicasForProjetos: ${duration}ms (${result.length} músicas para ${projetoIds.length} projetos)`);

    // Group músicas by projetoId in memory
    const musicasPorProjeto: Record<string, ProjetoMusica[]> = {};

    for (const musica of result) {
      if (!musicasPorProjeto[musica.projetoId]) {
        musicasPorProjeto[musica.projetoId] = [];
      }
      musicasPorProjeto[musica.projetoId].push(musica);
    }

    return musicasPorProjeto;
  }

  // ========== FASE 3C: BATCH QUERY PARA LOCUTORES ==========
  // Busca locutores + amostras de múltiplos projetos em apenas 2 queries
  // Evita N+1 duplo: 1 query por projeto + 1 query por locutor
  async getProjetosLocutoresForProjetos(projetoIds: string[]): Promise<Record<string, ProjetoLocutorWithRelations[]>> {
    if (projetoIds.length === 0) {
      return {};
    }

    const startTime = performance.now();

    // QUERY 1: Busca todos os locutores de todos os projetos
    const result = await this.db
      .select({
        projetoLocutores,
        locutores,
      })
      .from(projetoLocutores)
      .leftJoin(locutores, eq(projetoLocutores.locutorId, locutores.id))
      .where(inArray(projetoLocutores.projetoId, projetoIds))
      .orderBy(projetoLocutores.ordem);

    const query1Duration = (performance.now() - startTime).toFixed(2);
    console.log(`⏱️ [SQL Performance - Batch] getProjetosLocutoresForProjetos - Query 1 (locutores): ${query1Duration}ms (${result.length} locutores)`);

    // Extract all locutor IDs to fetch amostras in bulk
    const locutorIds = result
      .filter(row => row.locutores?.id)
      .map(row => row.locutores!.id);

    // QUERY 2: Busca todas as amostras de todos os locutores em uma única query
    const amostrasStartTime = performance.now();
    const amostras = locutorIds.length > 0
      ? await this.db
          .select()
          .from(amostrasLocutores)
          .where(inArray(amostrasLocutores.locutorId, locutorIds))
          .orderBy(amostrasLocutores.ordem)
      : [];

    const query2Duration = (performance.now() - amostrasStartTime).toFixed(2);
    console.log(`⏱️ [SQL Performance - Batch] getProjetosLocutoresForProjetos - Query 2 (amostras): ${query2Duration}ms (${amostras.length} amostras)`);

    // Group amostras by locutorId in memory
    const amostrasPorLocutor: Record<string, typeof amostras> = {};
    for (const amostra of amostras) {
      if (!amostrasPorLocutor[amostra.locutorId]) {
        amostrasPorLocutor[amostra.locutorId] = [];
      }
      amostrasPorLocutor[amostra.locutorId].push(amostra);
    }

    // FASE 4: Attach amostras to locutores and group by projetoId
    // Usando helper para garantir consistência com N+1 query
    const locutoresPorProjeto: Record<string, ProjetoLocutorWithRelations[]> = {};

    for (const row of result) {
      const projetoId = row.projetoLocutores.projetoId;

      if (!locutoresPorProjeto[projetoId]) {
        locutoresPorProjeto[projetoId] = [];
      }

      const locutorWithAmostras = buildProjetoLocutorWithRelations(
        row.projetoLocutores,
        row.locutores!,
        amostrasPorLocutor[row.locutores!.id] || []
      );

      locutoresPorProjeto[projetoId].push(locutorWithAmostras);
    }

    const totalDuration = (performance.now() - startTime).toFixed(2);
    console.log(`⏱️ [SQL Performance - Batch] getProjetosLocutoresForProjetos - TOTAL: ${totalDuration}ms (2 queries para ${projetoIds.length} projetos)`);

    return locutoresPorProjeto;
  }

  // ========== ROTEIRO COMENTÁRIOS ==========

  async getRoteiroComentarios(projetoId: string): Promise<RoteiroComentario[]> {
    return await db
      .select()
      .from(roteiroComentarios)
      .where(eq(roteiroComentarios.projetoId, projetoId))
      .orderBy(asc(roteiroComentarios.criadoEm));
  }

  async createRoteiroComentarios(
    projetoId: string,
    comentariosData: Array<{ secao: string; comentario: string; sugestao?: string }>
  ): Promise<RoteiroComentario[]> {
    if (comentariosData.length === 0) return [];

    const values = comentariosData.map(c => ({
      projetoId,
      secao: c.secao,
      comentario: c.comentario,
      sugestao: c.sugestao || null,
    }));

    const result = await db
      .insert(roteiroComentarios)
      .values(values)
      .returning();

    return result;
  }

  async aprovarRoteiro(
    token: string,
    aprovado: boolean,
    feedback?: string,
    comentariosData?: Array<{ secao: string; comentario: string; sugestao?: string }>
  ): Promise<Projeto> {
    // Buscar projeto pelo token
    const [projeto] = await db
      .select()
      .from(projetos)
      .where(eq(projetos.clientToken, token))
      .limit(1);

    if (!projeto) {
      throw new Error("Projeto não encontrado");
    }

    // Atualizar campos de aprovação do roteiro
    const [updatedProjeto] = await db
      .update(projetos)
      .set({
        roteiroAprovado: aprovado,
        roteiroFeedback: feedback || null,
        roteiroDataAprovacao: new Date(),
      })
      .where(eq(projetos.clientToken, token))
      .returning();

    // Criar comentários se houver
    if (comentariosData && comentariosData.length > 0) {
      // Limpar comentários anteriores antes de inserir novos
      await db
        .delete(roteiroComentarios)
        .where(eq(roteiroComentarios.projetoId, projeto.id));

      await this.createRoteiroComentarios(projeto.id, comentariosData);
    }

    return updatedProjeto;
  }

  async reenviarRoteiro(projetoId: string): Promise<Projeto> {
    const [updatedProjeto] = await db
      .update(projetos)
      .set({
        roteiroAprovado: sql`NULL`,
        roteiroFeedback: sql`NULL`,
        roteiroDataAprovacao: sql`NULL`,
        roteiroVisualizadoEm: sql`NULL`,
      } as any)
      .where(eq(projetos.id, projetoId))
      .returning();

    if (!updatedProjeto) {
      throw new Error("Projeto não encontrado");
    }

    return updatedProjeto;
  }

  // Métodos de NPS
  async createRespostaNps(resposta: InsertRespostaNps): Promise<RespostaNps> {
    const [novaResposta] = await this.db
      .insert(respostasNps)
      .values(resposta)
      .returning();
    return novaResposta;
  }

  async getRespostaNpsByProjeto(projetoId: string): Promise<RespostaNps | null> {
    const [resposta] = await this.db
      .select()
      .from(respostasNps)
      .where(eq(respostasNps.projetoId, projetoId))
      .limit(1);
    return resposta || null;
  }

  async getRespostasNpsByCliente(clienteId: string): Promise<RespostaNps[]> {
    return await this.db
      .select()
      .from(respostasNps)
      .where(eq(respostasNps.clienteId, clienteId));
  }

  async getAllRespostasNps(): Promise<RespostaNps[]> {
    return await this.db
      .select()
      .from(respostasNps)
      .orderBy(respostasNps.dataResposta);
  }

  // ========== CAPTADOR LINKS ==========

  async getCaptadorLinkByToken(token: string): Promise<CaptadorLink | undefined> {
    const [link] = await this.db
      .select()
      .from(captadorLinks)
      .where(eq(captadorLinks.token, token));
    return link;
  }

  async getCaptadorLinksByProjeto(projetoId: string): Promise<CaptadorLink[]> {
    return await this.db
      .select()
      .from(captadorLinks)
      .where(eq(captadorLinks.projetoId, projetoId))
      .orderBy(desc(captadorLinks.createdAt));
  }

  async createCaptadorLink(link: InsertCaptadorLink): Promise<CaptadorLink> {
    const [created] = await this.db
      .insert(captadorLinks)
      .values(link)
      .returning();
    return created;
  }

  async updateCaptadorLink(id: string, data: Partial<InsertCaptadorLink>): Promise<CaptadorLink> {
    const [updated] = await this.db
      .update(captadorLinks)
      .set(data)
      .where(eq(captadorLinks.id, id))
      .returning();
    return updated;
  }

  async deleteCaptadorLink(id: string): Promise<void> {
    await this.db.delete(captadorLinks).where(eq(captadorLinks.id, id));
  }

  // ========== CAPTADOR UPLOADS ==========

  async getCaptadorUploadsByLink(linkId: string): Promise<CaptadorUpload[]> {
    return await this.db
      .select()
      .from(captadorUploads)
      .where(eq(captadorUploads.linkId, linkId))
      .orderBy(desc(captadorUploads.createdAt));
  }

  async getCaptadorUploadsByProjeto(projetoId: string): Promise<CaptadorUpload[]> {
    return await this.db
      .select()
      .from(captadorUploads)
      .where(eq(captadorUploads.projetoId, projetoId))
      .orderBy(desc(captadorUploads.createdAt));
  }

  async createCaptadorUpload(upload: InsertCaptadorUpload): Promise<CaptadorUpload> {
    const [created] = await this.db
      .insert(captadorUploads)
      .values(upload)
      .returning();
    return created;
  }

  async deleteCaptadorUpload(id: string): Promise<void> {
    await this.db.delete(captadorUploads).where(eq(captadorUploads.id, id));
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

  // Métodos para o Portal do Cliente
  async getProjetoByClientToken(token: string): Promise<ProjetoWithRelations | undefined> {
    const result = await db
      .select({
        projetos,
        tiposDeVideo,
        users,
        clientes,
        empreendimentos,
      })
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .leftJoin(empreendimentos, eq(projetos.empreendimentoId, empreendimentos.id))
      .where(eq(projetos.clientToken, token))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return {
      ...result[0].projetos,
      tipoVideo: result[0].tiposDeVideo!,
      responsavel: result[0].users!,
      cliente: result[0].clientes || undefined,
      empreendimento: result[0].empreendimentos || undefined,
    };
  }

  async getClienteByPortalToken(token: string): Promise<{ cliente: Cliente; projetos: ProjetoWithRelations[] } | undefined> {
    // Primeiro, buscar o cliente pelo portal token
    const [cliente] = await db
      .select()
      .from(clientes)
      .where(eq(clientes.portalToken, token))
      .limit(1);

    if (!cliente) {
      return undefined;
    }

    // Depois, buscar todos os projetos desse cliente
    const result = await db
      .select({
        projetos,
        tiposDeVideo,
        users,
        clientes,
        empreendimentos,
      })
      .from(projetos)
      .leftJoin(tiposDeVideo, eq(projetos.tipoVideoId, tiposDeVideo.id))
      .leftJoin(users, eq(projetos.responsavelId, users.id))
      .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
      .leftJoin(empreendimentos, eq(projetos.empreendimentoId, empreendimentos.id))
      .where(eq(projetos.clienteId, cliente.id))
      .orderBy(desc(projetos.dataCriacao)); // Ordenar por data de criação (mais recentes primeiro)

    const projetosWithRelations = result.map(row => ({
      ...row.projetos,
      tipoVideo: row.tiposDeVideo!,
      responsavel: row.users!,
      cliente: row.clientes || undefined,
      empreendimento: row.empreendimentos || undefined,
    }));

    return {
      cliente,
      projetos: projetosWithRelations,
    };
  }

  async aprovarMusica(token: string, aprovado: boolean, feedback?: string): Promise<Projeto> {
    const [updatedProjeto] = await db
      .update(projetos)
      .set({
        musicaAprovada: aprovado,
        musicaFeedback: feedback || null,
        musicaDataAprovacao: new Date(),
      })
      .where(eq(projetos.clientToken, token))
      .returning();
    return updatedProjeto;
  }

  async aprovarLocucao(token: string, aprovado: boolean, feedback?: string): Promise<Projeto> {
    const [updatedProjeto] = await db
      .update(projetos)
      .set({
        locucaoAprovada: aprovado,
        locucaoFeedback: feedback || null,
        locucaoDataAprovacao: new Date(),
      })
      .where(eq(projetos.clientToken, token))
      .returning();
    return updatedProjeto;
  }

  async aprovarVideoFinal(token: string, aprovado: boolean, feedback?: string): Promise<Projeto> {
    const [updatedProjeto] = await db
      .update(projetos)
      .set({
        videoFinalAprovado: aprovado,
        videoFinalFeedback: feedback || null,
        videoFinalDataAprovacao: new Date(),
      })
      .where(eq(projetos.clientToken, token))
      .returning();
    return updatedProjeto;
  }

  async regenerarClientToken(projetoId: string): Promise<string> {
    const novoToken = nanoid(32);
    await db
      .update(projetos)
      .set({ clientToken: novoToken })
      .where(eq(projetos.id, projetoId));
    return novoToken;
  }

  // ========== SISTEMA DE VÍDEOS (Frame.io-like com Bunny.net) ==========

  async createVideoProjeto(video: InsertVideoProjeto): Promise<VideoProjeto> {
    const [newVideo] = await db
      .insert(videosProjeto)
      .values(video)
      .returning();
    return newVideo;
  }

  async getVideosByProjetoId(projetoId: string): Promise<VideoProjetoWithRelations[]> {
    const videos = await db.query.videosProjeto.findMany({
      where: eq(videosProjeto.projetoId, projetoId),
      with: {
        projeto: true,
        uploadedBy: true,
        comentarios: {
          with: {
            autor: true,
            resolvidoPor: true,
          },
          orderBy: (comentarios, { asc }) => [asc(comentarios.timestamp)],
        },
      },
      orderBy: (videos, { desc }) => [desc(videos.createdAt)],
    });
    return videos;
  }

  async getVideoById(videoId: string): Promise<VideoProjetoWithRelations | undefined> {
    const video = await db.query.videosProjeto.findFirst({
      where: eq(videosProjeto.id, videoId),
      with: {
        projeto: true,
        uploadedBy: true,
        comentarios: {
          with: {
            autor: true,
            resolvidoPor: true,
          },
          orderBy: (comentarios, { asc }) => [asc(comentarios.timestamp)],
        },
      },
    });
    return video;
  }

  async updateVideoProjeto(videoId: string, updates: Partial<InsertVideoProjeto>): Promise<VideoProjeto> {
    const [updatedVideo] = await db
      .update(videosProjeto)
      .set(updates)
      .where(eq(videosProjeto.id, videoId))
      .returning();
    return updatedVideo;
  }

  async deleteVideoProjeto(videoId: string): Promise<void> {
    await db.delete(videosProjeto).where(eq(videosProjeto.id, videoId));
  }

  // Comentários de vídeo
  async createVideoComentario(comentario: InsertVideoComentario): Promise<VideoComentario> {
    const [newComentario] = await db
      .insert(videoComentarios)
      .values(comentario)
      .returning();
    return newComentario;
  }

  async getComentariosByVideoId(videoId: string): Promise<VideoComentarioWithRelations[]> {
    const comentarios = await db.query.videoComentarios.findMany({
      where: eq(videoComentarios.videoId, videoId),
      with: {
        video: true,
        autor: true,
        resolvidoPor: true,
      },
      orderBy: (comentarios, { asc }) => [asc(comentarios.timestamp)],
    });
    return comentarios;
  }

  async toggleResolverComentario(comentarioId: string, userId: string): Promise<VideoComentario> {
    // Primeiro, buscar o comentário atual
    const comentario = await db.query.videoComentarios.findFirst({
      where: eq(videoComentarios.id, comentarioId),
    });

    if (!comentario) {
      throw new Error("Comentário não encontrado");
    }

    // Se já está resolvido, desresolver. Senão, resolver.
    const [updatedComentario] = await db
      .update(videoComentarios)
      .set({
        resolvido: !comentario.resolvido,
        resolvidoPorId: !comentario.resolvido ? userId : null,
        dataResolucao: !comentario.resolvido ? new Date() : null,
      })
      .where(eq(videoComentarios.id, comentarioId))
      .returning();

    return updatedComentario;
  }

  async updateVideoComentario(comentarioId: string, updates: Partial<{ frameIoCommentId: string }>): Promise<VideoComentario> {
    const [updated] = await db
      .update(videoComentarios)
      .set(updates)
      .where(eq(videoComentarios.id, comentarioId))
      .returning();
    return updated;
  }

  async deleteVideoComentario(comentarioId: string): Promise<void> {
    await db.delete(videoComentarios).where(eq(videoComentarios.id, comentarioId));
  }

  // ========== SISTEMA DE PASTAS DE VÍDEOS (Frame.io-like) ==========

  async createVideoPasta(pasta: InsertVideoPasta): Promise<VideoPasta> {
    const [newPasta] = await db
      .insert(videoPastas)
      .values(pasta)
      .returning();
    return newPasta;
  }

  async getVideoPastasByClienteId(clienteId: string, includeSubpastas: boolean = true): Promise<VideoPastaWithRelations[]> {
    const pastas = await db.query.videoPastas.findMany({
      where: and(
        eq(videoPastas.clienteId, clienteId),
        // Apenas pastas raiz (sem pasta_pai_id)
        includeSubpastas ? undefined : sql`${videoPastas.pastaPaiId} IS NULL`
      ),
      with: {
        cliente: true,
        empreendimento: true,
        pastaPai: true,
        subpastas: includeSubpastas ? {
          with: {
            subpastas: true, // nested subpastas
          }
        } : undefined,
        videos: {
          with: {
            uploadedBy: true,
          },
          orderBy: (videos, { desc }) => [desc(videos.createdAt)],
          limit: 1, // apenas o último vídeo para thumbnail
        },
      },
      orderBy: (pastas, { asc }) => [asc(pastas.ordem), asc(pastas.createdAt)],
    });
    return pastas;
  }

  async getVideoPastaById(pastaId: string): Promise<VideoPastaWithRelations | undefined> {
    const pasta = await db.query.videoPastas.findFirst({
      where: eq(videoPastas.id, pastaId),
      with: {
        cliente: true,
        empreendimento: true,
        pastaPai: true,
        subpastas: {
          orderBy: (subpastas, { asc }) => [asc(subpastas.ordem)],
        },
        videos: {
          with: {
            uploadedBy: true,
            comentarios: true,
          },
          orderBy: (videos, { desc }) => [desc(videos.createdAt)],
        },
      },
    });
    return pasta;
  }

  async updateVideoPasta(pastaId: string, updates: Partial<InsertVideoPasta>): Promise<VideoPasta> {
    const [updatedPasta] = await db
      .update(videoPastas)
      .set(updates)
      .where(eq(videoPastas.id, pastaId))
      .returning();
    return updatedPasta;
  }

  async deleteVideoPasta(pastaId: string): Promise<void> {
    await db.delete(videoPastas).where(eq(videoPastas.id, pastaId));
  }

  // Buscar breadcrumb de uma pasta (caminho completo)
  async getVideoPastaBreadcrumb(pastaId: string): Promise<Array<{ id: string; nome: string }>> {
    const result = await db.execute(sql`
      WITH RECURSIVE pasta_path AS (
        SELECT id, nome, pasta_pai_id, 1 as nivel
        FROM video_pastas WHERE id = ${pastaId}
        UNION ALL
        SELECT p.id, p.nome, p.pasta_pai_id, pp.nivel + 1
        FROM video_pastas p
        JOIN pasta_path pp ON p.id = pp.pasta_pai_id
      )
      SELECT id, nome FROM pasta_path ORDER BY nivel DESC
    `);
    return result.rows as Array<{ id: string; nome: string }>;
  }

  // Listar todos os clientes com estatísticas de vídeos (para grid de clientes)
  async getClientesComEstatisticasVideos(): Promise<Array<{
    id: string;
    nome: string;
    empresa: string | null;
    backgroundColor: string;
    textColor: string;
    frameIoProjectId: string | null;
    totalPastas: number;
    totalVideos: number;
    totalStorage: number;
    ultimaAtualizacao: Date | null;
  }>> {
    const result = await db.execute(sql`
      SELECT
        c.id,
        c.nome,
        c.empresa,
        c.background_color as "backgroundColor",
        c.text_color as "textColor",
        c.frame_io_project_id as "frameIoProjectId",
        COUNT(DISTINCT vp.id) as "totalPastas",
        COALESCE(SUM(vp.total_videos), 0) as "totalVideos",
        COALESCE(SUM(vp.total_storage), 0) as "totalStorage",
        MAX(vp.updated_at) as "ultimaAtualizacao"
      FROM clientes c
      LEFT JOIN video_pastas vp ON vp.cliente_id = c.id
      GROUP BY c.id, c.nome, c.empresa, c.background_color, c.text_color, c.frame_io_project_id
      ORDER BY c.nome
    `);
    return result.rows as any;
  }

  // Mover vídeo para outra pasta
  async moverVideoParaPasta(videoId: string, novaPastaId: string): Promise<VideoProjeto> {
    const [video] = await db
      .update(videosProjeto)
      .set({ pastaId: novaPastaId })
      .where(eq(videosProjeto.id, videoId))
      .returning();
    return video;
  }

  // Criar vídeo em uma pasta (sem projeto)
  async createVideoInPasta(video: Partial<InsertVideoProjeto>): Promise<VideoProjeto> {
    const [newVideo] = await db
      .insert(videosProjeto)
      .values(video as InsertVideoProjeto)
      .returning();
    return newVideo;
  }

  // Listar vídeos de uma pasta
  async getVideosByPastaId(pastaId: string): Promise<VideoProjetoWithRelations[]> {
    const videos = await db.query.videosProjeto.findMany({
      where: eq(videosProjeto.pastaId, pastaId),
      with: {
        projeto: true,
        pasta: true,
        uploadedBy: true,
        comentarios: {
          with: {
            autor: true,
            resolvidoPor: true,
          },
          orderBy: (comentarios, { asc }) => [asc(comentarios.timestamp)],
        },
      },
      orderBy: (videos, { desc }) => [desc(videos.createdAt)],
    });
    return videos;
  }
  // ==========================================
  // TOKENS DE ACESSO (API)
  // ==========================================

  async getTokensAcesso(): Promise<TokenAcesso[]> {
    return await db.select().from(tokensAcesso).orderBy(desc(tokensAcesso.createdAt));
  }

  async getTokenAcessoByToken(token: string): Promise<TokenAcesso | undefined> {
    const [result] = await db.select().from(tokensAcesso).where(eq(tokensAcesso.token, token));
    return result;
  }

  async createTokenAcesso(data: InsertTokenAcesso): Promise<TokenAcesso> {
    const [result] = await db.insert(tokensAcesso).values(data).returning();
    return result;
  }

  async updateTokenAcesso(id: string, data: Partial<InsertTokenAcesso>): Promise<TokenAcesso> {
    const [result] = await db.update(tokensAcesso)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tokensAcesso.id, id))
      .returning();
    return result;
  }

  async deleteTokenAcesso(id: string): Promise<void> {
    await db.delete(tokensAcesso).where(eq(tokensAcesso.id, id));
  }
}

export const storage = new DatabaseStorage();
