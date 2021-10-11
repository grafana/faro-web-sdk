import { sendRequest } from '../api';
import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';
import { getStackFrames } from './stackFrames';

export function exception(error: Error) {
  try {
    sendRequest({
      exceptions: [
        {
          type: 'Error',
          value: error.message,
          stacktrace: {
            frames: getStackFrames(error),
          },
          timestamp: getCurrentTimestamp(),
        },
      ],
    });
  } catch (err) {}
}
