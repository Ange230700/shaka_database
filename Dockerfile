# Dockerfile

# build stage
FROM node:24-alpine3.21 AS build
WORKDIR /app
COPY package*.json ./
ENV HUSKY=0
RUN npm ci
COPY . .
RUN npm run prisma:generate && npm run build

# run stage
FROM node:24-alpine3.21
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
# apply DB state and exit
CMD ["sh", "-c", "npm run prisma:db:push && npm run prisma:db:seed"]
