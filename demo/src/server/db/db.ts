import type { Sequelize } from 'sequelize';

export let db: Sequelize;

export function setDb(newDb: Sequelize): void {
  db = newDb;
}
