import { Cron } from '@nestjs/schedule';
import * as fs from 'fs-extra';
import { AsyncParser } from '@json2csv/node';
import {
  CustomMongoClient,
  CustomValidator,
  CustomUtils,
} from '@xxxhand/app-common';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { appConf } from './app.config';
import { MailClient, ISendOptions } from './mail.client';
import {
  DEFAULT_LOGGER_FACTORY,
  DEFAULT_MONGO,
  DEFAULT_MAILER,
  DEFAULT_ENCODING,
} from './app.constants';

interface IGroupDevice {
  _id: string;
  count: number;
}

interface IPartialDevice {
  sn: string;
  iotKey: string;
  accountId: string;
  uid: string;
}

interface IPartialAccount {
  accountId: string;
  email: string;
}

interface IWarningInfo {
  sn: string;
  accountId: string;
  email: string;
  iotKey: string;
  uid: string;
  count: number;
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
    @Inject(DEFAULT_MAILER)
    private readonly mailClient: MailClient,
  ) {
    this._Logger = this.loggerFac(AppService.name);
  }

  @Cron(appConf.executeExpression)
  async execute(): Promise<void> {
    if (this._isRunning) {
      this._Logger.log('Last task is not completed yet...');
      return;
    }
    const warningInfoAry: IWarningInfo[] = [];
    this._isRunning = true;
    await this.db.tryConnect();
    await this.mailClient.tryVerify();
    // 取前2小時資料
    const useTime = new Date(Date.now() - 60 * 60 * 2 * 1000);
    // const useTime = new Date(2024, 8, 30);
    this._Logger.log(
      'Start to find abnormal devices------------------------------',
    );
    const aggr: any = [
      {
        $match: {
          otaStatus: 2,
          updatedAt: {
            $gte: useTime,
          },
        },
      },
      {
        // 根據 sn 分組，並統計每個 sn 的出現次數
        $group: {
          _id: '$sn',
          count: { $sum: 1 },
        },
      },
      {
        // 過濾出現次數大於 1 的 sn
        $match: {
          count: { $gt: 3 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    this._Logger.log(JSON.stringify(aggr));

    const gDevices = (await this.db
      .getCollection('DeviceStatusInfos')
      .aggregate(aggr)
      .toArray()) as IGroupDevice[];
    if (!CustomValidator.nonEmptyArray(gDevices)) {
      this._Logger.log('No devices matched....terminated');
      this._terminate();
      return;
    }
    this._Logger.log(`${gDevices.length} devices were found....`);
    // Find device
    let q: any = {
      sn: {
        $in: gDevices.map((x) => x._id),
      },
    };
    const oDevices = (await this.db
      .getCollection('Devices')
      .find(q)
      .toArray()) as unknown as IPartialDevice[];
    // Find account
    q = {
      accountId: {
        $in: oDevices.map((x) => x.accountId),
      },
    };
    const oAccounts = (await this.db
      .getCollection('Accounts')
      .find(q)
      .toArray()) as unknown as IPartialAccount[];
    // compose info
    for (const gDevice of gDevices) {
      const currDevice = oDevices.find((x) => x.sn === gDevice._id);
      if (!currDevice) {
        this._Logger.log(`Not found sn: ${gDevice._id} in Devices`);
        continue;
      }
      const currInfo: IWarningInfo = {
        sn: currDevice.sn,
        uid: currDevice.uid,
        iotKey: currDevice.iotKey,
        accountId: currDevice.accountId,
        count: gDevice.count,
        email: '',
      };
      if (!CustomValidator.nonEmptyString(currInfo.accountId)) {
        warningInfoAry.push(currInfo);
        continue;
      }

      const currAccount = oAccounts.find(
        (x) => x.accountId === currInfo.accountId,
      );
      if (currAccount) {
        currInfo.email = CustomUtils.fromBase64ToString(currAccount.email);
      }
      warningInfoAry.push(currInfo);
    }
    // Send notify....
    try {
      const outputFile = `scanOtaStatus_${Date.now().toString()}.csv`;
      const csvContent = await new AsyncParser()
        .parse(warningInfoAry)
        .promise();
      await fs.writeFile(`./${outputFile}`, csvContent, {
        encoding: DEFAULT_ENCODING,
      });

      const sendOpt: ISendOptions = {
        from: appConf.defaultMailer.user,
        to: appConf.defaultMailer.receiver,
        sender: appConf.defaultMailer.sender,
        subject: `${gDevices.length} devices OTA status abnormal`,
        text: '乾鍋尤魚加牛',
        attachments: [],
      };
      sendOpt.attachments.push({
        fileName: outputFile,
        content: fs.createReadStream(`./${outputFile}`, {
          encoding: DEFAULT_ENCODING,
        }) as unknown as ReadableStream,
      });
      await this.mailClient.send(sendOpt);
    } catch (ex) {
      this._Logger.error(ex.stack);
    } finally {
      await this._terminate();
    }
  }
  private async _terminate(): Promise<void> {
    await this.db.close();
    this._isRunning = false;
    this._Logger.log(
      'End to find abnormal devices------------------------------',
    );
  }
}
