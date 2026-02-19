# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Install terser for minification
RUN npm install terser

# Build the app
RUN npm run build

# Production stage - serve with lightweight server
FROM node:20-alpine

WORKDIR /app

# Install lightweight server (serve) to serve the static files
RUN npm install -g serve

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built app from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5173', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 5173

# Start the server
CMD ["serve", "-s", "dist", "-l", "5173"]
