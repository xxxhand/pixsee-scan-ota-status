import * as nodemailer from 'nodemailer';
import { Options } from 'nodemailer/lib/smtp-pool';
import { CustomValidator } from '@xxxhand/app-common';

export interface IAttachement {
  fileName: string;
  contentType?: string;
  content: ReadableStream;
}

export interface ISendOptions {
  from: string;
  sender?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: IAttachement[];
}

export interface IInitialOptions {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  rejectUnauthorized: boolean;
  tlsMinVersion?: 'TLSv1.2' | 'TLSv1.3';
}

export class MailClient {
  private _instance: nodemailer.Transporter;

  public initialSmtpPool(opt?: IInitialOptions): void {
    const newOpt: Options = {
      secure: opt.port === 465 ? true : false,
      pool: true,
      host: opt.host,
      port: opt.port,
      tls: {
        rejectUnauthorized: opt.rejectUnauthorized,
        minVersion: CustomValidator.nonEmptyString(opt.tlsMinVersion)
          ? opt.tlsMinVersion
          : 'TLSv1.2',
      },
    };
    if (CustomValidator.nonEmptyString(opt.user)) {
      newOpt.auth = {
        user: opt.user,
        pass: opt.pass,
      };
    }
    this._instance = nodemailer.createTransport(newOpt);
    console.log('Initial mail client done');
  }

  public async tryVerify(): Promise<boolean> {
    if (!this._instance) {
      throw new Error('Mailer instance not initialized');
    }
    return this._instance.verify();
  }

  public close(): void {
    console.log('Close mail client');
    this._instance.close();
  }

  public async send(opts: ISendOptions): Promise<void> {
    const newOpt = {
      from: opts.from,
      to: opts.to,
      sender: CustomValidator.nonEmptyString(opts.sender)
        ? opts.sender
        : opts.from,
      subject: opts.subject,
      cc: CustomValidator.nonEmptyArray(opts.cc) ? opts.cc : [],
      bcc: CustomValidator.nonEmptyArray(opts.bcc) ? opts.bcc : [],
      text: CustomValidator.nonEmptyString(opts.text) ? opts.text : undefined,
      html: CustomValidator.nonEmptyString(opts.html) ? opts.html : undefined,
      attachments: [],
    };

    if (CustomValidator.nonEmptyArray(opts.attachments)) {
      opts.attachments.forEach((x) =>
        newOpt.attachments.push({
          filename: x.fileName,
          content: x.content,
        }),
      );
    }

    this._instance.sendMail(newOpt).catch((ex) => console.error(ex));
  }
}
