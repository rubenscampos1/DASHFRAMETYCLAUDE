import { google } from "googleapis";
import fs from "fs";
import path from "path";

/**
 * Google Drive Upload Service
 *
 * Usa Service Account para upload direto no Google Drive.
 *
 * Variáveis de ambiente necessárias:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: email da service account
 * - GOOGLE_SERVICE_ACCOUNT_KEY: chave privada (PEM) da service account
 *
 * A service account precisa ter acesso ao Shared Drive "FRAMETY"
 */

const SHARED_DRIVE_ID = "0ACcXbXZoz_AJUk9PVA"; // Shared Drive "FRAMETY"
const CAPTACOES_FOLDER_ID = "1Od_u7Eru00NnUZs_GqVOJnIVB88Db994"; // Pasta "CAPTAÇÕES PORTAL"

let driveClient: ReturnType<typeof google.drive> | null = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    console.log("[Google Drive] ⚠️ Credenciais não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_KEY)");
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  driveClient = google.drive({ version: "v3", auth });
  console.log("[Google Drive] ✅ Client inicializado:", email);
  return driveClient;
}

/**
 * Cria uma pasta no Google Drive dentro de "CAPTAÇÕES PORTAL"
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
 * Faz upload de um arquivo para uma pasta no Google Drive
 */
export async function uploadToDrive(
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
      fields: "id, webViewLink, webContentLink",
    });

    const id = res.data.id!;
    const url = res.data.webViewLink || `https://drive.google.com/file/d/${id}/view`;
    console.log(`[Google Drive] Upload OK: ${fileName} (${id})`);
    return { id, url };
  } catch (error: any) {
    console.error("[Google Drive] Erro no upload:", error.message);
    return null;
  }
}

/**
 * Faz upload direto para a pasta CAPTAÇÕES PORTAL (se não tiver pasta específica)
 */
export async function uploadToCaptacoes(
  filePath: string,
  fileName: string,
  mimeType: string,
  projectFolderName?: string
): Promise<{ fileId: string; fileUrl: string; folderId?: string; folderUrl?: string } | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  let targetFolderId = CAPTACOES_FOLDER_ID;
  let folderResult: { id: string; url: string } | null = null;

  // Se tiver nome de pasta do projeto, criar/buscar a subpasta
  if (projectFolderName) {
    // Buscar pasta existente
    try {
      const search = await drive.files.list({
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: SHARED_DRIVE_ID,
        corpora: "drive",
        q: `name = '${projectFolderName.replace(/'/g, "\\'")}' and '${CAPTACOES_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, webViewLink)",
      });

      if (search.data.files && search.data.files.length > 0) {
        targetFolderId = search.data.files[0].id!;
        folderResult = {
          id: targetFolderId,
          url: search.data.files[0].webViewLink || `https://drive.google.com/drive/folders/${targetFolderId}`,
        };
      } else {
        // Criar pasta nova
        folderResult = await createDriveFolder(projectFolderName);
        if (folderResult) {
          targetFolderId = folderResult.id;
        }
      }
    } catch (err: any) {
      console.warn("[Google Drive] Erro ao buscar pasta, usando pasta raiz:", err.message);
    }
  }

  const fileResult = await uploadToDrive(filePath, fileName, mimeType, targetFolderId);
  if (!fileResult) return null;

  return {
    fileId: fileResult.id,
    fileUrl: fileResult.url,
    folderId: folderResult?.id,
    folderUrl: folderResult?.url,
  };
}

export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}
