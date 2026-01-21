import { AppSyncResolverEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (event: AppSyncResolverEvent<any>) => {
    const { arguments: args, info } = event;
    const { fieldName } = info;
    const { id } = args;

    if (fieldName === 'getUploadUrl') {
        const { pageId } = args;
        const key = pageId ? `notes/${id}/pages/${pageId}.html` : `notes/${id}.html`;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: 'text/html',
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    if (fieldName === 'getDownloadUrl') {
        const { pageId } = args;
        const key = pageId ? `notes/${id}/pages/${pageId}.html` : `notes/${id}.html`;
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    if (fieldName === 'getAssetUploadUrl') {
        const { filename, contentType } = args;
        const uuid = crypto.randomUUID();
        // Sanitize filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `assets/${uuid}-${safeFilename}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    throw new Error(`Unknown field: ${fieldName}`);
};
