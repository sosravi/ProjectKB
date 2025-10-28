# ProjectKB Terraform Infrastructure
# This creates all AWS resources needed for ProjectKB

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Random ID for unique resource naming
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Buckets
resource "aws_s3_bucket" "uploads" {
  bucket = "${lower(var.project_name)}-${var.environment}-uploads-${random_id.bucket_suffix.hex}"
  
  tags = merge(var.tags, {
    Name                = "${var.project_name} Uploads Bucket"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "File Uploads"
    DataClassification  = "Internal"
    BackupRequired      = "Yes"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
  })
}

resource "aws_s3_bucket" "transcribe" {
  bucket = "${lower(var.project_name)}-${var.environment}-transcribe-${random_id.bucket_suffix.hex}"
  
  tags = merge(var.tags, {
    Name                = "${var.project_name} Transcribe Bucket"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "Audio Transcription"
    DataClassification  = "Internal"
    BackupRequired      = "Yes"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
  })
}

resource "aws_s3_bucket" "frontend_builds" {
  bucket = "${lower(var.project_name)}-${var.environment}-builds-${random_id.bucket_suffix.hex}"
  
  tags = merge(var.tags, {
    Name                = "${var.project_name} Frontend Builds"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "Frontend Build Artifacts"
    DataClassification  = "Internal"
    BackupRequired      = "No"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
  })
}


