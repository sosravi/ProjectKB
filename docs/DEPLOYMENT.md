# ProjectKB Deployment Guide

## Prerequisites

### Required Tools
- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK CLI (`npm install -g aws-cdk`)
- Git

### AWS Permissions Required
- Cognito (User Pools, Identity Providers)
- DynamoDB (Tables, Indexes)
- S3 (Buckets, Policies)
- Lambda (Functions, Layers)
- API Gateway (APIs, Authorizers)
- IAM (Roles, Policies)
- Bedrock (Model Access)
- Amplify (Hosting)

## Initial Setup

### 1. Clone Repository
```bash
git clone <your-repository-url>
cd ProjectKB
```

### 2. Install Dependencies
```bash
# Install infrastructure dependencies
cd infrastructure
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and Region
```

### 4. Bootstrap CDK (First Time Only)
```bash
cd infrastructure
cdk bootstrap
```

## Environment Configuration

### 1. Create Environment File
Create `infrastructure/.env`:
```env
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### 2. Update CDK Stack
Update the CDK stack with your OAuth credentials:
```typescript
// In infrastructure/lib/projectkb-stack.ts
const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
  userPool,
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  // ... rest of configuration
});
```

## Deployment Process

### 1. Deploy Infrastructure
```bash
cd infrastructure
npm run deploy
```

This will create:
- Cognito User Pool with Google/Microsoft OAuth
- DynamoDB tables for PKBs and content
- S3 bucket for file storage
- Lambda functions for API endpoints
- API Gateway with Cognito authorizers

### 2. Deploy Frontend to Amplify
```bash
# Build the frontend
cd frontend
npm run build

# Deploy to Amplify (manual)
aws amplify create-app --name projectkb-frontend
aws amplify create-branch --app-id <app-id> --branch-name main
```

### 3. Configure Frontend Environment
Create `frontend/.env`:
```env
REACT_APP_API_URL=https://your-api-gateway-url.amazonaws.com/prod
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-user-pool-client-id
REACT_APP_REGION=us-east-1
```

## GitHub Actions Setup

### 1. Repository Secrets
Add these secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AMPLIFY_APP_ID`
- `AMPLIFY_S3_BUCKET`

### 2. OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create new registration
4. Add redirect URI:
   - `https://your-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

## Release Process

### 1. Create Release
```bash
# Create a new release tag
git tag v1.0.0
git push origin v1.0.0

# Create GitHub release
gh release create v1.0.0 --title "Release v1.0.0" --notes "Initial release"
```

### 2. Automated Deployment
GitHub Actions will automatically:
- Run tests and linting
- Build applications
- Deploy infrastructure
- Deploy frontend to Amplify
- Update version numbers

## Monitoring and Troubleshooting

### 1. CloudWatch Logs
Monitor Lambda function logs:
```bash
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/projectkb
```

### 2. API Gateway Monitoring
- Check API Gateway console for request metrics
- Monitor 4xx/5xx error rates
- Review Cognito authorizer logs

### 3. Common Issues

#### Cognito OAuth Issues
- Verify redirect URIs match exactly
- Check client ID and secret configuration
- Ensure OAuth scopes are correct

#### S3 Upload Issues
- Verify bucket policies allow user access
- Check pre-signed URL expiration
- Ensure CORS configuration is correct

#### Lambda Cold Starts
- Monitor function duration metrics
- Consider provisioned concurrency for critical functions
- Optimize function code and dependencies

## Rollback Procedures

### 1. Infrastructure Rollback
```bash
cd infrastructure
cdk destroy ProjectKbStack
# Deploy previous version
git checkout <previous-commit>
npm run deploy
```

### 2. Frontend Rollback
```bash
# In Amplify console, revert to previous deployment
# Or redeploy previous version
cd frontend
git checkout <previous-commit>
npm run build
# Manual deployment to Amplify
```

### 3. Database Rollback
- Use DynamoDB point-in-time recovery
- Restore from S3 versioning if needed
- Manual data migration if required

## Cost Optimization

### 1. Monitoring Costs
- Set up AWS Budget alerts
- Monitor Lambda execution costs
- Track S3 storage usage
- Review DynamoDB read/write capacity

### 2. Optimization Strategies
- Implement S3 lifecycle policies
- Use DynamoDB on-demand billing
- Optimize Lambda memory allocation
- Enable CloudFront for static assets

## Security Considerations

### 1. IAM Policies
- Follow principle of least privilege
- Use resource-specific policies
- Regular policy audits

### 2. Data Protection
- Enable S3 encryption
- Use DynamoDB encryption at rest
- Implement proper CORS policies
- Regular security scans

### 3. Access Control
- Implement proper Cognito groups
- Use fine-grained S3 permissions
- Monitor API access patterns

## Support and Maintenance

### 1. Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Regular infrastructure reviews

### 2. Backup Strategy
- DynamoDB point-in-time recovery
- S3 versioning and cross-region replication
- Regular infrastructure snapshots

### 3. Performance Monitoring
- Set up CloudWatch dashboards
- Monitor application performance
- Regular load testing

---

For additional support, refer to:
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Chakra UI Documentation](https://chakra-ui.com/)
- [Project Sprint Log](docs/SPRINT_LOG.md)
