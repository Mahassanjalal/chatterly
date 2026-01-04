"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
const format = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
const transports = [
    new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
    }),
];
// Add file transport in production
if (env_1.appConfig.isProduction) {
    transports.push(new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }), new winston_1.default.transports.File({ filename: 'combined.log' }));
}
exports.logger = winston_1.default.createLogger({
    level: env_1.appConfig.isDevelopment ? 'debug' : 'info',
    format,
    transports,
});
