import { useState } from 'react';

import { Page } from '../../components';
import { Counter } from './Counter';

export function BrokenPage() {
  const [counter, setCounter] = useState(0);

  if (counter === 3) {
    throw new Error('Counter is 3');
  }

  return (
    <Page title="Broken Page">
      <p>The following content is going to fail once counter will get to 3.</p>
      <Counter value={counter} onChange={setCounter} />
    </Page>
  );
}
