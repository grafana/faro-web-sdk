function throwError() {
  throw new Error('This is a thrown error');
}

function callUndefined() {
  // eslint-disable-next-line no-eval
  eval('test();');
}

function callConsole(method: 'trace' | 'info' | 'log' | 'warn' | 'error') {
  // eslint-disable-next-line no-console
  console[method](`This is a console ${method} message`);
}
