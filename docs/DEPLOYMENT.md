# Deployment Guide

This guide provides step-by-step instructions for deploying ProjectKB to AWS using the CI/CD pipeline.

## Prerequisites

### 1. AWS Account Setup
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18+ installed
- Git installed

### 2. Required AWS Services
- AWS Amplify (for frontend hosting)
- AWS Lambda (for backend functions)
- AWS API Gateway (for API endpoints)
- AWS Cognito (for authentication)
- AWS DynamoDB (for data storage)
- AWS S3 (for file storage)
- AWS Bedrock (for AI services)
- AWS Rekognition (for image analysis)
- AWS Transcribe (for audio transcription)
- AWS Route 53 (for custom domain)
- AWS CloudFormation (for infrastructure)

### 3. GitHub Repository Setup
- GitHub repository with Actions enabled
- GitHub Secrets configured (see below)

## GitHub Secrets Configuration

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET=your_projectkb_uploads_bucket_name
TRANSCRIBE_BUCKET=your_projectkb_transcribe_bucket_name
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
COGNITO_CLIENT_ID=your_cognito_client_id
API_URL=https://your_api_gateway_url.execute-api.us-east-1.amazonaws.com/prod
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
AMPLIFY_APP_ID=your_amplify_app_id
AMPLIFY_BRANCH_NAME=main
```

### Optional Secrets (for custom domain)
```
DOMAIN_NAME=your_custom_domain.com
HOSTED_ZONE_ID=your_route53_hosted_zone_id
SSL_CERTIFICATE_ARN=your_ssl_certificate_arn
```

### Optional Secrets (for notifications)
```
SLACK_WEBHOOK_URL=your_slack_webhook_url
SNYK_TOKEN=your_snyk_token
```

## AWS Setup

### 1. Create S3 Buckets
```bash
# Create uploads bucket
aws s3 mb s3://your-projectkb-uploads-bucket --region us-east-1

# Create transcribe bucket
aws s3 mb s3://your-projectkb-transcribe-bucket --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning --bucket your-projectkb-uploads-bucket --versioning-configuration Status=Enabled
aws s3api put-bucket-versioning --bucket your-projectkb-transcribe-bucket --versioning-configuration Status=Enabled
```

### 2. Create Cognito User Pool
```bash
# Create user pool
aws cognito-idp create-user-pool \
  --pool-name ProjectKB-Users \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email

# Create user pool client
aws cognito-idp create-user-pool-client \
  --user-pool-id your_user_pool_id \
  --client-name ProjectKB-Client \
  --explicit-auth-flows ADMIN_NO_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

### 3. Create Amplify App
```bash
# Create Amplify app
aws amplify create-app \
  --name ProjectKB \
  --description "ProjectKB Knowledge Management System" \
  --platform WEB \
  --repository https://github.com/your-username/ProjectKB \
  --access-token your_github_token
```

### 4. Enable Required AWS Services
- Enable AWS Bedrock in your region
- Enable AWS Rekognition
- Enable AWS Transcribe
- Configure IAM roles for Lambda functions

## Environment Variables

### 1. Copy Environment Templates
```bash
# Copy development environment
cp env.example .env

# Copy production environment
cp env.production.example .env.production
```

### 2. Fill in Your Values
Edit the environment files with your actual AWS resource IDs and credentials.

## Deployment Steps

### 1. Automatic Deployment (Recommended)

The CI/CD pipeline will automatically deploy when you:
- Push to `main` branch (production deployment)
- Push to `develop` branch (staging deployment)
- Create a GitHub release

### 2. Manual Deployment

#### Deploy Infrastructure
```bash
cd infrastructure
npm install
npm run deploy:production
```

#### Deploy Backend
```bash
cd backend
npm install
npm run build
npm run deploy:production
```

#### Deploy Frontend
```bash
cd frontend
npm install
npm run build
npm run deploy:production
```

### 3. Custom Domain Setup (Optional)

#### Create Route 53 Hosted Zone
```bash
aws route53 create-hosted-zone \
  --name your-domain.com \
  --caller-reference $(date +%s)
```

#### Configure DNS Records
```bash
# Get Amplify domain info
aws amplify get-domain-association \
  --app-id your_amplify_app_id \
  --domain-name your-domain.com

# Update Route 53 records with Amplify domain info
```

## Verification

### 1. Health Checks
```bash
# Check frontend
curl -f https://your-domain.com

# Check API
curl -f https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod/health

# Check database
curl -f https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod/health/database
```

### 2. Test Authentication
- Visit your frontend URL
- Try to sign up for a new account
- Verify email confirmation works
- Test sign in/sign out

### 3. Test File Upload
- Create a new PKB
- Upload a file
- Verify file appears in the interface

### 4. Test AI Features
- Ask a question about uploaded content
- Test image analysis
- Test audio transcription

## Rollback Procedures

### 1. Infrastructure Rollback
```bash
cd infrastructure
npm run rollback:production
```

### 2. Application Rollback
```bash
# Rollback to previous version
git checkout previous-stable-tag
npm run deploy:production
```

### 3. Database Rollback
```bash
# Restore from backup (if available)
aws dynamodb restore-table-from-backup \
  --target-table-name ProjectKB-PKB-Prod \
  --backup-arn your_backup_arn
```

## Monitoring and Logs

### 1. CloudWatch Logs
- Lambda function logs: `/aws/lambda/projectkb-*`
- API Gateway logs: `/aws/apigateway/projectkb-api`
- Amplify logs: Available in Amplify console

### 2. CloudWatch Metrics
- Lambda invocations and errors
- API Gateway request count and latency
- DynamoDB read/write capacity
- S3 storage and request metrics

### 3. Alarms
- Set up CloudWatch alarms for:
  - Lambda errors
  - API Gateway 5xx errors
  - DynamoDB throttling
  - High latency

## Troubleshooting

### Common Issues

#### 1. Deployment Failures
- Check AWS credentials in GitHub Secrets
- Verify all required AWS services are enabled
- Check CloudWatch logs for detailed error messages

#### 2. Authentication Issues
- Verify Cognito User Pool configuration
- Check CORS settings in API Gateway
- Verify JWT token validation

#### 3. File Upload Issues
- Check S3 bucket permissions
- Verify pre-signed URL generation
- Check file size limits

#### 4. AI Service Issues
- Verify Bedrock model access
- Check Rekognition permissions
- Verify Transcribe service configuration

### Getting Help

1. Check CloudWatch logs for detailed error messages
2. Review GitHub Actions logs for deployment issues
3. Verify all environment variables are set correctly
4. Check AWS service quotas and limits

## Security Considerations

### 1. IAM Permissions
- Use least privilege principle
- Create specific IAM roles for each service
- Regularly rotate access keys

### 2. Data Protection
- Enable S3 encryption
- Use DynamoDB encryption at rest
- Implement proper CORS policies

### 3. Network Security
- Use VPC endpoints where possible
- Implement proper security groups
- Enable CloudTrail for audit logging

## Cost Optimization

### 1. Monitoring Costs
- Set up AWS Budget alerts
- Monitor usage with Cost Explorer
- Use AWS Cost Anomaly Detection

### 2. Optimization Tips
- Use S3 Intelligent Tiering
- Optimize Lambda memory allocation
- Use DynamoDB On-Demand billing for variable workloads
- Implement proper caching strategies

## Maintenance

### 1. Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Update AWS SDK versions

### 2. Backup Strategy
- Enable DynamoDB point-in-time recovery
- Regular S3 backup verification
- Test restore procedures

### 3. Performance Monitoring
- Monitor application performance
- Optimize slow queries
- Review and update capacity settings