// import type { TransportBody } from '@grafana/agent-core';

import './commands';

beforeEach(() => {
  // cy.intercept('POST', '**/collect', (req) => {
  //   const body = req.body as TransportBody;
  //
  //   if (body.exceptions?.length) {
  //     req.alias = 'exceptions';
  //   } else if (body.logs?.length) {
  //     req.alias = 'logs';
  //   } else if (body.traces) {
  //     req.alias = 'traces';
  //   } else if (body.measurements?.length) {
  //     const item = body.measurements[0]!;
  //     req.alias = `measurement-${item.type}-${Object.keys(item.values)[0]}`;
  //   } else if (body.events?.length) {
  //     req.alias = 'events';
  //   }
  //
  //   req.reply({
  //     statusCode: 201,
  //     body: {},
  //   });
  // });
});
