FROM node:19-alpine3.16 as builder
WORKDIR ./minesweeper-server

COPY . .

RUN yarn install
RUN npm i -g typescript
RUN tsc index.ts

ENTRYPOINT ["node", "index.js"]
