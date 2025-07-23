FROM node:20-alpine

# Install dependencies required to build native modules
RUN apk add --no-cache python3 make g++ \
  && ln -sf python3 /usr/bin/python

# Set PYTHON environment variable so node-gyp can find Python
ENV PYTHON=/usr/bin/python

WORKDIR /app

# Copy package.json and install websocket dependency
COPY package.json ./
RUN npm install && npm install websocket

# Copy the server code
COPY container_src/server.js ./

EXPOSE 8000
CMD ["node", "server.js"]