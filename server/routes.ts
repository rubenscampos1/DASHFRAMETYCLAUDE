import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import type { WebSocketServer } from "./websocket";
import { insertProjetoSchema, updateProjetoSchema, insertLogStatusSchema, insertClienteSchema, insertEmpreendimentoSchema, insertTagSchema, insertTipoVideoSchema, insertComentarioSchema, insertNotaSchema } from "@shared/schema";
import * as schema from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.papel)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    next();
  };
}

// Configuração do Multer para upload de áudio
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "locutores");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const audioUpload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Use MP3, WAV, OGG ou WEBM.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Health check endpoint for Render.com (no auth required)
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Configuração do Supabase para realtime (apenas usuários autenticados)
  app.get("/api/config/supabase", requireAuth, (req, res) => {
    // Extrair informações da DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL || '';

    // Formato: postgresql://postgres.PROJECT_ID:PASSWORD@HOST:PORT/postgres
    // Exemplo: postgresql://postgres.wgfpvlzpuqjenqumuxkx:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
    const match = databaseUrl.match(/postgres\.([^:]+):/);
    const projectId = match ? match[1] : '';

    const supabaseUrl = projectId ? `https://${projectId}.supabase.co` : '';

    // A chave anônima do Supabase precisa ser configurada como variável de ambiente
    // Por segurança, só enviamos para usuários autenticados
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

    res.json({
      supabaseUrl,
      supabaseAnonKey,
    });
  });

  // Initialize database with seed data
  app.post("/api/seed", async (req, res, next) => {
    try {
      await storage.seedData();
      res.json({ message: "Dados iniciais criados com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Users routes
  app.get("/api/users", requireAuth, async (req, res, next) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/user/profile", requireAuth, async (req, res, next) => {
    try {
      const { nome, email, senha, fotoUrl } = req.body;
      const updates: any = { nome, email, fotoUrl };
      
      if (senha && senha.trim() !== "") {
        updates.password = senha;
      }

      const user = await storage.updateUser(req.user!.id, updates);
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const { nome, email, senha, papel, fotoUrl } = req.body;
      const user = await storage.createUser({
        nome,
        email,
        password: senha,
        papel,
        fotoUrl,
        ativo: true,
      });
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const { nome, email, senha, papel, fotoUrl } = req.body;
      const updates: any = { nome, email, papel, fotoUrl };
      
      if (senha && senha.trim() !== "") {
        updates.password = senha;
      }

      const user = await storage.updateUser(req.params.id, updates);
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      // Prevent deleting yourself
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }
      
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      // Return 409 Conflict if user has projects
      if (error.message?.includes("responsável por")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  });

  // Projetos routes
  app.get("/api/projetos", requireAuth, async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status as string,
        responsavelId: req.query.responsavelId as string,
        tipoVideoId: req.query.tipoVideoId as string,
        prioridade: req.query.prioridade as string,
        search: req.query.search as string,
        dataInicioAprovacao: req.query.dataInicioAprovacao as string,
        dataFimAprovacao: req.query.dataFimAprovacao as string,
      };

      // Parâmetros de paginação
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      // Remove undefined values and "all" values
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value === undefined || value === "all" || value === "") {
          delete filters[key as keyof typeof filters];
        }
      });

      const projetos = await storage.getProjetos(filters);

      // Otimização: Remover campos pesados desnecessários para o dashboard
      // Campos como descricao, informacoesAdicionais, referencias, anotacoes são carregados apenas no drawer
      let projetosOtimizados = projetos.map(projeto => ({
        ...projeto,
        descricao: undefined,  // Não enviar descrição completa para o dashboard
        informacoesAdicionais: undefined,  // Não enviar informações adicionais para o dashboard
        referencias: undefined,  // Não enviar referências para o dashboard
        caminho: undefined,  // Não enviar caminho para o dashboard
      }));

      // Se paginação foi solicitada, aplicar limit e offset
      if (limit !== undefined && offset !== undefined) {
        const total = projetosOtimizados.length;
        const paginatedProjetos = projetosOtimizados.slice(offset, offset + limit);

        // Retornar com metadata de paginação
        return res.json({
          projetos: paginatedProjetos,
          total,
          offset,
          limit,
          hasMore: offset + limit < total,
        });
      }

      // Sem paginação, retorna todos os projetos (compatibilidade)
      res.json(projetosOtimizados);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/projetos/:id", requireAuth, async (req, res, next) => {
    try {
      const projeto = await storage.getProjeto(req.params.id);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      res.json(projeto);
    } catch (error) {
      next(error);
    }
  });

  // PDF Export endpoint
  app.get("/api/relatorios/pdf", requireAuth, async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status as string,
        responsavelId: req.query.responsavelId as string,
        tipoVideoId: req.query.tipoVideoId as string,
        prioridade: req.query.prioridade as string,
        search: req.query.search as string,
        dataInicioAprovacao: req.query.dataInicioAprovacao as string,
        dataFimAprovacao: req.query.dataFimAprovacao as string,
      };

      // Remove undefined values and "all" values
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (!value || value === "all") {
          delete filters[key as keyof typeof filters];
        }
      });

      const projetos = await storage.getProjetos(filters);

      // Create PDF in landscape mode for better table visibility
      const doc = new PDFDocument({ 
        size: 'A4',
        layout: 'landscape',
        margin: 40,
        bufferPages: true
      });

      // Set response headers
      const filename = `relatorio-projetos-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Pipe PDF to response
      doc.pipe(res);

      // Header with logo text
      doc.fontSize(24)
         .fillColor('#1e40af')
         .text('FRAMETY', 40, 40);
      
      doc.fontSize(10)
         .fillColor('#666666')
         .text('Sistema de Gestão de Projetos de Vídeo', 40, 70);

      // Title
      doc.fontSize(16)
         .fillColor('#000000')
         .text('Relatório de Projetos', 40, 100);

      // Date and filters info
      doc.fontSize(9)
         .fillColor('#666666')
         .text(`Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, 40, 125);
      
      let yPosition = 145;

      // Applied filters
      if (Object.keys(filters).length > 0) {
        doc.fontSize(9)
           .fillColor('#666666')
           .text('Filtros Aplicados:', 40, yPosition);
        yPosition += 12;

        if (filters.status) {
          doc.text(`• Status: ${filters.status}`, 55, yPosition);
          yPosition += 12;
        }
        if (filters.dataInicioAprovacao || filters.dataFimAprovacao) {
          const dataInicio = filters.dataInicioAprovacao ? new Date(filters.dataInicioAprovacao).toLocaleDateString('pt-BR') : '...';
          const dataFim = filters.dataFimAprovacao ? new Date(filters.dataFimAprovacao).toLocaleDateString('pt-BR') : '...';
          doc.text(`• Período: ${dataInicio} a ${dataFim}`, 55, yPosition);
          yPosition += 12;
        }
        yPosition += 8;
      }

      // Summary
      doc.fontSize(11)
         .fillColor('#000000')
         .text(`Total de Projetos: ${projetos.length}`, 40, yPosition);
      yPosition += 25;

      // Table configuration - landscape A4 is ~842 x 595 points
      // Available width: 842 - 80 (margins) = 762 points
      const tableTop = yPosition;
      const leftMargin = 40;
      const colWidths = {
        id: 60,
        titulo: 250,
        cliente: 160,
        responsavel: 160,
        dataAprovacao: 100
      };

      // Table header
      doc.fontSize(10)
         .fillColor('#1e40af')
         .font('Helvetica-Bold')
         .text('ID', leftMargin, tableTop, { width: colWidths.id, align: 'left' })
         .text('Título', leftMargin + colWidths.id, tableTop, { width: colWidths.titulo, align: 'left' })
         .text('Cliente', leftMargin + colWidths.id + colWidths.titulo, tableTop, { width: colWidths.cliente, align: 'left' })
         .text('Responsável', leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente, tableTop, { width: colWidths.responsavel, align: 'left' })
         .text('Data Aprovação', leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente + colWidths.responsavel, tableTop, { width: colWidths.dataAprovacao, align: 'left' });

      // Draw line under header
      doc.moveTo(leftMargin, tableTop + 14)
         .lineTo(leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente + colWidths.responsavel + colWidths.dataAprovacao, tableTop + 14)
         .strokeColor('#1e40af')
         .lineWidth(1.5)
         .stroke();

      yPosition = tableTop + 22;

      // Table rows
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#000000');
      
      projetos.forEach((projeto, index) => {
        // Check if we need a new page
        if (yPosition > 520) {
          doc.addPage({ layout: 'landscape' });
          yPosition = 40;
          
          // Redraw header on new page
          doc.fontSize(10)
             .fillColor('#1e40af')
             .font('Helvetica-Bold')
             .text('ID', leftMargin, yPosition, { width: colWidths.id, align: 'left' })
             .text('Título', leftMargin + colWidths.id, yPosition, { width: colWidths.titulo, align: 'left' })
             .text('Cliente', leftMargin + colWidths.id + colWidths.titulo, yPosition, { width: colWidths.cliente, align: 'left' })
             .text('Responsável', leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente, yPosition, { width: colWidths.responsavel, align: 'left' })
             .text('Data Aprovação', leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente + colWidths.responsavel, yPosition, { width: colWidths.dataAprovacao, align: 'left' });
          
          doc.moveTo(leftMargin, yPosition + 14)
             .lineTo(leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente + colWidths.responsavel + colWidths.dataAprovacao, yPosition + 14)
             .strokeColor('#1e40af')
             .lineWidth(1.5)
             .stroke();
          
          yPosition += 22;
          doc.font('Helvetica').fontSize(9).fillColor('#000000');
        }

        // Zebra striping background
        if (index % 2 === 0) {
          doc.fillColor('#f9fafb')
             .rect(leftMargin, yPosition - 2, colWidths.id + colWidths.titulo + colWidths.cliente + colWidths.responsavel + colWidths.dataAprovacao, 16)
             .fill();
          doc.fillColor('#000000');
        }

        const sequencialId = `#SKY${projeto.sequencialId}`;
        const titulo = projeto.titulo || '-';
        const cliente = projeto.cliente?.nome || '-';
        const responsavel = projeto.responsavel?.nome || '-';
        const dataAprovacao = projeto.dataAprovacao 
          ? new Date(projeto.dataAprovacao).toLocaleDateString('pt-BR')
          : '-';

        doc.text(sequencialId, leftMargin, yPosition, { width: colWidths.id - 5, ellipsis: true })
           .text(titulo, leftMargin + colWidths.id, yPosition, { width: colWidths.titulo - 5, ellipsis: true })
           .text(cliente, leftMargin + colWidths.id + colWidths.titulo, yPosition, { width: colWidths.cliente - 5, ellipsis: true })
           .text(responsavel, leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente, yPosition, { width: colWidths.responsavel - 5, ellipsis: true })
           .text(dataAprovacao, leftMargin + colWidths.id + colWidths.titulo + colWidths.cliente + colWidths.responsavel, yPosition, { width: colWidths.dataAprovacao, align: 'left' });

        yPosition += 16;
      });

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor('#666666')
           .text(
             `Página ${i + 1} de ${pageCount}`,
             50,
             doc.page.height - 50,
             { align: 'center', width: doc.page.width - 100 }
           );
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projetos", requireAuth, async (req, res, next) => {
    try {
      console.log("[POST /api/projetos] req.body:", JSON.stringify(req.body, null, 2));
      const validatedData = insertProjetoSchema.parse(req.body);
      console.log("[POST /api/projetos] validatedData:", JSON.stringify(validatedData, null, 2));
      const projeto = await storage.createProjeto(validatedData);
      
      // Create initial status log
      await storage.createLogStatus({
        projetoId: projeto.id,
        statusAnterior: null,
        statusNovo: projeto.status,
        alteradoPorId: req.user!.id,
      });

      res.status(201).json(projeto);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projetos/:id/duplicar", requireAuth, async (req, res, next) => {
    try {
      const projetoOriginal = await storage.getProjeto(req.params.id);
      if (!projetoOriginal) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const projetoDuplicado = await storage.duplicarProjeto(req.params.id);
      
      // Create initial status log for duplicated project
      await storage.createLogStatus({
        projetoId: projetoDuplicado.id,
        statusAnterior: null,
        statusNovo: projetoDuplicado.status,
        alteradoPorId: req.user!.id,
      });

      res.status(201).json(projetoDuplicado);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/projetos/:id", requireAuth, requireRole(["Admin", "Gestor"]), async (req, res, next) => {
    try {
      const projetoExistente = await storage.getProjeto(req.params.id);
      if (!projetoExistente) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      // Allow all authenticated users to edit any project

      const validatedData = updateProjetoSchema.parse(req.body);
      
      // If status is changing, log it and update statusChangedAt
      if (validatedData.status && validatedData.status !== projetoExistente.status) {
        await storage.createLogStatus({
          projetoId: req.params.id,
          statusAnterior: projetoExistente.status,
          statusNovo: validatedData.status,
          alteradoPorId: req.user!.id,
        });

        // Update statusChangedAt whenever status changes
        (validatedData as any).statusChangedAt = new Date();

        // If moving to Aprovado, set approval date
        if (validatedData.status === "Aprovado") {
          (validatedData as any).dataAprovacao = new Date();
        }
      }

      const projeto = await storage.updateProjeto(req.params.id, validatedData);

      // Emitir evento WebSocket para sincronização em tempo real
      const wsServer = (req.app as any).wsServer;
      console.log('🟡 [DEBUG DRAG] WebSocket server exists?', !!wsServer);
      console.log('🟡 [DEBUG DRAG] Projeto atualizado:', projeto.id);
      console.log('🟡 [DEBUG DRAG] Novo status:', projeto.status);
      console.log('🟡 [DEBUG DRAG] Emitindo evento projeto:updated...');

      if (wsServer) {
        wsServer.emitChange('projeto:updated', { id: projeto.id, projeto });
        console.log('🟡 [DEBUG DRAG] Evento projeto:updated emitido com sucesso!');
      } else {
        console.error('🟡 [DEBUG DRAG] ERRO: WebSocket server não encontrado!');
      }

      res.json(projeto);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/projetos/:id", requireAuth, requireRole(["Admin", "Gestor"]), async (req, res, next) => {
    try {
      const projeto = await storage.getProjeto(req.params.id);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      await storage.deleteProjeto(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // NPS route
  app.put("/api/projetos/:id/nps", requireAuth, async (req, res, next) => {
    try {
      // Define NPS validation schema
      const npsSchema = z.object({
        npsScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
        npsContact: z.string().trim().min(1, "Número de contato é obrigatório"),
        npsResponsible: z.string().trim().min(1, "Nome do responsável é obrigatório"),
      });

      const validatedData = npsSchema.parse(req.body);

      const projeto = await storage.updateProjeto(req.params.id, {
        npsScore: validatedData.npsScore,
        npsContact: validatedData.npsContact,
        npsResponsible: validatedData.npsResponsible,
      });

      res.json(projeto);
    } catch (error) {
      next(error);
    }
  });

  // Marcar aprovações como visualizadas
  app.put("/api/projetos/:id/marcar-aprovacoes-visualizadas", requireAuth, async (req, res, next) => {
    try {
      const now = new Date();

      const projeto = await storage.updateProjeto(req.params.id, {
        musicaVisualizadaEm: now,
        locucaoVisualizadaEm: now,
        videoFinalVisualizadoEm: now,
      });

      // Emitir evento WebSocket para atualização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('projeto:updated', { id: projeto.id, projeto });
      }

      res.json(projeto);
    } catch (error) {
      next(error);
    }
  });

  // Tipos de video routes
  app.get("/api/tipos-video", requireAuth, async (req, res, next) => {
    try {
      const tipos = await storage.getTiposDeVideo();
      res.json(tipos);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tipos-video", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tipoData = insertTipoVideoSchema.parse(req.body);
      const tipo = await storage.createTipoVideo(tipoData);
      res.status(201).json(tipo);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/tipos-video/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tipoData = insertTipoVideoSchema.parse(req.body);
      const updatedTipo = await storage.updateTipoVideo(req.params.id, tipoData);
      res.json(updatedTipo);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tipos-video/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteTipoVideo(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      // Se for erro de foreign key constraint, retornar mensagem amigável
      if (error instanceof Error && error.message.includes("projeto(s) associado(s)")) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  });

  // Tags routes
  app.get("/api/tags", requireAuth, async (req, res, next) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tags", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/tags/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const updatedTag = await storage.updateTag(req.params.id, tagData);
      res.json(updatedTag);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tags/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteTag(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Clientes routes
  app.get("/api/clientes", requireAuth, async (req, res, next) => {
    try {
      const clientes = await storage.getClientes();
      res.json(clientes);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/clientes/:id", requireAuth, async (req, res, next) => {
    try {
      const cliente = await storage.getCliente(req.params.id);
      if (!cliente) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      res.json(cliente);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/clientes", requireAuth, async (req, res, next) => {
    try {
      const clienteData = insertClienteSchema.parse(req.body);
      const cliente = await storage.createCliente(clienteData);
      res.status(201).json(cliente);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/clientes/:id", requireAuth, async (req, res, next) => {
    try {
      const cliente = await storage.getCliente(req.params.id);
      if (!cliente) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      const clienteData = insertClienteSchema.parse(req.body);
      const updatedCliente = await storage.updateCliente(req.params.id, clienteData);
      res.json(updatedCliente);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/clientes/:id", requireAuth, async (req, res, next) => {
    try {
      const cliente = await storage.getCliente(req.params.id);
      if (!cliente) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      await storage.deleteCliente(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      // Se for erro de foreign key constraint, retornar mensagem amigável
      if (error instanceof Error && error.message.includes("projeto(s) associado(s)")) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof Error && error.message.includes("empreendimento(s) associado(s)")) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  });

  // Empreendimentos routes
  app.get("/api/empreendimentos", requireAuth, async (req, res, next) => {
    try {
      const empreendimentos = await storage.getEmpreendimentos();
      res.json(empreendimentos);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/empreendimentos/:id", requireAuth, async (req, res, next) => {
    try {
      const empreendimento = await storage.getEmpreendimento(req.params.id);
      if (!empreendimento) {
        return res.status(404).json({ message: "Empreendimento não encontrado" });
      }
      res.json(empreendimento);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/empreendimentos", requireAuth, async (req, res, next) => {
    try {
      const empreendimentoData = insertEmpreendimentoSchema.parse(req.body);
      const empreendimento = await storage.createEmpreendimento(empreendimentoData);
      res.status(201).json(empreendimento);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/empreendimentos/:id", requireAuth, async (req, res, next) => {
    try {
      const empreendimento = await storage.getEmpreendimento(req.params.id);
      if (!empreendimento) {
        return res.status(404).json({ message: "Empreendimento não encontrado" });
      }

      const empreendimentoData = insertEmpreendimentoSchema.parse(req.body);
      const updatedEmpreendimento = await storage.updateEmpreendimento(req.params.id, empreendimentoData);
      res.json(updatedEmpreendimento);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/empreendimentos/:id", requireAuth, async (req, res, next) => {
    try {
      const empreendimento = await storage.getEmpreendimento(req.params.id);
      if (!empreendimento) {
        return res.status(404).json({ message: "Empreendimento não encontrado" });
      }

      await storage.deleteEmpreendimento(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Logs routes
  app.get("/api/projetos/:id/logs", requireAuth, async (req, res, next) => {
    try {
      const logs = await storage.getLogsByProjeto(req.params.id);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Comentários routes
  app.get("/api/projetos/:id/comentarios", requireAuth, async (req, res, next) => {
    try {
      const comentarios = await storage.getComentariosByProjeto(req.params.id);
      res.json(comentarios);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/comentarios", requireAuth, async (req, res, next) => {
    try {
      const comentarioData = insertComentarioSchema.parse({
        ...req.body,
        autorId: req.user?.id
      });
      const comentario = await storage.createComentario(comentarioData);
      res.status(201).json(comentario);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/comentarios/:id", requireAuth, async (req, res, next) => {
    try {
      const comentarioData = insertComentarioSchema.partial().parse(req.body);
      const updatedComentario = await storage.updateComentario(req.params.id, comentarioData);
      res.json(updatedComentario);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/comentarios/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteComentario(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Notas routes
  app.get("/api/notas", requireAuth, async (req, res, next) => {
    try {
      const { tipo, categoria, favorito } = req.query;
      const filters: any = {};
      if (tipo) filters.tipo = tipo;
      if (categoria) filters.categoria = categoria;
      if (favorito !== undefined) filters.favorito = favorito === 'true';

      // Buscar todas as notas (compartilhadas entre todos os usuários)
      const notas = await storage.getNotas(undefined, filters);
      res.json(notas);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notas/:id", requireAuth, async (req, res, next) => {
    try {
      const nota = await storage.getNota(req.params.id);
      if (!nota) {
        return res.status(404).json({ message: "Nota não encontrada" });
      }
      // Notas são compartilhadas entre todos os usuários
      res.json(nota);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/notas", requireAuth, async (req, res, next) => {
    try {
      const notaData = insertNotaSchema.parse({
        ...req.body,
        usuarioId: req.user!.id
      });
      const nota = await storage.createNota(notaData);

      // If this is a file nota, set ACL policy for the uploaded object
      if (nota.fileKey && nota.tipo === "Arquivo") {
        try {
          const objectStorageService = new ObjectStorageService();
          const objectPath = `/objects${nota.fileKey}`;
          await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
            owner: req.user!.id,
            visibility: "private",
          });
          console.log(`ACL policy set for object: ${objectPath}, owner: ${req.user!.id}`);
        } catch (aclError) {
          console.error("Failed to set ACL policy for uploaded file:", aclError);
          // Don't fail the nota creation if ACL setting fails
        }
      }

      // Emitir evento WebSocket para sincronização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('nota:created', { notaId: nota.id });
      }

      res.status(201).json(nota);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/notas/:id", requireAuth, async (req, res, next) => {
    try {
      const nota = await storage.getNota(req.params.id);
      if (!nota) {
        return res.status(404).json({ message: "Nota não encontrada" });
      }
      // Notas são compartilhadas - qualquer usuário pode editar

      const notaData = insertNotaSchema.partial().parse(req.body);
      const updatedNota = await storage.updateNota(req.params.id, notaData);

      // Emitir evento WebSocket para sincronização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('nota:updated', { notaId: updatedNota.id });
      }

      res.json(updatedNota);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/notas/:id", requireAuth, async (req, res, next) => {
    try {
      const nota = await storage.getNota(req.params.id);
      if (!nota) {
        return res.status(404).json({ message: "Nota não encontrada" });
      }
      // Notas são compartilhadas - qualquer usuário pode deletar

      await storage.deleteNota(req.params.id);

      // Emitir evento WebSocket para sincronização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('nota:deleted', { notaId: req.params.id });
      }

      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Timelapse routes
  app.get("/api/timelapses", requireAuth, async (req, res, next) => {
    try {
      const timelapses = await storage.getTimelapses();
      res.json(timelapses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/timelapses/:id", requireAuth, async (req, res, next) => {
    try {
      const timelapse = await storage.getTimelapseById(req.params.id);
      if (!timelapse) {
        return res.status(404).json({ message: "Timelapse não encontrado" });
      }
      res.json(timelapse);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/timelapses", requireAuth, async (req, res, next) => {
    try {
      log("[POST /api/timelapses] req.body:", JSON.stringify(req.body, null, 2));

      const validation = schema.insertTimelapseSchema.safeParse(req.body);
      if (!validation.success) {
        log("[POST /api/timelapses] validation failed:", JSON.stringify(validation.error.errors, null, 2));
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validation.error.errors,
        });
      }

      log("[POST /api/timelapses] validatedData:", JSON.stringify(validation.data, null, 2));
      const timelapse = await storage.createTimelapse(validation.data);
      log("[POST /api/timelapses] created:", JSON.stringify(timelapse, null, 2));
      res.status(201).json(timelapse);
    } catch (error) {
      log("[POST /api/timelapses] error:", error);
      next(error);
    }
  });

  app.patch("/api/timelapses/:id", requireAuth, async (req, res, next) => {
    try {
      const timelapse = await storage.getTimelapseById(req.params.id);
      if (!timelapse) {
        return res.status(404).json({ message: "Timelapse não encontrado" });
      }

      const validation = schema.insertTimelapseSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validation.error.errors,
        });
      }

      const updated = await storage.updateTimelapse(req.params.id, validation.data);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/timelapses/:id", requireAuth, async (req, res, next) => {
    try {
      const timelapse = await storage.getTimelapseById(req.params.id);
      if (!timelapse) {
        return res.status(404).json({ message: "Timelapse não encontrado" });
      }

      await storage.deleteTimelapse(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Object Storage routes (for file uploads in notas)
  // Reference: blueprint:javascript_object_storage
  app.post("/api/objects/upload", requireAuth, async (req, res, next) => {
    try {
      const { contentType } = req.body;
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getObjectEntityUploadURL(contentType);
      res.json(result);
    } catch (error) {
      console.error("Error getting upload URL:", error);
      next(error);
    }
  });

  app.get("/objects/:objectPath(*)", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      next(error);
    }
  });

  // Locutores routes
  app.get("/api/locutores", requireAuth, async (req, res, next) => {
    try {
      const { genero, faixaEtaria, regiao, disponivel } = req.query;
      const filters: any = {};

      if (genero) filters.genero = genero as string;
      if (faixaEtaria) filters.faixaEtaria = faixaEtaria as string;
      if (regiao) filters.regiao = regiao as string;
      if (disponivel !== undefined) filters.disponivel = disponivel === 'true';

      const locutores = await storage.getLocutores(filters);
      res.json(locutores);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/locutores/:id", requireAuth, async (req, res, next) => {
    try {
      const locutor = await storage.getLocutor(req.params.id);
      if (!locutor) {
        return res.status(404).json({ message: "Locutor não encontrado" });
      }
      res.json(locutor);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/locutores", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const novoLocutor = await storage.createLocutor(req.body);
      res.status(201).json(novoLocutor);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/locutores/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const locutor = await storage.updateLocutor(req.params.id, req.body);
      res.json(locutor);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/locutores/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteLocutor(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Estilos de Locução routes
  app.get("/api/estilos-locucao", requireAuth, async (req, res, next) => {
    try {
      const estilos = await storage.getEstilosLocucao();
      res.json(estilos);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/estilos-locucao", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const novoEstilo = await storage.createEstiloLocucao(req.body);
      res.status(201).json(novoEstilo);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/estilos-locucao/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const estilo = await storage.updateEstiloLocucao(req.params.id, req.body);
      res.json(estilo);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/estilos-locucao/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteEstiloLocucao(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Amostras de Locutores routes
  app.get("/api/locutores/:locutorId/amostras", requireAuth, async (req, res, next) => {
    try {
      const amostras = await storage.getAmostrasLocutor(req.params.locutorId);
      res.json(amostras);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/locutores/:locutorId/amostras", requireAuth, requireRole(["Admin"]), audioUpload.single('audio'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      const { titulo, descricao, estiloId, destaque } = req.body;
      const arquivoUrl = `/uploads/locutores/${req.file.filename}`;

      const novaAmostra = await storage.createAmostraLocutor({
        locutorId: req.params.locutorId,
        titulo,
        descricao: descricao || null,
        estiloId: estiloId || null,
        arquivoUrl,
        duracao: null, // Pode ser calculado no frontend ou com uma lib
        ordem: 0,
        destaque: destaque === 'true' || destaque === true
      });

      res.status(201).json(novaAmostra);
    } catch (error) {
      // Se der erro, remove o arquivo que foi feito upload
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  });

  app.put("/api/amostras/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const amostra = await storage.updateAmostraLocutor(req.params.id, req.body);
      res.json(amostra);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/amostras/:id", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const amostra = await storage.getAmostraLocutor(req.params.id);
      if (amostra) {
        // Remove o arquivo físico
        const filePath = path.join(process.cwd(), amostra.arquivoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await storage.deleteAmostraLocutor(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Servir arquivos estáticos de uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ==========================================
  // MÚSICAS DO PROJETO
  // ==========================================

  app.get("/api/projetos/:projetoId/musicas", requireAuth, async (req, res, next) => {
    try {
      const musicas = await storage.getProjetoMusicas(req.params.projetoId);
      res.json(musicas);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projetos/:projetoId/musicas", requireAuth, async (req, res, next) => {
    try {
      console.log("[POST /api/projetos/:projetoId/musicas] projetoId:", req.params.projetoId);
      console.log("[POST /api/projetos/:projetoId/musicas] body:", req.body);
      const musica = await storage.createProjetoMusica({
        ...req.body,
        projetoId: req.params.projetoId,
      });
      console.log("[POST /api/projetos/:projetoId/musicas] created:", musica);
      res.status(201).json(musica);
    } catch (error) {
      console.error("[POST /api/projetos/:projetoId/musicas] error:", error);
      next(error);
    }
  });

  app.put("/api/musicas/:id", requireAuth, async (req, res, next) => {
    try {
      const musica = await storage.updateProjetoMusica(req.params.id, req.body);
      res.json(musica);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/musicas/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteProjetoMusica(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // LOCUTORES DO PROJETO
  // ==========================================

  app.get("/api/projetos/:projetoId/locutores", requireAuth, async (req, res, next) => {
    try {
      const locutores = await storage.getProjetoLocutores(req.params.projetoId);
      res.json(locutores);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projetos/:projetoId/locutores", requireAuth, async (req, res, next) => {
    try {
      console.log("[POST /api/projetos/:projetoId/locutores] projetoId:", req.params.projetoId);
      console.log("[POST /api/projetos/:projetoId/locutores] body:", req.body);
      const locutor = await storage.createProjetoLocutor({
        ...req.body,
        projetoId: req.params.projetoId,
      });
      console.log("[POST /api/projetos/:projetoId/locutores] created:", locutor);
      res.status(201).json(locutor);
    } catch (error) {
      console.error("[POST /api/projetos/:projetoId/locutores] error:", error);
      next(error);
    }
  });

  app.put("/api/projeto-locutores/:id", requireAuth, async (req, res, next) => {
    try {
      const locutor = await storage.updateProjetoLocutor(req.params.id, req.body);
      res.json(locutor);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/projeto-locutores/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteProjetoLocutor(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // ROTAS PÚBLICAS DO PORTAL DO CLIENTE
  // ==========================================

  // Buscar projeto por token (rota pública - sem autenticação)
  app.get("/api/cliente/projeto/:token", async (req, res, next) => {
    try {
      const projeto = await storage.getProjetoByClientToken(req.params.token);

      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado ou link inválido" });
      }

      // Buscar músicas e locutores do projeto
      const musicas = await storage.getProjetoMusicas(projeto.id);
      const locutores = await storage.getProjetoLocutores(projeto.id);

      // Retornar apenas as informações necessárias para o cliente
      const projetoCliente = {
        id: projeto.id,
        sequencialId: projeto.sequencialId,
        titulo: projeto.titulo,
        descricao: projeto.descricao,
        status: projeto.status,
        dataCriacao: projeto.dataCriacao,
        dataPrevistaEntrega: projeto.dataPrevistaEntrega,
        statusChangedAt: projeto.statusChangedAt,
        tipoVideo: projeto.tipoVideo,
        cliente: projeto.cliente,
        empreendimento: projeto.empreendimento,
        // Link do Frame.io para o cliente visualizar o vídeo
        linkFrameIo: projeto.linkFrameIo,
        // Arrays de músicas e locutores para aprovação
        musicas,
        locutores,
        // URLs antigas para aprovação (mantidas para compatibilidade)
        musicaUrl: projeto.musicaUrl,
        musicaAprovada: projeto.musicaAprovada,
        musicaFeedback: projeto.musicaFeedback,
        musicaDataAprovacao: projeto.musicaDataAprovacao,
        locucaoUrl: projeto.locucaoUrl,
        locucaoAprovada: projeto.locucaoAprovada,
        locucaoFeedback: projeto.locucaoFeedback,
        locucaoDataAprovacao: projeto.locucaoDataAprovacao,
        videoFinalUrl: projeto.videoFinalUrl,
        videoFinalAprovado: projeto.videoFinalAprovado,
        videoFinalFeedback: projeto.videoFinalFeedback,
        videoFinalDataAprovacao: projeto.videoFinalDataAprovacao,
      };

      res.json(projetoCliente);
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // PORTAL UNIFICADO DO CLIENTE
  // ==========================================

  // Buscar todos os projetos de um cliente por portal token (rota pública - sem autenticação)
  app.get("/api/portal/cliente/:clientToken", async (req, res, next) => {
    try {
      const result = await storage.getClienteByPortalToken(req.params.clientToken);

      if (!result) {
        return res.status(404).json({ message: "Cliente não encontrado ou link inválido" });
      }

      const { cliente, projetos } = result;

      // Para cada projeto, buscar músicas e locutores
      const projetosComDetalhes = await Promise.all(
        projetos.map(async (projeto) => {
          const musicas = await storage.getProjetoMusicas(projeto.id);
          const locutores = await storage.getProjetoLocutores(projeto.id);

          return {
            id: projeto.id,
            sequencialId: projeto.sequencialId,
            titulo: projeto.titulo,
            descricao: projeto.descricao,
            status: projeto.status,
            dataCriacao: projeto.dataCriacao,
            dataPrevistaEntrega: projeto.dataPrevistaEntrega,
            statusChangedAt: projeto.statusChangedAt,
            tipoVideo: projeto.tipoVideo,
            empreendimento: projeto.empreendimento,
            linkFrameIo: projeto.linkFrameIo,
            clientToken: projeto.clientToken, // Token individual do projeto (para compatibilidade)
            // Arrays de músicas e locutores para aprovação
            musicas,
            locutores,
            // URLs antigas para aprovação (mantidas para compatibilidade)
            musicaUrl: projeto.musicaUrl,
            musicaAprovada: projeto.musicaAprovada,
            musicaFeedback: projeto.musicaFeedback,
            musicaDataAprovacao: projeto.musicaDataAprovacao,
            locucaoUrl: projeto.locucaoUrl,
            locucaoAprovada: projeto.locucaoAprovada,
            locucaoFeedback: projeto.locucaoFeedback,
            locucaoDataAprovacao: projeto.locucaoDataAprovacao,
            videoFinalUrl: projeto.videoFinalUrl,
            videoFinalAprovado: projeto.videoFinalAprovado,
            videoFinalFeedback: projeto.videoFinalFeedback,
            videoFinalDataAprovacao: projeto.videoFinalDataAprovacao,
          };
        })
      );

      res.json({
        cliente: {
          nome: cliente.nome,
          empresa: cliente.empresa,
          backgroundColor: cliente.backgroundColor,
          textColor: cliente.textColor,
        },
        projetos: projetosComDetalhes,
      });
    } catch (error) {
      next(error);
    }
  });

  // Aprovar/Reprovar Música
  app.post("/api/cliente/projeto/:token/aprovar-musica", async (req, res, next) => {
    try {
      const { aprovado, feedback } = req.body;

      if (typeof aprovado !== 'boolean') {
        return res.status(400).json({ message: "Campo 'aprovado' é obrigatório e deve ser boolean" });
      }

      const projeto = await storage.aprovarMusica(req.params.token, aprovado, feedback);

      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      res.json({
        message: aprovado ? "Música aprovada com sucesso!" : "Solicitação de alteração enviada",
        musicaAprovada: projeto.musicaAprovada,
        musicaFeedback: projeto.musicaFeedback
      });
    } catch (error) {
      next(error);
    }
  });

  // Aprovar/Reprovar Locução
  app.post("/api/cliente/projeto/:token/aprovar-locucao", async (req, res, next) => {
    try {
      const { aprovado, feedback } = req.body;

      if (typeof aprovado !== 'boolean') {
        return res.status(400).json({ message: "Campo 'aprovado' é obrigatório e deve ser boolean" });
      }

      const projeto = await storage.aprovarLocucao(req.params.token, aprovado, feedback);

      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      res.json({
        message: aprovado ? "Locução aprovada com sucesso!" : "Solicitação de alteração enviada",
        locucaoAprovada: projeto.locucaoAprovada,
        locucaoFeedback: projeto.locucaoFeedback
      });
    } catch (error) {
      next(error);
    }
  });

  // Aprovar/Reprovar Vídeo Final
  app.post("/api/cliente/projeto/:token/aprovar-video", async (req, res, next) => {
    try {
      const { aprovado, feedback } = req.body;

      if (typeof aprovado !== 'boolean') {
        return res.status(400).json({ message: "Campo 'aprovado' é obrigatório e deve ser boolean" });
      }

      const projeto = await storage.aprovarVideoFinal(req.params.token, aprovado, feedback);

      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      res.json({
        message: aprovado ? "Vídeo aprovado com sucesso!" : "Solicitação de alteração enviada",
        videoFinalAprovado: projeto.videoFinalAprovado,
        videoFinalFeedback: projeto.videoFinalFeedback
      });
    } catch (error) {
      next(error);
    }
  });

  // Aprovar/Reprovar Música Individual (novo sistema com múltiplas músicas)
  app.post("/api/cliente/projeto/:token/musicas/:musicaId/aprovar", async (req, res, next) => {
    try {
      const { aprovado, feedback } = req.body;

      if (typeof aprovado !== 'boolean') {
        return res.status(400).json({ message: "Campo 'aprovado' é obrigatório e deve ser boolean" });
      }

      // Verificar se o token é válido e pertence ao projeto da música
      const projeto = await storage.getProjetoByClientToken(req.params.token);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado ou link inválido" });
      }

      const musica = await storage.getProjetoMusica(req.params.musicaId);
      if (!musica || musica.projetoId !== projeto.id) {
        return res.status(404).json({ message: "Música não encontrada" });
      }

      const musicaAtualizada = await storage.updateProjetoMusica(req.params.musicaId, {
        aprovada: aprovado,
        feedback: feedback || null,
        dataAprovacao: new Date(),
      });

      // Atualizar também o campo musicaAprovada do projeto
      if (aprovado) {
        await storage.updateProjeto(projeto.id, {
          musicaAprovada: true,
          musicaDataAprovacao: new Date(),
          musicaVisualizadaEm: null, // Resetar visualização para mostrar o sininho novamente
        });
      }

      // Emitir evento WebSocket para atualização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('projeto:updated', { id: projeto.id });
      }

      res.json({
        message: aprovado ? "Música aprovada com sucesso!" : "Solicitação de alteração enviada",
        musica: musicaAtualizada,
      });
    } catch (error) {
      next(error);
    }
  });

  // Aprovar/Reprovar Locutor Individual (novo sistema com múltiplos locutores)
  app.post("/api/cliente/projeto/:token/locutores/:locutorId/aprovar", async (req, res, next) => {
    try {
      const { aprovado, feedback } = req.body;

      if (typeof aprovado !== 'boolean') {
        return res.status(400).json({ message: "Campo 'aprovado' é obrigatório e deve ser boolean" });
      }

      // Verificar se o token é válido e pertence ao projeto do locutor
      const projeto = await storage.getProjetoByClientToken(req.params.token);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado ou link inválido" });
      }

      const locutor = await storage.getProjetoLocutor(req.params.locutorId);
      if (!locutor || locutor.projetoId !== projeto.id) {
        return res.status(404).json({ message: "Locutor não encontrado" });
      }

      const locutorAtualizado = await storage.updateProjetoLocutor(req.params.locutorId, {
        aprovado: aprovado,
        feedback: feedback || null,
        dataAprovacao: new Date(),
      });

      // Atualizar também o campo locucaoAprovada do projeto
      if (aprovado) {
        await storage.updateProjeto(projeto.id, {
          locucaoAprovada: true,
          locucaoDataAprovacao: new Date(),
          locucaoVisualizadaEm: null, // Resetar visualização para mostrar o sininho novamente
        });
      }

      // Emitir evento WebSocket para atualização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('projeto:updated', { id: projeto.id });
      }

      res.json({
        message: aprovado ? "Locutor aprovado com sucesso!" : "Solicitação de alteração enviada",
        locutor: locutorAtualizado,
      });
    } catch (error) {
      next(error);
    }
  });

  // Rota para verificar se já respondeu NPS
  app.get("/api/cliente/projeto/:token/nps/verificar", async (req, res, next) => {
    try {
      // Verificar se o token é válido
      const projeto = await storage.getProjetoByClientToken(req.params.token);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado ou link inválido" });
      }

      // Verificar se já existe resposta NPS para este projeto
      const respostaExistente = await storage.getRespostaNpsByProjeto(projeto.id);

      res.json({
        jaRespondeu: !!respostaExistente,
        resposta: respostaExistente || null,
      });
    } catch (error) {
      next(error);
    }
  });

  // Rota para salvar resposta NPS do cliente
  app.post("/api/cliente/projeto/:token/nps", async (req, res, next) => {
    try {
      const { notaServicos, notaAtendimento, notaIndicacao, comentario } = req.body;

      // Validações
      if (typeof notaServicos !== 'number' || notaServicos < 0 || notaServicos > 10) {
        return res.status(400).json({ message: "Nota de serviços inválida (deve ser 0-10)" });
      }
      if (typeof notaAtendimento !== 'number' || notaAtendimento < 0 || notaAtendimento > 10) {
        return res.status(400).json({ message: "Nota de atendimento inválida (deve ser 0-10)" });
      }
      if (typeof notaIndicacao !== 'number' || notaIndicacao < 0 || notaIndicacao > 10) {
        return res.status(400).json({ message: "Nota de indicação inválida (deve ser 0-10)" });
      }

      // Verificar se o token é válido
      const projeto = await storage.getProjetoByClientToken(req.params.token);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado ou link inválido" });
      }

      // Verificar se já existe resposta NPS para este projeto
      const respostaExistente = await storage.getRespostaNpsByProjeto(projeto.id);
      if (respostaExistente) {
        return res.status(400).json({ message: "Você já respondeu o questionário para este projeto" });
      }

      // Calcular média das notas
      const notaMedia = Math.round((notaServicos + notaAtendimento + notaIndicacao) / 3);

      // Determinar categoria baseada na nota de indicação (NPS tradicional)
      let categoria: string;
      if (notaIndicacao >= 0 && notaIndicacao <= 6) {
        categoria = "detrator";
      } else if (notaIndicacao >= 7 && notaIndicacao <= 8) {
        categoria = "neutro";
      } else {
        categoria = "promotor";
      }

      // Capturar IP e User Agent
      const ipOrigem = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      // Salvar resposta
      const resposta = await storage.createRespostaNps({
        projetoId: projeto.id,
        clienteId: projeto.clienteId,
        notaServicos,
        notaAtendimento,
        notaIndicacao,
        notaMedia,
        categoria,
        ipOrigem,
        userAgent,
        comentario: comentario || null,
      });

      // Emitir evento WebSocket para atualização em tempo real
      const wsServer = (req.app as any).wsServer;
      console.log('🔴 [DEBUG NPS] WebSocket server exists?', !!wsServer);
      console.log('🔴 [DEBUG NPS] Emitindo evento nps:created para projeto:', projeto.id, 'categoria:', categoria);

      if (wsServer) {
        wsServer.emitChange('nps:created', { projetoId: projeto.id, categoria });
        console.log('🔴 [DEBUG NPS] Evento nps:created emitido com sucesso!');
      } else {
        console.error('🔴 [DEBUG NPS] ERRO: WebSocket server não encontrado!');
      }

      res.json({
        message: "Obrigado pelo seu feedback!",
        resposta,
      });
    } catch (error) {
      next(error);
    }
  });

  // Regenerar token do cliente (rota protegida para admin)
  app.post("/api/projetos/:id/regenerar-token", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const novoToken = await storage.regenerarClientToken(req.params.id);
      res.json({ clientToken: novoToken });
    } catch (error) {
      next(error);
    }
  });

  // Metrics routes
  app.get("/api/metricas", requireAuth, async (req, res, next) => {
    try {
      const metricas = await storage.getMetricas();
      res.json(metricas);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
