import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';

export class ProjectKbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool for Authentication
    const userPool = new cognito.UserPool(this, 'ProjectKbUserPool', {
      userPoolName: 'projectkb-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'ProjectKbUserPoolClient', {
      userPool,
      userPoolClientName: 'projectkb-client',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/auth/callback',
          'https://your-domain.com/auth/callback',
        ],
        logoutUrls: [
          'http://localhost:3000/auth/logout',
          'https://your-domain.com/auth/logout',
        ],
      },
    });

    // Google Identity Provider
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
      userPool,
      clientId: 'your-google-client-id',
      clientSecret: 'your-google-client-secret',
      scopes: ['email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
      },
    });

    // Microsoft Identity Provider
    const microsoftProvider = new cognito.UserPoolIdentityProviderOidc(this, 'MicrosoftProvider', {
      userPool,
      name: 'Microsoft',
      clientId: 'your-microsoft-client-id',
      clientSecret: 'your-microsoft-client-secret',
      issuerUrl: 'https://login.microsoftonline.com/common/v2.0',
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.other('email'),
        givenName: cognito.ProviderAttribute.other('given_name'),
        familyName: cognito.ProviderAttribute.other('family_name'),
      },
    });

    // DynamoDB Tables
    const pkbTable = new dynamodb.Table(this, 'ProjectKbTable', {
      tableName: 'projectkb-pkbs',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'pkbId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const contentTable = new dynamodb.Table(this, 'ContentTable', {
      tableName: 'projectkb-content',
      partitionKey: {
        name: 'pkbId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'contentId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 Bucket for file storage
    const fileBucket = new s3.Bucket(this, 'ProjectKbFileBucket', {
      bucketName: 'projectkb-files',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'ArchiveOldFiles',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    // Lambda Functions
    const authLambda = new lambda.Function(this, 'AuthLambda', {
      functionName: 'projectkb-auth',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/src/auth'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    const pkbLambda = new lambda.Function(this, 'PkbLambda', {
      functionName: 'projectkb-pkb',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/src/pkb'),
      environment: {
        PKB_TABLE: pkbTable.tableName,
        CONTENT_TABLE: contentTable.tableName,
      },
    });

    const contentLambda = new lambda.Function(this, 'ContentLambda', {
      functionName: 'projectkb-content',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/src/content'),
      environment: {
        CONTENT_TABLE: contentTable.tableName,
        FILE_BUCKET: fileBucket.bucketName,
      },
    });

    const aiLambda = new lambda.Function(this, 'AiLambda', {
      functionName: 'projectkb-ai',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/src/ai'),
      environment: {
        CONTENT_TABLE: contentTable.tableName,
        FILE_BUCKET: fileBucket.bucketName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant permissions to Lambda functions
    pkbTable.grantReadWriteData(pkbLambda);
    contentTable.grantReadWriteData(pkbLambda);
    contentTable.grantReadWriteData(contentLambda);
    contentTable.grantReadWriteData(aiLambda);
    fileBucket.grantReadWrite(contentLambda);
    fileBucket.grantRead(aiLambda);

    // Grant Bedrock permissions to AI Lambda
    aiLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'ProjectKbApi', {
      restApiName: 'ProjectKB API',
      description: 'API for ProjectKB application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Routes
    const authResource = api.root.addResource('auth');
    authResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));

    const pkbResource = api.root.addResource('pkb');
    pkbResource.addMethod('GET', new apigateway.LambdaIntegration(pkbLambda), {
      authorizer: cognitoAuthorizer,
    });
    pkbResource.addMethod('POST', new apigateway.LambdaIntegration(pkbLambda), {
      authorizer: cognitoAuthorizer,
    });
    pkbResource.addMethod('PUT', new apigateway.LambdaIntegration(pkbLambda), {
      authorizer: cognitoAuthorizer,
    });
    pkbResource.addMethod('DELETE', new apigateway.LambdaIntegration(pkbLambda), {
      authorizer: cognitoAuthorizer,
    });

    const contentResource = api.root.addResource('content');
    contentResource.addMethod('GET', new apigateway.LambdaIntegration(contentLambda), {
      authorizer: cognitoAuthorizer,
    });
    contentResource.addMethod('POST', new apigateway.LambdaIntegration(contentLambda), {
      authorizer: cognitoAuthorizer,
    });
    contentResource.addMethod('PUT', new apigateway.LambdaIntegration(contentLambda), {
      authorizer: cognitoAuthorizer,
    });
    contentResource.addMethod('DELETE', new apigateway.LambdaIntegration(contentLambda), {
      authorizer: cognitoAuthorizer,
    });

    const aiResource = api.root.addResource('ai');
    aiResource.addMethod('POST', new apigateway.LambdaIntegration(aiLambda), {
      authorizer: cognitoAuthorizer,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'FileBucketName', {
      value: fileBucket.bucketName,
      description: 'S3 File Bucket Name',
    });
  }
}
