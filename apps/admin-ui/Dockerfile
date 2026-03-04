ARG NODE_IMAGE=public.ecr.aws/docker/library/node:20-alpine
FROM ${NODE_IMAGE}

WORKDIR /app

COPY package.json ./
COPY apps/admin-ui/package.json apps/admin-ui/package.json

RUN npm install

COPY . .

WORKDIR /app/apps/admin-ui
EXPOSE 5173
CMD ["npm", "run", "dev"]
