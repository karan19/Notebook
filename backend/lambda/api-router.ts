import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    ScanCommand,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const { httpMethod, path, pathParameters, queryStringParameters } = event;
    const resource = event.resource; // e.g. /notebooks/{id}

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    };

    try {
        // --- NOTEBOOKS ROUTES ---

        // GET /notebooks
        if (httpMethod === 'GET' && resource === '/notebooks') {
            const result = await docClient.send(new ScanCommand({
                TableName: TABLE_NAME,
            }));
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Items),
            };
        }

        // POST /notebooks
        if (httpMethod === 'POST' && resource === '/notebooks') {
            const body = JSON.parse(event.body || '{}');
            const id = crypto.randomUUID();
            const now = Date.now();

            const item = {
                id,
                title: body.title || 'Untitled Document',
                snippet: '',
                isFavorite: false,
                tags: [],
                pages: [],
                createdAt: now,
                lastEditedAt: now,
            };

            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item,
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(item),
            };
        }

        // GET /notebooks/{id}
        if (httpMethod === 'GET' && resource === '/notebooks/{id}') {
            const id = pathParameters?.id;
            const result = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { id },
            }));

            if (!result.Item) {
                return { statusCode: 404, headers, body: JSON.stringify({ message: 'Not found' }) };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Item),
            };
        }

        // PATCH /notebooks/{id}
        if (httpMethod === 'PATCH' && resource === '/notebooks/{id}') {
            const id = pathParameters?.id;
            const body = JSON.parse(event.body || '{}');
            const now = Date.now();

            let updateExpression = 'SET lastEditedAt = :now';
            const expressionAttributeValues: any = { ':now': now };

            if (body.title !== undefined) {
                updateExpression += ', title = :title';
                expressionAttributeValues[':title'] = body.title;
            }
            if (body.snippet !== undefined) {
                updateExpression += ', snippet = :snippet';
                expressionAttributeValues[':snippet'] = body.snippet;
            }
            if (body.isFavorite !== undefined) {
                updateExpression += ', isFavorite = :isFavorite';
                expressionAttributeValues[':isFavorite'] = body.isFavorite;
            }
            if (body.tags !== undefined) {
                updateExpression += ', tags = :tags';
                expressionAttributeValues[':tags'] = body.tags;
            }
            if (body.pages !== undefined) {
                updateExpression += ', pages = :pages';
                expressionAttributeValues[':pages'] = body.pages;
            }

            const result = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id },
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Attributes),
            };
        }

        // DELETE /notebooks/{id}
        if (httpMethod === 'DELETE' && resource === '/notebooks/{id}') {
            const id = pathParameters?.id;
            await docClient.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { id },
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true }),
            };
        }

        // --- S3 URL ROUTES ---

        // GET /notebooks/urls/upload?id=...&pageId=...
        if (httpMethod === 'GET' && resource === '/notebooks/urls/upload') {
            const id = queryStringParameters?.id;
            const pageId = queryStringParameters?.pageId;
            if (!id || !pageId) throw new Error('Notebook ID and Page ID are required');

            const key = `notes/${id}/pages/${pageId}.html`;
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: 'text/html',
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return { statusCode: 200, headers, body: JSON.stringify({ url }) };
        }

        // GET /notebooks/urls/download?id=...&pageId=...
        if (httpMethod === 'GET' && resource === '/notebooks/urls/download') {
            const id = queryStringParameters?.id;
            const pageId = queryStringParameters?.pageId;
            if (!id || !pageId) throw new Error('Notebook ID and Page ID are required');

            const key = `notes/${id}/pages/${pageId}.html`;
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return { statusCode: 200, headers, body: JSON.stringify({ url }) };
        }

        // GET /assets/upload?filename=...&contentType=...
        if (httpMethod === 'GET' && resource === '/assets/upload') {
            const filename = queryStringParameters?.filename;
            const contentType = queryStringParameters?.contentType;
            if (!filename || !contentType) throw new Error('Filename and ContentType are required');

            const uuid = crypto.randomUUID();
            const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `assets/${uuid}-${safeFilename}`;

            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: contentType,
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return { statusCode: 200, headers, body: JSON.stringify({ url }) };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Route not found' }),
        };

    } catch (error: any) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
