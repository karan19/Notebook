import { AppSyncResolverEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (event: AppSyncResolverEvent<any>) => {
    const { fieldName, arguments: args } = event;
    const { id } = args;

    if (fieldName === 'getUploadUrl') {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `notes/${id}.html`,
            ContentType: 'text/html',
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    if (fieldName === 'getDownloadUrl') {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `notes/${id}.html`,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    throw new Error(`Unknown field: ${fieldName}`);
};
