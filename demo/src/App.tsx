import { ErrorBoundary, withGrafanaProfiler } from '@grafana/agent-integration-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import './App.css';
import { Counter } from './Counter';
// import { CounterWithErrorBoundry } from './CounterWithErrorBoundry';

function App() {
  const [counter, setCounter] = useState(0);
  const [anotherCounter, setAnotherCounter] = useState(0);

  return (
    <div className="App">
      <div className="card">
        <ErrorBoundary>
          <Counter value={counter} value2={anotherCounter} onSetCounter={() => setCounter(counter + 1)} />
        </ErrorBoundary>
        <button onClick={() => setAnotherCounter(anotherCounter + 1)}>Increment from outside of counter</button>
        {/*<CounterWithErrorBoundry value={counter} onSetCounter={() => setCounter(counter + 1)} />*/}
      </div>
      <Link to="/test/1">Test with ID</Link> | <Link to="/test">Test without ID</Link>
    </div>
  );
}

export default withGrafanaProfiler(App);
