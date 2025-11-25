import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["Admin", "Gestor", "Membro"]);
export const projectStatusEnum = pgEnum("project_status", [
  "Briefing",
  "Roteiro", 
  "Captação",
  "Edição",
  "Entrega",
  "Outros",
  "Aguardando Aprovação",
  "Aprovado",
  "Em Pausa",
  "Cancelado"
]);
export const priorityEnum = pgEnum("priority", ["Baixa", "Média", "Alta"]);
export const noteTipoEnum = pgEnum("note_tipo", ["Nota", "Senha", "Arquivo"]);
export const timelapseFrequenciaEnum = pgEnum("timelapse_frequencia", ["Semanal", "Quinzenal", "Mensal"]);
export const timelapseStatusEnum = pgEnum("timelapse_status", ["Ativo", "Pausado", "Cancelado"]);
export const generoEnum = pgEnum("genero", ["Masculino", "Feminino", "Outro"]);
export const faixaEtariaEnum = pgEnum("faixa_etaria", ["Jovem", "Adulto", "Idoso"]);
export const regiaoEnum = pgEnum("regiao", ["Sul", "Sudeste", "Norte", "Nordeste", "Centro-Oeste", "Nacional"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  papel: userRoleEnum("papel").notNull().default("Membro"),
  ativo: boolean("ativo").notNull().default(true),
  fotoUrl: text("foto_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tiposDeVideo = pgTable("tipos_de_video", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(),
  backgroundColor: text("background_color").notNull().default("#3b82f6"),
  textColor: text("text_color").notNull().default("#ffffff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(),
  backgroundColor: text("background_color").notNull().default("#10b981"),
  textColor: text("text_color").notNull().default("#ffffff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientes = pgTable("clientes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  empresa: text("empresa"),
  email: text("email"),
  telefone: text("telefone"),
  backgroundColor: text("background_color").notNull().default("#3b82f6"),
  textColor: text("text_color").notNull().default("#ffffff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const empreendimentos = pgTable("empreendimentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  clienteId: varchar("cliente_id").references(() => clientes.id).notNull(),
  backgroundColor: text("background_color").notNull().default("#3b82f6"),
  textColor: text("text_color").notNull().default("#ffffff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projetos = pgTable("projetos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequencialId: integer("sequencial_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipoVideoId: varchar("tipo_video_id").references(() => tiposDeVideo.id).notNull(),
  tags: text("tags").array().default([]),
  status: projectStatusEnum("status").notNull().default("Briefing"),
  responsavelId: varchar("responsavel_id").references(() => users.id),
  dataCriacao: timestamp("data_criacao").defaultNow().notNull(),
  dataPrevistaEntrega: timestamp("data_prevista_entrega"),
  dataAprovacao: timestamp("data_aprovacao"),
  prioridade: priorityEnum("prioridade").notNull().default("Média"),
  clienteId: varchar("cliente_id").references(() => clientes.id),
  empreendimentoId: varchar("empreendimento_id").references(() => empreendimentos.id),
  anexos: text("anexos").array().default([]),
  linkYoutube: text("link_youtube"),
  // Novos campos
  duracao: integer("duracao"), // minutagem
  formato: text("formato"), // texto simples
  captacao: boolean("captacao").default(false),
  roteiro: boolean("roteiro").default(false),
  locucao: boolean("locucao").default(false),
  dataInterna: timestamp("data_interna"),
  dataMeeting: timestamp("data_meeting"),
  linkFrameIo: text("link_frame_io"),
  caminho: text("caminho"),
  referencias: text("referencias"), // links simples, várias linhas
  informacoesAdicionais: text("informacoes_adicionais"), // texto livre
  // Campos NPS
  npsScore: integer("nps_score"), // nota de 1 a 10
  npsContact: text("nps_contact"), // número de contato
  npsResponsible: text("nps_responsible"), // nome do responsável pela avaliação
  // Portal do Cliente
  clientToken: text("client_token").unique(), // token único para acesso do cliente
  musicaUrl: text("musica_url"), // URL do arquivo de música para aprovação
  musicaAprovada: boolean("musica_aprovada"), // null = pendente, true = aprovado, false = reprovado
  musicaFeedback: text("musica_feedback"), // feedback do cliente sobre a música
  musicaDataAprovacao: timestamp("musica_data_aprovacao"), // data da aprovação/reprovação
  locucaoUrl: text("locucao_url"), // URL do arquivo de locução
  locucaoAprovada: boolean("locucao_aprovada"), // null = pendente, true = aprovado, false = reprovado
  locucaoFeedback: text("locucao_feedback"), // feedback do cliente sobre a locução
  locucaoDataAprovacao: timestamp("locucao_data_aprovacao"), // data da aprovação/reprovação
  videoFinalUrl: text("video_final_url"), // URL do vídeo final
  videoFinalAprovado: boolean("video_final_aprovado"), // null = pendente, true = aprovado, false = reprovado
  videoFinalFeedback: text("video_final_feedback"), // feedback do cliente sobre o vídeo
  videoFinalDataAprovacao: timestamp("video_final_data_aprovacao"), // data da aprovação/reprovação
});

export const logsDeStatus = pgTable("logs_de_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id).notNull(),
  statusAnterior: projectStatusEnum("status_anterior"),
  statusNovo: projectStatusEnum("status_novo").notNull(),
  alteradoPorId: varchar("alterado_por_id").references(() => users.id).notNull(),
  dataHora: timestamp("data_hora").defaultNow().notNull(),
});

export const comentarios = pgTable("comentarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id).notNull(),
  autorId: varchar("autor_id").references(() => users.id).notNull(),
  texto: text("texto").notNull(),
  anexos: text("anexos").array().default([]), // URLs das imagens
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notas = pgTable("notas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo"),
  tipo: noteTipoEnum("tipo").notNull().default("Nota"),
  categoria: text("categoria"),
  senha: text("senha"), // senha mascarada/criptografada para notas do tipo "Senha"
  usuarioNome: text("usuario_nome"), // para senhas - campo de usuário/email
  url: text("url"), // para senhas - URL do serviço
  // Campos de arquivo para notas do tipo "Arquivo"
  fileName: text("file_name"), // Nome original do arquivo
  fileKey: text("file_key"), // Caminho/key do arquivo no object storage
  fileSize: integer("file_size"), // Tamanho do arquivo em bytes
  fileMimeType: text("file_mime_type"), // Tipo MIME do arquivo
  usuarioId: varchar("usuario_id").references(() => users.id).notNull(),
  favorito: boolean("favorito").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timelapses = pgTable("timelapses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clienteId: varchar("cliente_id").references(() => clientes.id).notNull(),
  empreendimentoId: varchar("empreendimento_id").references(() => empreendimentos.id).notNull(),
  dataUltimoVideo: timestamp("data_ultimo_video"),
  linkVideo: text("link_video"),
  dataProximoVideo: timestamp("data_proximo_video"),
  frequencia: timelapseFrequenciaEnum("frequencia").notNull().default("Semanal"),
  status: timelapseStatusEnum("status").notNull().default("Ativo"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estilosLocucao = pgTable("estilos_locucao", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(),
  descricao: text("descricao"),
  icone: text("icone"),
  cor: text("cor").notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const locutores = pgTable("locutores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  fotoUrl: text("foto_url"),
  biografia: text("biografia"),
  // Características
  genero: generoEnum("genero").notNull(),
  faixaEtaria: faixaEtariaEnum("faixa_etaria").notNull(),
  idadePorVoz: text("idade_por_voz"), // Ex: "18-25", "26-35"
  regiao: regiaoEnum("regiao").notNull(),
  sotaque: text("sotaque").notNull(), // Ex: "Neutro", "Carioca", "Paulista"
  idiomas: text("idiomas").array().default(["Português"]),
  // Valores
  valorPorPalavra: integer("valor_por_palavra"), // em centavos
  valorMinimo: integer("valor_minimo"), // em centavos
  valorPorMinuto: integer("valor_por_minuto"), // em centavos
  // Contato
  email: text("email"),
  telefone: text("telefone"),
  instagram: text("instagram"),
  // Avaliação
  avaliacaoMedia: integer("avaliacao_media").default(0), // 0-500 (0-5.0 estrelas * 100)
  totalProjetos: integer("total_projetos").default(0),
  // Status
  disponivel: boolean("disponivel").notNull().default(true),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const amostrasLocutores = pgTable("amostras_locutores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locutorId: varchar("locutor_id").references(() => locutores.id).notNull(),
  estiloId: varchar("estilo_id").references(() => estilosLocucao.id),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  arquivoUrl: text("arquivo_url").notNull(), // Caminho do arquivo de áudio
  duracao: integer("duracao"), // duração em segundos
  ordem: integer("ordem").default(0), // para ordenação
  destaque: boolean("destaque").default(false), // amostra principal
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela para múltiplas músicas de um projeto
export const projetoMusicas = pgTable("projeto_musicas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id, { onDelete: "cascade" }).notNull(),
  titulo: text("titulo").notNull(),
  artistaUrl: text("artista_url"), // Link do artista (ex: Spotify, YouTube)
  musicaUrl: text("musica_url").notNull(), // Link da música
  aprovada: boolean("aprovada"), // null = pendente, true = aprovado, false = reprovado
  feedback: text("feedback"), // feedback do cliente
  dataAprovacao: timestamp("data_aprovacao"), // data da aprovação/reprovação
  ordem: integer("ordem").default(0), // ordem de exibição
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de relacionamento many-to-many entre projetos e locutores
export const projetoLocutores = pgTable("projeto_locutores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id, { onDelete: "cascade" }).notNull(),
  locutorId: varchar("locutor_id").references(() => locutores.id).notNull(),
  aprovado: boolean("aprovado"), // null = pendente, true = aprovado, false = reprovado
  feedback: text("feedback"), // feedback do cliente sobre este locutor
  dataAprovacao: timestamp("data_aprovacao"), // data da aprovação/reprovação
  ordem: integer("ordem").default(0), // ordem de exibição
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projetosResponsavel: many(projetos, { relationName: "responsavel" }),
  logsDeStatus: many(logsDeStatus),
  comentarios: many(comentarios),
  notas: many(notas),
}));

export const tiposDeVideoRelations = relations(tiposDeVideo, ({ many }) => ({
  projetos: many(projetos),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  projetos: many(projetos),
  empreendimentos: many(empreendimentos),
  timelapses: many(timelapses),
}));

export const empreendimentosRelations = relations(empreendimentos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [empreendimentos.clienteId],
    references: [clientes.id],
  }),
  timelapses: many(timelapses),
}));

export const projetosRelations = relations(projetos, ({ one, many }) => ({
  tipoVideo: one(tiposDeVideo, {
    fields: [projetos.tipoVideoId],
    references: [tiposDeVideo.id],
  }),
  responsavel: one(users, {
    fields: [projetos.responsavelId],
    references: [users.id],
    relationName: "responsavel",
  }),
  cliente: one(clientes, {
    fields: [projetos.clienteId],
    references: [clientes.id],
  }),
  empreendimento: one(empreendimentos, {
    fields: [projetos.empreendimentoId],
    references: [empreendimentos.id],
  }),
  logsDeStatus: many(logsDeStatus),
  comentarios: many(comentarios),
  musicas: many(projetoMusicas),
  locutores: many(projetoLocutores),
}));

export const logsDeStatusRelations = relations(logsDeStatus, ({ one }) => ({
  projeto: one(projetos, {
    fields: [logsDeStatus.projetoId],
    references: [projetos.id],
  }),
  alteradoPor: one(users, {
    fields: [logsDeStatus.alteradoPorId],
    references: [users.id],
  }),
}));

export const comentariosRelations = relations(comentarios, ({ one }) => ({
  projeto: one(projetos, {
    fields: [comentarios.projetoId],
    references: [projetos.id],
  }),
  autor: one(users, {
    fields: [comentarios.autorId],
    references: [users.id],
  }),
}));

export const notasRelations = relations(notas, ({ one }) => ({
  usuario: one(users, {
    fields: [notas.usuarioId],
    references: [users.id],
  }),
}));

export const timelapsesRelations = relations(timelapses, ({ one }) => ({
  cliente: one(clientes, {
    fields: [timelapses.clienteId],
    references: [clientes.id],
  }),
  empreendimento: one(empreendimentos, {
    fields: [timelapses.empreendimentoId],
    references: [empreendimentos.id],
  }),
}));

export const estilosLocucaoRelations = relations(estilosLocucao, ({ many }) => ({
  amostras: many(amostrasLocutores),
}));

export const locutoresRelations = relations(locutores, ({ many }) => ({
  amostras: many(amostrasLocutores),
  projetos: many(projetoLocutores),
}));

export const amostrasLocutoresRelations = relations(amostrasLocutores, ({ one }) => ({
  locutor: one(locutores, {
    fields: [amostrasLocutores.locutorId],
    references: [locutores.id],
  }),
  estilo: one(estilosLocucao, {
    fields: [amostrasLocutores.estiloId],
    references: [estilosLocucao.id],
  }),
}));

export const projetoMusicasRelations = relations(projetoMusicas, ({ one }) => ({
  projeto: one(projetos, {
    fields: [projetoMusicas.projetoId],
    references: [projetos.id],
  }),
}));

export const projetoLocutoresRelations = relations(projetoLocutores, ({ one }) => ({
  projeto: one(projetos, {
    fields: [projetoLocutores.projetoId],
    references: [projetos.id],
  }),
  locutor: one(locutores, {
    fields: [projetoLocutores.locutorId],
    references: [locutores.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Safe registration schema - prevents setting role and active status
export const registerUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  papel: true,
  ativo: true,
});

export const insertTipoVideoSchema = createInsertSchema(tiposDeVideo).omit({
  id: true,
  createdAt: true,
}).extend({
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor de fundo deve ser um código hexadecimal válido"),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor do texto deve ser um código hexadecimal válido"),
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
}).extend({
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor de fundo deve ser um código hexadecimal válido"),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor do texto deve ser um código hexadecimal válido"),
});

export const insertClienteSchema = createInsertSchema(clientes).omit({
  id: true,
  createdAt: true,
});

export const insertEmpreendimentoSchema = createInsertSchema(empreendimentos).omit({
  id: true,
  createdAt: true,
}).extend({
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor de fundo deve ser um código hexadecimal válido"),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor do texto deve ser um código hexadecimal válido"),
});

export const insertProjetoSchema = createInsertSchema(projetos).omit({
  id: true,
  sequencialId: true,
  dataCriacao: true,
  dataAprovacao: true,
}).extend({
  // Converte strings vazias em null para campos opcionais de foreign key
  responsavelId: z.union([z.string(), z.literal(""), z.null(), z.undefined()]).transform((val) => {
    if (!val || val === "") return null;
    return val;
  }).nullable(),
  clienteId: z.union([z.string(), z.literal(""), z.null(), z.undefined()]).transform((val) => {
    if (!val || val === "") return null;
    return val;
  }).nullable(),
  empreendimentoId: z.union([z.string(), z.literal(""), z.null(), z.undefined()]).transform((val) => {
    if (!val || val === "") return null;
    return val;
  }).nullable(),
  
  // Converte strings de data para Date - usa meio-dia UTC para evitar problemas de timezone
  dataPrevistaEntrega: z.string().optional().or(z.literal("")).transform((val) => {
    if (!val || val === "" || typeof val !== 'string') return undefined;
    const parts = val.split('-');
    if (parts.length !== 3) return undefined;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
    // Cria a data com meio-dia UTC para evitar problemas de mudança de dia
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }),
  dataInterna: z.string().optional().or(z.literal("")).transform((val) => {
    if (!val || val === "" || typeof val !== 'string') return undefined;
    const parts = val.split('-');
    if (parts.length !== 3) return undefined;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }),
  dataMeeting: z.string().optional().or(z.literal("")).transform((val) => {
    if (!val || val === "" || typeof val !== 'string') return undefined;
    const parts = val.split('-');
    if (parts.length !== 3) return undefined;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }),
  linkFrameIo: z.string().url().optional().or(z.literal("")),
  linkYoutube: z.string().url().optional().or(z.literal("")),
});

// Schema específico para updates (PATCH) que mantém as transformações funcionando
// Precisamos redefinir as transformações de data antes de chamar .partial()
export const updateProjetoSchema = z.object({
  // Campos de texto
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  tipoVideoId: z.string().optional(),
  responsavelId: z.union([z.string(), z.literal(""), z.null(), z.undefined()]).transform((val) => {
    if (!val || val === "") return null;
    return val;
  }).nullable().optional(),
  prioridade: z.enum(["Baixa", "Média", "Alta"]).optional(),
  status: z.enum(["Briefing", "Roteiro", "Captação", "Edição", "Aguardando Aprovação", "Aprovado"]).optional(),
  clienteId: z.union([z.string(), z.literal(""), z.null(), z.undefined()]).transform((val) => {
    if (!val || val === "") return null;
    return val;
  }).nullable().optional(),
  empreendimentoId: z.union([z.string(), z.literal(""), z.null(), z.undefined()]).transform((val) => {
    if (!val || val === "") return null;
    return val;
  }).nullable().optional(),
  duracao: z.number().optional(),
  formato: z.string().optional(),
  captacao: z.boolean().optional(),
  roteiro: z.boolean().optional(),
  locucao: z.boolean().optional(),
  
  // Campos de data com transformação - aceita tanto "YYYY-MM-DD" quanto ISO "YYYY-MM-DDTHH:MM:SS.SSSZ"
  dataPrevistaEntrega: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val || val === "") return undefined;
    if (val instanceof Date) return val;
    
    // Se já é uma string ISO completa, usa diretamente
    if (typeof val === 'string' && val.includes('T')) {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }
    
    // Se é formato simples YYYY-MM-DD
    if (typeof val === 'string') {
      const parts = val.split('-');
      if (parts.length !== 3) return undefined;
      const [year, month, day] = parts.map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
    
    return undefined;
  }),
  dataInterna: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val || val === "") return undefined;
    if (val instanceof Date) return val;
    
    // Se já é uma string ISO completa, usa diretamente
    if (typeof val === 'string' && val.includes('T')) {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }
    
    // Se é formato simples YYYY-MM-DD
    if (typeof val === 'string') {
      const parts = val.split('-');
      if (parts.length !== 3) return undefined;
      const [year, month, day] = parts.map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
    
    return undefined;
  }),
  dataMeeting: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val || val === "") return undefined;
    if (val instanceof Date) return val;
    
    // Se já é uma string ISO completa, usa diretamente
    if (typeof val === 'string' && val.includes('T')) {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }
    
    // Se é formato simples YYYY-MM-DD
    if (typeof val === 'string') {
      const parts = val.split('-');
      if (parts.length !== 3) return undefined;
      const [year, month, day] = parts.map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
    
    return undefined;
  }),
  
  linkFrameIo: z.string().url().optional().or(z.literal("")),
  linkYoutube: z.string().url().optional().or(z.literal("")),
  caminho: z.string().optional().or(z.literal("")),
  referencias: z.string().optional().or(z.literal("")),
  informacoesAdicionais: z.string().optional().or(z.literal("")),
}).partial();

export const insertLogStatusSchema = createInsertSchema(logsDeStatus).omit({
  id: true,
  dataHora: true,
});

export const insertComentarioSchema = createInsertSchema(comentarios).omit({
  id: true,
  createdAt: true,
});

export const insertNotaSchema = createInsertSchema(notas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimelapseSchema = createInsertSchema(timelapses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dataUltimoVideo: z.string().optional().or(z.literal("")).transform((val) => {
    if (!val || val === "" || typeof val !== 'string') return undefined;
    const parts = val.split('-');
    if (parts.length !== 3) return undefined;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }),
  dataProximoVideo: z.string().optional().or(z.literal("")).transform((val) => {
    if (!val || val === "" || typeof val !== 'string') return undefined;
    const parts = val.split('-');
    if (parts.length !== 3) return undefined;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }),
  linkVideo: z.string().url().optional().or(z.literal("")),
});

export const insertEstiloLocucaoSchema = createInsertSchema(estilosLocucao).omit({
  id: true,
  createdAt: true,
});

export const insertLocutorSchema = createInsertSchema(locutores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  avaliacaoMedia: true,
  totalProjetos: true,
});

