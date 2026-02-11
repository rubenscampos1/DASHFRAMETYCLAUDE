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
import nodemailer from "nodemailer";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { uploadLocutorAudioToSupabase, deleteLocutorAudioFromSupabase } from "./storage-helpers";
import { nanoid } from "nanoid";

// Template de email reutilizável (Framety branded)
function createEmailHtml(projeto: any, mensagem: string): string {
  const seq = projeto.sequencialId ? `#SKY${projeto.sequencialId}` : "";
  const statusLabel = projeto.status || "Em andamento";
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f8f8;">
      <div style="background: #ffffff; padding: 36px 24px; text-align: center; border-bottom: 3px solid #E81B60;">
        <img src="https://frametyboard.com/assets/Framety%20-%20PNG%20-%20%2001_1759177448673-BYQ2DGYc.png" alt="Framety" style="height: 80px;" />
      </div>
      <div style="background: #1a1a2e; padding: 14px 24px; display: flex;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="color: rgba(255,255,255,0.6); font-size: 12px;">Projeto</td>
          <td style="color: rgba(255,255,255,0.6); font-size: 12px; text-align: right;">Status</td>
        </tr><tr>
          <td style="color: #ffffff; font-size: 15px; font-weight: 600; padding-top: 2px;">${projeto.titulo} ${seq}</td>
          <td style="text-align: right; padding-top: 2px;">
            <span style="background: rgba(232,27,96,0.2); color: #E81B60; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${statusLabel}</span>
          </td>
        </tr></table>
      </div>
      <div style="background: #ffffff; padding: 28px 24px; border-left: 1px solid #e8e8e8; border-right: 1px solid #e8e8e8;">
        <div style="width: 40px; height: 3px; background: #E81B60; border-radius: 2px; margin-bottom: 20px;"></div>
        <p style="color: #333333; font-size: 15px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${mensagem.trim()}</p>
      </div>
      <div style="background: #1a1a2e; padding: 20px 24px; text-align: center;">
        <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0 0 8px;">Este email foi enviado pela plataforma <strong style="color: #E81B60;">Framety</strong></p>
        <p style="color: rgba(255,255,255,0.3); font-size: 10px; margin: 0;">Grupo Skyline &bull; Produção Audiovisual</p>
      </div>
    </div>
  `;
}

// Enviar email via Nodemailer/Gmail SMTP
async function sendEmailViaSMTP(emails: string[], assunto: string, mensagem: string, projeto: any): Promise<{ enviados: string[]; erros: { email: string; erro: string }[] }> {
  const SMTP_USER = process.env.SMTP_USER || "gustavo@skylineip.com.br";
  const SMTP_PASS = process.env.SMTP_PASS || "oqjavawt ecgq mgiu";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const htmlBody = createEmailHtml(projeto, mensagem);
  const enviados: string[] = [];
  const erros: { email: string; erro: string }[] = [];

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"Framety" <${SMTP_USER}>`,
        to: email,
        subject: assunto,
        text: mensagem.trim(),
        html: htmlBody,
      });
      console.log(`[Email] Enviado para ${email} - Projeto: ${projeto.titulo}`);
      enviados.push(email);
    } catch (err: any) {
      console.error(`[Email] Falha para ${email}:`, err.message);
      erros.push({ email, erro: err.message });
    }
  }

  return { enviados, erros };
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  next();
}

