FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY services/gateway/package.json services/gateway/package.json
COPY services/storage/package.json services/storage/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install && npm rebuild esbuild

COPY . .

WORKDIR /app/services/gateway
EXPOSE 3000
CMD ["npm", "run", "dev"]
