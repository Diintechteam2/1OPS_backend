const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '1ops';

// Validate credentials
const isR2Configured = () => {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ENDPOINT
  );
};

// Initialize S3Client for R2
let s3Client = null;
if (isR2Configured()) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.warn('Cloudflare R2 storage credentials are not fully configured in backend .env');
}

/**
 * Upload buffer content to Cloudflare R2
 * @param {Buffer} fileBuffer - File raw content buffer
 * @param {string} fileKey - Key (path) under which file is stored in bucket
 * @param {string} mimeType - File mime content type
 */
const uploadToR2 = async (fileBuffer, fileKey, mimeType) => {
  if (!s3Client) {
    throw new Error('R2 Client is not configured. Check env credentials.');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  return fileKey;
};

/**
 * Generate a secure, temporary, download URL for a file stored in R2
 * @param {string} fileKey - Key of the object in R2
 * @param {string} originalName - Name with which file will download
 * @param {number} expirySeconds - Time in seconds until URL expires
 */
const getPresignedUrlFromR2 = async (fileKey, originalName, expirySeconds = 300) => {
  if (!s3Client) {
    throw new Error('R2 Client is not configured. Check env credentials.');
  }

  // Use ResponseContentDisposition to force file download with original filename
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
};

/**
 * Delete a file object from Cloudflare R2
 * @param {string} fileKey - Key of the object to delete
 */
const deleteFromR2 = async (fileKey) => {
  if (!s3Client) {
    throw new Error('R2 Client is not configured. Check env credentials.');
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
};

module.exports = {
  isR2Configured,
  uploadToR2,
  getPresignedUrlFromR2,
  deleteFromR2,
};
