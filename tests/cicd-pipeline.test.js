// CI/CD Pipeline Tests - Following TDD Principles
const fs = require('fs');
const path = require('path');

describe('CI/CD Pipeline Configuration - TDD Implementation', () => {
  const workflowsDir = '.github/workflows';
  const infrastructureDir = 'infrastructure';
  const scriptsDir = 'scripts';

  describe('GitHub Actions Workflows', () => {
    test('should have main CI/CD workflow file', () => {
      const workflowPath = path.join(workflowsDir, 'ci-cd.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    test('should have deployment workflow file', () => {
      const workflowPath = path.join(workflowsDir, 'deploy.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    test('should have release workflow file', () => {
      const workflowPath = path.join(workflowsDir, 'release.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    test('should validate CI/CD workflow syntax', () => {
      const workflowPath = path.join(workflowsDir, 'ci-cd.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      
      // Check for required workflow elements
      expect(workflowContent).toContain('name: CI/CD Pipeline');
      expect(workflowContent).toContain('on:');
      expect(workflowContent).toContain('push:');
      expect(workflowContent).toContain('pull_request:');
      expect(workflowContent).toContain('jobs:');
      expect(workflowContent).toContain('test:');
      expect(workflowContent).toContain('build:');
      expect(workflowContent).toContain('deploy:');
    });

    test('should validate deployment workflow syntax', () => {
      const workflowPath = path.join(workflowsDir, 'deploy.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      
      // Check for required deployment elements
      expect(workflowContent).toContain('name: Deploy to Production');
      expect(workflowContent).toContain('on:');
      expect(workflowContent).toContain('release:');
      expect(workflowContent).toContain('jobs:');
      expect(workflowContent).toContain('deploy-frontend:');
      expect(workflowContent).toContain('deploy-backend:');
      expect(workflowContent).toContain('AWS_ACCESS_KEY_ID');
      expect(workflowContent).toContain('AWS_SECRET_ACCESS_KEY');
    });

    test('should validate release workflow syntax', () => {
      const workflowPath = path.join(workflowsDir, 'release.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      
      // Check for required release elements
      expect(workflowContent).toContain('name: Create Release');
      expect(workflowContent).toContain('on:');
      expect(workflowContent).toContain('push:');
      expect(workflowContent).toContain('tags:');
      expect(workflowContent).toContain('jobs:');
      expect(workflowContent).toContain('create-release:');
    });

    test('should have proper environment variables', () => {
      const workflowPath = path.join(workflowsDir, 'deploy.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      
      // Check for required environment variables
      expect(workflowContent).toContain('AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}');
      expect(workflowContent).toContain('AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}');
      expect(workflowContent).toContain('AWS_REGION: ${{ secrets.AWS_REGION }}');
      expect(workflowContent).toContain('S3_BUCKET: ${{ secrets.S3_BUCKET }}');
      expect(workflowContent).toContain('COGNITO_USER_POOL_ID: ${{ secrets.COGNITO_USER_POOL_ID }}');
      expect(workflowContent).toContain('COGNITO_CLIENT_ID: ${{ secrets.COGNITO_CLIENT_ID }}');
    });

    test('should have proper Node.js setup', () => {
      const workflowPath = path.join(workflowsDir, 'ci-cd.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      
      // Check for Node.js setup
      expect(workflowContent).toContain('uses: actions/setup-node@v3');
      expect(workflowContent).toContain('node-version:');
      expect(workflowContent).toContain('cache: npm');
    });

    test('should have proper AWS CLI setup', () => {
      const workflowPath = path.join(workflowsDir, 'deploy.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      
      // Check for AWS CLI setup
      expect(workflowContent).toContain('uses: aws-actions/configure-aws-credentials@v2');
      expect(workflowContent).toContain('aws-access-key-id:');
      expect(workflowContent).toContain('aws-secret-access-key:');
      expect(workflowContent).toContain('aws-region:');
    });
  });

  describe('Infrastructure as Code', () => {
    test('should have CDK infrastructure files', () => {
      const cdkFiles = [
        'infrastructure/lib/projectkb-stack.ts',
        'infrastructure/bin/projectkb.ts',
        'infrastructure/cdk.json',
        'infrastructure/package.json',
        'infrastructure/tsconfig.json'
      ];

      cdkFiles.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
    });

    test('should validate CDK stack configuration', () => {
      const stackPath = 'infrastructure/lib/projectkb-stack.ts';
      const stackContent = fs.readFileSync(stackPath, 'utf8');
      
      // Check for required AWS services
      expect(stackContent).toContain('Cognito');
      expect(stackContent).toContain('DynamoDB');
      expect(stackContent).toContain('S3');
      expect(stackContent).toContain('Lambda');
      expect(stackContent).toContain('ApiGateway');
      expect(stackContent).toContain('Amplify');
      expect(stackContent).toContain('Bedrock');
      expect(stackContent).toContain('Rekognition');
      expect(stackContent).toContain('Transcribe');
    });

    test('should validate CDK package.json', () => {
      const packagePath = 'infrastructure/package.json';
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check for required dependencies
      expect(packageContent.dependencies).toHaveProperty('@aws-cdk/core');
      expect(packageContent.dependencies).toHaveProperty('@aws-cdk/aws-cognito');
      expect(packageContent.dependencies).toHaveProperty('@aws-cdk/aws-dynamodb');
      expect(packageContent.dependencies).toHaveProperty('@aws-cdk/aws-s3');
      expect(packageContent.dependencies).toHaveProperty('@aws-cdk/aws-lambda');
      expect(packageContent.dependencies).toHaveProperty('@aws-cdk/aws-apigateway');
      expect(packageContent.dependencies).toHaveProperty('@aws-cdk/aws-amplify');
    });

    test('should validate CDK configuration', () => {
      const cdkConfigPath = 'infrastructure/cdk.json';
      const cdkConfig = JSON.parse(fs.readFileSync(cdkConfigPath, 'utf8'));
      
      // Check for required configuration
      expect(cdkConfig).toHaveProperty('app');
      expect(cdkConfig).toHaveProperty('context');
      expect(cdkConfig).toHaveProperty('output');
    });
  });

  describe('Deployment Scripts', () => {
    test('should have deployment script', () => {
      const deployScriptPath = path.join(scriptsDir, 'deploy.sh');
      expect(fs.existsSync(deployScriptPath)).toBe(true);
    });

    test('should have rollback script', () => {
      const rollbackScriptPath = path.join(scriptsDir, 'rollback.sh');
      expect(fs.existsSync(rollbackScriptPath)).toBe(true);
    });

    test('should have environment setup script', () => {
      const setupScriptPath = path.join(scriptsDir, 'setup-env.sh');
      expect(fs.existsSync(setupScriptPath)).toBe(true);
    });

    test('should validate deployment script permissions', () => {
      const deployScriptPath = path.join(scriptsDir, 'deploy.sh');
      const stats = fs.statSync(deployScriptPath);
      expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Check if executable
    });

    test('should validate rollback script permissions', () => {
      const rollbackScriptPath = path.join(scriptsDir, 'rollback.sh');
      const stats = fs.statSync(rollbackScriptPath);
      expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Check if executable
    });
  });

  describe('Environment Configuration', () => {
    test('should have environment template files', () => {
      const envFiles = [
        '.env.example',
        '.env.production.example',
        '.env.development.example'
      ];

      envFiles.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
    });

    test('should validate environment template content', () => {
      const envExamplePath = '.env.example';
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Check for required environment variables
      expect(envContent).toContain('AWS_ACCESS_KEY_ID=');
      expect(envContent).toContain('AWS_SECRET_ACCESS_KEY=');
      expect(envContent).toContain('AWS_REGION=');
      expect(envContent).toContain('S3_BUCKET=');
      expect(envContent).toContain('COGNITO_USER_POOL_ID=');
      expect(envContent).toContain('COGNITO_CLIENT_ID=');
      expect(envContent).toContain('API_URL=');
      expect(envContent).toContain('BEDROCK_MODEL_ID=');
    });

    test('should have production environment template', () => {
      const prodEnvPath = '.env.production.example';
      const prodEnvContent = fs.readFileSync(prodEnvPath, 'utf8');
      
      // Check for production-specific variables
      expect(prodEnvContent).toContain('NODE_ENV=production');
      expect(prodEnvContent).toContain('REACT_APP_API_URL=');
      expect(prodEnvContent).toContain('REACT_APP_COGNITO_USER_POOL_ID=');
      expect(prodEnvContent).toContain('REACT_APP_COGNITO_CLIENT_ID=');
    });
  });

  describe('Documentation', () => {
    test('should have deployment documentation', () => {
      const deployDocPath = 'docs/DEPLOYMENT.md';
      expect(fs.existsSync(deployDocPath)).toBe(true);
    });

    test('should have CI/CD documentation', () => {
      const cicdDocPath = 'docs/CI_CD.md';
      expect(fs.existsSync(cicdDocPath)).toBe(true);
    });

    test('should have environment setup documentation', () => {
      const envDocPath = 'docs/ENVIRONMENT_SETUP.md';
      expect(fs.existsSync(envDocPath)).toBe(true);
    });

    test('should validate deployment documentation content', () => {
      const deployDocPath = 'docs/DEPLOYMENT.md';
      const deployContent = fs.readFileSync(deployDocPath, 'utf8');
      
      // Check for required sections
      expect(deployContent).toContain('# Deployment Guide');
      expect(deployContent).toContain('## Prerequisites');
      expect(deployContent).toContain('## AWS Setup');
      expect(deployContent).toContain('## Environment Variables');
      expect(deployContent).toContain('## Deployment Steps');
      expect(deployContent).toContain('## Rollback Procedures');
    });
  });

  describe('Security Configuration', () => {
    test('should have security configuration files', () => {
      const securityFiles = [
        '.github/dependabot.yml',
        '.github/security.yml',
        'security.md'
      ];

      securityFiles.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
    });

    test('should validate dependabot configuration', () => {
      const dependabotPath = '.github/dependabot.yml';
      const dependabotContent = fs.readFileSync(dependabotPath, 'utf8');
      
      // Check for required dependabot elements
      expect(dependabotContent).toContain('version: 2');
      expect(dependabotContent).toContain('updates:');
      expect(dependabotContent).toContain('package-ecosystem: npm');
      expect(dependabotContent).toContain('directory: "/"');
    });

    test('should validate security policy', () => {
      const securityPath = 'security.md';
      const securityContent = fs.readFileSync(securityPath, 'utf8');
      
      // Check for required security elements
      expect(securityContent).toContain('# Security Policy');
      expect(securityContent).toContain('## Supported Versions');
      expect(securityContent).toContain('## Reporting a Vulnerability');
    });
  });

  describe('Monitoring and Logging', () => {
    test('should have monitoring configuration', () => {
      const monitoringFiles = [
        'monitoring/cloudwatch-dashboard.json',
        'monitoring/alarms.json',
        'monitoring/log-groups.json'
      ];

      monitoringFiles.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
    });

    test('should validate CloudWatch dashboard configuration', () => {
      const dashboardPath = 'monitoring/cloudwatch-dashboard.json';
      const dashboardContent = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
      
      // Check for required dashboard elements
      expect(dashboardContent).toHaveProperty('widgets');
      expect(dashboardContent).toHaveProperty('start');
      expect(dashboardContent).toHaveProperty('end');
    });
  });

  describe('Domain Configuration', () => {
    test('should have Route 53 configuration', () => {
      const route53Path = 'infrastructure/lib/route53-stack.ts';
      expect(fs.existsSync(route53Path)).toBe(true);
    });

    test('should validate Route 53 configuration', () => {
      const route53Path = 'infrastructure/lib/route53-stack.ts';
      const route53Content = fs.readFileSync(route53Path, 'utf8');
      
      // Check for required Route 53 elements
      expect(route53Content).toContain('HostedZone');
      expect(route53Content).toContain('ARecord');
      expect(route53Content).toContain('CnameRecord');
    });

    test('should have SSL certificate configuration', () => {
      const sslPath = 'infrastructure/lib/ssl-stack.ts';
      expect(fs.existsSync(sslPath)).toBe(true);
    });
  });
});

