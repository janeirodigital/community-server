import type { QueryResult } from 'pg';
import { Pool } from 'pg';
import * as pgtypes from 'pg-types';

export class Database {
  private readonly pool = new Pool();

  public async queryHelper(text: string, params: any[]): Promise<QueryResult> {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      this.pool.query(text, params, (err: Error, result: QueryResult) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.log(`ERROR ${err.message}`);
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
        // eslint-disable-next-line no-console
        console.log(`ERROR ${err.message}`);
      } else {
        // eslint-disable-next-line no-console
        console.log('Connected to db');
        this.queryHelper(`SELECT 'Testing Connection';`, [])
          .catch((err2: Error): void => {
            // eslint-disable-next-line no-console
            console.log(`ERROR ON QUERY ${err2.message}`);
          });
      }
    });
  }
}
