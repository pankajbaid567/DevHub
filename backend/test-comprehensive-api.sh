#!/bin/bash

# DevHub+ Backend API Comprehensive Test Script
# This script tests all backend API endpoints

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"
AUTH_URL="$BASE_URL/auth"

echo "🚀 Starting comprehensive backend API testing for DevHub+"
echo "======================================================="

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local auth_header=$6
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${BLUE}Testing:${NC} $description"
    echo -e "${YELLOW}$method $endpoint${NC}"
    
    if [ "$method" = "GET" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -H "Authorization: Bearer $auth_header" "$endpoint")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$endpoint")
        fi
    elif [ "$method" = "POST" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $auth_header" -d "$data" "$endpoint")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$endpoint")
        fi
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $auth_header" -d "$data" "$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X DELETE -H "Authorization: Bearer $auth_header" "$endpoint")
    fi
    
    # Extract HTTP status and body
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')
    
    echo "Status: $http_code"
    if [ ${#body} -gt 200 ]; then
        echo "Response: ${body:0:200}..."
    else
        echo "Response: $body"
    fi
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED - Expected $expected_status, got $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Basic server health checks
echo -e "\n${BLUE}=== BASIC HEALTH CHECKS ===${NC}"
test_endpoint "GET" "$BASE_URL/" 200 "Root endpoint"
test_endpoint "GET" "$BASE_URL/ping" 200 "Ping endpoint"
test_endpoint "GET" "$API_URL/health" 200 "Health check endpoint"

# Authentication endpoints
echo -e "\n${BLUE}=== AUTHENTICATION ENDPOINTS ===${NC}"
test_endpoint "POST" "$AUTH_URL/register" 400 "Register without data"
test_endpoint "POST" "$AUTH_URL/login" 400 "Login without data"
test_endpoint "POST" "$AUTH_URL/register" 400 "Register with invalid data" '{"username":"test"}'
test_endpoint "POST" "$AUTH_URL/login" 401 "Login with invalid credentials" '{"email":"test@test.com","password":"wrong"}'

# Test valid registration
echo -e "\n${YELLOW}Testing user registration with valid data...${NC}"
REGISTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test'$(date +%s)'@example.com",
    "password": "testpass123",
    "name": "Test User"
}' "$AUTH_URL/register")

REGISTER_STATUS=$(echo $REGISTER_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
REGISTER_BODY=$(echo $REGISTER_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ "$REGISTER_STATUS" -eq 201 ]; then
    echo -e "${GREEN}✅ Registration successful${NC}"
    # Extract token if available
    TOKEN=$(echo $REGISTER_BODY | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    USER_EMAIL=$(echo $REGISTER_BODY | grep -o '"email":"[^"]*' | cut -d'"' -f4)
    echo "Token extracted: ${TOKEN:0:20}..."
else
    echo -e "${RED}❌ Registration failed with status $REGISTER_STATUS${NC}"
    echo "Response: $REGISTER_BODY"
fi

# If we have a token, test protected routes
if [ -n "$TOKEN" ]; then
    echo -e "\n${BLUE}=== PROTECTED ROUTES (WITH AUTH) ===${NC}"
    
    # Users endpoints
    test_endpoint "GET" "$API_URL/users/profile" 200 "Get user profile" "" "$TOKEN"
    test_endpoint "PUT" "$API_URL/users/profile" 200 "Update profile" '{"name":"Updated Name"}' "$TOKEN"
    
    # Questions endpoints
    test_endpoint "GET" "$API_URL/questions" 200 "Get all questions"
    test_endpoint "POST" "$API_URL/questions" 201 "Create question" '{
        "title": "Test Question",
        "body": "This is a test question",
        "tags": ["test", "api"]
    }' "$TOKEN"
    
    # Get the created question ID for testing
    QUESTIONS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/questions")
    QUESTION_ID=$(echo $QUESTIONS_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    
    if [ -n "$QUESTION_ID" ]; then
        test_endpoint "GET" "$API_URL/questions/$QUESTION_ID" 200 "Get specific question"
        test_endpoint "POST" "$API_URL/questions/$QUESTION_ID/answers" 201 "Answer question" '{
            "content": "This is a test answer"
        }' "$TOKEN"
    fi
    
    # Snippets endpoints
    test_endpoint "GET" "$API_URL/snippets" 200 "Get all snippets"
    test_endpoint "POST" "$API_URL/snippets" 201 "Create snippet" '{
        "title": "Test Snippet",
        "code": "console.log(\"Hello World\");",
        "language": "javascript",
        "description": "Test snippet"
    }' "$TOKEN"
    
    # Sessions endpoints
    test_endpoint "GET" "$API_URL/sessions" 200 "Get all sessions"
    test_endpoint "POST" "$API_URL/sessions" 201 "Create session" '{
        "title": "Test Session",
        "description": "Test session description",
        "type": "coding",
        "maxParticipants": 5
    }' "$TOKEN"
    
    # Skills endpoints
    test_endpoint "GET" "$API_URL/skills" 200 "Get all skills"
    test_endpoint "POST" "$API_URL/skills" 201 "Create skill" '{
        "skillName": "JavaScript",
        "rating": 8
    }' "$TOKEN"
    
    # Study Rooms endpoints
    test_endpoint "GET" "$API_URL/study-rooms" 200 "Get study rooms" "" "$TOKEN"
    test_endpoint "POST" "$API_URL/study-rooms" 201 "Create study room" '{
        "name": "Test Study Room",
        "description": "Test study room for API testing",
        "subject": "Computer Science",
        "isPrivate": false
    }' "$TOKEN"
    
    # Boards endpoints
    test_endpoint "GET" "$API_URL/boards" 200 "Get collaborative boards" "" "$TOKEN"
    test_endpoint "POST" "$API_URL/boards" 201 "Create board" '{
        "name": "Test Board",
        "description": "Test collaborative board",
        "isPrivate": false
    }' "$TOKEN"
    
    # Social endpoints
    test_endpoint "GET" "$API_URL/social/profile" 200 "Get social profile" "" "$TOKEN"
    test_endpoint "GET" "$API_URL/posts" 200 "Get social posts"
    test_endpoint "POST" "$API_URL/posts" 201 "Create social post" '{
        "content": "This is a test post from API testing",
        "type": "text"
    }' "$TOKEN"
    
    # Notifications endpoints
    test_endpoint "GET" "$API_URL/notifications" 200 "Get notifications" "" "$TOKEN"
    
    # Profile endpoints
    test_endpoint "GET" "$API_URL/profile" 200 "Get profile" "" "$TOKEN"
    
else
    echo -e "${RED}❌ No authentication token available, skipping protected route tests${NC}"
fi

# Test routes that should be commented out (AI/Resume routes)
echo -e "\n${BLUE}=== FRONTEND-ONLY ROUTES (SHOULD BE DISABLED) ===${NC}"
test_endpoint "GET" "$API_URL/ai/analyze" 404 "AI analyze endpoint (should be disabled)"
test_endpoint "GET" "$API_URL/mentor/chat" 404 "AI mentor endpoint (should be disabled)"
test_endpoint "GET" "$API_URL/resumes" 404 "Resume endpoints (should be disabled - handled by frontend)"

# Summary
echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}           TEST SUMMARY${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Backend API is working correctly.${NC}"
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Please review the output above.${NC}"
fi

echo -e "\n${BLUE}=== RECOMMENDATIONS ===${NC}"
echo "1. Comment out AI and Resume analysis routes (handled by frontend)"
echo "2. Ensure all authentication is working properly"
echo "3. Verify database connections for failed endpoints"
echo "4. Add missing routes identified during testing"