import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProjetoSchema, insertLogStatusSchema, insertClienteSchema } from "@shared/schema";

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

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters]) {
          delete filters[key as keyof typeof filters];
        }
      });

      const projetos = await storage.getProjetos(filters);
      res.json(projetos);
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

  app.post("/api/projetos", requireAuth, requireRole(["Admin", "Gestor"]), async (req, res, next) => {
    try {
      const validatedData = insertProjetoSchema.parse(req.body);
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

  app.patch("/api/projetos/:id", requireAuth, async (req, res, next) => {
    try {
      const projetoExistente = await storage.getProjeto(req.params.id);
      if (!projetoExistente) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      // Allow all authenticated users to edit any project

      const validatedData = insertProjetoSchema.partial().parse(req.body);
      
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

  app.delete("/api/projetos/:id", requireAuth, async (req, res, next) => {
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

  // Tags routes
  app.get("/api/tags", requireAuth, async (req, res, next) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
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
