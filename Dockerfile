# Multi-stage build for full-stack deployment
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --silent

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
ENV REACT_APP_API_URL=/
RUN npm run build

# Stage 2: Backend with frontend build
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --production --silent

# Copy backend source code
COPY backend/ ./

# Copy frontend build from stage 1
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Expose port (Railway will override with PORT env var)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
