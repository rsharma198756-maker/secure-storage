FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY apps/admin-ui/package.json apps/admin-ui/package.json

RUN npm install

COPY . .

WORKDIR /app/apps/admin-ui
EXPOSE 5173
CMD ["npm", "run", "dev"]
