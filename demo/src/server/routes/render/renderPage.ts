import { createSession } from '@grafana/faro-react';

import { getActiveSpanContext } from '../../otel';
import { env, verifyToken } from '../../utils';
import type { Request, Response } from '../../utils';

import type { renderToString } from './renderToString';

export async function renderPage(
  req: Request,
  res: Response,
  template: string,
  render: typeof renderToString
): Promise<void> {
  const spanContext = getActiveSpanContext()!;

  const userPublic = (await verifyToken((res as Response).locals.token)) ?? null;

  const preloadedState = {
    faro: {
      session: createSession(),
      rootSpanId: spanContext?.spanId ?? null,
      rootTraceId: spanContext?.traceId ?? null,
    },
    user: {
      data: userPublic ?? null,
    },
  };

  const [renderedHtml, helmetContext] = render(req.originalUrl, preloadedState);

  const html = template
    .replace(
      '<!--app-tracing-->',
      spanContext
        ? `<meta name="traceparent" content="00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}" />`
        : ''
    )
    .replace('<!--app-title-->', helmetContext.helmet.title.toString())
    .replace('<!--app-state-->', `<script>window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState)}</script>`)
    .replace('<!--app-env-->', `<script>window.__APP_ENV__ = ${JSON.stringify(env)}</script>`)
    .replace(`<!--app-html-->`, renderedHtml);

  res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
}
