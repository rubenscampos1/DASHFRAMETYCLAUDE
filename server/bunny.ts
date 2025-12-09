const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME;

interface BunnyVideo {
  guid: string;
  videoLibraryId: number;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number;
  frameworkUrl: string;
  thumbnailUrl: string;
  availableResolutions: string;
  thumbnailFileName: string;
  averageWatchTime: number;
  totalWatchTime: number;
  category: string;
  chapters: any[];
  moments: any[];
  metaTags: any[];
  transcodingMessages: any[];
  width: number;
  height: number;
  storageSize: number;
}

interface CreateVideoResponse {
  success: boolean;
  message: string;
  statusCode: number;
  guid: string;
  videoId: string;
}

export class BunnyStreamService {
  private baseUrl = "https://video.bunnycdn.com";
  private headers = {
    "AccessKey": BUNNY_API_KEY!,
    "Content-Type": "application/json",
  };

  /**
   * Cria um novo vídeo no Bunny Stream
   */
  async createVideo(title: string, collectionId?: string): Promise<CreateVideoResponse> {
    const body: any = { title };
    if (collectionId) {
      body.collectionId = collectionId;
    }

    const response = await fetch(`${this.baseUrl}/library/${BUNNY_LIBRARY_ID}/videos`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao criar vídeo no Bunny: ${error}`);
    }

    return await response.json();
  }

  /**
   * Retorna a URL para upload direto do vídeo
   */
  getUploadUrl(videoId: string): string {
    return `${this.baseUrl}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`;
  }

  /**
   * Faz upload de um vídeo usando o buffer
   */
  async uploadVideo(videoId: string, videoBuffer: Buffer): Promise<void> {
    const response = await fetch(this.getUploadUrl(videoId), {
      method: "PUT",
      headers: {
        "AccessKey": BUNNY_API_KEY!,
        "Content-Type": "application/octet-stream",
      },
      body: videoBuffer,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao fazer upload do vídeo: ${error}`);
    }
  }

  /**
   * Obtém informações de um vídeo
   */
  async getVideo(videoId: string): Promise<BunnyVideo> {
    const response = await fetch(
      `${this.baseUrl}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "GET",
        headers: {
          "AccessKey": BUNNY_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao buscar vídeo: ${error}`);
    }

    return await response.json();
  }

  /**
   * Deleta um vídeo do Bunny Stream
   */
  async deleteVideo(videoId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "DELETE",
        headers: {
          "AccessKey": BUNNY_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao deletar vídeo: ${error}`);
    }
  }

  /**
   * Atualiza informações de um vídeo
   */
  async updateVideo(
    videoId: string,
    data: { title?: string; collectionId?: string }
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao atualizar vídeo: ${error}`);
    }
  }

  /**
   * Obtém a URL do vídeo para reprodução
   */
  getVideoUrl(guid: string): string {
    return `https://${BUNNY_CDN_HOSTNAME}/${guid}/playlist.m3u8`;
  }

  /**
   * Obtém a URL da thumbnail do vídeo
   */
  getThumbnailUrl(guid: string): string {
    return `https://${BUNNY_CDN_HOSTNAME}/${guid}/thumbnail.jpg`;
  }

  /**
   * Cria uma coleção (para organizar vídeos)
   */
  async createCollection(name: string): Promise<{ guid: string; videoLibraryId: number }> {
    const response = await fetch(
      `${this.baseUrl}/library/${BUNNY_LIBRARY_ID}/collections`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ name }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao criar coleção: ${error}`);
    }

    return await response.json();
  }

  /**
   * Lista todas as coleções
   */
  async getCollections(): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/library/${BUNNY_LIBRARY_ID}/collections`,
      {
        method: "GET",
        headers: {
          "AccessKey": BUNNY_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao listar coleções: ${error}`);
    }

    const data = await response.json();
    return data.items || [];
  }
}

export const bunnyStream = new BunnyStreamService();
