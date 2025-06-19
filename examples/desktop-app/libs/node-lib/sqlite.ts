import { logger, js_class as jsc } from '@benefitjs/core';
import { io } from '@benefitjs/node';
// import { io } from './io';
import sqlite3 from 'sqlite3';

/**
 * SQLite
 */
export namespace sqlite {
  /**
   * 日志打印
   */
  export const log = logger.newProxy('SQLite', logger.Level.warn);

  //const sqlite3 = require("sqlite3").verbose();
  //const db = new sqlite3.Database(":memory:");
  sqlite3.verbose();

  /**
   * 数据库
   */
  export class Database {
    /**
     * 数据库路径
     */
    path: string;
    /**
     * 数据库
     */
    raw: sqlite3.Database;

    /**
     * 数据库
     * 
     * @param path 路径
     */
    constructor(path: string) {
      this.path = io.createFile(path);
      this.raw = new sqlite3.Database(path);
    }

    /**
     * 关闭
     */
    close() {
      log.debug('db close:', this.path);
      this.raw.close();
    }

    /**
     * 执行语句
     *
     * @param sql SQL语句
     * @params params 占位符的参数
     * @returns 返回查询结果
     */
    run(sql: string, ...params: any[]) {
      return new Promise<boolean>((resolve, reject) => {
        log.debug('[run], sql:', sql, ', params:', ...params);
        this.raw.run(sql, [...params], (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }

    /**
     * 执行语句
     *
     * @param sql SQL语句
     * @returns 返回查询结果
     */
    exec(sql: string) {
      return new Promise<boolean>((resolve, reject) => {
        log.debug('[exec], sql:', sql);
        this.raw.exec(sql, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }

    /**
     * 查询
     *
     * @param sql SQL语句
     * @param params 占位符的参数
     * @returns 返回查询结果
     */
    get(sql: string, ...params: any) {
      return new Promise<any>((resolve, reject) => {
        log.debug('[get], sql:', sql, ', params:', ...params);
        this.raw.get(sql, [...params], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    /**
     * 查询全部
     *
     * @param sql SQL语句
     * @param params 占位符的参数
     * @returns 返回查询结果
     */
    all(sql: string, ...params: any) {
      return new Promise<any>((resolve, reject) => {
        log.debug('[all], sql:', sql, ', params:', ...params);
        this.raw.all(sql, [...params], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    /**
     * 查询全部
     *
     * @param sql SQL语句
     * @param params 占位符的参数
     * @returns 返回查询结果
     */
    each(cb: (err: any, row: any) => void, sql: string, ...params: any) {
      log.debug('[each], sql:', sql, ', params:', ...params);
      this.raw.each(sql, [...params], cb);
    }

    /**
     * 执行查询
     *
     * @param sql SQL语句
     * @param params 占位符的参数
     * @returns 返回查询结果
     */
    prepare(sql: string, ...params: any) {
      return new Promise<boolean>((resolve, reject) => {
        log.debug('[prepare], sql:', sql, ', params:', ...params);
        this.raw.prepare(sql, [...params], (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }

    /**
     * 序列化
     *
     * @param callback 回调
     */
    serialize(callback?: () => void): void {
      this.raw.serialize(callback);
    }

    parallelize(callback?: () => void): void {
      this.raw.parallelize(callback);
    }

    /**
     * 查询是否存在表
     *
     * @param table 表名
     * @returns 返回是否存在
     */
    exitsTable(table: string) {
      return this.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?;`, table).then((row) => row && row['name'] != undefined);
    }

    /**
     * 查询是否存在表
     *
     * @param table 表名
     * @returns 返回是否存在
     */
    createTableIfNotExits(table: string, sql: string) {
      return new Promise<boolean>((resolve, reject) => {
        this.exitsTable(table)
          .then((res) => {
            if (res) {
              resolve(res);
            } else {
              log.debug('createTableIfNotExits(), sql =>', sql);
              this.run(sql)
                .then((res) => resolve(res))
                .catch(reject);
            }
          })
          .catch(reject);
      });
    }

    /**
     * 删除表
     *
     * @param table 表名
     * @returns 返回执行结果
     */
    dropTable(table: string) {
      return this.run(`DROP TABLE ${table};`);
    }

    /**
     * 插入数据
     *
     * @param table 表
     * @param records 记录
     * @param fields 可配置的字段
     */
    insert(table: string, records: any[], fields?: Map<string, Type>) {
      log.debug('insert start...');
      try {
        let columns = <{ name: string; index: number }[]>[];
        fields = findTypes(...records);
        fields.forEach((value, key) => columns.push({ name: key, index: columns.length }));
        let names = columns.map((v) => v.name).join(', ');
        let placeHoler = columns.map((v) => '?').join(', ');
        // 插入数据
        let sql = `INSERT INTO ${table}(${names}) VALUES (${placeHoler})`;
        log.debug('insert sql ==>:', sql, ', count:', records.length);
        const stmt = this.raw.prepare(sql);
        for (let i = 0, record; i < records.length; i++) {
          record = records[i];
          log.debug(`insert record[${i}] ==>:`, record);
          stmt.run(...columns.map((v) => record[v.name]));
        }
        stmt.finalize();
      } finally {
        log.debug('insert end...');
      }
    }

    // /**
    //  * 删除数据
    //  *
    //  * @param sql
    //  */
    // delete(table: string, ...ids: any[]) {
    //   // findTypes(ids)
    //   // ids.map(v => typeof v != 'number')
    //   // `DELETE FROM ${table} WHERE `;
    //   // this.run(sql);
    // }
  }

  /**
   * 字段
   */
  export interface Field {
    /**
     * 字段名
     */
    name: string;
    /**
     * 类型
     */
    type: string;
  }

  /**
   * 类型
   */
  export enum Type {
    /**
     * NULL
     */
    NULL = 'NULL',
    /**
     * 整形 INT, INTEGER, TINYINT, SMALLINT, MEDIUMINT, BIGINT, UNSIGNED BIG INT, INT2, INT8
     */
    INTEGER = 'INTEGER',
    /**
     * 浮点数 REAL, DOUBLE, DOUBLE PRECISION, FLOAT
     */
    FLOAT = 'REAL',
    /**
     * 数值型 NUMERIC, DECIMAL(10,5), BOOLEAN, DATE, DATETIME
     */
    NUMERIC = 'NUMERIC',
    /**
     * 文本 CHARACTER(20), VARCHAR(255), VARYING CHARACTER(255), NCHAR(55), NATIVE CHARACTER(70), NVARCHAR(100), TEXT, CLOB
     */
    TEXT = 'TEXT',
    /**
     * 二进制
     */
    BLOB = 'BLOB',
  }

  /**
   * 类型
   */
  export const classTypes = new Map<jsc.Type, Type>();
  [jsc.Type.int].forEach((v) => classTypes.set(v, Type.INTEGER));
  [jsc.Type.float].forEach((v) => classTypes.set(v, Type.FLOAT));
  [jsc.Type.boolean, jsc.Type.date].forEach((v) => classTypes.set(v, Type.NUMERIC));
  [jsc.Type.string, jsc.Type.symbol, jsc.Type.object].forEach((v) => classTypes.set(v, Type.TEXT));
  [jsc.Type.blob].forEach((v) => classTypes.set(v, Type.BLOB));

  /**
   * 获取
   *
   * @param args 对象数组
   * @returns 返回映射的类型
   */
  export function findTypes(...args: any[]) {
    let map = new Map<string, Type>();
    for (let i = 0; i < args.length; i++) {
      let obj = args[i], value: any;
      for (let key in obj) {
        value = obj[key];
        let type = findType(value);
        if (type) {
          if (map.has(key) && map.get(key) !== type) {
            log.debug(`同一个[${key}]字段存在不同类型[${map.get(key)} -> ${type}], value =>: ${value}`);
          }
          map.set(key, type);
        }
      }
    }
    return map;
  }

  /**
   * 查找类型
   *
   * @param value 值
   * @returns 返回类型
   */
  export function findType(value: any) {
    return classTypes.get(jsc.find(value));
    // let type: Type | undefined;
    // let _typeof = typeof value;
    // if (_typeof !== 'undefined') {
    //   if (_typeof == 'bigint') {
    //     type = Type.INTEGER;
    //   } else if (_typeof == 'boolean') {
    //     type = Type.NUMERIC;
    //   } else if (_typeof == 'string') {
    //     type = Type.TEXT;
    //   } else if (_typeof == 'symbol') {
    //     type = Type.TEXT;
    //   } else if (_typeof == 'number') {
    //     type = Number.isInteger(value) ? Type.INTEGER : Type.FLOAT;
    //   } else if (_typeof == 'object') {
    //     if (value instanceof Number) {
    //       type = Number.isInteger(value) ? Type.INTEGER : Type.FLOAT;
    //     } else if (value instanceof String || value instanceof Symbol) {
    //       type = Type.TEXT;
    //     } else if (value instanceof Boolean || value instanceof Date) {
    //       type = Type.NUMERIC;
    //     } else {
    //       type = Type.TEXT;
    //     }
    //   } else if (_typeof == 'function') {
    //     // ignore
    //   }
    // }
    // return type;
  }

  // db.close();
}
