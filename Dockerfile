# Simple single-stage build with pre-built frontend
FROM node:18-alpine

# Set working directory to match repository structure
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --production --silent

# Copy backend source code
COPY backend/ /app/backend/

# Copy pre-built frontend
COPY frontend/build /app/frontend/build

# Set working directory to backend for execution
WORKDIR /app/backend

# Expose port (Railway will override with PORT env var)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
