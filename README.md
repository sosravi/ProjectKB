# ProjectKB - AI-Powered Project Knowledge Base

A modern, serverless web application for managing project knowledge bases with AI-powered content querying and suggestions.

## 🏗️ Architecture Overview

ProjectKB follows a serverless architecture pattern using AWS services for scalability, cost-efficiency, and security.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   AWS Amplify   │    │   AWS Cognito   │
│   (TypeScript)   │◄──►│   (Hosting)     │◄──►│  (Authentication)│
│   Chakra UI      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   AWS Lambda    │    │   DynamoDB      │
│   (REST APIs)   │◄──►│   (Backend)      │◄──►│  (Metadata)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AWS S3        │    │   AWS Bedrock   │    │   AWS Transcribe │
│   (File Storage)│◄──►│   (AI Agent)     │◄──►│  (Audio/Video)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

1. **Frontend**: React + TypeScript + Chakra UI
   - Modern, responsive design inspired by Notion/Figma/Linear
   - Dark/light mode toggle
   - Version display with tooltip
   - Real-time updates and smooth animations

2. **Authentication**: AWS Cognito
   - Username/password authentication
   - Google and Microsoft federated login
   - JWT token-based API security

3. **Backend**: AWS Lambda + API Gateway
   - Serverless REST APIs
   - Cognito authorizers for security
   - Pre-signed URLs for S3 uploads

4. **Storage**: AWS S3 + DynamoDB
   - S3: File storage (images, videos, documents)
   - DynamoDB: Metadata and small text content
   - Cost-optimized with lifecycle policies

5. **AI Integration**: AWS Bedrock
   - Content querying and analysis
   - Semantic search with embeddings
   - Intelligent suggestions and improvements

## 🚀 Sprint-Based Development

We follow a one-day sprint cycle with clear deliverables:

- **Day 1**: Project setup, CDK infrastructure, basic React app
- **Day 2**: Authentication implementation
- **Day 3**: PKB management UI and backend
- **Day 4**: File upload system with S3
- **Day 5**: AI agent integration
- **Day 6**: Advanced AI features (images, audio)
- **Day 7**: CI/CD and deployment automation

## 📁 Project Structure

```
ProjectKB/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # AWS Lambda functions
│   ├── src/
│   │   ├── auth/           # Authentication handlers
│   │   ├── pkb/            # PKB management
│   │   ├── content/        # Content upload/retrieval
│   │   └── ai/             # AI agent integration
│   └── package.json
├── infrastructure/          # AWS CDK infrastructure
│   ├── lib/
│   │   ├── cognito-stack.ts
│   │   ├── storage-stack.ts
│   │   ├── api-stack.ts
│   │   └── ai-stack.ts
│   └── cdk.json
├── docs/                   # Documentation
│   ├── SPRINT_LOG.md       # Sprint tracking
│   ├── API.md             # API documentation
│   └── DEPLOYMENT.md      # Deployment guide
├── scripts/                # Utility scripts
├── tests/                  # Test files
└── .github/               # GitHub Actions workflows
    └── workflows/
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Chakra UI** for modern, accessible components
- **React Router** for navigation
- **AWS Amplify** for hosting and CI/CD

### Backend
- **AWS Lambda** (Node.js/Python)
- **API Gateway** for REST APIs
- **AWS CDK** for infrastructure as code

### Storage & AI
- **AWS S3** for file storage
- **DynamoDB** for metadata
- **AWS Bedrock** for AI capabilities
- **AWS Transcribe** for audio processing

### DevOps
- **GitHub Actions** for CI/CD
- **Semantic Versioning** for releases
- **AWS CloudFormation** for deployments

## 💰 Cost Optimization

- **Serverless Architecture**: Pay-per-use pricing
- **S3 Lifecycle Policies**: Automatic archival of old files
- **DynamoDB On-Demand**: Scale based on actual usage
- **Lambda Cold Start Optimization**: Connection pooling and caching

## 🔒 Security Features

- **Cognito Authentication**: Secure user management
- **JWT Tokens**: Stateless authentication
- **S3 Bucket Policies**: User-specific access control
- **API Gateway Authorizers**: Request validation
- **HTTPS Everywhere**: Encrypted data transmission

## 📈 Scalability

- **Auto-scaling**: All AWS services scale automatically
- **CDN Integration**: CloudFront for global content delivery
- **Database Sharding**: DynamoDB partition key strategy
- **Caching**: Redis/ElastiCache for frequently accessed data

## 🚀 Getting Started

1. **Prerequisites**:
   ```bash
   npm install -g aws-cdk
   npm install -g @aws-amplify/cli
   ```

2. **Clone and Setup**:
   ```bash
   git clone <repository-url>
   cd ProjectKB
   npm install
   ```

3. **Deploy Infrastructure**:
   ```bash
   cd infrastructure
   cdk bootstrap
   cdk deploy --all
   ```

4. **Start Development**:
   ```bash
   cd frontend
   npm start
   ```

## 📋 Sprint Progress

See [SPRINT_LOG.md](docs/SPRINT_LOG.md) for detailed sprint tracking and deliverables.

## 🤝 Contributing

1. Follow the one-day sprint cycle
2. Update SPRINT_LOG.md with progress
3. Create GitHub releases for each sprint
4. Ensure all tests pass before deployment

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

