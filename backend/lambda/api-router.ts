import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    ScanCommand,
    QueryCommand,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.TABLE_NAME!;
const API_KEY_TABLE_NAME = process.env.API_KEY_TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const { httpMethod, path, pathParameters, queryStringParameters } = event;
    const resource = event.resource; // e.g. /notebooks/{id}

    // Auth extraction
    const authorizerContext = event.requestContext?.authorizer;
    // userId can come from custom authorizer context OR Cognito claims (if used directly)
    const userId = authorizerContext?.userId || authorizerContext?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Unauthorized: No user identity found' }),
        };
    }

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
            const result = await docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'byUser',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
                ScanIndexForward: false, // Sort by lastEditedAt desc
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
            const firstPageId = crypto.randomUUID();

            const item = {
                id,
                userId, // OWNERSHIP
                title: body.title || 'Untitled Document',
                snippet: '',
                isFavorite: false,
                pages: [{ id: firstPageId, order: 0, title: 'Page 1' }],
                tags: [],
                version: 1, // INITIAL VERSION
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

            // Security Check
            if (result.Item.userId !== userId) {
                return { statusCode: 403, headers, body: JSON.stringify({ message: 'Forbidden' }) };
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
            const currentVersion = body.version; // CLIENT SENT VERSION
            const now = Date.now();

            let updateExpression = 'set lastEditedAt = :now, version = if_not_exists(version, :start) + :inc';
            const expressionAttributeValues: any = {
                ':now': now,
                ':start': 0,
                ':inc': 1,
                ':userId': userId, // For Condition
            };

            let conditionExpression = 'userId = :userId';
            if (currentVersion !== undefined) {
                conditionExpression += ' AND (attribute_not_exists(version) OR version = :currentVersion)';
                expressionAttributeValues[':currentVersion'] = currentVersion;
            }

            if (body.title) {
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

            try {
                const result = await docClient.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { id },
                    UpdateExpression: updateExpression,
                    ConditionExpression: conditionExpression,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW',
                }));

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result.Attributes),
                };
            } catch (err: any) {
                if (err.name === 'ConditionalCheckFailedException') {
                    return { 
                        statusCode: 409, // CONFLICT
                        headers, 
                        body: JSON.stringify({ message: 'Conflict or Forbidden', code: 'VERSION_MISMATCH' }) 
                    };
                }
                throw err;
            }
        }

        // DELETE /notebooks/{id}
        if (httpMethod === 'DELETE' && resource === '/notebooks/{id}') {
            const id = pathParameters?.id;
            try {
                // 1. Get the notebook to find all pages for S3 cleanup
                const getResult = await docClient.send(new GetCommand({
                    TableName: TABLE_NAME,
                    Key: { id },
                }));

                if (getResult.Item && getResult.Item.userId === userId) {
                    const pages = getResult.Item.pages || [];
                    
                    // 2. Delete all page files from S3
                    for (const page of pages) {
                        const s3Key = `notes/${userId}/${id}/${page.id}.md`;
                        try {
                            await s3Client.send(new DeleteObjectCommand({
                                Bucket: BUCKET_NAME,
                                Key: s3Key,
                            }));
                        } catch (s3Err) {
                            // Silent fail if file doesn't exist
                        }
                    }
                }

                // 3. Delete the DynamoDB record
                await docClient.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { id },
                    ConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': userId,
                    },
                }));
                return { statusCode: 204, headers, body: '' };
            } catch (err: any) {
                if (err.name === 'ConditionalCheckFailedException') {
                    return { statusCode: 403, headers, body: JSON.stringify({ message: 'Forbidden or Not Found' }) };
                }
                throw err;
            }
        }
        // DELETE /notebooks/{id}/pages/{pageId}
        if (httpMethod === 'DELETE' && resource === '/notebooks/{id}/pages/{pageId}') {
            const id = pathParameters?.id;
            const pageId = pathParameters?.pageId;
            if (!id || !pageId) throw new Error('Notebook ID and Page ID are required');

            // 1. Get the notebook to verify ownership and find the page
            const getResult = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { id },
            }));

            if (!getResult.Item) {
                return { statusCode: 404, headers, body: JSON.stringify({ message: 'Notebook not found' }) };
            }
            if (getResult.Item.userId !== userId) {
                return { statusCode: 403, headers, body: JSON.stringify({ message: 'Forbidden' }) };
            }

            // 2. Delete the file from S3
            const s3Key = `notes/${userId}/${id}/${pageId}.md`;
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: s3Key,
                }));
            } catch (s3Err) {
                // Ignore non-existent files
            }

            // 3. Remove the page from the DynamoDB list
            const currentPages = getResult.Item.pages || [];
            const updatedPages = currentPages.filter((p: any) => p.id !== pageId);

            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id },
                UpdateExpression: 'SET pages = :pages, lastEditedAt = :now, version = if_not_exists(version, :start) + :inc',
                ExpressionAttributeValues: {
                    ':pages': updatedPages,
                    ':now': Date.now(),
                    ':start': 0,
                    ':inc': 1,
                },
            }));

            return { statusCode: 204, headers, body: '' };
        }


        // --- S3 URL ROUTES ---

        // GET /notebooks/urls/upload?id=...&pageId=...
        if (httpMethod === 'GET' && resource === '/notebooks/urls/upload') {
            const id = queryStringParameters?.id;
            const pageId = queryStringParameters?.pageId;
            if (!id || !pageId) throw new Error('Notebook ID and Page ID are required');

            // Enforce user namespace in Key
            const key = `notes/${userId}/${id}/${pageId}.md`;
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: 'text/markdown',
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

            return { statusCode: 200, headers, body: JSON.stringify({ url }) };
        }

        // GET /notebooks/urls/download?id=...&pageId=...
        if (httpMethod === 'GET' && resource === '/notebooks/urls/download') {
            const id = queryStringParameters?.id;
            const pageId = queryStringParameters?.pageId;
            if (!id || !pageId) throw new Error('Notebook ID and Page ID are required');

            // Enforce user namespace in Key
            const key = `notes/${userId}/${id}/${pageId}.md`;
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
            return { statusCode: 200, headers, body: JSON.stringify({ url }) };
        }

        // GET /assets/upload?filename=...&contentType=...
        if (httpMethod === 'GET' && resource === '/assets/upload') {
            const filename = queryStringParameters?.filename;
            const contentType = queryStringParameters?.contentType;
            if (!filename || !contentType) throw new Error('Filename and ContentType are required');

            const uuid = crypto.randomUUID();
            const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

            // Namespace assets too
            const key = `assets/${userId}/${uuid}-${safeFilename}`;

            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: contentType,
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return { statusCode: 200, headers, body: JSON.stringify({ url, key }) };
        }

        // GET /assets/urls/download?key=...
        if (httpMethod === 'GET' && resource === '/assets/urls/download') {
            const key = queryStringParameters?.key;
            if (!key) throw new Error('Key is required');

            // Security: Ensure key starts with assets/{userId}/
            if (!key.startsWith(`assets/${userId}/`)) {
                return { statusCode: 403, headers, body: JSON.stringify({ message: 'Forbidden' }) };
            }

            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return { statusCode: 200, headers, body: JSON.stringify({ url }) };
        }

        // --- API KEY ROUTES ---

        // GET /api-keys
        if (httpMethod === 'GET' && resource === '/api-keys') {
            const result = await docClient.send(new QueryCommand({
                TableName: API_KEY_TABLE_NAME,
                IndexName: 'byUser',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
            }));
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Items),
            };
        }

        // POST /api-keys
        if (httpMethod === 'POST' && resource === '/api-keys') {
            const apiKey = crypto.randomBytes(32).toString('hex');
            const now = Date.now();

            const item = {
                apiKey,
                userId,
                createdAt: now,
            };

            await docClient.send(new PutCommand({
                TableName: API_KEY_TABLE_NAME,
                Item: item,
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(item),
            };
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
