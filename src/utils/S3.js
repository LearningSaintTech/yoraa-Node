const {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const mime = require("mime-types");
require("dotenv").config();

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to S3. If the file size is less than 5MB, upload directly.
 * If the file size is greater than or equal to 5MB, use Multipart Upload.
 * @param {Object} file - The file object from multer (contains buffer, originalname, mimetype).
 * @param {string} folder - The S3 folder name.
 * @param {string} entityId - The entity ID (Category, SubCategory, etc.).
 * @returns {Promise<string>} - The S3 file URL.
 */

const uploadMultipart = async (file, folder, newCategoryId) => {
  console.log(`Upload started for file: ${file.originalname}`);
  const startTime = Date.now();
  const fileName = `${folder}/${newCategoryId}/${Date.now()}_${file.originalname}`;
  const fileSize = file.buffer.length;
  const contentType = file.mimetype || mime.lookup(file.originalname) || "application/octet-stream"; // Detect MIME type

  // Step 1: If file size is less than 5MB, upload directly
  if (fileSize < 5 * 1024 * 1024) {
    console.log("File size is less than 5MB, uploading directly...");
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: contentType, // Set proper Content-Type
    });

    await s3.send(uploadCommand);
    const endTime = Date.now();
    console.log(`File uploaded directly in ${(endTime - startTime) / 1000} seconds.`);
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  }

  // Step 2: Multipart Upload for files ≥ 5MB
  console.log("File size is 5MB or more, using Multipart Upload...");
  const partSize = 5 * 1024 * 1024; // 5MB per part
  const totalParts = Math.ceil(fileSize / partSize);

  // Initiate Multipart Upload
  const createUpload = new CreateMultipartUploadCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    ContentType: contentType,
  });

  const uploadResponse = await s3.send(createUpload);
  const uploadId = uploadResponse.UploadId;
  console.log(`Multipart upload initiated with UploadId: ${uploadId}`);

  try {
    // Upload Parts in Parallel
    const uploadPromises = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, fileSize);
      const chunk = file.buffer.slice(start, end); // Read part of the file

      const uploadPartCommand = new UploadPartCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: chunk,
      });

      console.log(`Uploading part ${partNumber}...`);
      uploadPromises.push(
        s3.send(uploadPartCommand).then((partUploadResponse) => ({
          ETag: partUploadResponse.ETag,
          PartNumber: partNumber,
        }))
      );
    }

    // Wait for all parts to upload
    const uploadedParts = await Promise.all(uploadPromises);

    // Complete Multipart Upload
    const completeUpload = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      UploadId: uploadId,
      MultipartUpload: { Parts: uploadedParts },
    });

    await s3.send(completeUpload);
    const endTime = Date.now();
    console.log(`Multipart upload completed in ${(endTime - startTime) / 1000} seconds.`);
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Multipart Upload Error:", error);

    // Abort multipart upload if any part fails
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        UploadId: uploadId,
      })
    );
    throw new Error("Multipart upload failed.");
  }
};
const deleteFileFromS3 = async (fileUrl) => {
  try {
    const urlParts = new URL(fileUrl);
    const key = urlParts.pathname.substring(1); // Remove leading "/"

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    await s3.send(deleteCommand);
    console.log("File deleted from S3:", fileUrl);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
  }
};

module.exports = { uploadMultipart,deleteFileFromS3 };
