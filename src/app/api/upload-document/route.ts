import { uploadDocument } from '@/lib/aws-services/s3-service';
import { validateFile } from '@/lib/aws-services/aws-utils';
import {
  KYCAPIHandlers,
  createMethodNotAllowedHandler
} from '@/lib/aws-services/api-handler-utils';

interface DocumentUploadData {
  userId: string;
  documentType: string;
}

// Document upload operation
async function performDocumentUpload(formData: FormData, parsedData: DocumentUploadData) {
  const file = formData.get('file') as File;
  const { userId, documentType } = parsedData;

  // Validate file
  validateFile(file);

  // Upload to S3
  const uploadResult = await uploadDocument({
    userId,
    documentType: documentType as 'id-front' | 'id-back' | 'selfie' | 'id-upload',
    file,
    contentType: file.type,
    metadata: {
      originalName: file.name,
      uploadedBy: 'kyc-process'
    }
  });

  return uploadResult;
}

// Use the generic FormData handler
export const POST = KYCAPIHandlers.createDocumentUploadHandler(performDocumentUpload);

// Use the generic GET handler
export const GET = createMethodNotAllowedHandler();
