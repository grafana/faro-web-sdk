import { Sequelize } from 'sequelize';

import { logger } from '../logger';
import { env } from '../utils';

import { setDb } from './db';
import { initializeArticle, initializeComment, initializeUser } from './repositories';

export async function initializeDb(): Promise<void> {
  const db = new Sequelize({
    database: env.database.name,
    host: env.database.host,
    password: env.database.password,
    port: Number(env.database.port),
    username: env.database.user,
    dialect: 'postgres',
  });

  try {
    await db.authenticate();

    await initializeUser(db);
    await initializeArticle(db);
    await initializeComment(db);

    setDb(db);

    logger.info('Database connection has been established successfully.');
  } catch (err) {
    logger.error(err);

    throw err;
  }
}
