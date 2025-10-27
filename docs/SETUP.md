# ProjectKB Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- AWS CLI configured
- Git
- AWS Account with appropriate permissions

### One-Command Setup
```bash
./scripts/setup.sh
```

## Manual Setup

### 1. Clone and Initialize
```bash
git clone <your-repository-url>
cd ProjectKB
git init
```

### 2. Install Dependencies
```bash
# Infrastructure
cd infrastructure
npm install

# Frontend
cd ../frontend
npm install

# Backend
cd ../backend
npm install
```

### 3. Environment Configuration
```bash
# Copy environment templates
cp infrastructure/.env.template infrastructure/.env
cp frontend/.env.template frontend/.env
cp backend/.env.template backend/.env

# Edit with your values
nano infrastructure/.env
nano frontend/.env
nano backend/.env
```

### 4. AWS Setup
```bash
# Configure AWS CLI
aws configure

# Bootstrap CDK (first time only)
cd infrastructure
cdk bootstrap
```

### 5. OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: "ProjectKB"
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `https://your-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Azure Active Directory > App registrations
3. New registration: "ProjectKB"
4. Add redirect URI: `https://your-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

### 6. Deploy Infrastructure
```bash
cd infrastructure
npm run deploy
```

### 7. Start Development
```bash
# Frontend
cd frontend
npm start

# Backend (in separate terminal)
cd backend
npm run dev
```

## Development Workflow

### Daily Development
1. **Pull latest changes**: `git pull origin main`
2. **Start frontend**: `cd frontend && npm start`
3. **Start backend**: `cd backend && npm run dev`
4. **Make changes** and test locally
5. **Commit changes**: `git add . && git commit -m "feat: description"`
6. **Push changes**: `git push origin main`

### Testing
```bash
# Run all tests
npm run test

# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# E2E tests
npm run test:e2e
```

### Deployment
```bash
# Create release
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will handle deployment
```

## Troubleshooting

### Common Issues

#### AWS Credentials
```bash
# Check AWS configuration
aws sts get-caller-identity

# Reconfigure if needed
aws configure
```

#### CDK Bootstrap Issues
```bash
# Check CDK version
cdk --version

# Bootstrap specific region
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

#### Frontend Build Issues
```bash
# Clear cache
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

#### Backend Issues
```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/projectkb

# Test API endpoints
curl -X GET https://your-api-gateway-url.amazonaws.com/prod/pkb
```

## Environment Variables

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-api-gateway-url.amazonaws.com/prod
REACT_APP_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_USER_POOL_CLIENT_ID=your-client-id
REACT_APP_REGION=us-east-1
REACT_APP_VERSION=v1.0.0
```

### Backend (.env)
```env
AWS_REGION=us-east-1
PKB_TABLE=projectkb-pkbs
CONTENT_TABLE=projectkb-content
FILE_BUCKET=projectkb-files
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Infrastructure (.env)
```env
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

## Project Structure

```
ProjectKB/
├── frontend/                 # React TypeScript app
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utilities
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Lambda functions
│   ├── src/
│   │   ├── auth/           # Auth handlers
│   │   ├── pkb/            # PKB management
│   │   ├── content/        # Content handling
│   │   └── ai/             # AI integration
│   └── package.json
├── infrastructure/          # CDK stack
│   ├── lib/
│   │   └── projectkb-stack.ts
│   └── package.json
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── .github/              # GitHub Actions
```

## Next Steps

1. **Complete Sprint 1**: Finish infrastructure setup
2. **Start Sprint 2**: Implement authentication
3. **Set up monitoring**: CloudWatch dashboards
4. **Create tests**: Unit and integration tests
5. **Deploy to production**: AWS Amplify + Lambda

## Support

- **Documentation**: See `docs/` folder
- **Sprint Tracking**: `docs/SPRINT_LOG.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Issues**: Create GitHub issues for bugs/features

---

*For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)*

