# Encelium gateway. No dependencies: just Node 24 running the TypeScript sources directly.
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY prompts ./prompts
# config.json and data/ (invite keys, usage) are mounted from the host, so they survive updates.
ENV NODE_ENV=production
EXPOSE 8787
USER node
CMD ["node", "src/main.ts"]
