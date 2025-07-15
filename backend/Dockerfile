# Couple Chat App - Backend Production Dockerfile
# Optimized for Node.js Express application

FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S express -u 1001

# Change ownership of the app directory
RUN chown -R express:nodejs /app

# Switch to non-root user
USER express

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "app.js"]