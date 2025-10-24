#!/bin/bash

# ProjectKB Deployment Script
# This script deploys the ProjectKB application to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="ProjectKB-${ENVIRONMENT}"

echo -e "${GREEN}🚀 Starting ProjectKB deployment to ${ENVIRONMENT}${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    # Install frontend dependencies
    echo "Installing frontend dependencies..."
    cd frontend
    npm ci
    cd ..
    
    # Install backend dependencies
    echo "Installing backend dependencies..."
    cd backend
    npm ci
    cd ..
    
    # Install infrastructure dependencies
    echo "Installing infrastructure dependencies..."
    cd infrastructure
    npm ci
    cd ..
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Build application
build_application() {
    echo -e "${YELLOW}🔨 Building application...${NC}"
    
    # Build frontend
    echo "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Build backend
    echo "Building backend..."
    cd backend
    npm run build
    cd ..
    
    # Build infrastructure
    echo "Building infrastructure..."
    cd infrastructure
    npm run build
    cd ..
    
    echo -e "${GREEN}✅ Application built${NC}"
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}🏗️ Deploying infrastructure...${NC}"
    
    cd infrastructure
    
    # Deploy CDK stack
    npm run deploy:${ENVIRONMENT}
    
    cd ..
    
    echo -e "${GREEN}✅ Infrastructure deployed${NC}"
}

# Deploy backend
deploy_backend() {
    echo -e "${YELLOW}⚙️ Deploying backend...${NC}"
    
    cd backend
    
    # Deploy Lambda functions
    npm run deploy:${ENVIRONMENT}
    
    cd ..
    
    echo -e "${GREEN}✅ Backend deployed${NC}"
}

# Deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}🎨 Deploying frontend...${NC}"
    
    cd frontend
    
    # Deploy to Amplify
    npm run deploy:${ENVIRONMENT}
    
    cd ..
    
    echo -e "${GREEN}✅ Frontend deployed${NC}"
}

# Run health checks
health_checks() {
    echo -e "${YELLOW}🏥 Running health checks...${NC}"
    
    # Get deployment URLs from environment variables
    FRONTEND_URL=${FRONTEND_URL:-"https://your-frontend-url.com"}
    API_URL=${API_URL:-"https://your-api-url.com"}
    
    # Check frontend
    echo "Checking frontend..."
    if curl -f -s "${FRONTEND_URL}" > /dev/null; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
    else
        echo -e "${RED}❌ Frontend health check failed${NC}"
        return 1
    fi
    
    # Check API
    echo "Checking API..."
    if curl -f -s "${API_URL}/health" > /dev/null; then
        echo -e "${GREEN}✅ API is accessible${NC}"
    else
        echo -e "${RED}❌ API health check failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All health checks passed${NC}"
}

# Main deployment function
main() {
    echo -e "${GREEN}🎯 ProjectKB Deployment Script${NC}"
    echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
    echo -e "${GREEN}AWS Region: ${AWS_REGION}${NC}"
    echo -e "${GREEN}Stack Name: ${STACK_NAME}${NC}"
    echo ""
    
    # Run deployment steps
    check_prerequisites
    install_dependencies
    build_application
    deploy_infrastructure
    deploy_backend
    deploy_frontend
    
    # Wait for deployment to complete
    echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
    sleep 30
    
    # Run health checks
    if health_checks; then
        echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
        echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
        echo -e "${GREEN}API URL: ${API_URL}${NC}"
    else
        echo -e "${RED}❌ Deployment completed but health checks failed${NC}"
        echo -e "${YELLOW}Please check the application manually${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [environment]"
        echo "  environment: production|staging (default: production)"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION: AWS region (default: us-east-1)"
        echo "  FRONTEND_URL: Frontend URL for health checks"
        echo "  API_URL: API URL for health checks"
        exit 0
        ;;
    --version|-v)
        echo "ProjectKB Deployment Script v1.0.0"
        exit 0
        ;;
esac

# Run main function
main "$@"
