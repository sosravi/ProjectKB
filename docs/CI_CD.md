# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for ProjectKB.

## Pipeline Overview

The CI/CD pipeline consists of three main workflows:
1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`) - Main pipeline for testing, building, and deploying
2. **Deploy to Production** (`.github/workflows/deploy.yml`) - Production deployment workflow
3. **Create Release** (`.github/workflows/release.yml`) - Automated release creation

## Workflow Triggers

### CI/CD Pipeline
- **Push to `main` branch**: Runs full pipeline including production deployment
- **Push to `develop` branch**: Runs full pipeline including staging deployment
- **Pull Request to `main`**: Runs tests, linting, and security scans

### Deploy to Production
- **GitHub Release**: Automatically deploys when a release is published
- **Manual Dispatch**: Allows manual deployment to production or staging

### Create Release
- **Push tags**: Automatically creates GitHub releases when tags are pushed

## Pipeline Stages

### 1. Test Stage
- **Frontend Tests**: Jest + React Testing Library
- **Backend Tests**: Jest for Lambda functions
- **Infrastructure Tests**: CDK tests
- **E2E Tests**: Cypress end-to-end tests

### 2. Code Quality Stage
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking

### 3. Security Stage
- **npm audit**: Dependency vulnerability scanning
- **Snyk**: Advanced security scanning

### 4. Build Stage
- **Frontend Build**: React production build
- **Backend Build**: TypeScript compilation
- **Infrastructure Build**: CDK synthesis

### 5. Deploy Stage
- **Staging**: Deploy to staging environment (develop branch)
- **Production**: Deploy to production environment (main branch)

## Environment Configuration

### GitHub Secrets

#### Required Secrets
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

#### Optional Secrets
```
DOMAIN_NAME=your_custom_domain.com
HOSTED_ZONE_ID=your_route53_hosted_zone_id
SSL_CERTIFICATE_ARN=your_ssl_certificate_arn
SLACK_WEBHOOK_URL=your_slack_webhook_url
SNYK_TOKEN=your_snyk_token
```

### Environment Variables

#### Frontend Build Variables
```
REACT_APP_API_URL=https://your_api_gateway_url.execute-api.us-east-1.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=your_cognito_user_pool_id
REACT_APP_COGNITO_CLIENT_ID=your_cognito_client_id
REACT_APP_S3_BUCKET=your_projectkb_uploads_bucket_name
REACT_APP_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

#### Backend Deployment Variables
```
AWS_REGION=us-east-1
S3_BUCKET=your_projectkb_uploads_bucket_name
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
COGNITO_CLIENT_ID=your_cognito_client_id
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
TRANSCRIBE_BUCKET=your_projectkb_transcribe_bucket_name
```

## Deployment Process

### 1. Frontend Deployment
- Build React application with production environment variables
- Deploy to AWS Amplify
- Configure custom domain (if provided)
- Update Route 53 records

### 2. Backend Deployment
- Deploy infrastructure using AWS CDK
- Deploy Lambda functions
- Update API Gateway configuration
- Configure environment variables

### 3. Domain Configuration
- Create custom domain in Amplify
- Configure SSL certificate
- Update Route 53 records
- Verify DNS propagation

### 4. Health Checks
- Verify frontend accessibility
- Test API endpoints
- Check database connectivity
- Validate authentication flow

## Branch Strategy

### Main Branch (`main`)
- Production-ready code
- Triggers production deployment
- Protected branch with required reviews

### Develop Branch (`develop`)
- Integration branch for features
- Triggers staging deployment
- Used for testing before production

### Feature Branches
- Created from `develop`
- Used for individual features
- Merged back to `develop` via pull requests

## Release Process

### 1. Semantic Versioning
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features
- **Patch** (0.0.1): Bug fixes

### 2. Release Creation
```bash
# Create and push tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically create release
```

### 3. Release Notes
- Automatically generated from commit messages
- Include feature descriptions
- Document breaking changes

## Monitoring and Notifications

### 1. Slack Notifications
- Deployment success/failure notifications
- Sent to `#deployments` channel
- Include deployment URLs and status

### 2. CloudWatch Monitoring
- Lambda function metrics
- API Gateway metrics
- DynamoDB metrics
- S3 metrics

### 3. Health Checks
- Automated health checks after deployment
- Frontend accessibility check
- API endpoint validation
- Database connectivity test

## Rollback Procedures

### 1. Automatic Rollback
- Failed deployments automatically rollback
- Previous version restored from artifacts
- Health checks verify rollback success

### 2. Manual Rollback
```bash
# Rollback to previous release
git checkout previous-stable-tag
git push origin main

# Or use GitHub Actions manual dispatch
```

### 3. Infrastructure Rollback
```bash
cd infrastructure
npm run rollback:production
```

## Security Considerations

### 1. Secret Management
- All secrets stored in GitHub Secrets
- Never commit secrets to repository
- Rotate secrets regularly

### 2. Access Control
- Use IAM roles with least privilege
- Separate AWS accounts for staging/production
- Enable MFA for AWS console access

### 3. Code Security
- Dependency vulnerability scanning
- Code quality checks
- Security linting rules

## Performance Optimization

### 1. Build Optimization
- Use npm ci for faster installs
- Cache dependencies between builds
- Parallel job execution

### 2. Deployment Optimization
- Use CDK for infrastructure as code
- Deploy only changed components
- Use blue-green deployments for zero downtime

### 3. Monitoring Optimization
- Set up performance budgets
- Monitor build times
- Track deployment frequency

## Troubleshooting

### Common Issues

#### 1. Build Failures
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript errors

#### 2. Deployment Failures
- Verify AWS credentials
- Check resource quotas
- Review CloudWatch logs

#### 3. Test Failures
- Check test environment setup
- Verify mock configurations
- Review test coverage

### Debugging Steps

1. **Check GitHub Actions logs**
   - Go to Actions tab in GitHub
   - Click on failed workflow
   - Review step-by-step logs

2. **Verify Environment Variables**
   - Check GitHub Secrets configuration
   - Verify environment variable names
   - Test with manual deployment

3. **Review AWS Resources**
   - Check CloudFormation stack status
   - Verify Lambda function logs
   - Review API Gateway configuration

## Best Practices

### 1. Code Quality
- Write comprehensive tests
- Use TypeScript for type safety
- Follow consistent coding standards

### 2. Security
- Regular dependency updates
- Security scanning in CI/CD
- Principle of least privilege

### 3. Monitoring
- Set up comprehensive monitoring
- Use structured logging
- Implement alerting for critical issues

### 4. Documentation
- Keep documentation up to date
- Document deployment procedures
- Maintain troubleshooting guides

## Future Improvements

### 1. Advanced Features
- Blue-green deployments
- Canary releases
- Automated rollback triggers

### 2. Monitoring Enhancements
- Custom dashboards
- Advanced alerting
- Performance analytics

### 3. Security Enhancements
- Container scanning
- Infrastructure security scanning
- Compliance reporting


