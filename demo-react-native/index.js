/**
 * @format
 */

import { AppRegistry } from 'react-native';

// Mark app start time as early as possible for performance tracking
import { markAppStart } from '@grafana/faro-react-native';

markAppStart();

import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
