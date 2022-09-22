# Grafana JavaScript Agent Demo

This small project demonstrates how to use the Grafana JavaScript Agent and its packages.

The app itself contains a full boilerplate for a React application including:

- server-side rendering (SSR)
- full implementation of the Grafana JavaScript Agent in the frontend
- full implementation of OTel in the backend

## Installation

1. Clone the repository:

   ```shell
   git clone git@github.com:grafana/grafana-javascript-agent.git
   ```

2. Install the dependencies:

   ```shell
   yarn
   ```

   Running the above command in the root directory of the repository will install all the necessary dependencies for
   the packages and the demo.

3. Run the infrastructure:

   ```shell
   docker-compose up -d
   ```

4. Run the demo:

   ```shell
   // if you want to run the demo locally
   yarn start

   // Alternatively you can run the demo using Docker
   docker compose up -d --profile demo
   ```

## Journey

TODO
