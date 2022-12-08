FROM node:16-alpine

ARG DEMO_DEMO_PATH
ARG DEMO_PACKAGES_CORE_PATH
ARG DEMO_PACKAGES_PATH
ARG DEMO_PACKAGES_REACT_PATH
ARG DEMO_PACKAGES_WEB_SDK_PATH
ARG DEMO_PACKAGES_WEB_TRACING_PATH
ARG DEMO_PORT
ARG DEMO_PORT_HMR
ARG DEMO_WORKSPACE_PATH

# Install Python in order to be able to build the native modules
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 make build-base && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

# Set the workspace path
WORKDIR ${DEMO_WORKSPACE_PATH}

# Create a simple TS file that will be used to build the workspace initially
# This file will be copied in the src folder of each package and removed at the end
RUN echo "export {};" >> index.ts

# Copy files necessary for installing the dependencies
# Root
COPY .env \
     lerna.json \
     package.json \
     rollup.config.base.js \
     tsconfig.base.json \
     tsconfig.base.cjs.json \
     tsconfig.base.esm.json \
     tsconfig.base.spec.json \
     yarn.lock \
     ./

# Demo
COPY ${DEMO_DEMO_PATH}/package.json \
     ${DEMO_DEMO_PATH}/index.html \
     ${DEMO_DEMO_PATH}/

RUN mkdir -p ${DEMO_DEMO_PATH}/src/client ${DEMO_DEMO_PATH}/src/server
RUN cp index.ts ${DEMO_DEMO_PATH}/src/client/index.tsx
RUN cp index.ts ${DEMO_DEMO_PATH}/src/server
RUN touch index.scss ${DEMO_DEMO_PATH}/src/client

# Packages - Core
COPY ${DEMO_PACKAGES_CORE_PATH}/package.json \
     ${DEMO_PACKAGES_CORE_PATH}/rollup.config.js \
     ${DEMO_PACKAGES_CORE_PATH}/tsconfig.cjs.json \
     ${DEMO_PACKAGES_CORE_PATH}/tsconfig.esm.json \
     ${DEMO_PACKAGES_CORE_PATH}/tsconfig.spec.json \
     ${DEMO_PACKAGES_CORE_PATH}/tsconfig.json \
     ${DEMO_PACKAGES_CORE_PATH}/

COPY ${DEMO_PACKAGES_CORE_PATH}/bin/genVersion.js \
     ${DEMO_PACKAGES_CORE_PATH}/bin/

RUN mkdir ${DEMO_PACKAGES_CORE_PATH}/src
RUN cp index.ts ${DEMO_PACKAGES_CORE_PATH}/src

# Packages - React
COPY ${DEMO_PACKAGES_REACT_PATH}/package.json \
     ${DEMO_PACKAGES_REACT_PATH}/rollup.config.js \
     ${DEMO_PACKAGES_REACT_PATH}/tsconfig.cjs.json \
     ${DEMO_PACKAGES_REACT_PATH}/tsconfig.esm.json \
     ${DEMO_PACKAGES_REACT_PATH}/tsconfig.spec.json \
     ${DEMO_PACKAGES_REACT_PATH}/tsconfig.json \
     ${DEMO_PACKAGES_REACT_PATH}/

RUN mkdir ${DEMO_PACKAGES_REACT_PATH}/src
RUN cp index.ts ${DEMO_PACKAGES_REACT_PATH}/src

# Packages - Web Sdk
COPY ${DEMO_PACKAGES_WEB_SDK_PATH}/package.json \
     ${DEMO_PACKAGES_WEB_SDK_PATH}/rollup.config.js \
     ${DEMO_PACKAGES_WEB_SDK_PATH}/tsconfig.cjs.json \
     ${DEMO_PACKAGES_WEB_SDK_PATH}/tsconfig.esm.json \
     ${DEMO_PACKAGES_WEB_SDK_PATH}/tsconfig.spec.json \
     ${DEMO_PACKAGES_WEB_SDK_PATH}/tsconfig.json \
     ${DEMO_PACKAGES_WEB_SDK_PATH}/

RUN mkdir ${DEMO_PACKAGES_WEB_SDK_PATH}/src
RUN cp index.ts ${DEMO_PACKAGES_WEB_SDK_PATH}/src

# Packages - Web Tracing
COPY ${DEMO_PACKAGES_WEB_TRACING_PATH}/package.json \
     ${DEMO_PACKAGES_WEB_TRACING_PATH}/rollup.config.js \
     ${DEMO_PACKAGES_WEB_TRACING_PATH}/tsconfig.cjs.json \
     ${DEMO_PACKAGES_WEB_TRACING_PATH}/tsconfig.esm.json \
     ${DEMO_PACKAGES_WEB_TRACING_PATH}/tsconfig.spec.json \
     ${DEMO_PACKAGES_WEB_TRACING_PATH}/tsconfig.json \
     ${DEMO_PACKAGES_WEB_TRACING_PATH}/

RUN mkdir ${DEMO_PACKAGES_WEB_TRACING_PATH}/src
RUN cp index.ts ${DEMO_PACKAGES_WEB_TRACING_PATH}/src

RUN rm index.ts

# Install external dependencies
# In order to save some time, we install the external dependencies first
# And later we rebuild everything
RUN SKIP_GEN_VERSION=1 yarn install --pure-lockfile

# Add the rest of the files necessary for internal dependencies
# Demo
COPY ${DEMO_DEMO_PATH} \
     ${DEMO_DEMO_PATH}/

# Packages
COPY ${DEMO_PACKAGES_PATH}/ \
     ${DEMO_PACKAGES_PATH}/

# Build the packages
RUN yarn clean
RUN yarn build

# Expose the ports
EXPOSE ${DEMO_PORT}
EXPOSE ${DEMO_PORT_HMR}

# Start the demo
CMD ["yarn", "start"]
