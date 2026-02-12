import { google } from "googleapis";
import fs from "fs";

/**
 * Google Drive Service — Upload direto do browser
 *
 * Fluxo:
 * 1. Server cria sessão de upload resumable no Drive (leve, só metadados)
 * 2. Server retorna URL de upload para o browser
 * 3. Browser envia o arquivo DIRETO pro Google Drive (sem passar pelo server)
 * 4. Browser confirma o upload pro server (salva no banco)
 *
 * Variáveis de ambiente:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_SERVICE_ACCOUNT_KEY (chave privada PEM)
 */

const SHARED_DRIVE_ID = "0ACcXbXZoz_AJUk9PVA";
const CAPTACOES_FOLDER_ID = "1Od_u7Eru00NnUZs_GqVOJnIVB88Db994";

let authClient: InstanceType<typeof google.auth.JWT> | null = null;
let driveClient: ReturnType<typeof google.drive> | null = null;

function getAuth() {
  if (authClient) return authClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "";
  // Limpar aspas que possam ter sido adicionadas no Render
  key = key.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");

  if (!email || !key) {
    console.log("[Google Drive] Credenciais não configuradas");
    return null;
  }

  authClient = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  console.log("[Google Drive] Auth inicializado:", email);
  return authClient;
}

function getDriveClient() {
  if (driveClient) return driveClient;
  const auth = getAuth();
  if (!auth) return null;
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

/**
 * Cria pasta no Drive dentro de CAPTAÇÕES PORTAL
 */
export async function createDriveFolder(folderName: string): Promise<{ id: string; url: string } | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const res = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [CAPTACOES_FOLDER_ID],
      },
      fields: "id, webViewLink",
    });

    const id = res.data.id!;
    const url = res.data.webViewLink || `https://drive.google.com/drive/folders/${id}`;
    console.log(`[Google Drive] Pasta criada: ${folderName} (${id})`);
    return { id, url };
  } catch (error: any) {
    console.error("[Google Drive] Erro ao criar pasta:", error.message);
    return null;
  }
}

/**
 * Busca ou cria a subpasta do projeto dentro de CAPTAÇÕES PORTAL
 */
export async function getOrCreateProjectFolder(
  projectFolderName: string
): Promise<{ id: string; url: string } | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    // Buscar pasta existente
    const search = await drive.files.list({
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: SHARED_DRIVE_ID,
      corpora: "drive",
      q: `name = '${projectFolderName.replace(/'/g, "\\'")}' and '${CAPTACOES_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, webViewLink)",
    });

    if (search.data.files && search.data.files.length > 0) {
      const f = search.data.files[0];
      return {
        id: f.id!,
        url: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      };
    }

    // Criar pasta nova
    return await createDriveFolder(projectFolderName);
  } catch (err: any) {
    console.error("[Google Drive] Erro ao buscar/criar pasta:", err.message);
    return null;
  }
}

/**
 * Cria uma sessão de upload resumable no Google Drive.
 * Retorna a URL que o browser pode usar para enviar o arquivo diretamente.
 */
export async function createResumableUpload(
  fileName: string,
  mimeType: string,
  fileSize: number,
  folderId: string,
  origin: string
): Promise<string | null> {
  const auth = getAuth();
  if (!auth) return null;

  try {
    const token = await auth.getAccessToken();
    if (!token.token) throw new Error("Falha ao obter access token");

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token.token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(fileSize),
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const uploadUrl = response.headers.get("Location");
    if (!uploadUrl) throw new Error("Google não retornou URL de upload");

    console.log(`[Google Drive] Sessão resumable criada: ${fileName} → ${folderId}`);
    return uploadUrl;
  } catch (error: any) {
    console.error("[Google Drive] Erro ao criar sessão resumable:", error.message);
    return null;
  }
}

/**
 * Upload de arquivo do server (fallback para arquivos pequenos ou quando browser direto não funciona)
 */
export async function uploadFromServer(
  filePath: string,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ id: string; url: string } | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const fileStream = fs.createReadStream(filePath);
    const res = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: fileStream,
      },
      fields: "id, webViewLink",
    });

    const id = res.data.id!;
    const url = res.data.webViewLink || `https://drive.google.com/file/d/${id}/view`;
    console.log(`[Google Drive] Upload server OK: ${fileName} (${id})`);
    return { id, url };
  } catch (error: any) {
    console.error("[Google Drive] Erro upload server:", error.message);
    return null;
  }
}

export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}
