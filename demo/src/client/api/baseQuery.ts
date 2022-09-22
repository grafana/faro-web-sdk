import { agent, isString, LogLevel } from '@grafana/agent-integration-react';

import { fetchBaseQuery } from '../utils';

export const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  fetchFn: (input, init) => {
    const url = isString(input) ? input : input.url;

    agent.api.pushLog([`Sending request to ${url}`], { level: LogLevel.TRACE });

    return fetch(input, init)
      .then((response) => {
        agent.api.pushLog([`Request to ${url} completed`], { level: LogLevel.TRACE });

        return response;
      })
      .catch((err) => {
        agent.api.pushLog([`Request to ${url} failed`], { level: LogLevel.ERROR });

        return err;
      });
  },
});
