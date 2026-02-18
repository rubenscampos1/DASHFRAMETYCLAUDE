# CLAUDE.md - Memoria do Projeto Framety Dashboard

## Visao Geral

**Projeto:** Framety Dashboard (DASHFRAMETYCLAUDE)
**Cliente:** Framety / Grupo Skyline (produtora audiovisual)
**Proposito:** Plataforma completa de gestao de projetos de video - do briefing ate a entrega e aprovacao final do cliente.
**URL Producao:** https://frametyboard.com
**Diretorio principal do codigo:** `DASHFRAMETYCLAUDE/`

---

## Tech Stack

| Camada | Tecnologias |
|--------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Shadcn/ui (Radix), React Query (TanStack), Framer Motion, Wouter (routing), React Beautiful DnD, Recharts, React Hook Form + Zod |
| **Backend** | Node.js (ESM), Express, Passport.js (sessao local) |
| **Banco de dados** | PostgreSQL (Neon serverless) + Drizzle ORM |
| **Realtime** | Supabase Realtime (WebSockets) |
| **Armazenamento** | Supabase Storage (audio), Google Cloud Storage, AWS S3/R2 (arquivos), Bunny.net Stream (videos CDN) |
| **Email** | Nodemailer (Gmail SMTP) |
| **IA** | OpenAI SDK (@ai-sdk/openai) |
| **PDF** | PDFKit |
| **Upload** | Uppy (S3, GCS) |

---

## Estrutura de Pastas

```
DASHFRAMETYCLAUDE/
├── client/
│   └── src/
│       ├── pages/             # 18 paginas (dashboard, metricas, kanban, portais, etc.)
│       ├── components/        # Componentes React reutilizaveis (21+ arquivos)
│       │   └── ui/            # Shadcn/ui components
│       ├── hooks/             # Custom hooks (useAuth, useProjetos, etc.)
│       ├── lib/               # Utilitarios (queryClient, utils)
│       ├── contexts/          # Context providers
│       └── App.tsx            # Router principal (Wouter)
├── server/
│   ├── index.ts               # Entry point do servidor Express
│   ├── routes.ts              # Todas as rotas API (3230+ linhas, 130+ endpoints)
│   ├── auth.ts                # Passport.js config
│   ├── db.ts                  # Conexao com PostgreSQL
│   ├── storage.ts             # Camada de operacoes no banco (queries Drizzle)
│   └── objectStorage.ts       # Upload/download de arquivos
├── shared/
│   └── schema.ts              # Schema Drizzle ORM + validacao Zod (30+ tabelas)
├── migrations/                # Migracoes SQL do Drizzle
├── drizzle.config.ts          # Config do Drizzle Kit
├── vite.config.ts             # Config do Vite
├── tsconfig.json              # TypeScript (strict mode)
└── package.json               # Dependencias
```

---

## Pipeline de Projetos (8 etapas)

```
Briefing → Roteiro → Captacao → Edicao → Entrega → Revisao → Aguardando Aprovacao → Aprovado
```

Cada mudanca de status gera um log em `logsDeStatus`.

---

## Tabelas Principais do Banco (Drizzle ORM)

| Tabela | Descricao |
|--------|-----------|
| `users` | Membros da equipe (roles: Admin, Gestor, Membro) |
| `projetos` | Entidade principal - projeto de video (120+ campos) |
| `clientes` | Clientes com tokens para portal |
| `empreendimentos` | Empreendimentos/subdivisoes dos clientes |
| `tipos_de_video` | Categorias de video (com cores) |
| `tags` | Tags/labels dos projetos |
| `logsDeStatus` | Historico de mudancas de status |
| `comentarios` | Comentarios internos em projetos |
| `projeto_musicas` | Opcoes de musica por projeto (workflow de aprovacao) |
| `projeto_locutores` | Locutores vinculados ao projeto |
| `locutores` | Banco de locutores (nomes, cachets, idiomas) |
| `estilos_locucao` | Estilos de locucao |
| `amostras_locutores` | Amostras de audio por locutor/estilo |
| `roteiro_comentarios` | Feedback do cliente por secao do roteiro |
| `notas` | Notas internas (3 tipos: Nota, Senha, Arquivo) |
| `timelapses` | Gerenciamento de timelapses (semanal/quinzenal/mensal) |
| `respostas_nps` | Respostas da pesquisa NPS (3 perguntas) |
| `videos_projeto` | Videos individuais (integracao Bunny.net) |
| `video_pastas` | Pastas hierarquicas para videos |
| `video_comentarios` | Comentarios por frame nos videos (com timestamp) |
| `captador_links` | Links de upload para captadores |
| `captador_uploads` | Arquivos enviados pelos captadores |
| `tokens_acesso` | Tokens de API para integracoes externas |

