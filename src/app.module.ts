import { Module, LoggerService } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomMongoClient, CustomDefinition } from '@xxxhand/app-common';
import { appConf } from './app.config';
import { AppService } from './app.service';
import { DefaultLoggerService } from './app.logger';
import { MailClient, IInitialOptions } from './mail.client';
import { DEFAULT_MONGO, DEFAULT_LOGGER_FACTORY, DEFAULT_MAILER } from './app.constants';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    {
      provide: DEFAULT_MONGO,
      useFactory: async (): Promise<CustomMongoClient> => {
        const opt: CustomDefinition.IMongoOptions = {
          user: appConf.defaultMongo.user,
          pass: appConf.defaultMongo.password,
          connectTimeoutMS: appConf.defaultMongo.connectTimeout,
          minPoolSize: appConf.defaultMongo.minPoolSize,
          maxPoolSize: appConf.defaultMongo.maxPoolSize,
          db: appConf.defaultMongo.dbName,
        };
        return new CustomMongoClient(appConf.defaultMongo.uri, opt);
      },
    },
    {
      provide: DEFAULT_LOGGER_FACTORY,
      useValue: (context: string): LoggerService => {
        return new DefaultLoggerService()
          .useContext(context)
          .initialFlieTransport(appConf.defaultLoggerPath);
      },
    },
    {
      provide: DEFAULT_MAILER,
      useFactory: (): MailClient => {
        const opt: IInitialOptions = {
          host: appConf.defaultMailer.host,
          port: appConf.defaultMailer.port,
          user: appConf.defaultMailer.user,
          pass: appConf.defaultMailer.pass,
          rejectUnauthorized: true,
          tlsMinVersion: 'TLSv1.2'
        };
        const client = new MailClient();
        client.initialSmtpPool(opt);
        return client;
      }
    },
    AppService,
  ],
})
export class AppModule {}
