// eslint-disable-next-line import/namespace
import { Dimensions, Platform } from 'react-native';
import { getBrand, getModel, getSystemVersion } from 'react-native-device-info';

import { Meta, MetaItem } from '@grafana/faro-core';

const { width, height } = Dimensions.get('window');

export const browserMeta: MetaItem<Pick<Meta, 'browser'>> = () => ({
  browser: {
    name: Platform.OS,
    os: getSystemVersion(),
    mobile: true,
    userAgent: `${Platform.OS}/${getSystemVersion()} (${getBrand()} ${getModel()})`,
    windowSize: {
      width,
      height,
    },
  },
});
