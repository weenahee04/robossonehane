FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci

COPY src ./src

RUN npm run build

ENV NODE_ENV=staging
ENV PORT=3002

EXPOSE 3002

CMD ["npm", "run", "start"]
