import * as toolkitQueryReact from '@reduxjs/toolkit/query/react';
const { fetchBaseQuery } = ((toolkitQueryReact as any).default ?? toolkitQueryReact) as typeof toolkitQueryReact;

import { agent, isString, LogLevel } from '@grafana/agent-integration-react';

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
