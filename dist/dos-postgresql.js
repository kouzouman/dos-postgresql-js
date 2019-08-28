'use strict'; // //  Host
// const Host = process.env.PG_HOST
// //  Database
// const Database = process.env.PG_DB_NAME
// //  User
// const User = process.env.PG_USER
// //  Port
// const Port = process.env.PG_PORT
// //  Password
// const Password = process.env.PG_PASS

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InsertedResult = exports.SelectedResult = exports.default = void 0;

const pg = require('pg');

const DefaultConfig = {
  user: '',
  //env var: PGUSER
  database: '',
  //env var: PGDATABASE
  password: '',
  //env var: PGPASSWORD
  host: '',
  // Server hosting the postgres database
  port: 5432,
  //env var: PGPORT
  max: 10,
  // max number of clients in the pool
  ssl: false,
  idleTimeoutMillis: 30000 // how long a client is allowed to remain idle before being closed

  /**
   * データベースのアクセサ
   *
   * @class DosPostgresql
   */

};

class DosPostgresql {
  /**
   * コンストラクタ
   * @param {any} [conf=null] 接続情報 DefaultConfig参考
   *
   * @memberOf DosPostgresql
   */
  constructor(conf = null) {
    const self = this;
    if (conf == null) conf = DefaultConfig;
    this.conf = conf;
    this.con = new pg.Pool(this.conf);
    this.con.on('error', this.connectError);
  } //  エラー処理   ------------------------------------------------------

  /**
   * 接続エラー
   *
   * @param {any} err エラー内容
   * @param {any} client クライアント情報
   *
   * @memberOf DosPostgresql
   */


  connectError(err, client) {
    console.error('idle client error', err.message, err.stack);
  } //  クエリ実行   -------------------------------------------------------

  /**
   * Updateクエリを実行
   * @param {String} sql SQLクエリ
   * @param {Object} param パラメータ
   */


  async execUpdate(sql, param = []) {
    try {
      const result = await this.execQuery(sql, param);
      return new QueryResult(result);
    } catch (e) {
      console.error('UpdateError');
      console.error(e);
      return {
        command: 'UPDATE',
        fields: [],
        rows: []
      };
    }
  }
  /**
   * Insertクエリを実行
   * @param {String} sql SQLクエリ
   * @param {Object} param パラメータ
   */


  async execInsert(sql, param = [], getId = true) {
    try {
      // console.log('execInsert-')
      const result = await this.execQuery(sql, param);
      return new InsertedResult(result); // // console.log('result---')
      // // console.log(result)
      // if (result.rowCount.toNumber() > 0 && getId) {
      //   const idSelected = await this.execSelect('SELECT LASTVAL() as last_id')
      //   // console.log('idSelected')
      //   // console.log(idSelected)
      //   return idSelected.rows[0].last_id.toNumber()
      // } else {
      //   return new InsertedResult(result)
      // }
    } catch (e) {
      console.error('InsertError');
      console.error(e);
      return {
        command: 'INSERT',
        fields: [],
        rows: [],
        error: e
      };
    }
  }
  /**
   * Select文を実行するクエリ
   *
   * @param {any} sql SQL文
   * @param {any} [param=[]] パラメータ
   * @returns SQLの実行結果の２次元配列
   *
   * @memberOf DosPostgresql+
   */


  async execSelect(sql, param = []) {
    try {
      // console.log(sql)
      // console.log(param)
      const result = await this.execQuery(sql, param); // console.log('------execselect---')
      // console.log(result)

      return new SelectedResult(result);
    } catch (e) {
      console.error('Select');
      console.error(e);
      return {
        command: 'SELECT',
        fields: [],
        rows: [],
        error: e
      };
    }
  }
  /**
   * Deleteクエリを実行
   * @param {String} sql SQLクエリ
   * @param {Object} param パラメータ
   */


  async execDelete(sql, param = []) {
    try {
      const result = await this.execQuery(sql, param); // console.log('execDeleteQuerySync')
      // console.log(result)

      return new QueryResult(result);
    } catch (e) {
      console.error('Delete');
      console.error(e);
      return {
        command: 'DELETE',
        fields: [],
        rows: []
      };
    }
  }
  /**
   * クエリ実行
   *
   * @param {any} sql SQL文
   * @param {any} [param=[]] パラメータ
   * @returns SQLの実行結果
   *
   * @memberOf DosPostgresql
   */


  async execQuery(sql, param = []) {
    try {
      // console.log(sql)
      // console.log(param)
      const res = await this._execQueryPromise(sql, param); // console.log('res')
      // console.log(res)

      return res;
    } catch (e) {
      console.error('NonTargetQuery');
      console.error(e);
      return e;
    }
  }
  /**
   * クエリ実行時のPromiseオブジェクトを取得する
   *
   * @param {any} sql 実行するクエリ
   * @param {any} param パラメータ
   * @param {any} callback コールバック
   * @returns これらを同期的に実行するためのPromise
   *
   * @memberOf DosPostgresql
   */


  _execQueryPromise(sql, param, callback) {
    // const query = sql.split('\n').map(v => v.replace(/--.*/, '')).join('\n');
    const query = sql.replace(/--.*/, ''); // console.log(query)
    // console.log(param)

    return new Promise((resolve, reject) => {
      try {
        this.con.query(query, param, (err, res) => {
          // console.log(err)
          // console.log(res)
          //   callback(res, err)
          if (!!err) reject(err);else resolve(res);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * トランザクションスタート
   */


  async transStart() {
    return await this.execQuery('BEGIN');
  }
  /**
   * トランザクションコミット
   */


  async transCommit() {
    return await this.execQuery('COMMIT');
  }
  /**
   * トランザクションロールバック
   */


  async transRollback() {
    return await this.execQuery('ROLLBACK');
  }

}

var _default = new DosPostgresql();
/**
 * クエリの実行結果
 *
 * @class QueryResult
 */


exports.default = _default;

class QueryResult {
  /**
   * コンストラクタ
   * @param {any} sqlResult execQueryの実行結果
   *
   * @memberOf QueryResult
   */
  constructor(sqlResult) {
    // console.log('--QueryResult-----')
    // console.log(sqlResult)
    // console.log('---------------------')
    // console.log(sqlResult.command)
    // console.log('---------------------')
    this.command = sqlResult.command;
    this.rowCount = sqlResult.rowCount;
  }

}
/**
 * selectの実行結果
 *
 * @class SelectedResult
 */


class SelectedResult extends QueryResult {
  /**
   * コンストラクタ
   * @param {any} sqlResult execQueryの実行結果
   *
   * @memberOf SelectedResult
   */
  constructor(sqlResult) {
    // console.log('------SelectedResult---')
    // console.log(sqlResult)
    super(sqlResult);
    this.rows = sqlResult.rows;
    this.fields = sqlResult.fields;
    this.error = null;
  }

}
/**
 * insertの実行結果
 *
 * @class InsertedResult
 */


exports.SelectedResult = SelectedResult;

class InsertedResult extends QueryResult {
  /**
   * コンストラクタ
   * @param {any} sqlResult execQueryの実行結果
   *
   * @memberOf InsertedResult
   */
  constructor(sqlResult) {
    // console.log(sqlResult)
    super(sqlResult); // this.rows = sqlResult.rows;
    // this.fields = sqlResult.fields;
  }

}

exports.InsertedResult = InsertedResult;