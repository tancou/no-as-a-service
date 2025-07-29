FROM docker.io/node:22-alpine3.22
LABEL authors="tancou"

RUN mkdir -p /app && \
    chown node:node /app

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node index.js reasons.json ./

EXPOSE 3000

CMD [ "node", "index.js" ]