---

## Rotas da Aplicacao (Frontend)

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/` ou `/dashboard` | dashboard.tsx | Kanban board principal |
| `/metricas` | metrics.tsx | Dashboard de KPIs e analytics |
| `/finalizados` | finalizados.tsx | Arquivo de projetos concluidos |
| `/novo-projeto` | novo-projeto.tsx | Formulario de criacao |
| `/minha-fila` | minha-fila.tsx | Projetos atribuidos ao usuario |
| `/relatorios` | relatorios.tsx | Geracao de relatorios PDF |
| `/banco-de-dados` | database.tsx | Tabela completa de projetos |
| `/notas` | notas.tsx | Sistema de notas/senhas/arquivos |
| `/timelapse` | timelapse.tsx | Gerenciamento de timelapses |
| `/videos` | videos-grid.tsx | Grid de videos |
| `/videos/:clienteId` | videos-cliente.tsx | Videos por cliente |
| `/videos/:clienteId/pastas/:pastaId` | videos-pasta.tsx | Videos na pasta |
| `/auth` | auth-page.tsx | Login |
| `/cliente/:token` | cliente-portal.tsx | Portal do cliente (legado) |
| `/portal/cliente/:clientToken` | portal-unificado.tsx | Portal unificado do cliente |
| `/captador/:token` | captador-portal.tsx | Portal de upload do captador |

---

## API - Endpoints Principais

### Projetos
- `GET /api/projetos/light` - Lista leve para Kanban (usar para consultas rapidas)
- `GET /api/projetos` - Lista completa com relacoes
- `GET /api/projetos/:id` - Detalhes (inclui contatos e roteiro)
- `POST /api/projetos` - Criar
- `PATCH /api/projetos/:id` - Atualizar
- `DELETE /api/projetos/:id` - Excluir
- `POST /api/projetos/:id/duplicar` - Duplicar

### Clientes e Empreendimentos
- `GET/POST/PUT/DELETE /api/clientes`
- `GET/POST/PUT/DELETE /api/empreendimentos`

### Musicas e Locutores (Aprovacao)
- `GET/POST /api/projetos/:projetoId/musicas`
- `PUT/DELETE /api/musicas/:id`
- `GET/POST /api/projetos/:projetoId/locutores`
- `GET/POST/PUT/DELETE /api/locutores` (banco de locutores)
- `POST /api/locutores/:locutorId/amostras` (upload de amostra)

### Videos (Bunny.net)
- `GET/POST /api/projetos/:id/videos`
- `GET/PATCH/DELETE /api/videos/:id`
- `POST /api/videos/:id/comentarios` (comentario por frame)
- `POST/GET/PATCH/DELETE /api/clientes/:clienteId/pastas` (pastas de video)

### Portal do Cliente (publico, token-based)
- `GET /api/cliente/projeto/:token` - Dados do projeto
- `GET /api/portal/cliente/:clientToken` - Portal unificado
- `POST /api/cliente/projeto/:token/aprovar-musica`
- `POST /api/cliente/projeto/:token/aprovar-locucao`
- `POST /api/cliente/projeto/:token/aprovar-video`
- `POST /api/cliente/projeto/:token/aprovar-roteiro`
- `POST /api/cliente/projeto/:token/nps` - Submeter NPS

### Outros
- `GET /api/metricas` - Dashboard de metricas
- `GET/POST/PATCH/DELETE /api/notas`
- `GET/POST/PATCH/DELETE /api/timelapses`
- `GET/POST/PUT/DELETE /api/tipos-video`
- `GET/POST/PUT/DELETE /api/tags`
- `POST /api/chat` - Chat com IA
- `POST /api/objects/upload` - Upload de arquivo
- `GET /api/config/supabase` - Config para realtime

---

## Autenticacao e Permissoes

- **Metodo:** Sessao com Passport.js + Bearer Token para API externa
- **Roles:** Admin (acesso total), Gestor (gestao de projetos), Membro (projetos proprios)
- **Sessao:** Armazenada em PostgreSQL (connect-pg-simple)

---

## Scripts de Desenvolvimento

```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build para producao (Vite + ESBuild)
npm start          # Servidor de producao
npm run check      # Verificacao TypeScript
npm run db:push    # Push do schema no banco
```

---

## Variaveis de Ambiente Necessarias

- `DATABASE_URL` - Conexao PostgreSQL
- `SESSION_SECRET` - Encriptacao de sessao
- `VITE_SUPABASE_URL` - Endpoint Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave publica Supabase
- `SMTP_USER` / `SMTP_PASS` - Credenciais Gmail
- Chaves de cloud storage (R2, GCS, Bunny.net, etc.)

---

## API Externa (para integracoes/tools)

- **Base URL:** `https://frametyboard.com`
- **Autenticacao:** Header `Authorization: Bearer <token>`
- **Sempre consultar API antes de enviar notificacoes**
- **Tom de mensagens:** Profissional e cordial, assinar como "Equipe Framety"

