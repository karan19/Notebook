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
  contentBucket: s3.Bucket;
  userPoolId: string;
}

export class NotebookApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NotebookApiStackProps) {
    super(scope, id, props);

    // Import existing User Pool
    const userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', props.userPoolId);

    // Consolidated API Router Lambda
    const apiRouter = new lambda.NodejsFunction(this, 'ApiRouter', {
      entry: path.join(__dirname, '../lambda/api-router.ts'),
      environment: {
        TABLE_NAME: props.notebookTable.tableName,
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

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'NotebookAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const authProps: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
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

    // /notebooks/urls
    const urls = notebooks.addResource('urls');
    const uploadUrl = urls.addResource('upload');
    uploadUrl.addMethod('GET', integration, authProps);

    const downloadUrl = urls.addResource('download');
    downloadUrl.addMethod('GET', integration, authProps);

    // /assets/upload
    const assets = api.root.addResource('assets');
    const assetUpload = assets.addResource('upload');
    assetUpload.addMethod('GET', integration, authProps);

    // Output API Details
    new cdk.CfnOutput(this, 'RestApiUrl', { value: api.url });
  }
}
