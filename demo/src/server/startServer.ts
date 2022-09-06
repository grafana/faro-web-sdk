import 'isomorphic-fetch';

import { env } from '../utils';
import { createServer } from './createServer';

if (!env.test) {
  createServer().then((app) =>
    app.listen(5173, () => {
      console.log('http://localhost:5173');
    })
  );
}
