# Destroy and Recreate Infrastructure

This document describes how to completely destroy and recreate the ProjectKB infrastructure using Terraform.

## ⚠️ Warning

Destroying infrastructure will **DELETE ALL DATA** including:
- All users in Cognito User Pools
- All data in DynamoDB tables
- All files in S3 buckets
- All Lambda functions
- All API Gateway configurations

**Only proceed if you're certain this is what you want to do.**

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.0 installed
3. Access to AWS Account: `529583112175`
4. Region: `us-east-1`

## Destroy Infrastructure

```bash
cd infrastructure
terraform destroy -var='environment=production' -auto-approve
```

This will:
- Delete all S3 buckets and their contents
- Delete all DynamoDB tables and their data
- Delete Cognito User Pool and all users
- Delete API Gateway and all configurations
- Delete Lambda functions and logs
- Delete IAM roles and policies
- Keep nothing (except CloudFormation stacks if using)

## Recreate Infrastructure

```bash
# Initialize Terraform
terraform init -reconfigure

# Review what will be created
terraform plan -var='environment=production'

# Apply the configuration
terraform apply -var='environment=production' -auto-approve
```

This will recreate:
- All S3 buckets with website hosting configuration
- All DynamoDB tables with proper indexes
- Cognito User Pool with app client
- API Gateway with CORS configuration
- IAM roles and policies
- CloudWatch log groups

## Verify Deployment

After recreation, verify:

1. **Get outputs:**
   ```bash
   terraform output
   ```

2. **Test frontend:**
   ```bash
   curl -I $(terraform output -raw frontend_website_url)
   ```

3. **Test Cognito:**
   ```bash
   aws cognito-idp describe-user-pool \
     --user-pool-id $(terraform output -raw cognito_user_pool_id)
   ```

4. **Test DynamoDB:**
   ```bash
   aws dynamodb describe-table \
     --table-name $(terraform output -raw s3_uploads_bucket)
   ```

5. **Create test user:**
   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id $(terraform output -raw cognito_user_pool_id) \
     --username test@example.com \
     --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
     --temporary-password TempPass123! \
     --message-action SUPPRESS

   aws cognito-idp admin-set-user-password \
     --user-pool-id $(terraform output -raw cognito_user_pool_id) \
     --username test@example.com \
     --password TestPass123! \
     --permanent
   ```

6. **Deploy frontend:**
   ```bash
   cd ../frontend
   npm run build
   aws s3 sync build/ s3://$(cd ../infrastructure && terraform output -raw s3_frontend_builds_bucket) --delete
   ```

7. **Access application:**
   - Frontend: http://$(terraform output -raw frontend_website_url | cut -d'/' -f3)
   - API Gateway: https://$(terraform output -raw api_gateway_url)

## Partial Recreate

If you only want to recreate specific components:

### Recreate S3 Buckets Only
```bash
terraform destroy -target=aws_s3_bucket.frontend_builds -var='environment=production' -auto-approve
terraform apply -target=aws_s3_bucket.frontend_builds -var='environment=production' -auto-approve
```

### Recreate DynamoDB Tables Only
```bash
terraform destroy -target=aws_dynamodb_table.pkbs -target=aws_dynamodb_table.content -var='environment=production' -auto-approve
terraform apply -target=aws_dynamodb_table.pkbs -target=aws_dynamodb_table.content -var='environment=production' -auto-approve
```

### Recreate Cognito User Pool Only
```bash
terraform destroy -target=aws_cognito_user_pool.main -var='environment=production' -auto-approve
terraform apply -target=aws_cognito_user_pool.main -var='environment=production' -auto-approve
```

## Troubleshooting

### Error: "Bucket already exists"
If S3 bucket name conflicts:
1. Check existing buckets: `aws s3 ls`
2. Manually delete conflicting bucket if empty
3. Update `variables.tf` with a new project name
4. Re-run `terraform apply`

### Error: "API Gateway method already exists"
If CORS configuration conflicts:
1. Import existing method into state
2. Or manually delete the API Gateway method
3. Re-run `terraform apply`

### Error: "DynamoDB table already exists"
If table conflicts:
1. Check existing tables: `aws dynamodb list-tables`
2. Wait for table to be fully deleted (can take several minutes)
3. Re-run `terraform apply`

## Best Practices

1. **Always backup data before destroying:**
   ```bash
   # Export DynamoDB data
   aws dynamodb scan --table-name ProjectKB-production-PKBs > backup_pkbs.json
   aws dynamodb scan --table-name ProjectKB-production-Content > backup_content.json
   
   # Download S3 files
   aws s3 sync s3://projectkb-production-uploads-aa11c8fa ./backup/uploads
   ```

2. **Use state locking in production:**
   ```bash
   terraform {
     backend "s3" {
       bucket = "your-terraform-state-bucket"
       key    = "projectkb/terraform.tfstate"
       region = "us-east-1"
       dynamodb_table = "terraform-state-lock"
     }
   }
   ```

3. **Tag resources for cost tracking:**
   All resources are automatically tagged with:
   - Environment
   - Project
   - CostCenter
   - Owner
   - Purpose
   - Compliance requirements

4. **Monitor costs after recreation:**
   ```bash
   aws ce get-cost-and-usage \
     --time-period Start=2025-10-27,End=2025-10-28 \
     --granularity DAILY \
     --metrics BlendedCost \
     --filter file://filter.json
   ```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `terraform plan` | Preview changes |
| `terraform apply` | Apply changes |
| `terraform destroy` | Destroy infrastructure |
| `terraform output` | View outputs |
| `terraform refresh` | Refresh state |
| `terraform state list` | List managed resources |
| `terraform import` | Import existing resources |
| `terraform validate` | Validate configuration |

## Contact

For issues or questions:
- GitHub Issues: https://github.com/sosravi/ProjectKB/issues
- Documentation: See `/docs` directory

---

**Last Updated**: October 27, 2025
**Infrastructure Version**: 1.4.0


