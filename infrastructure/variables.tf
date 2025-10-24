# Terraform Variables for ProjectKB Infrastructure

variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ProjectKB"
}

variable "domain_name" {
  description = "Custom domain name for the application (optional)"
  type        = string
  default     = ""
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring and alarms"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable DynamoDB point-in-time recovery"
  type        = bool
  default     = true
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 512
}

variable "api_gateway_stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "prod"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {
    "CostCenter"         = "Engineering"
    "Owner"              = "ProjectKB Team"
    "Project"            = "ProjectKB"
    "Environment"        = "production"
    "DataClassification" = "Internal"
    "BackupRequired"     = "Yes"
    "Compliance"         = "SOC2"
    "CreatedBy"          = "Terraform"
    "SecurityLevel"      = "High"
    "EncryptionRequired" = "Yes"
    "MonitoringEnabled"  = "Yes"
    "AutoScaling"        = "Enabled"
    "DisasterRecovery"   = "Enabled"
    "CostOptimization"   = "Enabled"
    "ResourceType"       = "Infrastructure"
    "DeploymentMethod"   = "Terraform"
    "Version"            = "1.0.0"
    "LastModified"       = timestamp()
  }
}