---

## Regras e Padroes

1. Schema do banco fica em `shared/schema.ts` (Drizzle ORM + Zod)
2. Todas as rotas API ficam em `server/routes.ts`
3. Operacoes de banco ficam em `server/storage.ts`
4. Componentes UI usam Shadcn/ui (pasta `client/src/components/ui/`)
5. Estado global via React Query com invalidacao por Supabase Realtime
6. Usar `/api/projetos/light` para consultas rapidas (70% menos dados)
7. Todas as aprovacoes do cliente sao feitas via token publico (sem login)

---

## NUC Framety (OpenClaw)

- **Host:** `100.68.169.64` (Tailscale) / `192.168.50.208` (local)
- **User SSH:** `framety-ia` / Senha: `Framety123`
- **OpenClaw:** v2026.2.9 instalado via npm
- **Gateway:** `localhost:18789` / Token: `57bf11589000632b2c0009387429a69db0ad17c08802dd1b`
- **WhatsApp:** Conectado no +556291852508
- **Modelo primario:** gemini-3-flash / Fallback: gpt-5.3-codex
- **TTS:** ElevenLabs (pt-BR) — Voz: Roberta BR (`ohZOfA9iwlZ5nOsoY7LB`), modelo `eleven_multilingual_v2`
- **Gmail:** gustavo@skylineip.com.br
- **Respostas automaticas:** DESLIGADAS (dmPolicy=disabled, groupPolicy=disabled)
- **O bot so envia mensagens quando solicitado via CLI ou plataforma**

### Grupos WhatsApp (JIDs)

| # | JID | Nome do Grupo |
|---|-----|---------------|
| 1 | `120363220823541581@g.us` | LUPEMA + SKYLINE |
| 2 | `120363314729718440@g.us` | DIRECIONAL CAMPINAS + SKYLINE |
| 3 | `120363317046420867@g.us` | SKYLINE + AB MAIS URBANISMO |
| 4 | `120363335115588758@g.us` | DIRECIONAL SP + SKYLINE |
| 5 | `120363402525976700@g.us` | TENDA + SKYLINE (GYN) |
| 6 | `120363403006110636@g.us` | CINQ + SKYLINE |
| 7 | `120363405194589841@g.us` | LIRIOS + SKYLINE |
| 8 | `120363410025026671@g.us` | M21 + Skyline |
| 9 | `120363412369614793@g.us` | BRDU + SKYLINE - Sala Interativa |
| 10 | `120363420407176976@g.us` | Tectaris + Skyline |
| 11 | `120363422234348702@g.us` | VIDEO AURORA |
| 12 | `120363422783724981@g.us` | Skyline + BP 8 Incorporadora |
| 13 | `120363423680681833@g.us` | Grupo Sinal + Skyline |
| 14 | `120363425528131353@g.us` | NOVOLAR + SKYLINE |
| 15 | `556292294131-1572969129@g.us` | EBM MKT + SKYLINE |

---

## Historico de Sessoes

> Adicione aqui notas sobre o que foi feito em cada sessao para manter contexto.

### Sessao 1 - 2026-02-12
- Primeira exploracao completa do projeto
- Criacao deste arquivo CLAUDE.md como memoria persistente
- Conexao SSH com NUC via Tailscale
- Mapeamento dos 15 grupos WhatsApp (JIDs + nomes)
- Configuracao OpenClaw: respostas automaticas desligadas, denyCommands removido
- Bot WhatsApp configurado para envio manual apenas (sem auto-reply)

