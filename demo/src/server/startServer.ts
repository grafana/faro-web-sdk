import { env } from '../common';
import { createServer } from './createServer';

if (!env.test) {
  createServer().then((app) =>
    app.listen(5173, () => {
      console.log('http://localhost:5173');
    })
  );
}
