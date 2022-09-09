import { getActiveSpanContext } from '../../otel';
import { verifyToken } from '../../utils';
import type { Request, Response } from '../../utils';
import type { renderToString } from './renderToString';

export function renderPage(req: Request, res: Response, template: string, render: typeof renderToString): void {
  console.log('rendering');

  const spanContext = getActiveSpanContext()!;

  const userPublic = verifyToken((res as Response).locals.token) ?? null;

  const preloadedState = {
    user: {
      data: userPublic ?? null,
    },
  };

  const [renderedHtml, helmetContext] = render(req.originalUrl, preloadedState);

  const html = template
    .replace(
      '<!--app-tracing-->',
      `<meta name="traceparent" content="00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}" />`
    )
    .replace('<!--app-title-->', helmetContext.helmet.title.toString())
    .replace('<!--app-state-->', `<script>window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState)}</script>`)
    .replace(`<!--app-html-->`, renderedHtml);

  res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
}
