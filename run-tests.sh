#!/bin/bash

# AI-Enabled Digital Library - Test Runner Script
# This script runs all tests for the project

set -e  # Exit on error

echo "=================================="
echo "AI-Enabled Digital Library Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Parse command line arguments
TEST_TYPE=${1:-all}

case $TEST_TYPE in
    unit)
        print_status "Running unit tests only..."
        cd backend
        npm test -- tests/unit/ --forceExit
        ;;
    
    properties)
        print_status "Running property-based tests only..."
        cd backend
        npm test -- tests/properties/ --forceExit
        ;;
    
    integration)
        print_status "Running integration tests only..."
        cd backend
        npm test -- tests/integration/ --forceExit
        ;;
    
    chat)
        print_status "Running Chat with Book tests..."
        cd backend
        echo ""
        print_status "Unit tests..."
        npm test -- tests/unit/chat-handler.test.ts
        echo ""
        print_status "Property tests..."
        npm test -- tests/properties/chat-properties.test.ts --forceExit
        ;;
    
    quiz)
        print_status "Running Quiz Generator tests..."
        cd backend
        echo ""
        print_status "Unit tests..."
        npm test -- tests/unit/quiz-handler.test.ts
        echo ""
        print_status "Property tests..."
        npm test -- tests/properties/quiz-properties.test.ts --forceExit
        ;;
    
    coverage)
        print_status "Running tests with coverage..."
        cd backend
        npm run test:coverage
        print_success "Coverage report generated at backend/coverage/index.html"
        ;;
    
    all)
        print_status "Running all tests..."
        cd backend
        
        echo ""
        print_status "1/3 Running unit tests..."
        npm test -- tests/unit/ --forceExit || true
        
        echo ""
        print_status "2/3 Running property-based tests..."
        npm test -- tests/properties/ --forceExit || true
        
        echo ""
        print_status "3/3 Running integration tests..."
        npm test -- tests/integration/ --forceExit || true
        
        echo ""
        print_success "All tests completed!"
        ;;
    
    *)
        echo "Usage: ./run-tests.sh [test-type]"
        echo ""
        echo "Test types:"
        echo "  all          - Run all tests (default)"
        echo "  unit         - Run unit tests only"
        echo "  properties   - Run property-based tests only"
        echo "  integration  - Run integration tests only"
        echo "  chat         - Run Chat with Book tests"
        echo "  quiz         - Run Quiz Generator tests"
        echo "  coverage     - Run tests with coverage report"
        echo ""
        echo "Examples:"
        echo "  ./run-tests.sh"
        echo "  ./run-tests.sh unit"
        echo "  ./run-tests.sh chat"
        echo "  ./run-tests.sh coverage"
        exit 1
        ;;
esac

echo ""
print_success "Test run completed!"
