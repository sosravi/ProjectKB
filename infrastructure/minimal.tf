# Minimal Infrastructure Configuration
# Focus: Only essential AWS resources for ProjectKB

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ProjectKB"
}

# Random ID for unique resource names
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket for uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-${var.environment}-uploads-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "${var.project_name} Uploads Bucket"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-users"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  username_attributes = ["email"]
  auto_verified_attributes = ["email"]

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your ProjectKB verification code"
    email_message        = "Your verification code is {####}"
  }

  tags = {
    Name        = "${var.project_name} User Pool"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = true
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = ["https://localhost:3000"]
  logout_urls   = ["https://localhost:3000"]

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# DynamoDB Tables
resource "aws_dynamodb_table" "pkbs" {
  name           = "${var.project_name}-${var.environment}-PKBs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "userId-index"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name} PKBs Table"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_dynamodb_table" "content" {
  name           = "${var.project_name}-${var.environment}-Content"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "pkbId"
    type = "S"
  }

  global_secondary_index {
    name     = "pkbId-index"
    hash_key = "pkbId"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name} Content Table"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Outputs
output "aws_region" {
  description = "AWS region"
  value       = data.aws_region.current.name
}

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "s3_uploads_bucket" {
  description = "S3 uploads bucket name"
  value       = aws_s3_bucket.uploads.bucket
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "dynamodb_pkbs_table" {
  description = "DynamoDB PKBs table name"
  value       = aws_dynamodb_table.pkbs.name
}

output "dynamodb_content_table" {
  description = "DynamoDB Content table name"
  value       = aws_dynamodb_table.content.name
}
