# Backend-only Docker build for Railway
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --production --silent

# Copy backend source code
COPY backend/ ./

# Expose port (Railway will set PORT env var)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
