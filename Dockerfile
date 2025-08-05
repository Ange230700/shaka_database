# Dockerfile

FROM node:24-alpine3.21 AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install && npm run prisma:generate

COPY . .
RUN npm run build

ENV NODE_ENV=prod

EXPOSE 4000

CMD ["node", "dist/lib/client.js"]
