"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("util");
// Polyfill TextEncoder/TextDecoder for OTEL
global.TextEncoder = util_1.TextEncoder;
global.TextDecoder = util_1.TextDecoder;
// Mock Request and Response for fetch instrumentation tests
var MockRequest = /** @class */ (function () {
    function MockRequest(url) {
        this.url = url;
    }
    return MockRequest;
}());
var MockResponse = /** @class */ (function () {
    function MockResponse() {
        this.ok = true;
        this.status = 200;
        this.statusText = 'OK';
    }
    return MockResponse;
}());
global.Request = MockRequest;
global.Response = MockResponse;
