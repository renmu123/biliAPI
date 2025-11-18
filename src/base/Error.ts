export class BiliResponseError extends Error {
  statusCode?: number;
  code?: number;
  path?: string;
  method?: string;
  rawResponse?: any;
  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: number;
      path?: string;
      method?: string;
      rawResponse?: any;
    } = {}
  ) {
    super(message);
    this.name = "BiliResponseError";
    this.statusCode = options["statusCode"];
    this.path = options["path"];
    this.method = options["method"];
    this.code = options["code"];
    this.rawResponse = options["rawResponse"];
    this.stack = new Error().stack;
  }
}

export class CancelError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.name = "CancelError";
    this.code = "ERR_CANCELED";
    this.stack = new Error().stack;
  }
}
