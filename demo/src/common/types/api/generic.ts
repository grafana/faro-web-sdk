export type ErrorResponse = {
  success: false;
  data: {
    message: string;
    field?: string;
    [label: string]: string | number | boolean | undefined;
  };
  spanId: string | null;
  traceId: string | null;
};

export type SuccessResponse<D = any> = {
  success: true;
  data: D;
  spanId: string | null;
  traceId: string | null;
};
