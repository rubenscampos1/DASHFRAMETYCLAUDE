// Hybrid Object Storage: Replit (dev) + AWS S3 (production/Render)
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Check if running on Replit or production
const isReplitEnvironment = !!process.env.PRIVATE_OBJECT_DIR;
const isProductionEnvironment = process.env.NODE_ENV === "production" && !isReplitEnvironment;

// AWS S3 configuration for production (Render.com)
let s3Client: any = null;
if (isProductionEnvironment) {
  // Dynamically import AWS SDK only in production
  try {
    const AWS = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME) {
      const { S3Client, GetObjectCommand, PutObjectCommand } = AWS;
      s3Client = {
        client: new S3Client({
          region: process.env.AWS_REGION || "us-east-1",
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        }),
        getSignedUrl,
        GetObjectCommand,
        PutObjectCommand,
        bucketName: process.env.AWS_BUCKET_NAME,
      };
      console.log(`[ObjectStorage] Using AWS S3 (bucket: ${process.env.AWS_BUCKET_NAME})`);
    } else {
      console.warn("[ObjectStorage] AWS S3 credentials not configured. File upload/download will not work in production.");
    }
  } catch (error) {
    console.error("[ObjectStorage] Failed to initialize AWS S3:", error);
  }
}

// Google Cloud Storage client for Replit
export const objectStorageClient = isReplitEnvironment
  ? new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    })
  : null;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {
    if (isReplitEnvironment) {
      console.log("[ObjectStorage] Using Replit Object Storage (development)");
    } else if (!s3Client) {
      console.warn("[ObjectStorage] No storage backend configured!");
    }
  }

  getPrivateObjectDir(): string {
    if (isReplitEnvironment) {
      const dir = process.env.PRIVATE_OBJECT_DIR || "";
      if (!dir) {
        throw new Error(
          "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
            "tool and set PRIVATE_OBJECT_DIR env var."
        );
      }
      return dir;
    }
    // For production, use a virtual directory structure
    return "/private";
  }

  async downloadObject(file: File | any, res: Response, cacheTtlSec: number = 3600) {
    try {
      if (isReplitEnvironment && file instanceof File) {
        // Replit Object Storage
        const [metadata] = await file.getMetadata();
        const aclPolicy = await getObjectAclPolicy(file);
        const isPublic = aclPolicy?.visibility === "public";
        
        res.set({
          "Content-Type": metadata.contentType || "application/octet-stream",
          "Content-Length": metadata.size,
          "Content-Disposition": `attachment; filename="${metadata.name?.split('/').pop() || 'download'}"`,
          "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        });

        const stream = file.createReadStream();
        stream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        });
        stream.pipe(res);
      } else if (isProductionEnvironment && s3Client) {
        // AWS S3
        const { GetObjectCommand } = require("@aws-sdk/client-s3");
        const command = new GetObjectCommand({
          Bucket: s3Client.bucketName,
          Key: file.key,
        });
        
        const s3Response = await s3Client.client.send(command);
        
        res.set({
          "Content-Type": s3Response.ContentType || "application/octet-stream",
          "Content-Length": s3Response.ContentLength,
          "Content-Disposition": `attachment; filename="${file.key.split('/').pop() || 'download'}"`,
          "Cache-Control": `private, max-age=${cacheTtlSec}`,
        });

        s3Response.Body.pipe(res);
      } else {
        throw new Error("No storage backend available");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(contentType?: string): Promise<{ uploadURL: string; objectKey: string; headers?: Record<string, string> }> {
    const objectId = randomUUID();
    const mimeType = contentType || "application/octet-stream";
    
    if (isReplitEnvironment) {
      // Replit Object Storage
      const privateObjectDir = this.getPrivateObjectDir();
      if (!privateObjectDir) {
        throw new Error("PRIVATE_OBJECT_DIR not set.");
      }

      const fullPath = `${privateObjectDir}/uploads/${objectId}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);

      const uploadURL = await signObjectURL({
        bucketName,
        objectName,
        method: "PUT",
        ttlSec: 900,
      });
      
      // Return the object key as /objects/uploads/{objectId}
      const objectKey = `/uploads/${objectId}`;
      
      return { 
        uploadURL,
        objectKey,
        headers: {
          "Content-Type": mimeType,
        },
      };
    } else if (isProductionEnvironment && s3Client) {
      // AWS S3 - Include Content-Type to avoid signature mismatch
      const { PutObjectCommand } = s3Client;
      const key = `uploads/${objectId}`;
      
      const command = new PutObjectCommand({
        Bucket: s3Client.bucketName,
        Key: key,
        ContentType: mimeType, // CRITICAL: Must match the header sent by client
      });

      const signedUrl = await s3Client.getSignedUrl(s3Client.client, command, { expiresIn: 900 });
      
      // Return the object key as /uploads/{objectId}
      const objectKey = `/${key}`;
      
      return { 
        uploadURL: signedUrl,
        objectKey,
        headers: {
          "Content-Type": mimeType,
        },
      };
    } else {
      throw new Error("No storage backend configured. Set up Replit Object Storage or AWS S3.");
    }
  }

  async getObjectEntityFile(objectPath: string): Promise<File | any> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");

    if (isReplitEnvironment && objectStorageClient) {
      // Replit Object Storage
      let entityDir = this.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) {
        entityDir = `${entityDir}/`;
      }
      const objectEntityPath = `${entityDir}${entityId}`;
      const { bucketName, objectName } = parseObjectPath(objectEntityPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      const [exists] = await objectFile.exists();
      if (!exists) {
        throw new ObjectNotFoundError();
      }
      return objectFile;
    } else if (isProductionEnvironment && s3Client) {
      // AWS S3
      const { HeadObjectCommand } = require("@aws-sdk/client-s3");
      const key = entityId;
      
      try {
        const command = new HeadObjectCommand({
          Bucket: s3Client.bucketName,
          Key: key,
        });
        await s3Client.client.send(command);
        return { key }; // Return object with key for AWS S3
      } catch (error: any) {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
          throw new ObjectNotFoundError();
        }
        throw error;
      }
    } else {
      throw new Error("No storage backend available");
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (isReplitEnvironment) {
      // Replit: Google Cloud Storage URLs
      if (!rawPath.startsWith("https://storage.googleapis.com/")) {
        return rawPath;
      }
    
      const url = new URL(rawPath);
      const rawObjectPath = url.pathname;
    
      let objectEntityDir = this.getPrivateObjectDir();
      if (!objectEntityDir.endsWith("/")) {
        objectEntityDir = `${objectEntityDir}/`;
      }
    
      if (!rawObjectPath.startsWith(objectEntityDir)) {
        return rawObjectPath;
      }
    
      const entityId = rawObjectPath.slice(objectEntityDir.length);
      return `/objects/${entityId}`;
    } else if (isProductionEnvironment) {
      // AWS S3: URLs
      if (rawPath.startsWith("https://") && rawPath.includes(".amazonaws.com/")) {
        const url = new URL(rawPath);
        const pathParts = url.pathname.split("/");
        const key = pathParts.slice(1).join("/");
        return `/objects/${key}`;
      }
      return rawPath;
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    if (isReplitEnvironment) {
      const objectFile = await this.getObjectEntityFile(normalizedPath);
      await setObjectAclPolicy(objectFile, aclPolicy);
    }
    // AWS S3 ACL policies can be implemented if needed
    
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File | any;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (isReplitEnvironment && objectFile instanceof File) {
      return canAccessObject({
        userId,
        objectFile,
        requestedPermission: requestedPermission ?? ObjectPermission.READ,
      });
    } else if (isProductionEnvironment) {
      // For AWS S3, implement your own ACL logic or always return true for authenticated users
      return !!userId;
    }
    return false;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
