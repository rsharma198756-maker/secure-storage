FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY services/gateway/package.json services/gateway/package.json
COPY services/storage/package.json services/storage/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY . .

# Build TypeScript to dist/
WORKDIR /app/services/gateway
RUN npx tsc -p tsconfig.json

EXPOSE 3000
CMD ["npm", "run", "start"]
