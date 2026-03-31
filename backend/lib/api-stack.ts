import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';

interface NotebookApiStackProps extends cdk.StackProps {
  notebookTable: dynamodb.Table;
  apiKeyTable: dynamodb.Table;
  contentBucket: s3.Bucket;
  userPoolId: string;
  userPoolClientId?: string;
}

export class NotebookApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NotebookApiStackProps) {
    super(scope, id, props);

    // Import existing User Pool
    const userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', props.userPoolId);

    // Auth Handler Lambda
    const authHandler = new lambda.NodejsFunction(this, 'AuthHandler', {
      entry: path.join(__dirname, '../lambda/auth-handler.ts'),
      environment: {
        API_KEY_TABLE_NAME: props.apiKeyTable.tableName,
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId || '',
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Permissions for Auth Handler
    props.apiKeyTable.grantReadData(authHandler);

    // Consolidated API Router Lambda
    const apiRouter = new lambda.NodejsFunction(this, 'ApiRouter', {
      entry: path.join(__dirname, '../lambda/api-router.ts'),
      environment: {
        TABLE_NAME: props.notebookTable.tableName,
        API_KEY_TABLE_NAME: props.apiKeyTable.tableName,
        BUCKET_NAME: props.contentBucket.bucketName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Permissions
    props.notebookTable.grantReadWriteData(apiRouter);
    props.apiKeyTable.grantReadWriteData(apiRouter);
    props.contentBucket.grantReadWrite(apiRouter);

    // API Gateway
    const api = new apigateway.RestApi(this, 'NotebookRestApi', {
      restApiName: 'NotebookRestApi',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
    });

    // Custom Lambda Authorizer (Dual Auth)
    const authorizer = new apigateway.RequestAuthorizer(this, 'NotebookRequestAuthorizer', {
      handler: authHandler,
      identitySources: [
        apigateway.IdentitySource.header('Authorization'),
        apigateway.IdentitySource.header('x-api-key'),
      ],
      resultsCacheTtl: cdk.Duration.seconds(0), // Disable cache for dev
    });

    const authProps: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    };

    // Lambda Integration
    const integration = new apigateway.LambdaIntegration(apiRouter);

    // Routes
    // /notebooks
    const notebooks = api.root.addResource('notebooks');
    notebooks.addMethod('GET', integration, authProps);
    notebooks.addMethod('POST', integration, authProps);

    // /notebooks/{id}
    const notebook = notebooks.addResource('{id}');
    notebook.addMethod('GET', integration, authProps);
    notebook.addMethod('PATCH', integration, authProps);
    notebook.addMethod('DELETE', integration, authProps);

    // /notebooks/{id}/pages/{pageId}
    const pages = notebook.addResource('pages');
    const page = pages.addResource('{pageId}');
    page.addMethod('DELETE', integration, authProps);

    // /notebooks/urls
    const urls = notebooks.addResource('urls');
    const uploadUrl = urls.addResource('upload');
    uploadUrl.addMethod('GET', integration, authProps);

    const downloadUrl = urls.addResource('download');
    downloadUrl.addMethod('GET', integration, authProps);

    // /assets
    const assets = api.root.addResource('assets');
    const assetUpload = assets.addResource('upload');
    assetUpload.addMethod('GET', integration, authProps);

    const assetUrls = assets.addResource('urls');
    const assetDownload = assetUrls.addResource('download');
    assetDownload.addMethod('GET', integration, authProps);

    // /api-keys
    const apiKeys = api.root.addResource('api-keys');
    apiKeys.addMethod('GET', integration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    apiKeys.addMethod('POST', integration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Gateway Responses for CORS on Auth Errors
    api.addGatewayResponse('UnauthorizedResponse', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    api.addGatewayResponse('AccessDeniedResponse', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    // Output API Details
    new cdk.CfnOutput(this, 'RestApiUrl', { value: api.url });
  }
}
