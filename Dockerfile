FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Fix permissions for node user
RUN chown -R node:node /app

# Use non-root user
USER node

# App port
EXPOSE 5000

# Healthcheck (optional but recommended)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start app
CMD ["node", "index.js"]