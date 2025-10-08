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
  "Revisão",
  "Aguardando Aprovação",
  "Aprovado",
  "Em Pausa",
  "Cancelado"
]);
export const priorityEnum = pgEnum("priority", ["Baixa", "Média", "Alta"]);

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
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipoVideoId: varchar("tipo_video_id").references(() => tiposDeVideo.id).notNull(),
  tags: text("tags").array().default([]),
  status: projectStatusEnum("status").notNull().default("Briefing"),
  responsavelId: varchar("responsavel_id").references(() => users.id).notNull(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projetosResponsavel: many(projetos, { relationName: "responsavel" }),
  logsDeStatus: many(logsDeStatus),
  comentarios: many(comentarios),
}));

export const tiposDeVideoRelations = relations(tiposDeVideo, ({ many }) => ({
  projetos: many(projetos),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  projetos: many(projetos),
  empreendimentos: many(empreendimentos),
}));

export const empreendimentosRelations = relations(empreendimentos, ({ one }) => ({
  cliente: one(clientes, {
    fields: [empreendimentos.clienteId],
    references: [clientes.id],
  }),
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
  dataCriacao: true,
  dataAprovacao: true,
}).extend({
  // Converte strings vazias em null para campos opcionais de foreign key
  clienteId: z.string().optional().or(z.literal("")).transform((val) => val === "" ? null : val),
  empreendimentoId: z.string().optional().or(z.literal("")).transform((val) => val === "" ? null : val),
  
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
  responsavelId: z.string().optional(),
  prioridade: z.enum(["Baixa", "Média", "Alta"]).optional(),
  status: z.enum(["Briefing", "Roteiro", "Captação", "Edição", "Revisão", "Aguardando Aprovação", "Aprovado"]).optional(),
  clienteId: z.string().optional().or(z.literal("")).transform((val) => val === "" ? null : val),
  empreendimentoId: z.string().optional().or(z.literal("")).transform((val) => val === "" ? null : val),
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
  caminho: z.string().optional(),
  referencias: z.string().optional(),
  informacoesAdicionais: z.string().optional(),
}).partial();

export const insertLogStatusSchema = createInsertSchema(logsDeStatus).omit({
  id: true,
  dataHora: true,
});

export const insertComentarioSchema = createInsertSchema(comentarios).omit({
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