# S3 Bucket configurations
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "transcribe" {
  bucket = aws_s3_bucket.transcribe.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "frontend_builds" {
  bucket = aws_s3_bucket.frontend_builds.id
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

resource "aws_s3_bucket_server_side_encryption_configuration" "transcribe" {
  bucket = aws_s3_bucket.transcribe.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_builds" {
  bucket = aws_s3_bucket.frontend_builds.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Website hosting configuration for frontend (SPA support)
resource "aws_s3_bucket_website_configuration" "frontend_builds" {
  bucket = aws_s3_bucket.frontend_builds.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# S3 public access configuration for frontend bucket
resource "aws_s3_bucket_public_access_block" "frontend_builds" {
  bucket = aws_s3_bucket.frontend_builds.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket policy for public read access to frontend
resource "aws_s3_bucket_policy" "frontend_builds" {
  bucket = aws_s3_bucket.frontend_builds.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_builds.arn}/*"
      }
    ]
  })
}

# S3 Bucket policies
resource "aws_s3_bucket_policy" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowLambdaAccess"
        Effect    = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
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

  tags = merge(var.tags, {
    Name                = "${var.project_name} User Pool"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "User Authentication"
    DataClassification  = "Confidential"
    BackupRequired      = "Yes"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "High"
    EncryptionRequired  = "Yes"
  })
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = var.domain_name != "" ? [
    "https://${var.domain_name}",
    "https://www.${var.domain_name}"
  ] : ["http://localhost:3000"]

  logout_urls = var.domain_name != "" ? [
    "https://${var.domain_name}",
    "https://www.${var.domain_name}"
  ] : ["http://localhost:3000"]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  generate_secret = false
}

# Cognito Identity Pool
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}-${var.environment}-identity"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }

  tags = {
    Name        = "${var.project_name} Identity Pool"
    Environment = var.environment
    Project     = var.project_name
  }
}

# DynamoDB Tables
resource "aws_dynamodb_table" "pkbs" {
  name           = "${var.project_name}-${var.environment}-PKBs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "userId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name     = "userId-createdAt-index"
    hash_key = "userId"
    range_key = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_backup
  }

  tags = merge(var.tags, {
    Name                = "${var.project_name} PKBs Table"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "Project Knowledge Base Storage"
    DataClassification  = "Confidential"
    BackupRequired      = "Yes"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "High"
    EncryptionRequired  = "Yes"
    TableType           = "Primary"
  })
}

resource "aws_dynamodb_table" "content" {
  name           = "${var.project_name}-${var.environment}-Content"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "pkbId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "pkbId"
    type = "S"
  }

  attribute {
    name = "uploadedAt"
    type = "S"
  }

  global_secondary_index {
    name     = "pkbId-uploadedAt-index"
    hash_key = "pkbId"
    range_key = "uploadedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_backup
  }

  tags = merge(var.tags, {
    Name                = "${var.project_name} Content Table"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "Content Metadata Storage"
    DataClassification  = "Confidential"
    BackupRequired      = "Yes"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "High"
    EncryptionRequired  = "Yes"
    TableType           = "Secondary"
  })
}

# IAM Role for Lambda functions
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.project_name}-${var.environment}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name                = "${var.project_name} Lambda Execution Role"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "Lambda Function Execution"
    DataClassification  = "Internal"
    BackupRequired      = "No"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "High"
    RoleType            = "Service"
  })
}

# IAM Policy for Lambda functions
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-${var.environment}-lambda-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.pkbs.arn,
          "${aws_dynamodb_table.pkbs.arn}/index/*",
          aws_dynamodb_table.content.arn,
          "${aws_dynamodb_table.content.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "${aws_s3_bucket.uploads.arn}/*",
          "${aws_s3_bucket.transcribe.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GeneratePresignedPost",
          "s3:GeneratePresignedUrl"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          aws_s3_bucket.transcribe.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminRespondToAuthChallenge",
          "cognito-idp:ForgotPassword",
          "cognito-idp:ConfirmForgotPassword",
          "cognito-idp:ResendConfirmationCode"
        ]
        Resource = aws_cognito_user_pool.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rekognition:DetectLabels",
          "rekognition:DetectText",
          "rekognition:DetectFaces"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob"
        ]
        Resource = "*"
      }
    ]
  })
}

# API Gateway
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.environment}-API"
  description = "ProjectKB API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(var.tags, {
    Name                = "${var.project_name} API Gateway"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "REST API Gateway"
    DataClassification  = "Internal"
    BackupRequired      = "No"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "High"
    APIType             = "REST"
  })
}

# API Gateway Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name                   = "CognitoAuthorizer"
  rest_api_id            = aws_api_gateway_rest_api.main.id
  type                   = "COGNITO_USER_POOLS"
  provider_arns          = [aws_cognito_user_pool.main.arn]
  authorizer_credentials = aws_iam_role.lambda_execution_role.arn
}

# API Gateway CORS Configuration
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_rest_api.main.root_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_rest_api.main.root_resource_id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_rest_api.main.root_resource_id
  http_method = aws_api_gateway_method.proxy_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_rest_api.main.root_resource_id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = aws_api_gateway_method_response.proxy_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# API Gateway Resources for specific endpoints
resource "aws_api_gateway_resource" "pkb" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "pkb"
}

resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "auth"
}

resource "aws_api_gateway_resource" "content" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "content"
}

resource "aws_api_gateway_resource" "content_presigned" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.content.id
  path_part   = "presigned-url"
}

# API Gateway Method for presigned URL generation
resource "aws_api_gateway_method" "content_presigned_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.content_presigned.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "content_presigned" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.content_presigned.id
  http_method = aws_api_gateway_method.content_presigned_post.http_method
  type        = "AWS_PROXY"
  uri         = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-content-generate-presigned-url/invocations"
  
  integration_http_method = "POST"
}

# Lambda permission for API Gateway to invoke content-generate-presigned-url
resource "aws_lambda_permission" "api_gateway_content_presigned" {
  statement_id  = "AllowExecutionFromAPIGatewayContentPresigned"
  action        = "lambda:InvokeFunction"
  function_name = "${var.project_name}-${var.environment}-content-generate-presigned-url"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway Methods and Integrations for PKB endpoints
resource "aws_api_gateway_method" "pkb_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.pkb.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "pkb_list" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.pkb.id
  http_method = aws_api_gateway_method.pkb_get.http_method
  type        = "AWS_PROXY"
  uri         = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-pkb-list/invocations"
  
  integration_http_method = "POST"
}

# Lambda permission for API Gateway to invoke pkb-list
resource "aws_lambda_permission" "api_gateway_pkb_list" {
  statement_id  = "AllowExecutionFromAPIGatewayPKB"
  action        = "lambda:InvokeFunction"
  function_name = "${var.project_name}-${var.environment}-pkb-list"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# POST method for creating PKBs
resource "aws_api_gateway_method" "pkb_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.pkb.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "pkb_create" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.pkb.id
  http_method = aws_api_gateway_method.pkb_post.http_method
  type        = "AWS_PROXY"
  uri         = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-pkb-create/invocations"
  
  integration_http_method = "POST"
}

# Lambda permission for API Gateway to invoke pkb-create
resource "aws_lambda_permission" "api_gateway_pkb_create" {
  statement_id  = "AllowExecutionFromAPIGatewayPKBCreate"
  action        = "lambda:InvokeFunction"
  function_name = "${var.project_name}-${var.environment}-pkb-create"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy_options.id,
      aws_api_gateway_integration.proxy_options.id,
      aws_api_gateway_method.pkb_get.id,
      aws_api_gateway_method.pkb_post.id,
      aws_api_gateway_method.content_presigned_post.id,
    ]))
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.api_gateway_stage_name
  
  xray_tracing_enabled = false
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name                = "${var.project_name} Lambda Logs"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "Lambda Function Logs"
    DataClassification  = "Internal"
    BackupRequired      = "No"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "Medium"
    LogType             = "Application"
    RetentionPeriod     = "${var.log_retention_days} days"
  })
}

# Route 53 Hosted Zone (if domain provided)
resource "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name

  tags = merge(var.tags, {
    Name                = "${var.project_name} Hosted Zone"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "DNS Management"
    DataClassification  = "Internal"
    BackupRequired      = "No"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "High"
    ServiceType         = "DNS"
  })
}

# SSL Certificate (if domain provided)
resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" ? 1 : 0
  
  domain_name       = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]

  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name                = "${var.project_name} SSL Certificate"
    Environment         = var.environment
    Project             = var.project_name
    CostCenter          = "Engineering"
    Owner               = "ProjectKB Team"
    Purpose             = "SSL/TLS Certificate"
    DataClassification  = "Internal"
    BackupRequired      = "No"
    Compliance          = "SOC2"
    CreatedBy           = "Terraform"
    LastModified        = timestamp()
    SecurityLevel       = "High"
    CertificateType     = "SSL/TLS"
  })
}

# SSL Certificate Validation (if domain provided)
resource "aws_route53_record" "cert_validation" {
  count = var.domain_name != "" ? 2 : 0

  allow_overwrite = true
  name            = tolist(aws_acm_certificate.main[0].domain_validation_options)[count.index].resource_record_name
  records         = [tolist(aws_acm_certificate.main[0].domain_validation_options)[count.index].resource_record_value]
  ttl             = 60
  type            = tolist(aws_acm_certificate.main[0].domain_validation_options)[count.index].resource_record_type
  zone_id         = aws_route53_zone.main[0].zone_id
}

resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
}

