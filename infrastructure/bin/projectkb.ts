import * as cdk from 'aws-cdk-lib';
import { ProjectKbStack } from './lib/projectkb-stack';

const app = new cdk.App();

new ProjectKbStack(app, 'ProjectKbStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

app.synth();
