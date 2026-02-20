import { db } from "./db";
import { frameioTokens } from "../shared/schema";
import { eq } from "drizzle-orm";

// Adobe IMS credentials
const ADOBE_CLIENT_ID = process.env.FRAMEIO_ADOBE_CLIENT_ID || "a9e788f0de964b0d80664e75f86bf564";
const ADOBE_CLIENT_SECRET = process.env.FRAMEIO_ADOBE_CLIENT_SECRET || "";
const ADOBE_TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3";
const ADOBE_AUTH_URL = "https://ims-na1.adobelogin.com/ims/authorize/v2";
const REDIRECT_URI = process.env.FRAMEIO_REDIRECT_URI || "https://localhost:9999/callback";

// Frame.io V4 constants
const FRAMEIO_API_HOST = "https://api.frame.io";
const FRAMEIO_BASE_URL = `${FRAMEIO_API_HOST}/v4`;
const ACCOUNT_ID = "83a481fd-f32a-44d3-936e-cab304799cba";
const WORKSPACE_ID = "7da91fef-c417-4bb9-b92b-3076ac0c2e2e";
const TOKEN_ROW_ID = "default"; // Single-row token storage

// Frame.io V4 response types
export interface FrameIoProject {
  id: string;
  name: string;
  root_folder_id: string;
  inserted_at: string;
  updated_at: string;
  storage?: number;
  file_count?: number;
  folder_count?: number;
  [key: string]: any;
}

export interface FrameIoFolder {
  id: string;
  name: string;
  type: "folder";
  item_count?: number;
  inserted_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface FrameIoFile {
  id: string;
  name: string;
  type: "file";
  file_size: number;
  media_type: string;
  status: string; // "uploading" | "transcoding" | "transcoded" | "error"
  view_url: string;
  parent_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  upload_url?: string; // Present when creating file for upload
  [key: string]: any;
}

export interface FrameIoComment {
  id: string;
  text: string;
  timestamp: number | null; // In seconds
  owner: {
    id: string;
    name: string;
    email: string;
  };
  inserted_at: string;
  updated_at: string;
  completed: boolean;
  completed_at: string | null;
  [key: string]: any;
}

export interface FrameIoShare {
  id: string;
  short_url: string;
  is_active: boolean;
  expires_at: string | null;
  inserted_at: string;
  [key: string]: any;
}

interface PaginatedResponse<T> {
  data: T[];
  links?: {
    next?: string;
  };
  total_count?: number;
}

class FrameIoService {
  private accountId = ACCOUNT_ID;
  private workspaceId = WORKSPACE_ID;

  // ==================== TOKEN MANAGEMENT ====================

  /**
   * Get a valid access token, auto-refreshing if expired
   */
  async getValidAccessToken(): Promise<string> {
    const [tokenRow] = await db
      .select()
      .from(frameioTokens)
      .where(eq(frameioTokens.id, TOKEN_ROW_ID));

    if (!tokenRow) {
      throw new Error("Frame.io não está autenticado. Faça o OAuth flow primeiro via /api/admin/frameio/auth-callback");
    }

    if (tokenRow.requiresReauth) {
      throw new Error("Frame.io requer re-autenticação. O refresh token expirou.");
    }

    // Check if access token is still valid (with 5 min buffer)
    const now = new Date();
    const expiresAt = new Date(tokenRow.accessTokenExpiresAt);
    const bufferMs = 5 * 60 * 1000;

    if (now.getTime() < expiresAt.getTime() - bufferMs) {
      return tokenRow.accessToken;
    }

    // Check if refresh token is still valid
    const refreshExpiresAt = new Date(tokenRow.refreshTokenExpiresAt);
    if (now.getTime() >= refreshExpiresAt.getTime()) {
      // Mark as requiring reauth
      await db
        .update(frameioTokens)
        .set({ requiresReauth: true, updatedAt: now })
        .where(eq(frameioTokens.id, TOKEN_ROW_ID));
      throw new Error("Frame.io refresh token expirado. Refaça o OAuth flow.");
    }

    // Refresh the access token
    return await this.refreshAccessToken(tokenRow.refreshToken);
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ADOBE_CLIENT_ID,
      client_secret: ADOBE_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const response = await fetch(ADOBE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erro ao renovar token Adobe IMS:", error);

      // Mark as requiring reauth
      await db
        .update(frameioTokens)
        .set({ requiresReauth: true, updatedAt: new Date() })
        .where(eq(frameioTokens.id, TOKEN_ROW_ID));

      throw new Error(`Falha ao renovar token Frame.io: ${error}`);
    }

    const data = await response.json();
    const now = new Date();

    await db
      .update(frameioTokens)
      .set({
        accessToken: data.access_token,
        accessTokenExpiresAt: new Date(now.getTime() + data.expires_in * 1000),
        // Adobe may return a new refresh token
        ...(data.refresh_token
          ? {
              refreshToken: data.refresh_token,
              refreshTokenExpiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
            }
          : {}),
        requiresReauth: false,
        updatedAt: now,
      })
      .where(eq(frameioTokens.id, TOKEN_ROW_ID));

    return data.access_token;
  }

