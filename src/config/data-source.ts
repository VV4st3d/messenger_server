import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER ,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'messenger',

  synchronize: false, 
  logging: process.env.NODE_ENV === 'development',

  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],

});