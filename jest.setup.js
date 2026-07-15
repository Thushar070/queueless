const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

require("@testing-library/jest-dom");

if (typeof global.ReadableStream === "undefined") {
  const { ReadableStream } = require("stream/web");
  global.ReadableStream = ReadableStream;
}

if (typeof global.MessagePort === "undefined") {
  const { MessagePort, MessageChannel } = require("worker_threads");
  global.MessagePort = MessagePort;
  global.MessageChannel = MessageChannel;
}

if (typeof global.Request === "undefined") {
  const { Request, Response, Headers } = require("undici");
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
}
