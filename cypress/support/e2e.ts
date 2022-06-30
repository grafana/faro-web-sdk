import type { TransportBody } from '@grafana/agent-core';
import './commands';

beforeEach(() => {
  cy.intercept('POST', '**/collect', (req) => {
    const body = req.body as TransportBody;
    if (body.exceptions?.length) {
      req.alias = 'exceptions';
    } else if (body.logs?.length) {
      req.alias = 'logs';
    } else if (body.traces) {
      req.alias = 'traces';
    } else if (body.measurements?.length) {
      req.alias = 'measurements';
    }
    req.reply({
      statusCode: 201,
      body: {},
    });
  });
  cy.visit('/');
});

afterEach(() => cy.loadBlank());
