FROM node:18.20.1

WORKDIR /worker

# RUN apt-get update && apt-get install -y clang libc++-dev libc++abi-dev

# RUN npm install -g wrangler

COPY . /worker

WORKDIR /worker
RUN yarn

RUN rm -rf ./.wrangler

CMD env > .dev.vars && echo "n" | npx wrangler dev --local --var WORKER_TYPE:${WORKER_TYPE} --ip 0.0.0.0 --port ${WORKER_PORT}
