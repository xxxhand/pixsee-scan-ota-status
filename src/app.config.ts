interface IConfig {
  executeExpression: string;
  defaultLoggerPath: string;
  defaultMongo: {
    uri: string;
    minPoolSize: number;
    maxPoolSize: number;
    connectTimeout: number;
    dbName: string;
    user: string;
    password: string;
  };
}

export const appConf: IConfig = {
  executeExpression: process.env.EXEC_EXPRESSION,
  defaultLoggerPath: process.env.DEFAULT_LOGGER_PATH,
  defaultMongo: {
    uri: process.env.DEFAULT_MONGO_URI,
    dbName: process.env.DEFAULT_MONGO_DB_NAME,
    minPoolSize: Number.parseInt(process.env.DEFAULT_MONGO_MIN_POOL),
    maxPoolSize: Number.parseInt(process.env.DEFAULT_MONGO_MAX_POOL),
    connectTimeout: Number.parseInt(process.env.DEFAULT_MONGO_CONN_TIMEOUT),
    user: process.env.DEFAULT_MONGO_USER,
    password: process.env.DEFAULT_MONGO_PASS,
  },
};
