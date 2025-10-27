# Terraform Outputs for ProjectKB Infrastructure

# AWS Configuration
output "aws_region" {
  description = "AWS region where resources are deployed"
  value       = data.aws_region.current.name
}

output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# S3 Buckets
output "s3_uploads_bucket" {
  description = "S3 bucket name for file uploads"
  value       = aws_s3_bucket.uploads.bucket
}

output "s3_uploads_bucket_arn" {
  description = "S3 bucket ARN for file uploads"
  value       = aws_s3_bucket.uploads.arn
}

output "s3_transcribe_bucket" {
  description = "S3 bucket name for audio transcription"
  value       = aws_s3_bucket.transcribe.bucket
}

output "s3_transcribe_bucket_arn" {
  description = "S3 bucket ARN for audio transcription"
  value       = aws_s3_bucket.transcribe.arn
}

output "s3_frontend_builds_bucket" {
  description = "S3 bucket name for frontend builds"
  value       = aws_s3_bucket.frontend_builds.bucket
}

output "s3_frontend_builds_bucket_arn" {
  description = "S3 bucket ARN for frontend builds"
  value       = aws_s3_bucket.frontend_builds.arn
}

# Cognito Configuration
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "cognito_user_pool_client_secret" {
  description = "Cognito User Pool Client Secret"
  value       = aws_cognito_user_pool_client.main.client_secret
  sensitive   = true
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = aws_cognito_identity_pool.main.id
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.main.endpoint
}

# DynamoDB Tables
output "dynamodb_pkbs_table" {
  description = "DynamoDB table name for PKBs"
  value       = aws_dynamodb_table.pkbs.name
}

output "dynamodb_pkbs_table_arn" {
  description = "DynamoDB table ARN for PKBs"
  value       = aws_dynamodb_table.pkbs.arn
}

output "dynamodb_content_table" {
  description = "DynamoDB table name for content"
  value       = aws_dynamodb_table.content.name
}

output "dynamodb_content_table_arn" {
  description = "DynamoDB table ARN for content"
  value       = aws_dynamodb_table.content.arn
}

# API Gateway
output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_arn" {
  description = "API Gateway ARN"
  value       = aws_api_gateway_rest_api.main.arn
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.api_gateway_stage_name}"
}

output "api_gateway_execution_arn" {
  description = "API Gateway execution ARN"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

# IAM Roles
output "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_execution_role.arn
}

output "lambda_execution_role_name" {
  description = "Lambda execution role name"
  value       = aws_iam_role.lambda_execution_role.name
}

# CloudWatch
output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = aws_cloudwatch_log_group.lambda_logs.arn
}

# Domain Configuration (if provided)
output "domain_name" {
  description = "Custom domain name"
  value       = var.domain_name != "" ? var.domain_name : null
}

output "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = var.domain_name != "" ? aws_route53_zone.main[0].zone_id : null
}

output "hosted_zone_name_servers" {
  description = "Route 53 hosted zone name servers"
  value       = var.domain_name != "" ? aws_route53_zone.main[0].name_servers : null
}

output "ssl_certificate_arn" {
  description = "SSL certificate ARN"
  value       = var.domain_name != "" ? aws_acm_certificate.main[0].arn : null
}

# AI Services Configuration
output "bedrock_model_id" {
  description = "Bedrock model ID for Claude"
  value       = "anthropic.claude-3-sonnet-20240229-v1:0"
}

output "bedrock_region" {
  description = "Bedrock service region"
  value       = data.aws_region.current.name
}

# Environment Configuration
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}

# Frontend Configuration
output "frontend_config" {
  description = "Frontend configuration object"
  value = {
    api_url                    = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.api_gateway_stage_name}"
    cognito_user_pool_id       = aws_cognito_user_pool.main.id
    cognito_user_pool_client_id = aws_cognito_user_pool_client.main.id
    s3_bucket                  = aws_s3_bucket.uploads.bucket
    s3_region                  = data.aws_region.current.name
    bedrock_model_id           = "anthropic.claude-3-sonnet-20240229-v1:0"
    domain_name                = var.domain_name != "" ? var.domain_name : null
  }
}

# Backend Configuration
output "backend_config" {
  description = "Backend configuration object"
  value = {
    aws_region                 = data.aws_region.current.name
    s3_uploads_bucket          = aws_s3_bucket.uploads.bucket
    s3_transcribe_bucket      = aws_s3_bucket.transcribe.bucket
    cognito_user_pool_id       = aws_cognito_user_pool.main.id
    cognito_user_pool_client_id = aws_cognito_user_pool_client.main.id
    dynamodb_pkbs_table        = aws_dynamodb_table.pkbs.name
    dynamodb_content_table     = aws_dynamodb_table.content.name
    api_gateway_id             = aws_api_gateway_rest_api.main.id
    lambda_execution_role_arn  = aws_iam_role.lambda_execution_role.arn
    bedrock_model_id           = "anthropic.claude-3-sonnet-20240229-v1:0"
    cloudwatch_log_group       = aws_cloudwatch_log_group.lambda_logs.name
  }
}

# Frontend Website URL
output "frontend_website_url" {
  description = "Frontend website URL (S3 website endpoint)"
  value       = "http://${aws_s3_bucket.frontend_builds.bucket}.s3-website-${data.aws_region.current.name}.amazonaws.com"
}

# GitHub Actions Configuration
output "github_actions_config" {
  description = "Configuration for GitHub Actions secrets"
  value = {
    AWS_REGION                 = data.aws_region.current.name
    S3_BUCKET                  = aws_s3_bucket.uploads.bucket
    TRANSCRIBE_BUCKET          = aws_s3_bucket.transcribe.bucket
    COGNITO_USER_POOL_ID       = aws_cognito_user_pool.main.id
    COGNITO_CLIENT_ID          = aws_cognito_user_pool_client.main.id
    API_URL                    = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.api_gateway_stage_name}"
    BEDROCK_MODEL_ID           = "anthropic.claude-3-sonnet-20240229-v1:0"
    DYNAMODB_PKB_TABLE         = aws_dynamodb_table.pkbs.name
    DYNAMODB_CONTENT_TABLE     = aws_dynamodb_table.content.name
    LAMBDA_EXECUTION_ROLE_ARN  = aws_iam_role.lambda_execution_role.arn
    CLOUDWATCH_LOG_GROUP       = aws_cloudwatch_log_group.lambda_logs.name
    DOMAIN_NAME                = var.domain_name != "" ? var.domain_name : null
    HOSTED_ZONE_ID             = var.domain_name != "" ? aws_route53_zone.main[0].zone_id : null
    SSL_CERTIFICATE_ARN        = var.domain_name != "" ? aws_acm_certificate.main[0].arn : null
    FRONTEND_URL               = "http://${aws_s3_bucket.frontend_builds.bucket}.s3-website-${data.aws_region.current.name}.amazonaws.com"
  }
}

