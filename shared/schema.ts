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
export const noteTipoEnum = pgEnum("note_tipo", ["Nota", "Senha", "Arquivo"]);
export const timelapseFrequenciaEnum = pgEnum("timelapse_frequencia", ["Semanal", "Quinzenal", "Mensal"]);
export const timelapseStatusEnum = pgEnum("timelapse_status", ["Ativo", "Pausado", "Cancelado"]);
export const generoEnum = pgEnum("genero", ["Masculino", "Feminino"]);
export const faixaEtariaEnum = pgEnum("faixa_etaria", ["Criança", "Jovem", "Adulto", "Madura"]);

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
  portalToken: text("portal_token").unique(), // Token único para portal unificado do cliente
  frameIoProjectId: text("frame_io_project_id"), // ID do projeto no Frame.io V4
  frameIoLastCheckedAt: timestamp("frame_io_last_checked_at"), // Último check de polling do Frame.io
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
  statusChangedAt: timestamp("status_changed_at").defaultNow().notNull(), // Data da última mudança de status
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
  frameIoShareUrl: text("frame_io_share_url"), // URL do share link Frame.io para embed no portal
  frameIoFileId: text("frame_io_file_id"), // ID do arquivo selecionado no Frame.io (para download)
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
  musicaVisualizadaEm: timestamp("musica_visualizada_em"), // quando a aprovação foi visualizada pela equipe
  locucaoUrl: text("locucao_url"), // URL do arquivo de locução
  locucaoAprovada: boolean("locucao_aprovada"), // null = pendente, true = aprovado, false = reprovado
  locucaoFeedback: text("locucao_feedback"), // feedback do cliente sobre a locução
  locucaoDataAprovacao: timestamp("locucao_data_aprovacao"), // data da aprovação/reprovação
  locucaoVisualizadaEm: timestamp("locucao_visualizada_em"), // quando a aprovação foi visualizada pela equipe
  videoFinalUrl: text("video_final_url"), // URL do vídeo final
  videoFinalAprovado: boolean("video_final_aprovado"), // null = pendente, true = aprovado, false = reprovado
  videoFinalFeedback: text("video_final_feedback"), // feedback do cliente sobre o vídeo
  videoFinalDataAprovacao: timestamp("video_final_data_aprovacao"), // data da aprovação/reprovação
  videoFinalVisualizadoEm: timestamp("video_final_visualizado_em"), // quando a aprovação foi visualizada pela equipe
  // Controle de envio
  enviadoCliente: boolean("enviado_cliente").default(false), // marca se o projeto foi enviado ao cliente
  // Aprovação de Roteiro (Portal do Cliente)
  roteiroLink: text("roteiro_link"), // Link do Google Docs / externo
  roteiroAprovado: boolean("roteiro_aprovado"), // null=pendente, true=aprovado, false=alterações
  roteiroFeedback: text("roteiro_feedback"), // Feedback geral do cliente
  roteiroDataAprovacao: timestamp("roteiro_data_aprovacao"), // Data da aprovação/rejeição
  roteiroVisualizadoEm: timestamp("roteiro_visualizado_em"), // Quando a equipe visualizou
  // Contatos do Projeto (para notificações via IA)
  contatosEmail: text("contatos_email").array().default([]),
  contatosWhatsapp: text("contatos_whatsapp").array().default([]),
  contatosGrupos: text("contatos_grupos").array().default([]),
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
  nomeFicticio: text("nome_ficticio").notNull(), // Nome público/artístico
  nomeReal: text("nome_real").notNull(), // Nome verdadeiro (interno)
  // Características
  genero: generoEnum("genero").notNull(),
  faixaEtaria: faixaEtariaEnum("faixa_etaria").notNull(),
  idiomas: text("idiomas").array().notNull().default(["Português"]),
  // Valor
  valorPorMinuto: text("valor_por_minuto"), // Campo livre de texto (ex: "R$ 150", "150", "$100")
  // Contato
  email: text("email"),
  telefone: text("telefone"),
  instagram: text("instagram"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const amostrasLocutores = pgTable("amostras_locutores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locutorId: varchar("locutor_id").references(() => locutores.id, { onDelete: "cascade" }).notNull(),
  estiloId: varchar("estilo_id").references(() => estilosLocucao.id),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  arquivoUrl: text("arquivo_url").notNull(), // Caminho do arquivo de áudio
  duracao: integer("duracao"), // duração em segundos
  ordem: integer("ordem").default(0), // para ordenação
  destaque: boolean("destaque").default(false), // amostra principal
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comentários do cliente sobre seções do roteiro
export const roteiroComentarios = pgTable("roteiro_comentarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id, { onDelete: "cascade" }).notNull(),
  secao: text("secao").notNull(), // Nome/número da seção (ex: "Cena 1", "Introdução")
  comentario: text("comentario").notNull(), // Observação do cliente
  sugestao: text("sugestao"), // Sugestão de alteração (opcional)
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
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
  locutorId: varchar("locutor_id").references(() => locutores.id, { onDelete: "cascade" }).notNull(),
  aprovado: boolean("aprovado"), // null = pendente, true = aprovado, false = reprovado
  feedback: text("feedback"), // feedback do cliente sobre este locutor
  dataAprovacao: timestamp("data_aprovacao"), // data da aprovação/reprovação
  ordem: integer("ordem").default(0), // ordem de exibição
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de respostas NPS do cliente
export const respostasNps = pgTable("respostas_nps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id, { onDelete: "cascade" }).notNull(),
  clienteId: varchar("cliente_id").references(() => clientes.id),
  // Pergunta 1: Em uma escala de 0 a 10, como você avalia nossos serviços prestados?
  notaServicos: integer("nota_servicos").notNull(), // 0-10
  // Pergunta 2: Em uma escala de 0 a 10, como você avalia nosso atendimento?
  notaAtendimento: integer("nota_atendimento").notNull(), // 0-10
  // Pergunta 3: Em uma escala de 0 a 10, qual a probabilidade de indicar o Grupo Skyline a um parceiro?
  notaIndicacao: integer("nota_indicacao").notNull(), // 0-10
  // Campos calculados
  notaMedia: integer("nota_media"), // Média das 3 notas
  categoria: text("categoria"), // "detrator" (0-6), "neutro" (7-8), "promotor" (9-10) baseado na nota de indicação
  // Metadata
  dataResposta: timestamp("data_resposta").defaultNow().notNull(),
  ipOrigem: text("ip_origem"), // IP do cliente que respondeu
  userAgent: text("user_agent"), // User agent do navegador
  comentario: text("comentario"), // Comentário adicional do cliente
});

export const tokensAcesso = pgTable("tokens_acesso", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").unique().notNull(),
  tipo: text("tipo").default("api").notNull(), // Tipo: "api", "finalizados"
  papel: userRoleEnum("papel").notNull().default("Membro"), // Nível de acesso do token
  descricao: text("descricao"), // Descrição do token (ex: "ClawdBot", "Time Comercial")
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tokens Adobe IMS para Frame.io V4
export const frameioTokens = pgTable("frameio_tokens", {
  id: varchar("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
  requiresReauth: boolean("requires_reauth").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sistema de Vídeos (Frame.io-like com Bunny.net)
export const videoStatusEnum = pgEnum("video_status", ["uploading", "processing", "ready", "failed"]);

export const videosProjeto = pgTable("videos_projeto", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id, { onDelete: "cascade" }), // OPCIONAL agora
  pastaId: varchar("pasta_id").references((): any => videoPastas.id, { onDelete: "cascade" }), // FK para pasta (opcional inicialmente, depois será obrigatório)
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  // Dados do Bunny.net (legado)
  bunnyVideoId: text("bunny_video_id").unique(), // ID do vídeo no Bunny Stream
  bunnyLibraryId: text("bunny_library_id"), // ID da biblioteca do Bunny
  bunnyGuid: text("bunny_guid"), // GUID do vídeo no Bunny
  // Dados do Frame.io V4
  frameIoFileId: text("frame_io_file_id"), // ID do arquivo no Frame.io
  frameIoFolderId: text("frame_io_folder_id"), // ID da pasta no Frame.io
  status: videoStatusEnum("status").notNull().default("uploading"),
  // URLs e metadata
  thumbnailUrl: text("thumbnail_url"), // URL da thumbnail
  videoUrl: text("video_url"), // URL do vídeo (CDN do Bunny)
  duration: integer("duration"), // duração em segundos
  fileSize: integer("file_size"), // tamanho em bytes
  width: integer("width"), // largura do vídeo
  height: integer("height"), // altura do vídeo
  // Versionamento
  versao: integer("versao").notNull().default(1), // versão do vídeo (1, 2, 3...)
  // Aprovação (similar ao sistema de música/locução)
  aprovado: boolean("aprovado"), // null = pendente, true = aprovado, false = reprovado
  feedback: text("feedback"), // feedback geral do cliente
  dataAprovacao: timestamp("data_aprovacao"), // data da aprovação/reprovação
  // Metadata
  uploadedById: varchar("uploaded_by_id").references(() => users.id), // quem fez upload
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videoComentarios = pgTable("video_comentarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").references(() => videosProjeto.id, { onDelete: "cascade" }).notNull(),
  autorId: varchar("autor_id").references(() => users.id), // null se for comentário do cliente
  autorNome: text("autor_nome"), // nome do autor (para clientes não autenticados)
  texto: text("texto").notNull(),
  timestamp: integer("timestamp").notNull(), // timestamp do vídeo em segundos
  frameIoCommentId: text("frame_io_comment_id"), // Para sync bidirecional com Frame.io
  // Status do comentário
  resolvido: boolean("resolvido").default(false), // marca comentário como resolvido
  resolvidoPorId: varchar("resolvido_por_id").references(() => users.id), // quem resolveu
  dataResolucao: timestamp("data_resolucao"), // quando foi resolvido
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sistema de Pastas de Vídeos (Frame.io-like)
export const videoPastas = pgTable("video_pastas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clienteId: varchar("cliente_id").references(() => clientes.id, { onDelete: "cascade" }).notNull(),
  empreendimentoId: varchar("empreendimento_id").references(() => empreendimentos.id), // opcional - para vincular a empreendimento
  pastaPaiId: varchar("pasta_pai_id").references((): any => videoPastas.id, { onDelete: "cascade" }), // para hierarquia de pastas
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  cor: text("cor").default("#3b82f6"), // cor para identificação visual
  icone: text("icone"), // emoji ou nome de ícone
  ordem: integer("ordem").default(0), // para ordenação customizada
  frameIoFolderId: text("frame_io_folder_id"), // Mapeamento pasta local ↔ Frame.io
  // Contadores desnormalizados para performance
  totalVideos: integer("total_videos").default(0),
  totalStorage: integer("total_storage").default(0), // em bytes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Portal do Captador - Links de upload
export const captadorLinks = pgTable("captador_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projetoId: varchar("projeto_id").references(() => projetos.id, { onDelete: "cascade" }).notNull(),
  token: text("token").unique().notNull(),
  nomeCaptador: text("nome_captador"),
  instrucoes: text("instrucoes"),
  driveFolderId: text("drive_folder_id"),
  driveFolderUrl: text("drive_folder_url"),
  ativo: boolean("ativo").default(true),
  expiraEm: timestamp("expira_em"),
  criadoPorId: varchar("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Portal do Captador - Arquivos enviados
export const captadorUploads = pgTable("captador_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").references(() => captadorLinks.id, { onDelete: "cascade" }).notNull(),
  projetoId: varchar("projeto_id").references(() => projetos.id, { onDelete: "cascade" }).notNull(),
  nomeOriginal: text("nome_original").notNull(),
  storagePath: text("storage_path").notNull(),
  publicUrl: text("public_url"),
  tamanho: integer("tamanho"),
  mimeType: text("mime_type"),
  nomeCaptador: text("nome_captador"),
  observacao: text("observacao"),
  driveFolderId: text("drive_folder_id"),
  thumbnail: text("thumbnail"),
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
  videoPastas: many(videoPastas),
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
  roteiroComentarios: many(roteiroComentarios),
  musicas: many(projetoMusicas),
  locutores: many(projetoLocutores),
  respostasNps: many(respostasNps),
  videos: many(videosProjeto),
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

export const roteiroComentariosRelations = relations(roteiroComentarios, ({ one }) => ({
  projeto: one(projetos, {
    fields: [roteiroComentarios.projetoId],
    references: [projetos.id],
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

export const respostasNpsRelations = relations(respostasNps, ({ one }) => ({
  projeto: one(projetos, {
    fields: [respostasNps.projetoId],
    references: [projetos.id],
  }),
  cliente: one(clientes, {
    fields: [respostasNps.clienteId],
    references: [clientes.id],
  }),
}));

export const videosProjetoRelations = relations(videosProjeto, ({ one, many }) => ({
  projeto: one(projetos, {
    fields: [videosProjeto.projetoId],
    references: [projetos.id],
  }),
  pasta: one(videoPastas, {
    fields: [videosProjeto.pastaId],
    references: [videoPastas.id],
  }),
  uploadedBy: one(users, {
    fields: [videosProjeto.uploadedById],
    references: [users.id],
  }),
  comentarios: many(videoComentarios),
}));

export const videoComentariosRelations = relations(videoComentarios, ({ one }) => ({
  video: one(videosProjeto, {
    fields: [videoComentarios.videoId],
    references: [videosProjeto.id],
  }),
  autor: one(users, {
    fields: [videoComentarios.autorId],
    references: [users.id],
  }),
  resolvidoPor: one(users, {
    fields: [videoComentarios.resolvidoPorId],
    references: [users.id],
  }),
}));

export const videoPastasRelations = relations(videoPastas, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [videoPastas.clienteId],
    references: [clientes.id],
  }),
  empreendimento: one(empreendimentos, {
    fields: [videoPastas.empreendimentoId],
    references: [empreendimentos.id],
  }),
  pastaPai: one(videoPastas, {
    fields: [videoPastas.pastaPaiId],
    references: [videoPastas.id],
    relationName: "subpastas",
  }),
  subpastas: many(videoPastas, {
    relationName: "subpastas",
  }),
  videos: many(videosProjeto),
}));

export const captadorLinksRelations = relations(captadorLinks, ({ one, many }) => ({
  projeto: one(projetos, {
    fields: [captadorLinks.projetoId],
    references: [projetos.id],
  }),
  criadoPor: one(users, {
    fields: [captadorLinks.criadoPorId],
    references: [users.id],
  }),
  uploads: many(captadorUploads),
}));

export const captadorUploadsRelations = relations(captadorUploads, ({ one }) => ({
  link: one(captadorLinks, {
    fields: [captadorUploads.linkId],
    references: [captadorLinks.id],
  }),
  projeto: one(projetos, {
    fields: [captadorUploads.projetoId],
    references: [projetos.id],
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

  // Controle de envio ao cliente
  enviadoCliente: z.boolean().optional(),

  // Roteiro
  roteiroLink: z.string().url().optional().or(z.literal("")),

  // Contatos do projeto
  contatosEmail: z.array(z.string().min(3)).optional(),
  contatosWhatsapp: z.array(z.string()).optional(),
  contatosGrupos: z.array(z.string()).optional(),
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
});

export const insertAmostraLocutorSchema = createInsertSchema(amostrasLocutores).omit({
  id: true,
  createdAt: true,
});

export const insertRoteiroComentarioSchema = createInsertSchema(roteiroComentarios).omit({
  id: true,
  criadoEm: true,
});

export const insertProjetoMusicaSchema = createInsertSchema(projetoMusicas).omit({
  id: true,
  createdAt: true,
});

export const insertProjetoLocutorSchema = createInsertSchema(projetoLocutores).omit({
  id: true,
  createdAt: true,
});

export const insertRespostaNpsSchema = createInsertSchema(respostasNps).omit({
  id: true,
  dataResposta: true,
}).extend({
  notaServicos: z.number().min(0).max(10),
  notaAtendimento: z.number().min(0).max(10),
  notaIndicacao: z.number().min(0).max(10),
});

export const insertVideoProjetoSchema = createInsertSchema(videosProjeto).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVideoComentarioSchema = createInsertSchema(videoComentarios).omit({
  id: true,
  createdAt: true,
});

export const insertVideoPastaSchema = createInsertSchema(videoPastas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalVideos: true,
  totalStorage: true,
});

export const insertCaptadorLinkSchema = createInsertSchema(captadorLinks).omit({
  id: true,
  createdAt: true,
});

export const insertCaptadorUploadSchema = createInsertSchema(captadorUploads).omit({
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
export type RoteiroComentario = typeof roteiroComentarios.$inferSelect;
export type InsertRoteiroComentario = z.infer<typeof insertRoteiroComentarioSchema>;
export type ProjetoMusica = typeof projetoMusicas.$inferSelect;
export type InsertProjetoMusica = z.infer<typeof insertProjetoMusicaSchema>;
export type ProjetoLocutor = typeof projetoLocutores.$inferSelect;
export type InsertProjetoLocutor = z.infer<typeof insertProjetoLocutorSchema>;
export type RespostaNps = typeof respostasNps.$inferSelect;
export type InsertRespostaNps = z.infer<typeof insertRespostaNpsSchema>;
export type VideoProjeto = typeof videosProjeto.$inferSelect;
export type InsertVideoProjeto = z.infer<typeof insertVideoProjetoSchema>;
export type VideoComentario = typeof videoComentarios.$inferSelect;
export type InsertVideoComentario = z.infer<typeof insertVideoComentarioSchema>;
export type VideoPasta = typeof videoPastas.$inferSelect;
export type InsertVideoPasta = z.infer<typeof insertVideoPastaSchema>;

// Token de Acesso schemas
export const insertTokenAcessoSchema = z.object({
  token: z.string().min(1),
  tipo: z.string().default("api"),
  papel: z.enum(["Admin", "Gestor", "Membro"]).default("Membro"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

export type TokenAcesso = typeof tokensAcesso.$inferSelect;
export type InsertTokenAcesso = z.infer<typeof insertTokenAcessoSchema>;

export type CaptadorLink = typeof captadorLinks.$inferSelect;
export type InsertCaptadorLink = z.infer<typeof insertCaptadorLinkSchema>;
export type CaptadorUpload = typeof captadorUploads.$inferSelect;
export type InsertCaptadorUpload = z.infer<typeof insertCaptadorUploadSchema>;
export type FrameioToken = typeof frameioTokens.$inferSelect;

// Extended types with relations
export type ProjetoWithRelations = Projeto & {
  tipoVideo: TipoVideo;
  responsavel: User;
  cliente?: Cliente;
  empreendimento?: Empreendimento;
  respostaNps?: RespostaNps | null;
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

export type VideoProjetoWithRelations = VideoProjeto & {
  projeto: Projeto;
  uploadedBy?: User;
  comentarios: VideoComentario[];
};

export type VideoComentarioWithRelations = VideoComentario & {
  video: VideoProjeto;
  autor?: User;
  resolvidoPor?: User;
};

export type VideoPastaWithRelations = VideoPasta & {
  cliente: Cliente;
  empreendimento?: Empreendimento;
  pastaPai?: VideoPasta;
  subpastas: VideoPasta[];
  videos: VideoProjeto[];
};

// ========== TIPO LEVE PARA KANBAN (FASE 2A) ==========
// Versão otimizada com apenas os campos necessários para renderizar cards do Kanban
// Reduz drasticamente o volume de dados transferidos e processados
export type ProjetoKanbanLight = {
  // Campos básicos do projeto
  id: string;
  sequencialId: number;
  titulo: string;
  status: typeof projetos.$inferSelect.status;
  prioridade: typeof projetos.$inferSelect.prioridade;
  dataCriacao: Date;
  dataPrevistaEntrega: Date | null;
  dataAprovacao: Date | null;

  // Relacionamentos apenas com campos essenciais (sem objetos completos)
  tipoVideo: {
    nome: string;
    backgroundColor: string;
    textColor: string;
  };
  responsavel: {
    id: string;
    nome: string;
  };
  cliente?: {
    id: string;
    nome: string;
  } | null;

  // Campos de aprovação do cliente (necessários para badge de notificação)
  musicaAprovada: boolean | null;
  musicaVisualizadaEm: Date | null;
  locucaoAprovada: boolean | null;
  locucaoVisualizadaEm: Date | null;
  videoFinalAprovado: boolean | null;
  videoFinalVisualizadoEm: Date | null;
  roteiroAprovado: boolean | null;
  roteiroVisualizadoEm: Date | null;

  // CAMPOS REMOVIDOS (presentes em ProjetoWithRelations mas não necessários no Kanban):
  // ❌ descricao - não exibida no card
  // ❌ tags - não exibida no card
  // ❌ anexos - não exibida no card
  // ❌ linkYoutube - não exibida no card
  // ❌ duracao, formato, captacao, roteiro - não exibidas no card
  // ❌ informacoesAdicionais, referencias - não exibidas no card
  // ❌ empreendimento - não exibido no card
  // ❌ respostaNps - não exibida no card
  // ❌ musicaUrl, locucaoUrl, videoFinalUrl - não exibidas no card
  // ❌ todos os campos de aprovação de música/locução/vídeo - não exibidos no card
  //
  // RESULTADO: ~70% menos dados transferidos por projeto!
  // Exemplo: ProjetoWithRelations = ~2KB, ProjetoKanbanLight = ~0.6KB
  // Com 70 projetos: 140KB → 42KB (economia de ~100KB por requisição)
};
