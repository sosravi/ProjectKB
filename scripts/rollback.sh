#!/bin/bash

# ProjectKB Rollback Script
# This script rolls back the ProjectKB application to a previous version

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
ROLLBACK_VERSION=${2:-previous}

echo -e "${YELLOW}🔄 Starting ProjectKB rollback for ${ENVIRONMENT}${NC}"

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

# Get previous version
get_previous_version() {
    echo -e "${YELLOW}📋 Getting previous version...${NC}"
    
    # Get previous CloudFormation stack version
    PREVIOUS_STACK=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query "StackSummaries[?contains(StackName, '${STACK_NAME}') && StackName != '${STACK_NAME}'].StackName" \
        --output text | head -1)
    
    if [ -z "$PREVIOUS_STACK" ]; then
        echo -e "${RED}❌ No previous version found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Previous version found: ${PREVIOUS_STACK}${NC}"
}

# Rollback infrastructure
rollback_infrastructure() {
    echo -e "${YELLOW}🏗️ Rolling back infrastructure with Terraform...${NC}"
    
    cd infrastructure
    
    # Rollback Terraform stack
    terraform destroy -var="environment=${ENVIRONMENT}" -auto-approve
    
    cd ..
    
    echo -e "${GREEN}✅ Infrastructure rolled back${NC}"
}

# Rollback backend
rollback_backend() {
    echo -e "${YELLOW}⚙️ Rolling back backend...${NC}"
    
    cd backend
    
    # Rollback Lambda functions
    npm run rollback:${ENVIRONMENT}
    
    cd ..
    
    echo -e "${GREEN}✅ Backend rolled back${NC}"
}

# Rollback frontend
rollback_frontend() {
    echo -e "${YELLOW}🎨 Rolling back frontend...${NC}"
    
    cd frontend
    
    # Rollback Amplify deployment
    npm run rollback:${ENVIRONMENT}
    
    cd ..
    
    echo -e "${GREEN}✅ Frontend rolled back${NC}"
}

# Restore database from backup
restore_database() {
    echo -e "${YELLOW}🗄️ Restoring database from backup...${NC}"
    
    # Get latest backup
    LATEST_BACKUP=$(aws dynamodb list-backups \
        --table-name "${STACK_NAME}-PKB" \
        --query 'BackupSummaries[0].BackupArn' \
        --output text)
    
    if [ "$LATEST_BACKUP" != "None" ] && [ "$LATEST_BACKUP" != "null" ]; then
        echo "Restoring from backup: ${LATEST_BACKUP}"
        
        # Restore table from backup
        aws dynamodb restore-table-from-backup \
            --target-table-name "${STACK_NAME}-PKB" \
            --backup-arn "${LATEST_BACKUP}"
        
        echo -e "${GREEN}✅ Database restored from backup${NC}"
    else
        echo -e "${YELLOW}⚠️ No backup found, skipping database restore${NC}"
    fi
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

# Main rollback function
main() {
    echo -e "${YELLOW}🔄 ProjectKB Rollback Script${NC}"
    echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
    echo -e "${YELLOW}AWS Region: ${AWS_REGION}${NC}"
    echo -e "${YELLOW}Stack Name: ${STACK_NAME}${NC}"
    echo -e "${YELLOW}Rollback Version: ${ROLLBACK_VERSION}${NC}"
    echo ""
    
    # Confirm rollback
    read -p "Are you sure you want to rollback? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Rollback cancelled${NC}"
        exit 0
    fi
    
    # Run rollback steps
    check_prerequisites
    get_previous_version
    rollback_infrastructure
    rollback_backend
    rollback_frontend
    restore_database
    
    # Wait for rollback to complete
    echo -e "${YELLOW}⏳ Waiting for rollback to complete...${NC}"
    sleep 30
    
    # Run health checks
    if health_checks; then
        echo -e "${GREEN}🎉 Rollback completed successfully!${NC}"
        echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
        echo -e "${GREEN}API URL: ${API_URL}${NC}"
    else
        echo -e "${RED}❌ Rollback completed but health checks failed${NC}"
        echo -e "${YELLOW}Please check the application manually${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [environment] [version]"
        echo "  environment: production|staging (default: production)"
        echo "  version: previous|specific-version (default: previous)"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION: AWS region (default: us-east-1)"
        echo "  FRONTEND_URL: Frontend URL for health checks"
        echo "  API_URL: API URL for health checks"
        exit 0
        ;;
    --version|-v)
        echo "ProjectKB Rollback Script v1.0.0"
        exit 0
        ;;
esac

# Run main function
main "$@"
