#!/bin/bash

# ProjectKB Environment Setup Script
# This script helps set up the development and deployment environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ProjectKB Environment Setup Script${NC}"

# Check if running on macOS, Linux, or Windows
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    echo -e "${GREEN}✅ Detected OS: ${OS}${NC}"
}

# Install Node.js
install_nodejs() {
    echo -e "${YELLOW}📦 Installing Node.js...${NC}"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✅ Node.js already installed: ${NODE_VERSION}${NC}"
        
        # Check if version is 18 or higher
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            echo -e "${YELLOW}⚠️ Node.js version ${NODE_VERSION} is below 18. Please upgrade.${NC}"
        fi
    else
        echo -e "${YELLOW}Installing Node.js 18...${NC}"
        
        case $OS in
            "macos")
                if command -v brew &> /dev/null; then
                    brew install node@18
                else
                    echo -e "${RED}❌ Homebrew not found. Please install Node.js manually.${NC}"
                    exit 1
                fi
                ;;
            "linux")
                curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                sudo apt-get install -y nodejs
                ;;
            "windows")
                echo -e "${YELLOW}Please install Node.js 18+ from https://nodejs.org${NC}"
                ;;
        esac
    fi
}

# Install AWS CLI
install_aws_cli() {
    echo -e "${YELLOW}☁️ Installing AWS CLI...${NC}"
    
    if command -v aws &> /dev/null; then
        AWS_VERSION=$(aws --version)
        echo -e "${GREEN}✅ AWS CLI already installed: ${AWS_VERSION}${NC}"
    else
        echo -e "${YELLOW}Installing AWS CLI...${NC}"
        
        case $OS in
            "macos")
                if command -v brew &> /dev/null; then
                    brew install awscli
                else
                    curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
                    sudo installer -pkg AWSCLIV2.pkg -target /
                fi
                ;;
            "linux")
                curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
                unzip awscliv2.zip
                sudo ./aws/install
                ;;
            "windows")
                echo -e "${YELLOW}Please install AWS CLI from https://aws.amazon.com/cli/${NC}"
                ;;
        esac
    fi
}

# Install Git
install_git() {
    echo -e "${YELLOW}📝 Installing Git...${NC}"
    
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        echo -e "${GREEN}✅ Git already installed: ${GIT_VERSION}${NC}"
    else
        echo -e "${YELLOW}Installing Git...${NC}"
        
        case $OS in
            "macos")
                if command -v brew &> /dev/null; then
                    brew install git
                else
                    echo -e "${RED}❌ Homebrew not found. Please install Git manually.${NC}"
                    exit 1
                fi
                ;;
            "linux")
                sudo apt-get update
                sudo apt-get install -y git
                ;;
            "windows")
                echo -e "${YELLOW}Please install Git from https://git-scm.com${NC}"
                ;;
        esac
    fi
}

# Setup AWS credentials
setup_aws_credentials() {
    echo -e "${YELLOW}🔑 Setting up AWS credentials...${NC}"
    
    if aws sts get-caller-identity &> /dev/null; then
        echo -e "${GREEN}✅ AWS credentials already configured${NC}"
        aws sts get-caller-identity
    else
        echo -e "${YELLOW}Please configure AWS credentials:${NC}"
        echo "1. Run: aws configure"
        echo "2. Enter your AWS Access Key ID"
        echo "3. Enter your AWS Secret Access Key"
        echo "4. Enter your default region (e.g., us-east-1)"
        echo "5. Enter your default output format (e.g., json)"
        echo ""
        read -p "Press Enter when you've configured AWS credentials..."
        
        if aws sts get-caller-identity &> /dev/null; then
            echo -e "${GREEN}✅ AWS credentials configured successfully${NC}"
        else
            echo -e "${RED}❌ AWS credentials configuration failed${NC}"
            exit 1
        fi
    fi
}

# Install project dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
    
    # Install frontend dependencies
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Install backend dependencies
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install infrastructure dependencies
    echo "Installing infrastructure dependencies..."
    cd infrastructure
    npm install
    cd ..
    
    echo -e "${GREEN}✅ All dependencies installed${NC}"
}

# Setup environment files
setup_environment_files() {
    echo -e "${YELLOW}⚙️ Setting up environment files...${NC}"
    
    # Copy environment templates
    if [ ! -f .env ]; then
        cp env.example .env
        echo -e "${GREEN}✅ Created .env file from template${NC}"
        echo -e "${YELLOW}⚠️ Please edit .env file with your actual values${NC}"
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
    
    if [ ! -f .env.production ]; then
        cp env.production.example .env.production
        echo -e "${GREEN}✅ Created .env.production file from template${NC}"
        echo -e "${YELLOW}⚠️ Please edit .env.production file with your actual values${NC}"
    else
        echo -e "${GREEN}✅ .env.production file already exists${NC}"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    echo -e "${YELLOW}🪝 Setting up Git hooks...${NC}"
    
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linting and tests before commit

echo "Running pre-commit checks..."

# Run frontend linting
cd frontend
npm run lint
if [ $? -ne 0 ]; then
    echo "Frontend linting failed"
    exit 1
fi
cd ..

# Run backend linting
cd backend
npm run lint
if [ $? -ne 0 ]; then
    echo "Backend linting failed"
    exit 1
fi
cd ..

echo "Pre-commit checks passed!"
EOF
    
    chmod +x .git/hooks/pre-commit
    echo -e "${GREEN}✅ Git hooks configured${NC}"
}

# Verify installation
verify_installation() {
    echo -e "${YELLOW}🔍 Verifying installation...${NC}"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    else
        echo -e "${RED}❌ Node.js not found${NC}"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
    else
        echo -e "${RED}❌ npm not found${NC}"
    fi
    
    # Check AWS CLI
    if command -v aws &> /dev/null; then
        echo -e "${GREEN}✅ AWS CLI: $(aws --version)${NC}"
    else
        echo -e "${RED}❌ AWS CLI not found${NC}"
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        echo -e "${GREEN}✅ Git: $(git --version)${NC}"
    else
        echo -e "${RED}❌ Git not found${NC}"
    fi
}

# Main setup function
main() {
    echo -e "${BLUE}🎯 ProjectKB Environment Setup${NC}"
    echo ""
    
    detect_os
    install_nodejs
    install_aws_cli
    install_git
    setup_aws_credentials
    install_dependencies
    setup_environment_files
    setup_git_hooks
    verify_installation
    
    echo ""
    echo -e "${GREEN}🎉 Environment setup completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Edit .env file with your AWS credentials and configuration"
    echo "2. Edit .env.production file for production deployment"
    echo "3. Run 'npm run dev' to start development server"
    echo "4. Run 'npm run test' to run tests"
    echo "5. Run './scripts/deploy.sh' to deploy to production"
    echo ""
    echo -e "${BLUE}Happy coding! 🚀${NC}"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --version, -v  Show version information"
        echo ""
        echo "This script will:"
        echo "  - Install Node.js 18+"
        echo "  - Install AWS CLI"
        echo "  - Install Git"
        echo "  - Setup AWS credentials"
        echo "  - Install project dependencies"
        echo "  - Create environment files"
        echo "  - Setup Git hooks"
        exit 0
        ;;
    --version|-v)
        echo "ProjectKB Environment Setup Script v1.0.0"
        exit 0
        ;;
esac

# Run main function
main "$@"
