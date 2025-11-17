// Reference: blueprint:javascript_object_storage
import { useState } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onUploadComplete?: (result: UploadResult) => void;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onUploadComplete,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          // Get presigned upload URL from our backend with Content-Type
          const contentType = file.type || "application/octet-stream";
          const response = await fetch("/api/objects/upload", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ contentType }),
          });
          const { uploadURL, objectKey, headers } = await response.json();
          
          // Store objectKey in file meta for later use
          file.meta.objectKey = objectKey;
          
          return {
            method: "PUT" as const,
            url: uploadURL,
            headers: headers || {
              "Content-Type": contentType,
            },
          };
        },
      })
      .on("complete", (result) => {
        if (result.successful.length > 0) {
          // Use objectKey from file meta (set during getUploadParameters)
          const uploadedFile = result.successful[0];
          const objectKey = uploadedFile.meta?.objectKey || "";
          
          // Add objectKey to response
          uploadedFile.response = {
            ...uploadedFile.response,
            objectKey: objectKey,
          };
          
          onUploadComplete?.(result);
          setShowModal(false);
        }
      })
  );

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        variant="outline"
        type="button"
        className="w-full"
        data-testid="button-upload-file"
      >
        <Upload className="h-4 w-4 mr-2" />
        Selecionar Arquivo
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