  /**
   * Exchange authorization code for tokens (OAuth callback)
   */
  async exchangeCodeForTokens(code: string): Promise<void> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ADOBE_CLIENT_ID,
      client_secret: ADOBE_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    const response = await fetch(ADOBE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Falha ao trocar code por tokens: ${error}`);
    }

    const data = await response.json();
    const now = new Date();

    const tokenData = {
      id: TOKEN_ROW_ID,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(now.getTime() + data.expires_in * 1000),
      refreshTokenExpiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
      requiresReauth: false,
      updatedAt: now,
    };

    // Upsert
    const existing = await db
      .select()
      .from(frameioTokens)
      .where(eq(frameioTokens.id, TOKEN_ROW_ID));

    if (existing.length > 0) {
      await db
        .update(frameioTokens)
        .set(tokenData)
        .where(eq(frameioTokens.id, TOKEN_ROW_ID));
    } else {
      await db.insert(frameioTokens).values(tokenData);
    }
  }

  /**
   * Get the OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: ADOBE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email offline_access additional_info.roles",
      response_type: "code",
      state: state || "framety1234",
    });
    return `${ADOBE_AUTH_URL}?${params.toString()}`;
  }

  // ==================== PRIVATE HELPERS ====================

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getValidAccessToken();
    const url = path.startsWith("http") ? path : `${FRAMEIO_BASE_URL}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Frame.io API error (${response.status}): ${error}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  }

  private async requestPaginated<T>(path: string, maxPages = 10): Promise<T[]> {
    const allItems: T[] = [];
    let url: string | undefined = path.startsWith("http") ? path : `${FRAMEIO_BASE_URL}${path}`;
    let page = 0;

    while (url && page < maxPages) {
      const result: PaginatedResponse<T> = await this.request<PaginatedResponse<T>>(url);
      if (result.data) {
        allItems.push(...result.data);
      }
      // links.next returns paths like "/v4/accounts/..." — prepend API host
      const next = result.links?.next;
      url = next ? (next.startsWith("http") ? next : `${FRAMEIO_API_HOST}${next}`) : undefined;
      page++;
    }

    return allItems;
  }

  // ==================== PROJECTS ====================

  async listProjects(): Promise<FrameIoProject[]> {
    return this.requestPaginated<FrameIoProject>(
      `/accounts/${this.accountId}/workspaces/${this.workspaceId}/projects?page_size=50`
    );
  }

  async getProject(projectId: string): Promise<FrameIoProject> {
    const resp = await this.request<{ data: FrameIoProject }>(
      `/accounts/${this.accountId}/projects/${projectId}`
    );
    return resp.data;
  }

  // ==================== FOLDERS ====================

