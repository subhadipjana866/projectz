import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import 'dotenv/config';

// 1. Initialize the S3 client (equivalent to boto3.client)
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});


/**
 * Equivalent to your Python generate_s3_upload_url
 */
export const generateS3UploadUrl = async (objectName, fileType, expiration = 3600) => {
    try {
        // 2. Create the PutObject command
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: objectName,
            ContentType: fileType,
        });

        // 3. Generate the presigned URL (equivalent to generate_presigned_url)
        const url = await getSignedUrl(s3Client, command, { 
            expiresIn: expiration 
        });

        console.log("Generated URL:", url);
        return url;
    } catch (err) {
        console.error("AWS Error:", err);
        return null;
    }
};