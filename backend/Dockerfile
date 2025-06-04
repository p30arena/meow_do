# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json from builder stage
COPY --from=builder /app/package*.json ./

# Install production dependencies
RUN npm install

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["sh", "-c", "npm run drizzle:migrate && npm start"]