### Sessao 2 - 2026-02-18
- Implementacao do **Sistema de Anuncio Sonoro no Escritorio**
- Quando cliente aprova/reprova musica, locucao, roteiro ou video no portal, toca anuncio TTS no speaker
- Criado `anunciarAprovacaoNoSpeaker()` em `server/routes.ts` (~linha 1026)
- Chamada fire-and-forget (sem await) nos 6 endpoints de aprovacao do portal
- Criado `nuc-speaker-server.cjs` — micro HTTP server que roda no NUC (porta 3456)
- Fluxo: Render (producao) → POST `https://framety.tail81fe5d.ts.net:8443/announce` → Tailscale Funnel → NUC porta 3456 → OpenClaw TTS (ElevenLabs) → PowerShell MediaPlayer → speaker
- Fila sequencial implementada: anuncios nunca sobrepoe, tocam um apos o outro
- Voz trocada de Sarah (inglesa) para **Roberta BR** (brasileira, casual)
- Mensagens com tom desconttraido: "Fala galera, tudo joia? X aprovou a musica..."
- Firewall Windows aberto na porta 3456
- Tailscale Funnel configurado: `--https=8443 http://localhost:3456`
- Tarefa agendada "Framety Services" no Windows (auto-start no logon)
- Script `C:\Users\framety-ia\start-services.bat` sobe: gateway + speaker server + funnel
- Testado em producao: aprovacao no portal → speaker toca corretamente
- Implementacao do **Agradecimento automatico no WhatsApp**
- Funcao `agradecerAprovacaoWhatsApp()` em `server/routes.ts` (logo apos anunciarAprovacaoNoSpeaker)
- Quando cliente APROVA (musica, locucao, roteiro ou video), envia mensagem no grupo WhatsApp do projeto
- Reprovacoes NAO disparam mensagem (tratamento interno pela equipe)
- So envia se o projeto tiver `contatosGrupos` configurado
- Fire-and-forget — nao atrasa resposta ao cliente
- Mensagens: musica 🎵 / locucao 🎤 / roteiro 📝 / video 🎬 — todas assinadas "Equipe Framety"

---

## Sistema de Anuncio Sonoro (Speaker)

### Arquitetura
```
Cliente aprova no portal
  → Render (routes.ts) chama anunciarAprovacaoNoSpeaker() [fire-and-forget]
  → POST https://framety.tail81fe5d.ts.net:8443/announce { text: "..." }
  → Tailscale Funnel → NUC porta 3456
  → nuc-speaker-server.cjs (fila sequencial)
  → OpenClaw TTS (ElevenLabs, voz Roberta BR) → gera MP3
  → Toca no speaker (Windows: PowerShell MediaPlayer / Linux: mpv)
```

### Arquivos envolvidos
- `server/routes.ts` — funcao `anunciarAprovacaoNoSpeaker()` + chamadas nos 6 endpoints
- `nuc-speaker-server.cjs` — micro HTTP server (porta 3456) com fila sequencial

### Endpoints que disparam anuncio
| Endpoint | Evento |
|----------|--------|
| `POST /api/cliente/projeto/:token/aprovar-musica` | musica / musica_reprovada |
| `POST /api/cliente/projeto/:token/aprovar-locucao` | locucao / locucao_reprovada |
| `POST /api/cliente/projeto/:token/aprovar-video` | video / video_reprovado |
| `POST /api/cliente/projeto/:token/aprovar-roteiro` | roteiro / roteiro_reprovado |
| `POST /api/cliente/projeto/:token/musicas/:musicaId/aprovar` | musica / musica_reprovada |
| `POST /api/cliente/projeto/:token/locutores/:locutorId/aprovar` | locucao / locucao_reprovada |

### Config atual no NUC (Windows)
- **Script:** `C:\Users\framety-ia\nuc-speaker-server.cjs`
- **Auto-start:** Tarefa agendada "Framety Services" → `C:\Users\framety-ia\start-services.bat`
- **start-services.bat:**
  ```bat
  @echo off
  set OPENCLAW_URL=http://127.0.0.1:18789
  set OPENCLAW_TOKEN=57bf11589000632b2c0009387429a69db0ad17c08802dd1b
  start /B openclaw gateway --port 18789 --token 57bf11589000632b2c0009387429a69db0ad17c08802dd1b
  timeout /t 5 /nobreak > nul
  start /B node C:\Users\framety-ia\nuc-speaker-server.cjs
  timeout /t 3 /nobreak > nul
  tailscale funnel --bg --https=8443 http://localhost:3456
  ```

### Agradecimento automatico no WhatsApp
- **Funcao:** `agradecerAprovacaoWhatsApp()` em `server/routes.ts`
- **Disparo:** Apenas quando `aprovado === true` (reprovacoes ignoradas)
- **Requisito:** Projeto precisa ter `contatosGrupos` preenchido
- **Canal:** WhatsApp via OpenClaw `tool: "message", action: "send", channel: "whatsapp"`
- **Mensagens:**
  - musica: "Música aprovada! 🎵 Obrigado pelo retorno, seguimos para a próxima etapa! — Equipe Framety"
  - locucao: "Locução aprovada! 🎤 Valeu pela confiança, partiu próxima fase! — Equipe Framety"
  - roteiro: "Roteiro aprovado! 📝 Obrigado pelo feedback, bora dar vida a esse projeto! — Equipe Framety"
  - video: "Vídeo aprovado! 🎬 Projeto finalizado com sucesso, obrigado pela parceria! — Equipe Framety"