export const insertAmostraLocutorSchema = createInsertSchema(amostrasLocutores).omit({
  id: true,
  createdAt: true,
});

export const insertProjetoMusicaSchema = createInsertSchema(projetoMusicas).omit({
  id: true,
  createdAt: true,
});

export const insertProjetoLocutorSchema = createInsertSchema(projetoLocutores).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type TipoVideo = typeof tiposDeVideo.$inferSelect;
export type InsertTipoVideo = z.infer<typeof insertTipoVideoSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Empreendimento = typeof empreendimentos.$inferSelect;
export type InsertEmpreendimento = z.infer<typeof insertEmpreendimentoSchema>;
export type Projeto = typeof projetos.$inferSelect;
export type InsertProjeto = z.infer<typeof insertProjetoSchema>;
export type LogStatus = typeof logsDeStatus.$inferSelect;
export type InsertLogStatus = z.infer<typeof insertLogStatusSchema>;
export type Comentario = typeof comentarios.$inferSelect;
export type InsertComentario = z.infer<typeof insertComentarioSchema>;
export type Nota = typeof notas.$inferSelect;
export type InsertNota = z.infer<typeof insertNotaSchema>;
export type Timelapse = typeof timelapses.$inferSelect;
export type InsertTimelapse = z.infer<typeof insertTimelapseSchema>;
export type EstiloLocucao = typeof estilosLocucao.$inferSelect;
export type InsertEstiloLocucao = z.infer<typeof insertEstiloLocucaoSchema>;
export type Locutor = typeof locutores.$inferSelect;
export type InsertLocutor = z.infer<typeof insertLocutorSchema>;
export type AmostraLocutor = typeof amostrasLocutores.$inferSelect;
export type InsertAmostraLocutor = z.infer<typeof insertAmostraLocutorSchema>;
export type ProjetoMusica = typeof projetoMusicas.$inferSelect;
export type InsertProjetoMusica = z.infer<typeof insertProjetoMusicaSchema>;
export type ProjetoLocutor = typeof projetoLocutores.$inferSelect;
export type InsertProjetoLocutor = z.infer<typeof insertProjetoLocutorSchema>;

// Extended types with relations
export type ProjetoWithRelations = Projeto & {
  tipoVideo: TipoVideo;
  responsavel: User;
  cliente?: Cliente;
  empreendimento?: Empreendimento;
};

export type EmpreendimentoWithRelations = Empreendimento & {
  cliente: Cliente;
};

export type ComentarioWithRelations = Comentario & {
  autor: User;
};

export type TimelapseWithRelations = Timelapse & {
  cliente: Cliente;
  empreendimento: Empreendimento;
};

export type LocutorWithRelations = Locutor & {
  amostras: AmostraLocutor[];
};

export type AmostraLocutorWithRelations = AmostraLocutor & {
  locutor: Locutor;
  estilo?: EstiloLocucao;
};

export type ProjetoMusicaWithRelations = ProjetoMusica & {
  projeto: Projeto;
};

export type ProjetoLocutorWithRelations = ProjetoLocutor & {
  projeto: Projeto;
  locutor: Locutor;
};
