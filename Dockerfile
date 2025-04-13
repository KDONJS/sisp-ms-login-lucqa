FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./


# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Build the application
RUN npm run build

# Create logs directory
RUN mkdir -p logs

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]