// Middleware que aceita autenticação por sessão (navegador) OU Bearer token (API/ClawdBot)
async function requireAuthOrToken(req: any, res: any, next: any) {
  // 1. Tenta sessão normal (Passport.js)
  if (req.isAuthenticated()) {
    return next();
  }

  // 2. Tenta Bearer token no header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const tokenRecord = await storage.getTokenAcessoByToken(token);
      if (tokenRecord && tokenRecord.ativo) {
        // Injeta um usuário virtual com o papel do token
        req.user = {
          id: `api-token:${tokenRecord.id}`,
          nome: tokenRecord.descricao || 'API Token',
          email: 'api@token',
          papel: tokenRecord.papel,
          ativo: true,
          fotoUrl: null,
          createdAt: tokenRecord.createdAt,
          _isApiToken: true,
        };
        return next();
      }
    } catch (error) {
      console.error('[Auth] Erro ao validar API token:', error);
    }
  }

  return res.status(401).json({ message: "Não autorizado" });
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
// ✅ MIGRADO PARA SUPABASE STORAGE - usa memoryStorage ao invés de diskStorage
const audioUpload = multer({
  storage: multer.memoryStorage(), // 🔥 Salva em memória (buffer), não em disco
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

// Configuração do Multer para upload de captações (vídeos, imagens, zips)
// Usa diskStorage para não estourar memória com arquivos grandes
const captadorUploadMulter = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tmpDir = path.join(process.cwd(), "tmp-uploads");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Health check endpoint for Render.com (no auth required)
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Configuração do Supabase para realtime (apenas usuários autenticados)
  app.get("/api/config/supabase", requireAuthOrToken, (req, res) => {
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
  app.get("/api/users", requireAuthOrToken, async (req, res, next) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/user/profile", requireAuthOrToken, async (req, res, next) => {
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

  app.post("/api/users", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
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

  app.patch("/api/users/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
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

  app.delete("/api/users/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
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

  // ========== FASE 2C: ENDPOINT LEVE PARA KANBAN ==========
  // Retorna apenas campos necessários para renderizar cards (~70% menos dados)
  //
  // ⚠️ CRÍTICO - ORDEM DE ROTAS (FASE 4):
  // Esta rota DEVE estar registrada ANTES de /api/projetos/:id (linha ~270)
  // Caso contrário, Express vai capturar "light" como um :id e retornar 404.
  // Ordem correta: /light → /api/projetos → /:id
  // NÃO mova esta rota sem verificar a ordem das rotas dinâmicas abaixo!
  app.get("/api/projetos/light", requireAuthOrToken, async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status as string,
        responsavelId: req.query.responsavelId as string,
        tipoVideoId: req.query.tipoVideoId as string,
        prioridade: req.query.prioridade as string,
        search: req.query.search as string,
      };

      // Remove undefined values and "all" values
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value === undefined || value === "all" || value === "") {
          delete filters[key as keyof typeof filters];
        }
      });

      const projetos = await storage.getProjetosKanbanLight(filters);
      res.json(projetos);
    } catch (error) {
      next(error);
    }
  });
  // ========================================================

  app.get("/api/projetos", requireAuthOrToken, async (req, res, next) => {
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

      // ✅ FASE 5: Otimização completa - campos pesados já excluídos no SELECT (storage.ts:366-455)
      // Campos não carregados do banco: descricao, informacoesAdicionais, referencias, caminho
      // Reduz ~20-30% do volume de dados trafegados desde o banco até o cliente
      // Não é mais necessário deletar em memória - otimização movida para a query
      let projetosOtimizados = projetos;

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

  app.get("/api/projetos/:id", requireAuthOrToken, async (req, res, next) => {
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
  app.get("/api/relatorios/pdf", requireAuthOrToken, async (req, res, next) => {
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

  app.post("/api/projetos", requireAuthOrToken, async (req, res, next) => {
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

      // Emitir evento WebSocket para sincronização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('projeto:created', { id: projeto.id, status: projeto.status });
      }

      res.status(201).json(projeto);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projetos/:id/duplicar", requireAuthOrToken, async (req, res, next) => {
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

  app.patch("/api/projetos/:id", requireAuthOrToken, requireRole(["Admin", "Gestor"]), async (req, res, next) => {
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
      if (wsServer) {
        console.log('[WebSocket Server] 📤 Emitindo projeto:updated:', {
          id: projeto.id,
          status: projeto.status,
          temProjetoCompleto: !!projeto,
          camposEnviados: Object.keys(projeto).length
        });
        wsServer.emitChange('projeto:updated', { id: projeto.id, projeto });
      }

      res.json(projeto);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/projetos/:id", requireAuthOrToken, requireRole(["Admin", "Gestor"]), async (req, res, next) => {
    try {
      const projeto = await storage.getProjeto(req.params.id);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      await storage.deleteProjeto(req.params.id);

      // Emitir evento WebSocket para atualização em tempo real
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('projeto:deleted', { id: req.params.id });
      }

      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // NPS route
  app.put("/api/projetos/:id/nps", requireAuthOrToken, async (req, res, next) => {
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
  app.put("/api/projetos/:id/marcar-aprovacoes-visualizadas", requireAuthOrToken, async (req, res, next) => {
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
  app.get("/api/tipos-video", requireAuthOrToken, async (req, res, next) => {
    try {
      const tipos = await storage.getTiposDeVideo();
      res.json(tipos);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tipos-video", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tipoData = insertTipoVideoSchema.parse(req.body);
      const tipo = await storage.createTipoVideo(tipoData);
      res.status(201).json(tipo);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/tipos-video/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tipoData = insertTipoVideoSchema.parse(req.body);
      const updatedTipo = await storage.updateTipoVideo(req.params.id, tipoData);
      res.json(updatedTipo);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tipos-video/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
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
  app.get("/api/tags", requireAuthOrToken, async (req, res, next) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tags", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/tags/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const updatedTag = await storage.updateTag(req.params.id, tagData);
      res.json(updatedTag);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tags/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteTag(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Clientes routes
  app.get("/api/clientes", requireAuthOrToken, async (req, res, next) => {
    try {
      const clientes = await storage.getClientes();
      res.json(clientes);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/clientes/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.post("/api/clientes", requireAuthOrToken, async (req, res, next) => {
    try {
      const clienteData = insertClienteSchema.parse(req.body);
      const cliente = await storage.createCliente(clienteData);
      res.status(201).json(cliente);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/clientes/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.delete("/api/clientes/:id", requireAuthOrToken, async (req, res, next) => {
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
  app.get("/api/empreendimentos", requireAuthOrToken, async (req, res, next) => {
    try {
      const empreendimentos = await storage.getEmpreendimentos();
      res.json(empreendimentos);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/empreendimentos/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.post("/api/empreendimentos", requireAuthOrToken, async (req, res, next) => {
    try {
      const empreendimentoData = insertEmpreendimentoSchema.parse(req.body);
      const empreendimento = await storage.createEmpreendimento(empreendimentoData);
      res.status(201).json(empreendimento);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/empreendimentos/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.delete("/api/empreendimentos/:id", requireAuthOrToken, async (req, res, next) => {
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
  app.get("/api/projetos/:id/logs", requireAuthOrToken, async (req, res, next) => {
    try {
      const logs = await storage.getLogsByProjeto(req.params.id);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Comentários routes
  app.get("/api/projetos/:id/comentarios", requireAuthOrToken, async (req, res, next) => {
    try {
      const comentarios = await storage.getComentariosByProjeto(req.params.id);
      res.json(comentarios);
    } catch (error) {
      next(error);
    }
  });

  // Comentários do roteiro (equipe)
  app.get("/api/projetos/:id/roteiro-comentarios", requireAuthOrToken, async (req, res, next) => {
    try {
      const comentarios = await storage.getRoteiroComentarios(req.params.id);
      res.json(comentarios);
    } catch (error) {
      next(error);
    }
  });

  // Marcar roteiro como visualizado (equipe)
  app.post("/api/projetos/:id/roteiro-visualizado", requireAuthOrToken, async (req, res, next) => {
    try {
      const projeto = await storage.updateProjeto(req.params.id, {
        roteiroVisualizadoEm: new Date(),
      } as any);
      res.json(projeto);
    } catch (error) {
      next(error);
    }
  });

  // Reenviar roteiro para aprovação (reseta status, cliente vê review de novo)
  app.post("/api/projetos/:id/reenviar-roteiro", requireAuthOrToken, async (req, res, next) => {
    try {
      const projeto = await storage.reenviarRoteiro(req.params.id);

      // Emitir WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('projeto:updated', { id: projeto.id, projeto });
      }

      res.json(projeto);
    } catch (error) {
      next(error);
    }
  });

  // Notificar cliente via WhatsApp (OpenClaw gateway)
  app.post("/api/projetos/:id/notificar-whatsapp", requireAuthOrToken, async (req, res, next) => {
    try {
      const { mensagem } = req.body;
      if (!mensagem || !mensagem.trim()) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      const projeto = await storage.getProjeto(req.params.id);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const numeros = projeto.contatosWhatsapp || [];
      if (numeros.length === 0) {
        return res.status(400).json({ message: "Projeto não possui contatos WhatsApp cadastrados" });
      }

      const OPENCLAW_URL = process.env.OPENCLAW_URL || "https://framety.tail81fe5d.ts.net";
      const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || "57bf11589000632b2c0009387429a69db0ad17c08802dd1b";

      const enviados: string[] = [];
      const erros: { numero: string; erro: string }[] = [];

      for (const numero of numeros) {
        try {
          const target = numero.startsWith("+") ? numero : `+${numero.replace(/\D/g, "")}`;
          const response = await fetch(`${OPENCLAW_URL}/tools/invoke`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tool: "message",
              action: "send",
              args: {
                channel: "whatsapp",
                target,
                message: mensagem.trim(),
              },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`[WhatsApp] Enviado para ${target} - Projeto: ${projeto.titulo}`, result);
            enviados.push(target);
          } else {
            const errorText = await response.text();
            console.error(`[WhatsApp] Erro para ${target}:`, errorText);
            erros.push({ numero: target, erro: errorText });
          }
        } catch (err: any) {
          console.error(`[WhatsApp] Falha para ${numero}:`, err.message);
          erros.push({ numero, erro: err.message });
        }
      }

      if (enviados.length === 0) {
        return res.status(502).json({
          message: "Falha ao enviar para todos os contatos",
          erros,
        });
      }

      res.json({
        message: `WhatsApp enviado para ${enviados.length} contato(s)`,
        enviados,
        erros: erros.length > 0 ? erros : undefined,
      });
    } catch (error) {
      next(error);
    }
  });

  // Notificar cliente via Áudio WhatsApp (TTS + OpenClaw)
  app.post("/api/projetos/:id/notificar-audio", requireAuthOrToken, async (req, res, next) => {
    try {
      const { mensagem } = req.body;
      if (!mensagem || !mensagem.trim()) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      const projeto = await storage.getProjeto(req.params.id);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const numeros = projeto.contatosWhatsapp || [];
      if (numeros.length === 0) {
        return res.status(400).json({ message: "Projeto não possui contatos WhatsApp cadastrados" });
      }

      const OPENCLAW_URL = process.env.OPENCLAW_URL || "https://framety.tail81fe5d.ts.net";
      const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || "57bf11589000632b2c0009387429a69db0ad17c08802dd1b";

      // Ajustar pronúncia: "Framety" → "Freymeti" para TTS brasileiro
      const textoTTS = mensagem.trim().replace(/Framety/gi, "Freymeti");

      // 1. Gerar áudio via TTS
      const ttsResponse = await fetch(`${OPENCLAW_URL}/tools/invoke`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: "tts",
          action: "speak",
          args: { text: textoTTS },
        }),
      });

      if (!ttsResponse.ok) {
        return res.status(502).json({ message: "Falha ao gerar áudio TTS" });
      }

      const ttsData = await ttsResponse.json() as any;
      const audioPath = ttsData.result?.details?.audioPath;
      if (!audioPath) {
        return res.status(502).json({ message: "TTS não retornou caminho do áudio" });
      }

      // 2. Enviar áudio para cada contato
      const enviados: string[] = [];
      const erros: { numero: string; erro: string }[] = [];

      for (const numero of numeros) {
        try {
          const target = numero.startsWith("+") ? numero : `+${numero.replace(/\D/g, "")}`;
          const response = await fetch(`${OPENCLAW_URL}/tools/invoke`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tool: "message",
              action: "send",
              args: {
                channel: "whatsapp",
                target,
                message: ".",
                media: audioPath,
              },
            }),
          });

          if (response.ok) {
            console.log(`[Áudio] Enviado para ${target} - Projeto: ${projeto.titulo}`);
            enviados.push(target);
          } else {
            const errorText = await response.text();
            console.error(`[Áudio] Erro para ${target}:`, errorText);
            erros.push({ numero: target, erro: errorText });
          }
        } catch (err: any) {
          console.error(`[Áudio] Falha para ${numero}:`, err.message);
          erros.push({ numero, erro: err.message });
        }
      }

      if (enviados.length === 0) {
        return res.status(502).json({ message: "Falha ao enviar áudio para todos os contatos", erros });
      }

      res.json({
        message: `Áudio enviado para ${enviados.length} contato(s)`,
        enviados,
        erros: erros.length > 0 ? erros : undefined,
      });
    } catch (error) {
      next(error);
    }
  });

  // Notificar cliente via Email (Gmail SMTP)
  app.post("/api/projetos/:id/notificar-email", requireAuthOrToken, async (req, res, next) => {
    try {
      const { mensagem, assunto } = req.body;
      if (!mensagem || !mensagem.trim()) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      const projeto = await storage.getProjeto(req.params.id);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const emails = projeto.contatosEmail || [];
      if (emails.length === 0) {
        return res.status(400).json({ message: "Projeto não possui contatos de email cadastrados" });
      }

      const subjectLine = assunto?.trim() || `Atualização - Projeto ${projeto.titulo}`;
      const { enviados, erros } = await sendEmailViaSMTP(emails, subjectLine, mensagem, projeto);

      if (enviados.length === 0) {
        return res.status(502).json({
          message: "Falha ao enviar para todos os emails",
          erros,
        });
      }

      res.json({
        message: `Email enviado para ${enviados.length} contato(s)`,
        enviados,
        erros: erros.length > 0 ? erros : undefined,
      });
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // PORTAL DO CAPTADOR — Rotas autenticadas
  // ==========================================

  // Gerar link de upload para captador
  app.post("/api/projetos/:id/captador-link", requireAuthOrToken, async (req, res, next) => {
    try {
      const { nomeCaptador, instrucoes } = req.body;
      const projeto = await storage.getProjeto(req.params.id);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const token = nanoid(16);
      let driveFolderId: string | undefined;
      let driveFolderUrl: string | undefined;

      // Tentar criar pasta no Google Drive via OpenClaw
      try {
        const OPENCLAW_URL = process.env.OPENCLAW_URL || "https://framety.tail81fe5d.ts.net";
        const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || "57bf11589000632b2c0009387429a69db0ad17c08802dd1b";
        const folderName = `SKY${projeto.sequencialId} - ${projeto.titulo}`;

        const driveResponse = await fetch(`${OPENCLAW_URL}/tools/invoke`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tool: "gog",
            action: "exec",
            args: {
              command: "drive.createFolder",
              args: [folderName, "--parent", "1Od_u7Eru00NnUZs_GqVOJnIVB88Db994", "--drive", "0ACcXbXZoz_AJUk9PVA"],
            },
          }),
        });

        if (driveResponse.ok) {
          const driveData = await driveResponse.json() as any;
          const output = driveData?.result?.output || driveData?.result?.details?.output || "";
          // Tentar extrair ID da pasta do output
          const idMatch = output.match(/Id:\s*(\S+)/i) || output.match(/([a-zA-Z0-9_-]{20,})/);
          if (idMatch) {
            driveFolderId = idMatch[1];
            driveFolderUrl = `https://drive.google.com/drive/folders/${driveFolderId}`;
          }
          console.log(`[Captador] Pasta criada no Drive: ${folderName}`, driveData);
        } else {
          console.warn("[Captador] Falha ao criar pasta no Drive (continuando sem Drive):", await driveResponse.text());
        }
      } catch (driveError: any) {
        console.warn("[Captador] Erro ao criar pasta no Drive (continuando sem Drive):", driveError.message);
      }

      const link = await storage.createCaptadorLink({
        projetoId: projeto.id,
        token,
        nomeCaptador: nomeCaptador || undefined,
        instrucoes: instrucoes || undefined,
        driveFolderId: driveFolderId || undefined,
        driveFolderUrl: driveFolderUrl || undefined,
        criadoPorId: req.user?.id,
        ativo: true,
      });

      const origin = `${req.protocol}://${req.get("host")}`;
      res.status(201).json({
        ...link,
        url: `${origin}/captador/${token}`,
      });
    } catch (error) {
      next(error);
    }
  });

  // Listar links de captador por projeto
  app.get("/api/projetos/:id/captador-links", requireAuthOrToken, async (req, res, next) => {
    try {
      const links = await storage.getCaptadorLinksByProjeto(req.params.id);
      res.json(links);
    } catch (error) {
      next(error);
    }
  });

  // Listar uploads de captador por projeto
  app.get("/api/projetos/:id/captador-uploads", requireAuthOrToken, async (req, res, next) => {
    try {
      const uploads = await storage.getCaptadorUploadsByProjeto(req.params.id);
      res.json(uploads);
    } catch (error) {
      next(error);
    }
  });

  // Desativar link de captador
  app.patch("/api/captador-links/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      const updated = await storage.updateCaptadorLink(req.params.id, { ativo: false });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Deletar link de captador
  app.delete("/api/captador-links/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      await storage.deleteCaptadorLink(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/comentarios", requireAuthOrToken, async (req, res, next) => {
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

  app.put("/api/comentarios/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      const comentarioData = insertComentarioSchema.partial().parse(req.body);
      const updatedComentario = await storage.updateComentario(req.params.id, comentarioData);
      res.json(updatedComentario);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/comentarios/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      await storage.deleteComentario(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Notas routes
  app.get("/api/notas", requireAuthOrToken, async (req, res, next) => {
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

  app.get("/api/notas/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.post("/api/notas", requireAuthOrToken, async (req, res, next) => {
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

  app.patch("/api/notas/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.delete("/api/notas/:id", requireAuthOrToken, async (req, res, next) => {
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
  app.get("/api/timelapses", requireAuthOrToken, async (req, res, next) => {
    try {
      const timelapses = await storage.getTimelapses();
      res.json(timelapses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/timelapses/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.post("/api/timelapses", requireAuthOrToken, async (req, res, next) => {
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

  app.patch("/api/timelapses/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.delete("/api/timelapses/:id", requireAuthOrToken, async (req, res, next) => {
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
  app.post("/api/objects/upload", requireAuthOrToken, async (req, res, next) => {
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

  app.get("/objects/:objectPath(*)", requireAuthOrToken, async (req, res, next) => {
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
  app.get("/api/locutores", requireAuthOrToken, async (req, res, next) => {
    try {
      const { genero, faixaEtaria, idioma } = req.query;
      const filters: any = {};

      if (genero) filters.genero = genero as string;
      if (faixaEtaria) filters.faixaEtaria = faixaEtaria as string;
      if (idioma) filters.idioma = idioma as string;

      const locutores = await storage.getLocutores(filters);
      res.json(locutores);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/locutores/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.post("/api/locutores", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const novoLocutor = await storage.createLocutor(req.body);
      res.status(201).json(novoLocutor);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/locutores/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const locutor = await storage.updateLocutor(req.params.id, req.body);
      res.json(locutor);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/locutores/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteLocutor(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Estilos de Locução routes
  app.get("/api/estilos-locucao", requireAuthOrToken, async (req, res, next) => {
    try {
      const estilos = await storage.getEstilosLocucao();
      res.json(estilos);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/estilos-locucao", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const novoEstilo = await storage.createEstiloLocucao(req.body);
      res.status(201).json(novoEstilo);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/estilos-locucao/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const estilo = await storage.updateEstiloLocucao(req.params.id, req.body);
      res.json(estilo);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/estilos-locucao/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteEstiloLocucao(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Amostras de Locutores routes
  app.get("/api/locutores/:locutorId/amostras", requireAuthOrToken, async (req, res, next) => {
    try {
      const amostras = await storage.getAmostrasLocutor(req.params.locutorId);
      res.json(amostras);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/locutores/:locutorId/amostras", requireAuthOrToken, requireRole(["Admin"]), audioUpload.single('audio'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      const { titulo, descricao, estiloId, destaque } = req.body;
      const locutorId = req.params.locutorId;

      // Gerar ID único para a amostra (antes de salvar no banco)
      const amostraId = uuidv4();

      console.log('[Upload Audio] Uploading to Supabase Storage...');
      console.log('[Upload Audio] locutorId:', locutorId);
      console.log('[Upload Audio] amostraId:', amostraId);
      console.log('[Upload Audio] originalName:', req.file.originalname);
      console.log('[Upload Audio] size:', (req.file.size / 1024 / 1024).toFixed(2), 'MB');

      // 🔥 Upload para Supabase Storage
      const { storagePath, publicUrl } = await uploadLocutorAudioToSupabase({
        locutorId,
        amostraId,
        originalName: req.file.originalname,
        buffer: req.file.buffer, // 🔥 Buffer em memória (não arquivo em disco)
        contentType: req.file.mimetype,
      });

      console.log('[Upload Audio] Supabase path:', storagePath);
      console.log('[Upload Audio] Public URL:', publicUrl);

      // Salvar no banco (com storagePath, não URL completa)
      const novaAmostra = await storage.createAmostraLocutor({
        id: amostraId, // 🔥 Usar o mesmo ID gerado antes
        locutorId,
        titulo,
        descricao: descricao || null,
        estiloId: estiloId || null,
        arquivoUrl: storagePath, // 🔥 "locutores/{locutorId}/{amostraId}.mp3"
        duracao: null,
        ordem: 0,
        destaque: destaque === 'true' || destaque === true
      });

      console.log('[Upload Audio] Database saved:', novaAmostra.id);

      res.status(201).json(novaAmostra);
    } catch (error) {
      console.error('[Upload Audio] Error:', error);
      // 🔥 NÃO precisa mais de fs.unlinkSync (não salvou em disco)
      next(error);
    }
  });

  app.put("/api/amostras/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const amostra = await storage.updateAmostraLocutor(req.params.id, req.body);
      res.json(amostra);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/amostras/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      // 1. Buscar amostra no banco
      const amostra = await storage.getAmostraLocutor(req.params.id);

      if (!amostra) {
        return res.status(404).json({ message: "Amostra não encontrada" });
      }

      console.log('[Delete Audio] Deleting amostra:', amostra.id);
      console.log('[Delete Audio] Storage path:', amostra.arquivoUrl);

      // 2. Deletar do Supabase Storage
      await deleteLocutorAudioFromSupabase(amostra.arquivoUrl);

      // 3. Deletar do banco
      await storage.deleteAmostraLocutor(req.params.id);

      console.log('[Delete Audio] Success');

      res.status(204).send();
    } catch (error) {
      console.error('[Delete Audio] Error:', error);
      next(error);
    }
  });

  // ❌ DESATIVADO - Migrado para Supabase Storage
  // Servir arquivos estáticos de uploads
  // app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ==========================================
  // MÚSICAS DO PROJETO
  // ==========================================

  app.get("/api/projetos/:projetoId/musicas", requireAuthOrToken, async (req, res, next) => {
    try {
      const musicas = await storage.getProjetoMusicas(req.params.projetoId);
      res.json(musicas);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projetos/:projetoId/musicas", requireAuthOrToken, async (req, res, next) => {
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

  app.put("/api/musicas/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      const musica = await storage.updateProjetoMusica(req.params.id, req.body);
      res.json(musica);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/musicas/:id", requireAuthOrToken, async (req, res, next) => {
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

  app.get("/api/projetos/:projetoId/locutores", requireAuthOrToken, async (req, res, next) => {
    try {
      const locutores = await storage.getProjetoLocutores(req.params.projetoId);
      res.json(locutores);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projetos/:projetoId/locutores", requireAuthOrToken, async (req, res, next) => {
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

  app.put("/api/projeto-locutores/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      const locutor = await storage.updateProjetoLocutor(req.params.id, req.body);
      res.json(locutor);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/projeto-locutores/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      await storage.deleteProjetoLocutor(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // PORTAL DO CAPTADOR — Rotas públicas
  // ==========================================

  // Buscar dados do link de captador (público)
  app.get("/api/captador/:token", async (req, res, next) => {
    try {
      const link = await storage.getCaptadorLinkByToken(req.params.token);
      if (!link) {
        return res.status(404).json({ message: "Link não encontrado ou inválido" });
      }
      if (!link.ativo) {
        return res.status(410).json({ message: "Este link de upload foi desativado" });
      }
      if (link.expiraEm && new Date(link.expiraEm) < new Date()) {
        return res.status(410).json({ message: "Este link de upload expirou" });
      }

      const projeto = await storage.getProjeto(link.projetoId);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const uploads = await storage.getCaptadorUploadsByLink(link.id);

      res.json({
        link: {
          id: link.id,
          token: link.token,
          nomeCaptador: link.nomeCaptador,
          instrucoes: link.instrucoes,
          createdAt: link.createdAt,
        },
        projeto: {
          id: projeto.id,
          sequencialId: projeto.sequencialId,
          titulo: projeto.titulo,
          status: projeto.status,
          tipoVideo: projeto.tipoVideo?.nome,
          cliente: projeto.cliente?.nome,
        },
        uploads: uploads.map(u => ({
          id: u.id,
          nomeOriginal: u.nomeOriginal,
          tamanho: u.tamanho,
          mimeType: u.mimeType,
          nomeCaptador: u.nomeCaptador,
          observacao: u.observacao,
          createdAt: u.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  // Upload de arquivo pelo captador (público)
  app.post("/api/captador/:token/upload", captadorUploadMulter.single("file"), async (req, res, next) => {
    try {
      const link = await storage.getCaptadorLinkByToken(req.params.token);
      if (!link) {
        return res.status(404).json({ message: "Link não encontrado ou inválido" });
      }
      if (!link.ativo) {
        return res.status(410).json({ message: "Este link de upload foi desativado" });
      }
      if (link.expiraEm && new Date(link.expiraEm) < new Date()) {
        return res.status(410).json({ message: "Este link de upload expirou" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const { nomeCaptador, observacao } = req.body;
      const file = req.file;
      const filePath = file.path; // disk storage path

      // Upload para Supabase Storage (bucket captacoes)
      let storagePath = `${link.projetoId}/${link.id}/${Date.now()}-${file.originalname}`;
      let publicUrl = "";

      try {
        const { supabaseAdmin } = await import("./supabase-client");
        if (supabaseAdmin) {
          const bucketName = "captacoes";
          const fileBuffer = fs.readFileSync(filePath);

          const { data: uploadData, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(storagePath, fileBuffer, {
              contentType: file.mimetype,
              upsert: false,
            });

          if (error) {
            if (error.message?.includes("not found") || error.message?.includes("Bucket")) {
              console.log("[Captador] Criando bucket captacoes...");
              await supabaseAdmin.storage.createBucket(bucketName, { public: true });
              const retryResult = await supabaseAdmin.storage
                .from(bucketName)
                .upload(storagePath, fileBuffer, {
                  contentType: file.mimetype,
                  upsert: false,
                });
              if (retryResult.error) {
                throw new Error(`Upload falhou: ${retryResult.error.message}`);
              }
            } else {
              throw new Error(`Upload falhou: ${error.message}`);
            }
          }

          publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${storagePath}`;
          console.log(`[Captador] Upload OK: ${storagePath} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        } else {
          console.warn("[Captador] Supabase não configurado - salvando referência sem upload");
          publicUrl = `/uploads/${storagePath}`;
        }
      } catch (uploadError: any) {
        console.error("[Captador] Erro no upload para Supabase:", uploadError.message);
        return res.status(500).json({ message: "Falha ao fazer upload do arquivo" });
      } finally {
        // Limpar arquivo temporário do disco
        try { fs.unlinkSync(filePath); } catch {}
      }

      const upload = await storage.createCaptadorUpload({
        linkId: link.id,
        projetoId: link.projetoId,
        nomeOriginal: file.originalname,
        storagePath,
        publicUrl,
        tamanho: file.size,
        mimeType: file.mimetype,
        nomeCaptador: nomeCaptador || link.nomeCaptador || undefined,
        observacao: observacao || undefined,
      });

      res.status(201).json({
        message: "Arquivo enviado com sucesso",
        upload: {
          id: upload.id,
          nomeOriginal: upload.nomeOriginal,
          tamanho: upload.tamanho,
          createdAt: upload.createdAt,
        },
      });
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

      // Buscar músicas, locutores e comentários de roteiro do projeto
      const musicas = await storage.getProjetoMusicas(projeto.id);
      const locutores = await storage.getProjetoLocutores(projeto.id);
      const roteiroComentarios = await storage.getRoteiroComentarios(projeto.id);

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
        // Roteiro
        roteiroLink: projeto.roteiroLink,
        roteiroAprovado: projeto.roteiroAprovado,
        roteiroFeedback: projeto.roteiroFeedback,
        roteiroDataAprovacao: projeto.roteiroDataAprovacao,
        roteiroComentarios,
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
      const startTime = Date.now();
      const result = await storage.getClienteByPortalToken(req.params.clientToken);
      const duration = (Date.now() - startTime).toFixed(2);

      console.log(`⏱️ [Portal Performance] getClienteByPortalToken: ${duration}ms`);

      if (!result) {
        return res.status(404).json({ message: "Cliente não encontrado ou link inválido" });
      }

      const { cliente, projetos } = result;

      // ========== FASE 3D: BATCH QUERIES - ELIMINA N+1 ==========
      // Antes: 1 query por projeto para músicas + 1 query por projeto para locutores
      //        + 1 query por locutor para amostras = 40+ queries simultâneas
      // Agora: 1 query para todas as músicas + 2 queries para todos os locutores/amostras
      //        = apenas 3 queries total, independente do número de projetos

      const projetoIds = projetos.map(p => p.id);

      // Busca todas as músicas, locutores e comentários de roteiro em lote (batch)
      const [musicasPorProjeto, locutoresPorProjeto, ...roteiroComentariosResults] = await Promise.all([
        storage.getProjetosMusicasForProjetos(projetoIds),
        storage.getProjetosLocutoresForProjetos(projetoIds),
        ...projetoIds.map(id => storage.getRoteiroComentarios(id)),
      ]);

      // Agrupar comentários de roteiro por projetoId
      const roteiroComentariosPorProjeto: Record<string, any[]> = {};
      projetoIds.forEach((id, index) => {
        roteiroComentariosPorProjeto[id] = roteiroComentariosResults[index] || [];
      });

      // Mapeia projetos anexando músicas/locutores do resultado batch
      const projetosComDetalhes = projetos.map(projeto => ({
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
        // Arrays de músicas e locutores para aprovação (vem do batch)
        musicas: musicasPorProjeto[projeto.id] || [],
        locutores: locutoresPorProjeto[projeto.id] || [],
        // Roteiro
        roteiroLink: projeto.roteiroLink,
        roteiroAprovado: projeto.roteiroAprovado,
        roteiroFeedback: projeto.roteiroFeedback,
        roteiroDataAprovacao: projeto.roteiroDataAprovacao,
        roteiroComentarios: roteiroComentariosPorProjeto[projeto.id] || [],
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
      }));

      res.json({
        cliente: {
          nome: cliente.nome,
          empresa: cliente.empresa,
          backgroundColor: cliente.backgroundColor,
          textColor: cliente.textColor,
        },
        projetos: projetosComDetalhes,
      });
    } catch (error: any) {
      // FASE 4: Tratamento específico para timeouts de batch queries
      if (error.message?.includes('statement timeout') || error.message?.includes('query timeout')) {
        console.error('⚠️ [Portal Timeout] Batch query excedeu 30s:', {
          clientToken: req.params.clientToken,
          error: error.message,
        });
        return res.status(504).json({
          message: "O portal possui muitos projetos e demorou mais que o esperado. Tente novamente em instantes.",
          timeout: true,
        });
      }
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

  // Aprovar/Reprovar Roteiro
  app.post("/api/cliente/projeto/:token/aprovar-roteiro", async (req, res, next) => {
    try {
      const { aprovado, feedback, comentarios } = req.body;

      if (typeof aprovado !== 'boolean') {
        return res.status(400).json({ message: "Campo 'aprovado' é obrigatório e deve ser boolean" });
      }

      // Validar comentários se enviados
      if (comentarios && !Array.isArray(comentarios)) {
        return res.status(400).json({ message: "Campo 'comentarios' deve ser um array" });
      }

      const projeto = await storage.aprovarRoteiro(req.params.token, aprovado, feedback, comentarios);

      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      // Emitir WebSocket se disponível
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('projeto:updated', { id: projeto.id, projeto });
      }

      res.json({
        message: aprovado ? "Roteiro aprovado com sucesso!" : "Solicitação de alteração enviada",
        roteiroAprovado: projeto.roteiroAprovado,
        roteiroFeedback: projeto.roteiroFeedback,
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

      // Buscar projeto atualizado e emitir evento WebSocket
      const projetoAtualizado = await storage.getProjeto(projeto.id);
      const wsServer = (req.app as any).wsServer;
      if (wsServer && projetoAtualizado) {
        console.log('[WebSocket Server] 🎵 MÚSICA APROVADA - Emitindo evento:', {
          projetoId: projetoAtualizado.id,
          musicaAprovada: projetoAtualizado.musicaAprovada,
          musicaVisualizadaEm: projetoAtualizado.musicaVisualizadaEm,
          clientesConectados: wsServer.io.sockets.sockets.size
        });
        wsServer.emitChange('projeto:updated', { id: projetoAtualizado.id, projeto: projetoAtualizado });
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

      // Buscar projeto atualizado e emitir evento WebSocket
      const projetoAtualizado = await storage.getProjeto(projeto.id);
      const wsServer = (req.app as any).wsServer;
      if (wsServer && projetoAtualizado) {
        console.log('[WebSocket Server] 🎤 LOCUÇÃO APROVADA - Emitindo evento:', {
          projetoId: projetoAtualizado.id,
          locucaoAprovada: projetoAtualizado.locucaoAprovada,
          locucaoVisualizadaEm: projetoAtualizado.locucaoVisualizadaEm,
          clientesConectados: wsServer.io.sockets.sockets.size
        });
        wsServer.emitChange('projeto:updated', { id: projetoAtualizado.id, projeto: projetoAtualizado });
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
      if (wsServer) {
        wsServer.emitChange('nps:created', { projetoId: projeto.id, categoria });
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
  app.post("/api/projetos/:id/regenerar-token", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const novoToken = await storage.regenerarClientToken(req.params.id);
      res.json({ clientToken: novoToken });
    } catch (error) {
      next(error);
    }
  });

  // ========== ROTAS DE PASTAS DE VÍDEOS (Sistema Frame.io-like) ==========

  // Listar todos os clientes com estatísticas de vídeos (Grid de Clientes)
  app.get("/api/videos/clientes", requireAuthOrToken, async (req, res, next) => {
    try {
      const clientes = await storage.getClientesComEstatisticasVideos();
      res.json(clientes);
    } catch (error) {
      next(error);
    }
  });

  // Criar nova pasta em um cliente
  app.post("/api/clientes/:clienteId/pastas", requireAuthOrToken, async (req, res, next) => {
    try {
      const pastaData = {
        ...req.body,
        clienteId: req.params.clienteId,
      };

      const pasta = await storage.createVideoPasta(pastaData);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('pasta:created', { clienteId: req.params.clienteId, pastaId: pasta.id });
      }

      res.json(pasta);
    } catch (error) {
      next(error);
    }
  });

  // Listar pastas de um cliente
  app.get("/api/clientes/:clienteId/pastas", requireAuthOrToken, async (req, res, next) => {
    try {
      const includeSubpastas = req.query.includeSubpastas !== 'false';
      const pastas = await storage.getVideoPastasByClienteId(req.params.clienteId, includeSubpastas);
      res.json(pastas);
    } catch (error) {
      next(error);
    }
  });

  // Obter pasta por ID (com vídeos e subpastas)
  app.get("/api/pastas/:pastaId", requireAuthOrToken, async (req, res, next) => {
    try {
      const pasta = await storage.getVideoPastaById(req.params.pastaId);
      if (!pasta) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      res.json(pasta);
    } catch (error) {
      next(error);
    }
  });

  // Atualizar pasta
  app.patch("/api/pastas/:pastaId", requireAuthOrToken, async (req, res, next) => {
    try {
      const pasta = await storage.updateVideoPasta(req.params.pastaId, req.body);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('pasta:updated', { pastaId: pasta.id });
      }

      res.json(pasta);
    } catch (error) {
      next(error);
    }
  });

  // Deletar pasta
  app.delete("/api/pastas/:pastaId", requireAuthOrToken, async (req, res, next) => {
    try {
      await storage.deleteVideoPasta(req.params.pastaId);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('pasta:deleted', { pastaId: req.params.pastaId });
      }

      res.json({ message: "Pasta deletada com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Buscar breadcrumb de uma pasta
  app.get("/api/pastas/:pastaId/breadcrumb", requireAuthOrToken, async (req, res, next) => {
    try {
      const breadcrumb = await storage.getVideoPastaBreadcrumb(req.params.pastaId);
      res.json(breadcrumb);
    } catch (error) {
      next(error);
    }
  });

  // Mover vídeo para outra pasta
  app.patch("/api/videos/:videoId/mover", requireAuthOrToken, async (req, res, next) => {
    try {
      const { novaPastaId } = req.body;
      if (!novaPastaId) {
        return res.status(400).json({ message: "novaPastaId é obrigatório" });
      }

      const video = await storage.moverVideoParaPasta(req.params.videoId, novaPastaId);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:moved', { videoId: video.id, novaPastaId });
      }

      res.json(video);
    } catch (error) {
      next(error);
    }
  });

  // ========== ROTAS DE VÍDEOS (Sistema Frame.io-like) ==========

  // Criar novo vídeo em um projeto
  app.post("/api/projetos/:id/videos", requireAuthOrToken, async (req, res, next) => {
    try {
      const { id: projetoId } = req.params;
      const videoData = {
        ...req.body,
        projetoId,
        uploadedById: req.user!.id,
      };

      const video = await storage.createVideoProjeto(videoData);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:created', { projetoId, videoId: video.id });
      }

      res.json(video);
    } catch (error) {
      next(error);
    }
  });

  // Listar vídeos de um projeto
  app.get("/api/projetos/:id/videos", requireAuthOrToken, async (req, res, next) => {
    try {
      const videos = await storage.getVideosByProjetoId(req.params.id);
      res.json(videos);
    } catch (error) {
      next(error);
    }
  });

  // Obter vídeo por ID (com comentários)
  app.get("/api/videos/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      const video = await storage.getVideoById(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Vídeo não encontrado" });
      }
      res.json(video);
    } catch (error) {
      next(error);
    }
  });

  // Atualizar vídeo (status, aprovação, etc.)
  app.patch("/api/videos/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      const video = await storage.updateVideoProjeto(req.params.id, req.body);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:updated', { videoId: video.id });
      }

      res.json(video);
    } catch (error) {
      next(error);
    }
  });

  // Deletar vídeo
  app.delete("/api/videos/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      await storage.deleteVideoProjeto(req.params.id);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:deleted', { videoId: req.params.id });
      }

      res.json({ message: "Vídeo deletado com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Criar comentário em vídeo
  app.post("/api/videos/:id/comentarios", requireAuthOrToken, async (req, res, next) => {
    try {
      const comentarioData = {
        ...req.body,
        videoId: req.params.id,
        autorId: req.user!.id,
      };

      const comentario = await storage.createVideoComentario(comentarioData);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:comentario:created', {
          videoId: req.params.id,
          comentarioId: comentario.id
        });
      }

      res.json(comentario);
    } catch (error) {
      next(error);
    }
  });

  // Toggle resolvido em comentário
  app.patch("/api/videos/comentarios/:id/toggle-resolvido", requireAuthOrToken, async (req, res, next) => {
    try {
      const comentario = await storage.toggleResolverComentario(
        req.params.id,
        req.user!.id
      );

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:comentario:updated', {
          comentarioId: comentario.id,
          resolvido: comentario.resolvido
        });
      }

      res.json(comentario);
    } catch (error) {
      next(error);
    }
  });

  // Deletar comentário
  app.delete("/api/videos/comentarios/:id", requireAuthOrToken, async (req, res, next) => {
    try {
      await storage.deleteVideoComentario(req.params.id);

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:comentario:deleted', { comentarioId: req.params.id });
      }

      res.json({ message: "Comentário deletado com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // ========== ROTAS DE UPLOAD DE VÍDEO (Bunny.net) ==========

  // Iniciar upload de vídeo em uma pasta
  app.post("/api/pastas/:pastaId/videos/upload-init", requireAuthOrToken, async (req, res, next) => {
    try {
      const { pastaId } = req.params;
      const { titulo, descricao } = req.body;

      // Importar bunnyStream aqui para evitar problemas de inicialização
      const { bunnyStream } = await import("./bunny");

      // 1. Criar vídeo no Bunny.net
      const bunnyVideo = await bunnyStream.createVideo(titulo);
      console.log("Resposta do Bunny.net:", bunnyVideo);

      // 2. Criar registro no banco de dados
      const video = await storage.createVideoInPasta({
        pastaId,
        titulo,
        descricao,
        bunnyVideoId: bunnyVideo.guid,  // Bunny.net usa 'guid' como ID
        bunnyGuid: bunnyVideo.guid,
        bunnyLibraryId: process.env.BUNNY_LIBRARY_ID,
        status: "uploading",
        uploadedById: req.user!.id,
      });

      // 3. Retornar dados para o frontend fazer upload direto
      res.json({
        videoId: video.id,
        bunnyVideoId: bunnyVideo.guid,  // Bunny.net usa 'guid' não 'videoId'
        uploadUrl: bunnyStream.getUploadUrl(bunnyVideo.guid),
        uploadHeaders: {
          "AccessKey": process.env.BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
      });
    } catch (error) {
      console.error("Erro ao iniciar upload:", error);
      next(error);
    }
  });

  // Atualizar status do vídeo após upload
  app.patch("/api/videos/:videoId/status", requireAuthOrToken, async (req, res, next) => {
    try {
      const { videoId } = req.params;
      const { status } = req.body;

      // Se o status for "processing", buscar informações do Bunny.net
      if (status === "processing" || status === "ready") {
        const video = await storage.getVideoById(videoId);
        if (!video || !video.bunnyVideoId) {
          return res.status(404).json({ message: "Vídeo não encontrado" });
        }

        const { bunnyStream } = await import("./bunny");
        const bunnyVideo = await bunnyStream.getVideo(video.bunnyVideoId);

        // Atualizar com informações completas do Bunny.net
        const updatedVideo = await storage.updateVideoProjeto(videoId, {
          status: bunnyVideo.status === 4 ? "ready" : "processing",
          thumbnailUrl: bunnyStream.getThumbnailUrl(video.bunnyGuid!),
          videoUrl: bunnyStream.getVideoUrl(video.bunnyGuid!),
          duration: bunnyVideo.length,
          fileSize: bunnyVideo.storageSize,
          width: bunnyVideo.width,
          height: bunnyVideo.height,
        });

        // Emitir evento WebSocket
        const wsServer = (req.app as any).wsServer;
        if (wsServer) {
          wsServer.emitChange('video:updated', { videoId: updatedVideo.id });
        }

        return res.json(updatedVideo);
      }

      // Atualizar apenas o status
      const updatedVideo = await storage.updateVideoProjeto(videoId, { status });

      // Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:updated', { videoId: updatedVideo.id });
      }

      res.json(updatedVideo);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      next(error);
    }
  });

  // Listar vídeos de uma pasta
  app.get("/api/pastas/:pastaId/videos", requireAuthOrToken, async (req, res, next) => {
    try {
      const videos = await storage.getVideosByPastaId(req.params.pastaId);
      res.json(videos);
    } catch (error) {
      next(error);
    }
  });

  // Deletar um vídeo
  app.delete("/api/videos/:videoId", requireAuthOrToken, async (req, res, next) => {
    try {
      const { videoId } = req.params;

      // 1. Buscar informações do vídeo
      const video = await storage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ message: "Vídeo não encontrado" });
      }

      // 2. Deletar do Bunny.net se tiver bunnyVideoId
      if (video.bunnyVideoId) {
        try {
          const { bunnyStream } = await import("./bunny");
          await bunnyStream.deleteVideo(video.bunnyVideoId);
        } catch (error) {
          console.error("Erro ao deletar do Bunny.net:", error);
          // Continua mesmo se falhar no Bunny (pode já ter sido deletado)
        }
      }

      // 3. Deletar do banco de dados
      await storage.deleteVideoProjeto(videoId);

      // 4. Emitir evento WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.emitChange('video:deleted', { videoId });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao deletar vídeo:", error);
      next(error);
    }
  });

  // Metrics routes
  app.get("/api/metricas", requireAuthOrToken, async (req, res, next) => {
    try {
      const metricas = await storage.getMetricas();
      res.json(metricas);
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // TOKENS DE ACESSO (API)
  // ==========================================

  // Listar todos os tokens
  app.get("/api/tokens", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const tokens = await storage.getTokensAcesso();
      // Mascarar o valor do token na listagem (mostra só os primeiros 8 chars)
      const tokensMascarados = tokens.map(t => ({
        ...t,
        token: t.token.substring(0, 8) + '...',
        tokenCompleto: t.token, // Enviamos completo para o admin poder copiar
      }));
      res.json(tokensMascarados);
    } catch (error) {
      next(error);
    }
  });

  // Criar novo token
  app.post("/api/tokens", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const { descricao, papel, tipo } = req.body;
      const token = nanoid(48); // Token seguro de 48 caracteres

      const novoToken = await storage.createTokenAcesso({
        token,
        descricao: descricao || 'API Token',
        papel: papel || 'Membro',
        tipo: tipo || 'api',
        ativo: true,
      });

      res.status(201).json({
        ...novoToken,
        mensagem: 'Token criado! Copie o valor abaixo — ele não será exibido novamente.',
      });
    } catch (error) {
      next(error);
    }
  });

  // Atualizar token (ativar/desativar, editar descrição)
  app.patch("/api/tokens/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      const { descricao, papel, ativo } = req.body;
      const updates: any = {};
      if (descricao !== undefined) updates.descricao = descricao;
      if (papel !== undefined) updates.papel = papel;
      if (ativo !== undefined) updates.ativo = ativo;

      const token = await storage.updateTokenAcesso(req.params.id, updates);
      res.json(token);
    } catch (error) {
      next(error);
    }
  });

  // Deletar token
  app.delete("/api/tokens/:id", requireAuthOrToken, requireRole(["Admin"]), async (req, res, next) => {
    try {
      await storage.deleteTokenAcesso(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Proxy para o chat do OpenClaw (evita CORS) com suporte a email
  app.post("/api/chat", requireAuthOrToken, async (req, res, next) => {
    try {
      const openclawUrl = process.env.OPENCLAW_URL || "https://framety.tail81fe5d.ts.net";
      const openclawToken = process.env.OPENCLAW_TOKEN || "57bf11589000632b2c0009387429a69db0ad17c08802dd1b";

      // Injetar instrução de sistema para email no início das mensagens
      const emailSystemMsg = {
        role: "system",
        content: `INSTRUÇÃO IMPORTANTE SOBRE EMAIL:
Você NÃO pode enviar emails usando o tool "message" com channel "gmail" — esse canal não está disponível.
Para enviar email, inclua na sua resposta um bloco especial no formato:
[ENVIAR_EMAIL]
{"projetoId":"ID_DO_PROJETO","assunto":"Assunto do Email","mensagem":"Corpo do email aqui"}
[/ENVIAR_EMAIL]
O sistema dashboard processará esse bloco automaticamente e enviará o email via Gmail SMTP para os contatos de email cadastrados no projeto.
Se não souber o ID do projeto, pergunte ao usuário qual projeto ele se refere.
WhatsApp continua funcionando normalmente via tool "message" com channel "whatsapp".`
      };

      const messages = req.body.messages || [];
      const modifiedBody = {
        ...req.body,
        messages: [emailSystemMsg, ...messages],
      };

      console.log("[Chat Proxy] Enviando para OpenClaw:", JSON.stringify(modifiedBody).slice(0, 300));
      const response = await fetch(`${openclawUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openclawToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modifiedBody),
      });

      console.log("[Chat Proxy] Status OpenClaw:", response.status);
      const text = await response.text();
      console.log("[Chat Proxy] Resposta:", text.slice(0, 300));

      if (!response.ok) {
        return res.status(response.status).json({ error: "Erro no OpenClaw gateway", detail: text });
      }

      const data = JSON.parse(text);

      // Verificar se a resposta contém bloco [ENVIAR_EMAIL]
      let reply = data.choices?.[0]?.message?.content || "";
      const emailMatch = reply.match(/\[ENVIAR_EMAIL\]([\s\S]*?)\[\/ENVIAR_EMAIL\]/);

      if (emailMatch) {
        try {
          const emailData = JSON.parse(emailMatch[1].trim());
          const { projetoId, assunto, mensagem } = emailData;

          if (projetoId && mensagem) {
            const projeto = await storage.getProjeto(projetoId);
            if (projeto) {
              const emails = projeto.contatosEmail || [];
              if (emails.length > 0) {
                const subjectLine = assunto || `Atualização - Projeto ${projeto.titulo}`;
                const { enviados, erros } = await sendEmailViaSMTP(emails, subjectLine, mensagem, projeto);

                if (enviados.length > 0) {
                  console.log(`[Chat Email] Enviado para ${enviados.join(", ")} - Projeto: ${projeto.titulo}`);
                  reply = reply.replace(/\[ENVIAR_EMAIL\][\s\S]*?\[\/ENVIAR_EMAIL\]/, '').trim();
                  reply += `\n\n✅ **Email enviado com sucesso** para ${enviados.length} contato(s): ${enviados.join(", ")}`;
                } else {
                  reply = reply.replace(/\[ENVIAR_EMAIL\][\s\S]*?\[\/ENVIAR_EMAIL\]/, '').trim();
                  reply += `\n\n❌ **Falha ao enviar email**: ${erros.map(e => e.erro).join(", ")}`;
                }
              } else {
                reply = reply.replace(/\[ENVIAR_EMAIL\][\s\S]*?\[\/ENVIAR_EMAIL\]/, '').trim();
                reply += "\n\n⚠️ Este projeto não possui contatos de email cadastrados. Adicione emails na aba de contatos do projeto.";
              }
            } else {
              reply = reply.replace(/\[ENVIAR_EMAIL\][\s\S]*?\[\/ENVIAR_EMAIL\]/, '').trim();
              reply += "\n\n⚠️ Projeto não encontrado. Verifique o ID do projeto.";
            }
          }

          data.choices[0].message.content = reply;
        } catch (e: any) {
          console.error("[Chat Email] Erro ao processar bloco de email:", e.message);
          // Remove o bloco malformado e avisa
          reply = reply.replace(/\[ENVIAR_EMAIL\][\s\S]*?\[\/ENVIAR_EMAIL\]/, '').trim();
          reply += "\n\n⚠️ Houve um erro ao processar o envio de email. Tente novamente.";
          data.choices[0].message.content = reply;
        }
      }

      res.json(data);
    } catch (error: any) {
      console.error("[Chat Proxy] ERRO:", error.message);
      res.status(502).json({ error: "Falha ao conectar com OpenClaw", detail: error.message });
    }
  });

  // ==========================================
  // ENVIAR EMAIL (Tool do bot via Gmail SMTP)
  // ==========================================
  app.post("/api/enviar-email", requireAuthOrToken, async (req, res, next) => {
    try {
      const { projetoId, assunto, mensagem } = req.body;

      if (!projetoId || !assunto || !mensagem) {
        return res.status(400).json({ message: "Campos projetoId, assunto e mensagem são obrigatórios" });
      }

      const projeto = await storage.getProjeto(projetoId);
      if (!projeto) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const emails = projeto.contatosEmail || [];
      if (emails.length === 0) {
        return res.status(400).json({ message: "Projeto não possui emails de contato cadastrados" });
      }

      const { enviados, erros } = await sendEmailViaSMTP(emails, assunto, mensagem, projeto);

      if (enviados.length === 0) {
        return res.status(502).json({ message: "Falha ao enviar para todos os emails", erros });
      }

      console.log(`[Email Bot] Enviado para ${enviados.join(", ")} - Projeto: ${projeto.titulo}`);

      res.json({
        message: `Email enviado com sucesso para ${enviados.length} destinatário(s)`,
        destinatarios: enviados,
        erros: erros.length > 0 ? erros : undefined,
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
