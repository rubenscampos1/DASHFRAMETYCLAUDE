/**
 * Micro HTTP Server - Speaker Announcer
 * Roda no NUC (Windows ou Ubuntu) e toca anuncios no speaker.
 *
 * Uso:
 *   node nuc-speaker-server.js
 *
 * Endpoint:
 *   POST http://localhost:3456/announce
 *   Body: { "text": "Texto para anunciar" }
 *
 * Porta padrao: 3456 (ou variavel PORT)
 */

const http = require("http");
const { exec } = require("child_process");
const os = require("os");

const PORT = process.env.PORT || 3456;
const OPENCLAW_URL = (process.env.OPENCLAW_URL || "http://localhost:18789").trim();
const OPENCLAW_TOKEN = (process.env.OPENCLAW_TOKEN || "57bf11589000632b2c0009387429a69db0ad17c08802dd1b").trim();

function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === "win32";

    let cmd;
    if (isWindows) {
      // PowerShell MediaPlayer (funciona com MP3 no Windows)
      const escaped = filePath.replace(/'/g, "''");
      cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName PresentationCore; $p = New-Object System.Windows.Media.MediaPlayer; $p.Open([uri]::new('${escaped}')); $p.Play(); Start-Sleep 15; $p.Close()"`;
    } else {
      // Linux: tenta mpv, ffplay, aplay em ordem
      cmd = `mpv --no-video "${filePath}" 2>/dev/null || ffplay -nodisp -autoexit "${filePath}" 2>/dev/null || aplay "${filePath}" 2>/dev/null`;
    }

    console.log(`[Player] Tocando: ${filePath}`);
    exec(cmd, { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`[Player] Erro: ${err.message}`);
        reject(err);
      } else {
        console.log("[Player] Playback concluido");
        resolve();
      }
    });
  });
}

async function generateTTS(text) {
  const res = await fetch(`${OPENCLAW_URL}/tools/invoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tool: "tts", action: "speak", args: { text } }),
  });

  const data = await res.json();
  const audioPath = data.result?.details?.audioPath || data.result?.audioPath;
  if (!audioPath) {
    throw new Error("TTS nao retornou audioPath");
  }
  return audioPath;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && req.url === "/announce") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { text } = JSON.parse(body);
        if (!text) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: "text required" }));
        }

        console.log(`[Announce] Recebido: ${text}`);

        // 1. Gerar audio via TTS
        const audioPath = await generateTTS(text);
        console.log(`[Announce] Audio gerado: ${audioPath}`);

        // 2. Tocar no speaker
        await playAudio(audioPath);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, audioPath }));
      } catch (err) {
        console.error(`[Announce] Erro: ${err.message}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use POST /announce" }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Speaker Server] Rodando em http://0.0.0.0:${PORT}`);
  console.log(`[Speaker Server] OS: ${os.platform()} (${os.release()})`);
  console.log(`[Speaker Server] OpenClaw: ${OPENCLAW_URL}`);
  console.log(`[Speaker Server] POST /announce { "text": "..." }`);
});