  async listFolderChildren(folderId: string): Promise<(FrameIoFile | FrameIoFolder)[]> {
    return this.requestPaginated<FrameIoFile | FrameIoFolder>(
      `/accounts/${this.accountId}/folders/${folderId}/children?page_size=50`
    );
  }

  async getFolder(folderId: string): Promise<FrameIoFolder> {
    const resp = await this.request<{ data: FrameIoFolder }>(
      `/accounts/${this.accountId}/folders/${folderId}`
    );
    return resp.data;
  }

  async createFolder(parentFolderId: string, name: string): Promise<FrameIoFolder> {
    const resp = await this.request<{ data: FrameIoFolder }>(
      `/accounts/${this.accountId}/folders/${parentFolderId}/folders`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    );
    return resp.data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    return this.request<void>(
      `/accounts/${this.accountId}/folders/${folderId}`,
      { method: "DELETE" }
    );
  }

  // ==================== FILES ====================

  async getFile(fileId: string): Promise<FrameIoFile> {
    const resp = await this.request<{ data: FrameIoFile }>(
      `/accounts/${this.accountId}/files/${fileId}`
    );
    return resp.data;
  }

  /**
   * Create a file placeholder in Frame.io for upload
   * Returns the file with an upload_url for the client to PUT the binary data
   */
  async createFileForUpload(folderId: string, name: string, fileSize: number, mediaType: string): Promise<FrameIoFile> {
    const resp = await this.request<{ data: FrameIoFile }>(
      `/accounts/${this.accountId}/folders/${folderId}/files`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          filesize: fileSize,
          filetype: mediaType,
        }),
      }
    );
    return resp.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.request<void>(
      `/accounts/${this.accountId}/files/${fileId}`,
      { method: "DELETE" }
    );
  }

  // ==================== COMMENTS ====================

  async listComments(fileId: string): Promise<FrameIoComment[]> {
    return this.requestPaginated<FrameIoComment>(
      `/accounts/${this.accountId}/files/${fileId}/comments?page_size=50`
    );
  }

  async createComment(fileId: string, text: string, timestamp?: number): Promise<FrameIoComment> {
    const body: any = { text };
    if (timestamp !== undefined && timestamp !== null) {
      body.timestamp = timestamp;
    }
    const resp = await this.request<{ data: FrameIoComment }>(
      `/accounts/${this.accountId}/files/${fileId}/comments`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    return resp.data;
  }

  // ==================== SHARES (Review Links) ====================

  async listShares(projectId: string): Promise<FrameIoShare[]> {
    return this.requestPaginated<FrameIoShare>(
      `/accounts/${this.accountId}/projects/${projectId}/shares?page_size=50`
    );
  }

  // NOTA: createShare não funciona na API V4 do Frame.io (nenhum formato de body aceito).
  // Usar shares existentes via listShares() + vincular ao projeto via link-share endpoint.

  async deleteShare(shareId: string): Promise<void> {
    return this.request<void>(
      `/accounts/${this.accountId}/shares/${shareId}`,
      { method: "DELETE" }
    );
  }

  // ==================== STATUS CHECK ====================

  async getStatus(): Promise<{ authenticated: boolean; requiresReauth: boolean; expiresAt?: Date; error?: string }> {
    try {
      const [tokenRow] = await db
        .select()
        .from(frameioTokens)
        .where(eq(frameioTokens.id, TOKEN_ROW_ID));

      if (!tokenRow) {
        return { authenticated: false, requiresReauth: true, error: "Nenhum token encontrado" };
      }

      if (tokenRow.requiresReauth) {
        return { authenticated: false, requiresReauth: true, error: "Requer re-autenticação" };
      }

      // Try a lightweight API call to verify
      await this.getValidAccessToken();
      return {
        authenticated: true,
        requiresReauth: false,
        expiresAt: tokenRow.refreshTokenExpiresAt,
      };
    } catch (err: any) {
      return { authenticated: false, requiresReauth: true, error: err.message };
    }
  }
}

export const frameio = new FrameIoService();
