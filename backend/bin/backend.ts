#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import { NotebookDataStack } from '../lib/data-stack';
import { NotebookApiStack } from '../lib/api-stack';
import { NotebookBackupStack } from '../lib/backup-stack';

const app = new cdk.App();

// Apply global tags
cdk.Tags.of(app).add('Stage', 'Production');
cdk.Tags.of(app).add('Application', 'Notebook');

const region = process.env.COGNITO_REGION || 'us-west-2';
const userPoolId = process.env.COGNITO_USER_POOL_ID;

if (!userPoolId) {
  throw new Error('COGNITO_USER_POOL_ID environment variable is required');
}

const dataStack = new NotebookDataStack(app, 'NotebookDataStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
});

new NotebookApiStack(app, 'NotebookApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
  notebookTable: dataStack.notebookTable,
  contentBucket: dataStack.contentBucket,
  userPoolId: userPoolId,
});

new NotebookBackupStack(app, 'NotebookBackupStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
  resources: [
    backup.BackupResource.fromDynamoDbTable(dataStack.notebookTable),
    backup.BackupResource.fromArn(dataStack.contentBucket.bucketArn),
  ],
});
