import type { QueryResult } from 'pg';
import { Pool } from 'pg';
import * as pgtypes from 'pg-types';
import { getLoggerFor } from '../logging/LogUtil';

const logger = getLoggerFor('PostgresDataAccessor');

export class Database {
  private readonly pool = new Pool();

  public async queryHelper(text: string, params: any[]): Promise<QueryResult> {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      this.pool.query(text, params, (err: Error, result: QueryResult) => {
        if (err) {
          logger.error(`Error executing query: ${err.message}`);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  public connect(): void {
    pgtypes.setTypeParser(20, parseInt);
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    this.pool.connect((err: Error) => {
      if (err) {
        logger.info(`Error connecting to db: ${err.message}`);
      } else {
        logger.info('Connected to db');
        this.queryHelper(`SELECT 'Testing Connection';`, [])
          .catch((err2: Error): void => {
            logger.debug(`ERROR ON QUERY ${err2.message}`);
          });
      }
    });
  }
}
