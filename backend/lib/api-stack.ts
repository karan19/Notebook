import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
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

    // AppSync API
    const api = new appsync.GraphqlApi(this, 'NotebookApi', {
      name: 'NotebookApi',
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, '../graphql/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
      },
    });

    // Data Sources
    const dbSource = api.addDynamoDbDataSource('NotebookDataSource', props.notebookTable);

    const urlHandler = new lambda.NodejsFunction(this, 'UrlHandler', {
      entry: path.join(__dirname, '../lambda/url-handler.ts'),
      environment: {
        BUCKET_NAME: props.contentBucket.bucketName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    const lambdaSource = api.addLambdaDataSource('UrlHandlerDataSource', urlHandler);

    // Permissions
    props.contentBucket.grantReadWrite(urlHandler);

    // Resolvers
    dbSource.createResolver('GetNotebook', {
      typeName: 'Query',
      fieldName: 'getNotebook',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'id'),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if(\$util.isNull(\$ctx.result.title))
          #set(\$ctx.result.title = "Untitled Document")
        #end
        \$util.toJson(\$ctx.result)
      `),
    });

    dbSource.createResolver('ListNotebooks', {
      typeName: 'Query',
      fieldName: 'listNotebooks',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #foreach(\$item in \$ctx.result.items)
          #if(\$util.isNull(\$item.title))
            #set(\$item.title = "Untitled Document")
          #end
        #end
        \$util.toJson(\$ctx.result.items)
      `),
    });

    dbSource.createResolver('CreateNotebook', {
      typeName: 'Mutation',
      fieldName: 'createNotebook',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$id = \$util.autoId())
        {
          "version": "2018-05-29",
          "operation": "PutItem",
          "key": {
            "id": \$util.dynamodb.toDynamoDBJson(\$id)
          },
          "attributeValues": {
            "title": \$util.dynamodb.toDynamoDBJson(\$util.defaultIfNullOrEmpty(\$ctx.args.title, "Untitled Document")),
            "isFavorite": \$util.dynamodb.toDynamoDBJson(false),
            "contentKey": \$util.dynamodb.toDynamoDBJson("notes/\${id}.html"),
            "createdAt": \$util.dynamodb.toDynamoDBJson(\$util.time.nowEpochMilliSeconds()),
            "lastEditedAt": \$util.dynamodb.toDynamoDBJson(\$util.time.nowEpochMilliSeconds())
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dbSource.createResolver('UpdateNotebook', {
      typeName: 'Mutation',
      fieldName: 'updateNotebook',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set(\$expression = "SET lastEditedAt = :lastEditedAt")
        #set(\$expressionValues = {
          ":lastEditedAt": \$util.dynamodb.toDynamoDBJson(\$util.time.nowEpochMilliSeconds())
        })

        #if(\$ctx.args.title)
          #set(\$expression = "\${expression}, title = :title")
          \$util.qr(\$expressionValues.put(":title", \$util.dynamodb.toDynamoDBJson(\$ctx.args.title)))
        #end

        #if(\$ctx.args.snippet)
          #set(\$expression = "\${expression}, snippet = :snippet")
          \$util.qr(\$expressionValues.put(":snippet", \$util.dynamodb.toDynamoDBJson(\$ctx.args.snippet)))
        #end

        #if(!\$util.isNull(\$ctx.args.isFavorite))
          #set(\$expression = "\${expression}, isFavorite = :isFavorite")
          \$util.qr(\$expressionValues.put(":isFavorite", \$util.dynamodb.toDynamoDBJson(\$ctx.args.isFavorite)))
        #end

        #if(\$ctx.args.contentKey)
          #set(\$expression = "\${expression}, contentKey = :contentKey")
          \$util.qr(\$expressionValues.put(":contentKey", \$util.dynamodb.toDynamoDBJson(\$ctx.args.contentKey)))
        #end

        {
          "version": "2018-05-29",
          "operation": "UpdateItem",
          "key": {
            "id": \$util.dynamodb.toDynamoDBJson(\$ctx.args.id)
          },
          "update": {
            "expression": "\${expression}",
            "expressionValues": \$util.toJson(\$expressionValues)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dbSource.createResolver('DeleteNotebook', {
      typeName: 'Mutation',
      fieldName: 'deleteNotebook',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbDeleteItem('id', 'id'),
      responseMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson($ctx.result.id)'),
    });

    // Link S3 URL queries to Lambda
    lambdaSource.createResolver('GetUploadUrl', { typeName: 'Query', fieldName: 'getUploadUrl' });
    lambdaSource.createResolver('GetDownloadUrl', { typeName: 'Query', fieldName: 'getDownloadUrl' });

    // Output API Details
    new cdk.CfnOutput(this, 'GraphQLAPIURL', { value: api.graphqlUrl });
  }
}
