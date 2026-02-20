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
- **TTS:** ElevenLabs (pt-BR) — Voz: Fernanda AI Agent (`7iqXtOF3wl3pomwXFY7G`), modelo `eleven_multilingual_v2`
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
  → OpenClaw TTS (ElevenLabs, voz Fernanda AI Agent) → gera MP3
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
- **API Key:** `sk_6725ee348eae089736529d16fac83e94e1309f94dd002cb2` (conta premium)
- **Voice ID:** `7iqXtOF3wl3pomwXFY7G` (Fernanda - AI Agent, conversational, brasileira)
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

---

## Frame.io (Integracao API V4)

### Visao Geral
- **Plataforma:** Frame.io (adquirido pela Adobe) — review e aprovacao de videos
- **Conta:** Framety® (rubens@skylineip.com.br)
- **Storage:** ~2.2TB de 3TB usado
- **Migrada para Adobe:** em 2024-10-15 (V4)
- **API V2 NAO funciona mais** — accounts retorna vazio, endpoints 401
- **API V4 é a unica que funciona** — requer autenticacao via Adobe IMS

### Credenciais Adobe IMS (OAuth Web App)
- **Adobe Developer Console Project:** criado em 2026-02-18
- **Client ID:** `a9e788f0de964b0d80664e75f86bf564`
- **Client Secret:** `[ADOBE_CLIENT_SECRET]`
- **Auth endpoint:** `https://ims-na1.adobelogin.com/ims/authorize/v2`
- **Token endpoint:** `https://ims-na1.adobelogin.com/ims/token/v3`
- **Redirect URI:** `https://localhost:9999/callback`
- **Scopes:** `openid profile email offline_access additional_info.roles`
- **Auth method:** `client_secret_basic` (nao usar client_secret_post)

### Credenciais Frame.io V2 (LEGADO - nao usar)
- **Client ID V2:** `7279291d-684c-4f6b-a552-e182f299f82b`
- **Client Secret V2:** `51cHJG3T6-9okSU.K6XCTLftpW`
- **Developer Token V2:** `[FRAMEIO_DEV_TOKEN_LEGADO]`
- **Status:** NAO funciona — /v2/accounts retorna [], /v4 retorna 401

### IDs da Conta
- **Account ID:** `83a481fd-f32a-44d3-936e-cab304799cba`
- **Workspace ID:** `7da91fef-c417-4bb9-b92b-3076ac0c2e2e` (workspace "Framety")
- **User ID (Adobe):** `7A535BC3634D57680A495C3B@20ee4c0c628fca43495c2d.e`
- **User ID (Frame.io V2):** `42c2f892-0e1d-4018-985a-a1ea57fee373`

### API V4 - Base URL e Endpoints Principais

**Base URL:** `https://api.frame.io/v4`
**Auth header:** `Authorization: Bearer <adobe_ims_access_token>`

#### Projetos
| Operacao | Endpoint |
|----------|----------|
| Listar | `GET /v4/accounts/{account_id}/workspaces/{workspace_id}/projects` |
| Detalhes | `GET /v4/accounts/{account_id}/projects/{project_id}` |
| Criar | `POST /v4/accounts/{account_id}/workspaces/{workspace_id}/projects` |
| Atualizar | `PATCH /v4/accounts/{account_id}/workspaces/{workspace_id}/projects/{project_id}` |
| Deletar | `DELETE /v4/accounts/{account_id}/workspaces/{workspace_id}/projects/{project_id}` |

#### Pastas
| Operacao | Endpoint |
|----------|----------|
| Listar filhos | `GET /v4/accounts/{account_id}/folders/{folder_id}/children` |
| Criar pasta | `POST /v4/accounts/{account_id}/folders/{folder_id}/folders` |
| Detalhes | `GET /v4/accounts/{account_id}/folders/{folder_id}` |
| Atualizar | `PATCH /v4/accounts/{account_id}/folders/{folder_id}` |
| Deletar | `DELETE /v4/accounts/{account_id}/folders/{folder_id}` |

#### Arquivos
| Operacao | Endpoint |
|----------|----------|
| Upload | `POST /v4/accounts/{account_id}/folders/{folder_id}/files` |
| Detalhes | `GET /v4/accounts/{account_id}/files/{file_id}` |
| Atualizar | `PATCH /v4/accounts/{account_id}/files/{file_id}` |
| Deletar | `DELETE /v4/accounts/{account_id}/files/{file_id}` |
| Version Stack | `POST /v4/accounts/{account_id}/folders/{folder_id}/version_stacks` |

