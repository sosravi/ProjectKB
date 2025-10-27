#!/bin/bash

# ProjectKB Lambda Deployment Script
# This script deploys all Lambda functions to the existing infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration from Terraform outputs
LAMBDA_ROLE_ARN="arn:aws:iam::529583112175:role/ProjectKB-production-lambda-execution-role"
AWS_REGION="us-east-1"
FUNCTION_PREFIX="ProjectKB-production"

echo -e "${GREEN}🚀 Starting Lambda deployment...${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd backend
npm install

# Create deployment directory
mkdir -p ../deploy
cd ../deploy

# Deploy key functions first (simplified approach)
FUNCTIONS=(
    "auth-signup:../backend/src/auth/signup.ts"
    "auth-signin:../backend/src/auth/signin.ts"
    "pkb-create:../backend/src/pkb/create.ts"
    "pkb-list:../backend/src/pkb/list.ts"
    "content-generate-presigned-url:../backend/src/content/generate-presigned-url.ts"
    "ai-query-content:../backend/src/ai/query-content.ts"
)

# Deploy each function
for func_config in "${FUNCTIONS[@]}"; do
    IFS=':' read -r func_name func_file <<< "$func_config"
    full_func_name="${FUNCTION_PREFIX}-${func_name}"
    
    echo -e "${YELLOW}📦 Deploying ${full_func_name}...${NC}"
    
    # Create function package
    mkdir -p "lambda-${func_name}"
    cp "${func_file}" "lambda-${func_name}/index.ts"
    cp ../backend/package.json "lambda-${func_name}/"
    
    # Create zip file
    cd "lambda-${func_name}"
    zip -r "../${func_name}.zip" . -q
    cd ..
    
    # Deploy or update Lambda function
    if aws lambda get-function --function-name "${full_func_name}" --region "${AWS_REGION}" >/dev/null 2>&1; then
        echo -e "${YELLOW}  ↳ Updating existing function...${NC}"
        aws lambda update-function-code \
            --function-name "${full_func_name}" \
            --zip-file "fileb://${func_name}.zip" \
            --region "${AWS_REGION}" >/dev/null
    else
        echo -e "${YELLOW}  ↳ Creating new function...${NC}"
        aws lambda create-function \
            --function-name "${full_func_name}" \
            --runtime "nodejs18.x" \
            --role "${LAMBDA_ROLE_ARN}" \
            --handler "index.handler" \
            --zip-file "fileb://${func_name}.zip" \
            --region "${AWS_REGION}" \
            --timeout 30 \
            --memory-size 256 >/dev/null
    fi
    
    echo -e "${GREEN}  ✅ ${full_func_name} deployed successfully${NC}"
done

echo -e "${GREEN}🎉 Core Lambda functions deployed successfully!${NC}"

# Cleanup
cd ..
rm -rf deploy

echo -e "${GREEN}🚀 Lambda deployment complete!${NC}"