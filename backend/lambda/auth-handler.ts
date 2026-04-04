import { APIGatewayAuthorizerResult, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.API_KEY_TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const CLIENT_ID = process.env.CLIENT_ID!;

const jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: 'id',
    clientId: CLIENT_ID,
});

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    console.log('Authorizer Event:', JSON.stringify({
        path: event.path,
        method: event.httpMethod,
        headers: event.headers,
        resource: event.resource
    }, null, 2));

    const authHeader = event.headers?.['Authorization'] || event.headers?.['authorization'];
    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'] || event.headers?.['x-api-key'.toLowerCase()];

    try {
        // 1. Check for Cognito JWT (or API Key in Authorization header)
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '').trim();
            
            // Heuristic: Cognito JWTs are very long (>500 chars) and contain dots.
            // API Keys are shorter (64 chars) hex strings.
            if (token.includes('.') && token.length > 500) {
                const payload = await jwtVerifier.verify(token);
                console.log(`Validated Cognito token for user: ${payload.sub}`);
                return grantAccess(event, payload.sub as string);
            } else {
                // Treat as API Key in Authorization header
                const result = await docClient.send(new GetCommand({
                    TableName: TABLE_NAME,
                    Key: { apiKey: token },
                }));

                if (result.Item) {
                    const userId = result.Item.userId;
                    console.log(`Validated API key (via Auth header) for user: ${userId}`);
                    return grantAccess(event, userId);
                }
            }
        }

        // 2. Check for x-api-key (Fallback, though won't trigger APIG if Auth header is missing)
        if (apiKey) {
            const result = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { apiKey },
            }));

            if (result.Item) {
                const userId = result.Item.userId;
                console.log(`Validated API key (via x-api-key) for user: ${userId}`);
                return grantAccess(event, userId);
            }
        }

        console.log('No valid auth provided');
        throw new Error('Unauthorized');
    } catch (error) {
        console.error('Auth Error:', error);
        throw new Error('Unauthorized');
    }
};

const grantAccess = (event: APIGatewayRequestAuthorizerEvent, userId: string): APIGatewayAuthorizerResult => {
    const resourceParts = event.methodArn.split(':');
    const apiGatewayArnPart = resourceParts[5].split('/');
    const apiId = apiGatewayArnPart[0];
    const stage = apiGatewayArnPart[1];
    
    // Allow all methods and paths for this API/Stage
    const wildcardResource = `arn:aws:execute-api:${resourceParts[3]}:${resourceParts[4]}:${apiId}/${stage}/*/*`;

    return generatePolicy(userId, 'Allow', wildcardResource, userId);
};

const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string, userId: string): APIGatewayAuthorizerResult => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource, 
                },
            ],
        },
        context: {
            userId,
        },
    };
};

