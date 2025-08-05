# Dockerfile

# Base image
FROM node:24-alpine3.21 AS build

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source files
COPY . .

# Build Prisma client
RUN npm run prisma:generate && npm run build

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 4000

# Start your application (adjust according to your actual entry point)
CMD ["node", "dist/lib/client.js"]
