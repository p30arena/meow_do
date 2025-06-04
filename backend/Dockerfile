# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Copy the rest of the application code
COPY . /app/

# Set the working directory in the container
WORKDIR /app

# Install dependencies
RUN npm install

# Build the TypeScript application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["sh", "-c", "npm run drizzle:migrate && npm start"]
