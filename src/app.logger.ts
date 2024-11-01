import { pino } from 'pino';
import { LoggerService, LogLevel } from '@nestjs/common';

export class DefaultLoggerService implements LoggerService {
  private _context?: string = '';
  private _logger: pino.Logger;
  private readonly _DEF_LEVEL = 'info';

  public useContext(context: string): DefaultLoggerService {
    this._context = context;
    return this;
  }

  public initialFlieTransport(filePath: string): DefaultLoggerService {
    this._logger = pino({
      timestamp: () => pino.stdTimeFunctions.isoTime(),
      base: { pid: process.pid, context: this._context }, // 移除 hostname，只保留 pid
      transport: {
        targets: [
          {
            target: 'pino/file',
            options: {
              destination: filePath,
              mkdir: true,
            },
            level: this._DEF_LEVEL,
          },
        ],
      },
    });
    return this;
  }

  log(message: any, ...optionalParams: any[]) {
    this._logger.info({ ...optionalParams }, message);
  }
  error(message: any, ...optionalParams: any[]) {
    this._logger.error({ ...optionalParams }, message);
  }
  warn(message: any, ...optionalParams: any[]) {
    this._logger.warn({ ...optionalParams }, message);
  }
  debug?(message: any, ...optionalParams: any[]) {
    this._logger.debug({ ...optionalParams }, message);
  }
  verbose?(message: any, ...optionalParams: any[]) {
    this._logger.trace({ ...optionalParams }, message);
  }
  fatal?(message: any, ...optionalParams: any[]) {
    this._logger.fatal({ ...optionalParams }, message);
  }
  setLogLevels?(levels: LogLevel[]) {
    const pinoLevels = levels.map((level) => {
      switch (level) {
        case 'log':
          return 'info';
        case 'error':
          return 'error';
        case 'warn':
          return 'warn';
        case 'debug':
          return 'debug';
        case 'verbose':
          return 'trace';
        default:
          return 'info';
      }
    });
    this._logger.level = pinoLevels[0] || this._DEF_LEVEL;
  }
}
