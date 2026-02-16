import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from './env';
import path from 'path';
import { UrlTransformSubscriber } from '../subscribers/url-transform.subscriber';

const options: DataSourceOptions = {
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.name,
  synchronize: env.isDev, // auto-sync in dev only; use migrations in prod
  logging: env.isDev ? ['error', 'warn'] : ['error'],
  entities: [path.join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  subscribers: [UrlTransformSubscriber],
};

export const AppDataSource = new DataSource(options);
