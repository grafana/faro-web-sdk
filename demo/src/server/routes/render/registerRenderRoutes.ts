import type { Express, Router } from 'express';

import { env } from '../../utils';

export async function registerRenderRoutes(globalRouter: Router, app: Express): Promise<void> {
  if (env.mode.prod) {
    const registerRenderProdRoutes = (await import('./renderProd')).registerRenderProdRoutes;
    await registerRenderProdRoutes(globalRouter, app);
  } else {
    const registerRenderDevRoutes = (await import('./renderDev')).registerRenderDevRoutes;
    await registerRenderDevRoutes(globalRouter, app);
  }
}
