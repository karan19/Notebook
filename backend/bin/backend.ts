#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NotebookDataStack } from '../lib/data-stack';
import { NotebookApiStack } from '../lib/api-stack';

const app = new cdk.App();

const region = process.env.COGNITO_REGION || 'us-east-2';
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