#### Comentarios
| Operacao | Endpoint |
|----------|----------|
| Listar | `GET /v4/accounts/{account_id}/files/{file_id}/comments` |
| Criar | `POST /v4/accounts/{account_id}/files/{file_id}/comments` |
| Detalhes | `GET /v4/accounts/{account_id}/comments/{comment_id}` |
| Atualizar | `PATCH /v4/accounts/{account_id}/comments/{comment_id}` |
| Deletar | `DELETE /v4/accounts/{account_id}/comments/{comment_id}` |

#### Share Links (antigo Review Links)
| Operacao | Endpoint |
|----------|----------|
| Listar | `GET /v4/accounts/{account_id}/projects/{project_id}/shares` |
| Criar | `POST /v4/accounts/{account_id}/projects/{project_id}/shares` |
| Add asset | `POST /v4/accounts/{account_id}/shares/{share_id}/assets` |
| Atualizar | `PATCH /v4/accounts/{account_id}/shares/{share_id}` |
| Deletar | `DELETE /v4/accounts/{account_id}/shares/{share_id}` |

### Mudancas V2 → V4 (referencia rapida)
- `teams` → `workspaces`
- `assets` → `files` + `folders` (separados)
- `review_links` → `shares`
- `PUT` → `PATCH` (updates)
- Todos os paths exigem `account_id`
- Auth via Adobe IMS (nao mais via Frame.io OAuth)

### Projetos no Frame.io (50 projetos mapeados)

| # | Nome | Project ID |
|---|------|-----------|
| 1 | BAIRRU | `05045f0d-a12a-4658-8c80-fe4a189ca3ac` |
| 2 | QUEIROZ SILVEIRA | `0752eda7-8867-4931-b7a1-d9ab6a0eed44` |
| 3 | GTIS | `0b11d953-6315-4edb-a4bf-cd7a9e604331` |
| 4 | GRUPO SINAL | `0ebb3afa-2035-4b43-b524-663957c49d68` |
| 5 | MELO BORGES | `17b19b71-5212-45ca-9849-41d5b696290f` |
| 6 | LIVING/CYRELA | `18406ae0-e9a4-41ab-bddb-c952e65e32db` |
| 7 | ENGECO | `18bf892f-5bcb-4e0e-9cec-4bf7eea5e4e2` |
| 8 | DINAMICA | `1bbac325-e2cb-48df-af10-e4841b37db9b` |
| 9 | PATRIMAR | `1fc4e60b-2a90-4972-a0ba-ae5245370c52` |
| 10 | MAIS VGV | `2135d1bf-810f-4a4b-81d1-c40c6b71bbbb` |
| 11 | GRUPO LIRIOS | `2178253a-4d8e-415a-985c-c961cb23f787` |
| 12 | ENGECOM | `309c363a-40df-4186-bfcc-0697e5dc0a5b` |
| 13 | CALEGARI | `324262db-71bc-4910-99fe-a9c0459e301b` |
| 14 | HCON | `34fce190-5055-454d-882d-56aff4dd4f59` |
| 15 | EBM | `35548a73-adfa-400c-9ee3-8a42267a110f` |
| 16 | SMART HOUSE | `358aeb62-1754-48df-86af-25e2d630232d` |
| 17 | CENA | `38243897-222e-4708-8bc8-311096fac0f2` |
| 18 | GAV | `3a1db933-c32c-4184-821e-38c81cc75abf` |
| 19 | CAMPO E MAR | `3bbdfc07-2e54-452a-9506-32611bddde94` |
| 20 | DRESDEN | `3db564d0-fa73-45b3-95f3-83021ee99334` |
| 21 | MRV | `42b19506-ca16-44ab-a40f-9b1bda30e93e` |
| 22 | KRAFT HEINZ | `45b427fb-641e-4e66-bb55-e83dd94b1ccf` |
| 23 | RECORD | `468656f7-c330-481d-beb3-8b3c891e6271` |
| 24 | RNI | `4815e83b-462f-4197-8669-f6d798723678` |
| 25 | GERRESHEIMER | `4ad32648-e48f-4403-a64b-9800250461e5` |
| 26 | ABL PRIME | `4c149055-7ac6-4f65-a263-86d3dd4eb6d2` |
| 27 | SKYLINE | `4d968a14-73ff-4c7b-bd8e-2dabf9bef16d` |
| 28 | AGX | `4e138807-cbcc-47eb-90d2-dab53c0fb347` |
| 29 | CMO | `4e6ba705-6b4a-4e2d-b200-9150d65d70c7` |
| 30 | FGR | `4f8b584b-4f78-4222-bda8-ca893021d805` |
| 31 | SYYN | `50b5eb65-4f6b-46ab-8156-c59695821cd8` |
| 32 | TERRAL | `53106fb1-42d1-4833-ae24-837ee5a88660` |
| 33 | SA CAVALCANTE | `5393bea6-6d16-4280-b68d-20ae08fef718` |
| 34 | TECTARIS | `590c2006-50db-459b-a007-f822c22a8578` |
| 35 | CINQ | `5bc765c1-9983-4d0d-86c5-5a58db98624f` |
| 36 | z00 - BANCO LOCUCAO | `5da27346-633f-4a14-b42a-9f8170275681` |
| 37 | REI | `623f4a8b-1f30-4812-ab17-19e3df578af0` |
| 38 | TRINUS | `66e6a162-e16b-410a-b1a6-c0e29e536c1e` |
| 39 | CITY | `6cfeab73-b15e-4d5e-90fa-16446f8de11c` |
| 40 | VM EMPREENDIMENTOS | `6e383b96-2708-4f94-99b6-e98b0edb6b98` |
| 41 | HABRAS | `6fb8d48f-b946-4ce2-9c00-e260fa9ff1fd` |
| 42 | HABITAT | `727d10fe-7bdc-4764-a401-383ad3454cb3` |
| 43 | ACCE | `7442f3fd-3f60-4763-b1a6-095e3562a0cc` |
| 44 | QUADRA ENG. | `74907251-514d-438d-adf2-b8ecda1e5c5b` |
| 45 | HUB | `75e44ce0-f911-4c35-b18a-89aa37412eb0` |
| 46 | URBS | `78c42ebf-0fa6-4d8c-8476-7163aece85ab` |
| 47 | MZN | `7a9a9078-56c4-4884-b023-4e67adecb239` |
| 48 | Tenda | `7c2dc590-82a2-482f-9580-57a0f135e5a0` |
| 49 | BRAINFARMA | `7de8a10e-99a3-471a-ae57-70a494369b28` |
| 50 | REAL | `804b817c-5c19-4fa9-aa38-5756b99cc3c0` |

