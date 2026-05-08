FROM node:20-slim
WORKDIR /app

# Copy workspace structure
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Install all dependencies
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ backend/

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=backend"]
