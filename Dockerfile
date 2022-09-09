FROM node:16-alpine

WORKDIR /usr/app

COPY . .

RUN yarn install --frozen-lockfile
