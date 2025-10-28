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

# Install dependencies and build
echo -e "${YELLOW}📦 Installing dependencies and building...${NC}"
cd backend
npm install
npm run build

# Create deployment directory
mkdir -p ../deploy
cd ../deploy

# Deploy key functions first (simplified approach)
FUNCTIONS=(
    "auth-signup:../backend/dist/auth/signup.js"
    "auth-signin:../backend/dist/auth/signin.js"
    "pkb-create:../backend/dist/pkb/create.js"
    "pkb-list:../backend/dist/pkb/list.js"
    "content-generate-presigned-url:../backend/dist/content/generate-presigned-url.js"
    "ai-query-content:../backend/dist/ai/query-content.js"
)

# Deploy each function
for func_config in "${FUNCTIONS[@]}"; do
    IFS=':' read -r func_name func_file <<< "$func_config"
    full_func_name="${FUNCTION_PREFIX}-${func_name}"
    
    echo -e "${YELLOW}📦 Deploying ${full_func_name}...${NC}"
    
    # Create function package with compiled JS
    mkdir -p "lambda-${func_name}"
    cp "${func_file}" "lambda-${func_name}/index.js"
    
    # Only copy necessary dependencies (aws-sdk is available in Lambda runtime)
    mkdir -p "lambda-${func_name}/node_modules"
    if [ -d "../backend/node_modules/jsonwebtoken" ]; then
        cp -r ../backend/node_modules/jsonwebtoken "lambda-${func_name}/node_modules/"
    fi
    if [ -d "../backend/node_modules/uuid" ]; then
        cp -r ../backend/node_modules/uuid "lambda-${func_name}/node_modules/"
    fi
    if [ -d "../backend/node_modules/.bin" ]; then
        mkdir -p "lambda-${func_name}/node_modules/.bin"
    fi
    # Copy dependencies of jsonwebtoken and uuid if they exist
    if [ -d "../backend/node_modules/jwa" ]; then
        cp -r ../backend/node_modules/jwa "lambda-${func_name}/node_modules/" || true
    fi
    if [ -d "../backend/node_modules/jws" ]; then
        cp -r ../backend/node_modules/jws "lambda-${func_name}/node_modules/" || true
    fi
    if [ -d "../backend/node_modules/safe-buffer" ]; then
        cp -r ../backend/node_modules/safe-buffer "lambda-${func_name}/node_modules/" || true
    fi
    
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