### ElevenLabs
- **API Key:** `sk_eea4c2101a3afac48c78031c0d4fda7bd09b06d9694c5da6`
- **Voice ID:** `ohZOfA9iwlZ5nOsoY7LB` (Roberta - Casual, Engaging and Clear, brasileira)
- **Model:** `eleven_multilingual_v2`
- Config fica em `~/.openclaw/openclaw.json` → `messages.tts.elevenlabs`

### URL do Speaker Server (usada pelo Render)
- **Variavel:** `NUC_SPEAKER_URL` (env var opcional no Render)
- **Default no codigo:** `https://framety.tail81fe5d.ts.net:8443`
- Se mudar a maquina/Tailscale, atualizar essa URL no `routes.ts` ou setar a env var no Render

---

## MIGRAR SPEAKER PARA UBUNTU (TODO FUTURO)

Quando trocar o NUC Windows para Ubuntu, seguir estes passos:

### 1. Instalar dependencias
```bash
sudo apt update
sudo apt install -y nodejs npm mpv
# Verificar Node >= 18
node --version
```

### 2. Instalar OpenClaw
```bash
npm install -g openclaw
openclaw doctor
```

### 3. Configurar TTS no OpenClaw
Editar `~/.openclaw/openclaw.json` e adicionar/atualizar:
```json
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "elevenlabs": {
        "apiKey": "sk_eea4c2101a3afac48c78031c0d4fda7bd09b06d9694c5da6",
        "voiceId": "ohZOfA9iwlZ5nOsoY7LB",
        "modelId": "eleven_multilingual_v2"
      }
    }
  }
}
```

### 4. Copiar o script
```bash
# Copiar nuc-speaker-server.cjs do repo para a home
cp /caminho/do/repo/DASHFRAMETYCLAUDE/nuc-speaker-server.cjs ~/nuc-speaker-server.cjs
```

### 5. Instalar Tailscale
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Logar na mesma conta Tailscale para manter o hostname framety.tail81fe5d.ts.net
```

### 6. Criar servico systemd (auto-start no boot)
```bash
# /etc/systemd/system/openclaw-gateway.service
sudo tee /etc/systemd/system/openclaw-gateway.service << 'EOF'
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=framety-ia
ExecStart=/usr/bin/openclaw gateway --port 18789 --token 57bf11589000632b2c0009387429a69db0ad17c08802dd1b
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# /etc/systemd/system/speaker-server.service
sudo tee /etc/systemd/system/speaker-server.service << 'EOF'
[Unit]
Description=NUC Speaker Server
After=openclaw-gateway.service
Requires=openclaw-gateway.service

[Service]
Type=simple
User=framety-ia
Environment=OPENCLAW_URL=http://127.0.0.1:18789
Environment=OPENCLAW_TOKEN=57bf11589000632b2c0009387429a69db0ad17c08802dd1b
ExecStart=/usr/bin/node /home/framety-ia/nuc-speaker-server.cjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Ativar servicos
sudo systemctl daemon-reload
sudo systemctl enable openclaw-gateway speaker-server
sudo systemctl start openclaw-gateway speaker-server
```

### 7. Configurar Tailscale Funnel
```bash
tailscale funnel --bg --https=8443 http://localhost:3456
```

### 8. Testar
```bash
curl -X POST http://localhost:3456/announce \
  -H "Content-Type: application/json" \
  -d '{"text":"Teste de som no Ubuntu"}'
```

### 9. Verificar acesso externo
```bash
curl -X POST https://framety.tail81fe5d.ts.net:8443/announce \
  -H "Content-Type: application/json" \
  -d '{"text":"Teste externo"}'
```

### O que NAO precisa mudar
- Nada no `server/routes.ts` (Render) — a URL Tailscale permanece a mesma
- Nada no `nuc-speaker-server.cjs` — ele detecta o OS automaticamente (usa `mpv` no Linux)
- Nada no ElevenLabs — mesma API key e voz

### Possivel problema no Ubuntu: audio sem sessao grafica
- Se o Ubuntu rodar headless (sem desktop), o `mpv` pode nao encontrar dispositivo de audio
- Solucao: usar PulseAudio ou PipeWire e garantir que o user tem acesso ao dispositivo
- Alternativa: `PULSE_SERVER=unix:/run/user/1000/pulse/native mpv --no-video arquivo.mp3`
