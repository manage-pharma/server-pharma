FROM node:18-alpine
#chuẩn bị môi trường node.js, version node14/alpine

WORKDIR /server-pharma

COPY package*.json ./

RUN npm install --force

RUN npm install -g @babel/core @babel/cli --force

COPY . .

RUN npm run build-src

CMD [ "npm","run", "build" ]

#docker build --tag node-docker .
# docker run -p 8080:8080 -d node-docker