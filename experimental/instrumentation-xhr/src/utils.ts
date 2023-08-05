export const parseXHRHeaders = (context: XMLHttpRequest): Record<string, any> => {
  const headers = context.getAllResponseHeaders().split('\r\n');
  const headerMap: Record<string, any> = {};

  for (const header of headers) {
    const [key, value] = header.split(': ');
    if (key && value) {
      headerMap[`header_${key}`] = value;
    }
  }

  return headerMap;
};

export const parseXHREvent = (context: XMLHttpRequest, event: ProgressEvent<EventTarget>): Record<string, any> => {
  if (event.type === 'load') {
    return parseLoadEvent(context, event);
  } else if (event.type === 'abort') {
    return parseAbortEvent(context, event);
  } else if (event.type === 'error') {
    return parseErrorEvent(context, event);
  } else if (event.type === 'timeout') {
    return parseTimeoutEvent(context, event);
  }

  return {};
};

// TODO - simplify down to one parser? thought there would be more differences between the events

export const parseLoadEvent = (context: XMLHttpRequest, event: ProgressEvent<EventTarget>): Record<string, any> => {
  return {
    // @ts-ignore - _url is attached to the xhr object in the open function of instrumentation.ts
    request_url: context._url?.toString() ?? '',
    response_url: context.responseURL?.toString() ?? '',
    bytes_loaded: event.loaded?.toString() ?? '',
    ok: (context.status >= 200 && context.status < 300).toString() ?? '',
    status_text: context.statusText ?? '',
    status: context.status?.toString() ?? '',
  };
};

export const parseAbortEvent = (context: XMLHttpRequest, event: ProgressEvent<EventTarget>): Record<string, any> => {
  return {
    // @ts-ignore - _url is attached to the xhr object in the open function of instrumentation.ts
    request_url: context._url?.toString() ?? '',
    response_url: context.responseURL?.toString() ?? '',
    bytes_loaded: event.loaded?.toString() ?? '',
    ok: (context.status >= 200 && context.status < 300).toString() ?? '',
    status_text: context.statusText ?? '',
    status: context.status?.toString() ?? '',
  };
};

export const parseErrorEvent = (context: XMLHttpRequest, event: ProgressEvent<EventTarget>): Record<string, any> => {
  return {
    // @ts-ignore - _url is attached to the xhr object in the open function of instrumentation.ts
    request_url: context._url?.toString() ?? '',
    response_url: context.responseURL?.toString() ?? '',
    bytes_loaded: event.loaded?.toString() ?? '',
    ok: (context.status >= 200 && context.status < 300).toString() ?? '',
    status_text: context.statusText ?? '',
    status: context.status?.toString() ?? '',
  };
};

export const parseTimeoutEvent = (context: XMLHttpRequest, event: ProgressEvent<EventTarget>): Record<string, any> => {
  return {
    // @ts-ignore - _url is attached to the xhr object in the open function of instrumentation.ts
    request_url: context._url?.toString() ?? '',
    response_url: context.responseURL?.toString() ?? '',
    bytes_loaded: event.loaded?.toString() ?? '',
    ok: (context.status >= 200 && context.status < 300).toString() ?? '',
    status_text: context.statusText ?? '',
    status: context.status?.toString() ?? '',
  };
};
