import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProjetoSchema, updateProjetoSchema, insertLogStatusSchema, insertClienteSchema, insertEmpreendimentoSchema, insertTagSchema, insertTipoVideoSchema, insertComentarioSchema } from "@shared/schema";

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

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Health check endpoint for Render.com (no auth required)
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
      };

      // Remove undefined values and "all" values
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (!value || value === "all") {
          delete filters[key as keyof typeof filters];
        }
      });

      const projetos = await storage.getProjetos(filters);
      
      // Otimização: Remover campos pesados desnecessários para o dashboard
      // Campos como descricao, informacoesAdicionais, referencias, anotacoes são carregados apenas no drawer
      const projetosOtimizados = projetos.map(projeto => ({
        ...projeto,
        descricao: undefined,  // Não enviar descrição completa para o dashboard
        informacoesAdicionais: undefined,  // Não enviar informações adicionais para o dashboard
        referencias: undefined,  // Não enviar referências para o dashboard
        caminho: undefined,  // Não enviar caminho para o dashboard
      }));
      
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

  app.patch("/api/projetos/:id", requireAuth, requireRole(["Admin", "Gestor"]), async (req, res, next) => {
    try {
      const projetoExistente = await storage.getProjeto(req.params.id);
      if (!projetoExistente) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      // Allow all authenticated users to edit any project

      const validatedData = updateProjetoSchema.parse(req.body);
      
      // If status is changing, log it
      if (validatedData.status && validatedData.status !== projetoExistente.status) {
        await storage.createLogStatus({
          projetoId: req.params.id,
          statusAnterior: projetoExistente.status,
          statusNovo: validatedData.status,
          alteradoPorId: req.user!.id,
        });

        // If moving to Aprovado, set approval date
        if (validatedData.status === "Aprovado") {
          (validatedData as any).dataAprovacao = new Date();
        }
      }

      const projeto = await storage.updateProjeto(req.params.id, validatedData);
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
