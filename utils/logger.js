import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, "..", "utils/logs", `%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      prepend: true,
      json: false,
    }),
  ],
});
export { logger };
