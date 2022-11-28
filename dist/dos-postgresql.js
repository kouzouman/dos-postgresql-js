'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SelectedResult = exports.InsertedResult = void 0;

var _redis = require("redis");

var _crypto = require("crypto");

require('dos-common-js'); // //  Host
// const Host = process.env.PG_HOST
// //  Database
// const Database = process.env.PG_DB_NAME
// //  User
// const User = process.env.PG_USER
// //  Port
// const Port = process.env.PG_PORT
// //  Password
// const Password = process.env.PG_PASS


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
  idleTimeoutMillis: 30000,
  // how long a client is allowed to remain idle before being closed
  redisHost: '',
  redisPort: '6379',
  redisUser: '',
  redisPass: '',

  /**
   * 現在選択しているdbNumber
   */
  dbNumber: 0
};
/**
 * データベースのアクセサ
 *
 * @class DosPostgresql
 */

class DosPostgresql {
  /**
   * コンストラクタ
   * @param {any} [conf=null] 接続情報 DefaultConfig参考
   *
   * @memberOf DosPostgresql
   */
  constructor(conf = null) {
    var _this$redis, _this$redis2;

    const self = this;
    if (conf == null) conf = DefaultConfig;
    this.conf = conf;
    this.con = new pg.Pool(this.conf);
    this.con.on('error', this.connectError);
    this.redis = this.createRedisConnector();
    (_this$redis = this.redis) === null || _this$redis === void 0 ? void 0 : _this$redis.on("ready", () => this.setRedisDbNumber());
    (_this$redis2 = this.redis) === null || _this$redis2 === void 0 ? void 0 : _this$redis2.connect();
  } //  Redis＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝

  /**
   * Redisのコネクタを作成する
   */


  createRedisConnector() {
    var _this$conf$redisUser, _this$conf$redisPass, _this$conf$redisHost, _this$conf$redisPort;

    const user = (_this$conf$redisUser = this.conf.redisUser) !== null && _this$conf$redisUser !== void 0 ? _this$conf$redisUser : '';
    const pass = (_this$conf$redisPass = this.conf.redisPass) !== null && _this$conf$redisPass !== void 0 ? _this$conf$redisPass : '';
    const host = (_this$conf$redisHost = this.conf.redisHost) !== null && _this$conf$redisHost !== void 0 ? _this$conf$redisHost : '';
    const port = (_this$conf$redisPort = this.conf.redisPort) !== null && _this$conf$redisPort !== void 0 ? _this$conf$redisPort : '';
    if (!host) return null;
    let url = '';
    if (user && pass) url = `redis://${user}:${pass}@${host}:${port}`;else if (!user && pass) url = `redis://:${pass}@${host}:${port}`;else if (user && !pass) url = `redis://${user}@${host}:${port}`;else if (!user && !pass) url = `redis://${host}:${port}`;
    console.log('redis-url : ' + url);
    return (0, _redis.createClient)({
      url
    });
  }

  sha256(data) {
    const text = typeof data == "string" ? data : JSON.stringify(data);
    return (0, _crypto.createHash)('sha256').update(text).digest('hex');
  }
  /**
   * redisDbの番号を変更があれば設定
   * @param {*} dbNumber 
   */


  async setRedisDbNumber(dbNumber = 0) {
    if (this.conf.dbNumber != dbNumber) {
      var _this$redis3;

      this.conf.dbNumber = dbNumber - 0;
      await ((_this$redis3 = this.redis) === null || _this$redis3 === void 0 ? void 0 : _this$redis3.select(this.conf.dbNumber));
    }
  }
  /**
   * Redisから値を取得する
   * @param {*} sql
   * @param {*} param
   */


  async redisGet(sql, param, dbNumber = 0) {
    var _this$redis4;

    // await this.connectRedis()
    await this.setRedisDbNumber(dbNumber);
    const key = this.sha256({
      sql,
      param
    });
    const resultJson = await ((_this$redis4 = this.redis) === null || _this$redis4 === void 0 ? void 0 : _this$redis4.get(key));
    const res = JSON.parse(resultJson); // console.log({type:"get", key, res})

    return res;
  }
  /**
   * redisに値を登録する
   * @param {*} sql
   * @param {*} param
   * @returns
   */


  async redisSet(sql, param, value, dbNumber = 0, lifespan = 3600) {
    var _this$redis5;

    // await this.connectRedis()
    await this.setRedisDbNumber(dbNumber);
    const key = this.sha256({
      sql,
      param
    }); // console.log({type:"set", key, value})

    return await ((_this$redis5 = this.redis) === null || _this$redis5 === void 0 ? void 0 : _this$redis5.set(key, JSON.stringify(value), {
      "EX": lifespan
    }));
  }
  /**
   * 特定のDB = 0のデータを削除
   */


  async redisFlushdb(dbNumber) {
    var _this$redis6;

    await this.setRedisDbNumber(dbNumber);
    return (_this$redis6 = this.redis) === null || _this$redis6 === void 0 ? void 0 : _this$redis6.FLUSHDB();
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
      if (!getId) return new InsertedResult(result); // // console.log('result---')
      // // console.log(result)

      if (result.rowCount.toNumber() > 0) {
        const idSelected = await this.execSelect('SELECT LASTVAL() as last_id'); // console.log('idSelected')
        // console.log(idSelected)

        return idSelected.rows[0].last_id.toNumber();
      } else {
        return new InsertedResult(result);
      }
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


  async execSelect(sql, param = [], redisDbNumber = null, lifespan = 3600) {
    try {
      const cash = redisDbNumber !== null ? await this.redisGet(sql, param, redisDbNumber) : null; // console.log(sql)
      // console.log(param)

      const result = !!cash ? cash : await this.execQuery(sql, param); // console.log(result)
      // console.log({mes:"sqlres", redisDbNumber,result })

      if (redisDbNumber !== null) {
        this.redisSet(sql, param, result, redisDbNumber, lifespan);
      }

      return new SelectedResult(result);
    } catch (e) {
      console.error('Select Exception');
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
/**
 * クエリの実行結果
 *
 * @class QueryResult
 */


exports.default = DosPostgresql;

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