#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚛 Coalfield Fleet - Local Development Setup${NC}"
echo "================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or later.${NC}"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}📦 pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}📦 Installing dependencies...${NC}"
pnpm install

echo -e "${GREEN}🏗️  Building the application...${NC}"
pnpm run build

echo -e "${GREEN}🚀 Starting development server...${NC}"
echo -e "${YELLOW}   • Web Dashboard: http://localhost:3000${NC}"
echo -e "${YELLOW}   • WebSocket Server: ws://localhost:8080${NC}"
echo -e "${YELLOW}   • Mobile Truck Registration: http://localhost:3000 (on mobile device)${NC}"
echo ""
echo -e "${GREEN}✨ Ready for live truck tracking!${NC}"

pnpm run dev