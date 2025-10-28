#!/bin/bash

# ProjectKB Initial Setup Script
# This script sets up the development environment for ProjectKB

set -e

echo "🚀 Setting up ProjectKB development environment..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "🔍 Checking required tools..."
check_tool "node"
check_tool "npm"
check_tool "aws"
check_tool "git"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
else
    echo "✅ Node.js version $(node -v) is compatible"
fi

# Install CDK globally if not already installed
if ! command -v cdk &> /dev/null; then
    echo "📦 Installing AWS CDK globally..."
    npm install -g aws-cdk
else
    echo "✅ AWS CDK is already installed"
fi

# Install dependencies for each part of the project
echo "📦 Installing dependencies..."

echo "  - Infrastructure dependencies..."
cd infrastructure
npm install
cd ..

echo "  - Frontend dependencies..."
cd frontend
npm install
cd ..

echo "  - Backend dependencies..."
cd backend
npm install
cd ..

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p frontend/src/components
mkdir -p frontend/src/pages
mkdir -p frontend/src/hooks
mkdir -p frontend/src/services
mkdir -p frontend/src/utils
mkdir -p backend/src/auth
mkdir -p backend/src/pkb
mkdir -p backend/src/content
mkdir -p backend/src/ai
mkdir -p tests/integration
mkdir -p tests/unit

# Create environment files template
echo "📝 Creating environment files template..."

cat > infrastructure/.env.template << EOF
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
EOF

cat > frontend/.env.template << EOF
REACT_APP_API_URL=https://your-api-gateway-url.amazonaws.com/prod
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-user-pool-client-id
REACT_APP_REGION=us-east-1
EOF

cat > backend/.env.template << EOF
AWS_REGION=us-east-1
PKB_TABLE=projectkb-pkbs
CONTENT_TABLE=projectkb-content
FILE_BUCKET=projectkb-files
EOF

# Create gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
frontend/build/
backend/dist/
infrastructure/cdk.out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# AWS
.aws/
aws-exports.js

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port
EOF
fi

# Initialize git repository if not already initialized
if [ ! -d .git ]; then
    echo "🔧 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: ProjectKB setup"
else
    echo "✅ Git repository already initialized"
fi

echo ""
echo "🎉 ProjectKB setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure AWS credentials: aws configure"
echo "2. Set up OAuth providers (Google, Microsoft)"
echo "3. Copy .env.template files to .env and fill in values"
echo "4. Bootstrap CDK: cd infrastructure && cdk bootstrap"
echo "5. Deploy infrastructure: cd infrastructure && npm run deploy"
echo "6. Start development: cd frontend && npm start"
echo ""
echo "For detailed instructions, see docs/DEPLOYMENT.md"
echo "For sprint tracking, see docs/SPRINT_LOG.md"
echo ""
echo "Happy coding! 🚀"


