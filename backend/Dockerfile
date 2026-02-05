FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk -U upgrade && apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
