import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class NotebookDataStack extends cdk.Stack {
    public readonly notebookTable: dynamodb.Table;
    public readonly contentBucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // DynamoDB Table for Notebook Metadata
        this.notebookTable = new dynamodb.Table(this, 'NotebookTable', {
            tableName: 'Notebook-table',
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // S3 Bucket for heavy document content
        this.contentBucket = new s3.Bucket(this, 'ContentBucket', {
            bucketName: `notebook-content-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.PUT,
                    ],
                    allowedOrigins: ['*'], // refine in prod
                    allowedHeaders: ['*'],
                },
            ],
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
        });
    }
}
