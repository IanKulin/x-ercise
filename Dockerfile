# Use Node.js 22 or later for --experimental-strip-types support
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including devDependencies for TypeScript types)
RUN npm ci

# Copy application source files
COPY src ./src
COPY views ./views
COPY public ./public
COPY tsconfig.json ./

# Create necessary directories with proper permissions
RUN mkdir -p data public/images/exercises && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
