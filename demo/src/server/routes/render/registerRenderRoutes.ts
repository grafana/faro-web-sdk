import type { Express, Router } from 'express';

import { env } from '../../../common';

export async function registerRenderRoutes(globalRouter: Router, app: Express): Promise<void> {
  if (env.prod) {
    const registerRenderProdRoutes = (await import('./renderProd')).registerRenderProdRoutes;
    await registerRenderProdRoutes(globalRouter, app);
  } else {
    const registerRenderDevRoutes = (await import('./renderDev')).registerRenderDevRoutes;
    await registerRenderDevRoutes(globalRouter, app);
  }
}