### Estrutura de exemplo (TECTARIS)
```
TECTARIS (project: 590c2006-...)
  └── root_folder: 42ab3a17-bb05-46d8-920e-3383adbde9b6
      └── 📁 INSTITUCIONAL (869ee2c6-...)
          ├── 🎬 TECTARIS INSTITUCIONAL V3.mp4 (version_stack)
          ├── 📁 VERSAO CUIABA
          ├── 📁 HORIZONTAL
          └── 📁 VERTICAL
```

### Como renovar o token (refresh)
```bash
curl -s -X POST "https://ims-na1.adobelogin.com/ims/token/v3" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "client_id=a9e788f0de964b0d80664e75f86bf564" \
  --data-urlencode "client_secret=[ADOBE_CLIENT_SECRET]" \
  --data-urlencode "refresh_token=REFRESH_TOKEN_AQUI"
```
- Access token expira em **1 hora** (3600s)
- Refresh token expira em **14 dias**
- Para obter novo refresh token, refazer o OAuth flow completo

### Como fazer novo OAuth flow (quando refresh expirar)
1. Abrir no navegador:
```
https://ims-na1.adobelogin.com/ims/authorize/v2?client_id=a9e788f0de964b0d80664e75f86bf564&redirect_uri=https://localhost:9999/callback&scope=openid%20profile%20email%20offline_access%20additional_info.roles&response_type=code&state=framety1234
```
2. Logar com conta Adobe (rubens@skylineip.com.br)
3. Copiar o `code=` da URL de callback (vai dar erro SSL, mas o code esta la)
4. Trocar pelo token:
```bash
curl -s -X POST "https://ims-na1.adobelogin.com/ims/token/v3" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "client_id=a9e788f0de964b0d80664e75f86bf564" \
  --data-urlencode "client_secret=[ADOBE_CLIENT_SECRET]" \
  --data-urlencode "code=CODE_AQUI" \
  --data-urlencode "redirect_uri=https://localhost:9999/callback"
```

### Notas importantes
- **CUIDADO:** A conta tem 2.2TB de arquivos de clientes reais. Usar API somente para LEITURA ate que a integracao esteja testada
- **API V2 nao funciona** — nao perder tempo tentando. Usar somente V4
- **Vinculacao Adobe ID obrigatoria** — sem isso a V4 retorna 401 "Frame user is not linked to an Adobe ID"
- **Paginacao:** `page_size=50` (max). Usar `links.next` para proximas paginas
