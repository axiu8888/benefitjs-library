import { logger } from "@benefitjs/core";
import fs from 'fs';
import { files } from "./node_file";

/**
 * SQLite
 */
export namespace sqlite {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("SQLite", logger.Level.debug);

  const dbName = files.createFile(files.replaceWithCurDir('./mydb.db'));
  log.debug('dbName:', dbName);
  const sqlite3 = require("sqlite3").verbose();
//   const db = new sqlite3.Database(":memory:");
  const db = new sqlite3.Database(dbName);

  db.serialize(() => {

    db.run(`
        CREATE TABLE sys_user (
            id varchar(32), 
            username varchar(100), 
            password varchar(100),
            create_time TEXT
        )
        `);

    // // 插入数据
    // const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
    // for (let i = 0; i < 10; i++) {
    //   stmt.run("Ipsum " + i);
    // }
    // stmt.finalize();

    // // 查询数据
    // db.each("SELECT rowid AS id, info FROM lorem", (err, row) => {
    //   console.log(row.id + ": " + row.info);
    // });
  });

  db.close();
}
