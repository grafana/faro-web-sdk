import { createServer } from './createServer';
import { env } from './utils';

if (!env.mode.test) {
  createServer().then((app) =>
    app.listen(env.serverPort, () => {
      console.log(`http://localhost:${env.serverPort}`);
    })
  );
}
