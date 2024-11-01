import { Cron } from '@nestjs/schedule';
import { CustomMongoClient, CustomValidator } from '@xxxhand/app-common';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { appConf } from './app.config';
import { DEFAULT_LOGGER_FACTORY, DEFAULT_MONGO } from './app.constants';

interface IGroupDevice {
  sn: string;
}

@Injectable()
export class AppService {
  private _Logger: LoggerService;
  private _isRunning = false;
  constructor(
    @Inject(DEFAULT_LOGGER_FACTORY)
    private readonly loggerFac: (context: string) => LoggerService,
    @Inject(DEFAULT_MONGO)
    private readonly db: CustomMongoClient,
  ) {
    this._Logger = this.loggerFac(AppService.name);
  }

  @Cron(appConf.executeExpression)
  async execute(): Promise<void> {
    if (this._isRunning) {
      this._Logger.log('Last task is not completed yet...');
      return;
    }
    this._isRunning = true;
    await this.db.tryConnect();
    this._Logger.log('Start to find abnormal devices------------------------------');
    const aggr: any = [
      {
        '$match': {
          'otaStatus': 2,
          'updatedAt': {
            '$gte': new Date()
          }
        }
      },
      {
        // 根據 sn 分組，並統計每個 sn 的出現次數
        '$group': {
          '_id': '$sn',
          'count': { '$sum': 1 }
        }
      },
      {
        // 過濾出現次數大於 1 的 sn
        '$match': {
          'count': { '$gt': 1 }
        }
      },
      {
        '$sort': { '_id': 1 }
      }
    ];

    const oDevices = await this.db.getCollection('DeviceStatusInfos').aggregate(aggr).toArray() as IGroupDevice[];
    if (!CustomValidator.nonEmptyArray(oDevices)) {
      this._Logger.log('No devices matched....terminated');
      this._terminate();
      return;
    }
    this._Logger.log(`${oDevices.length} devices were found....`);
    
    await this._terminate();

  }
  private async _terminate(): Promise<void> {
    await this.db.close();
    this._isRunning = false;
  }
}
