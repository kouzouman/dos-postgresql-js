import { createClient } from 'redis'
const crypto = require('crypto')

// const client = createClient()

// client.on('error', (err) => console.log('Redis Client Error', err))

// await client.connect()

// await client.set('key', 'value')
// const value = await client.get('key')

/**
 * Redisのwrapper
 */
export default class redisWrapper {
  /**
   * コンストラクタ
   * @param {*} param
   */
  constructor({ user, pass, host, port }) {
    port = port ?? '6379'
    let url = ''
    if (!!user && !!pass && !!host)
      url = `redis://${user}:${pass}@${host}:${port}`
    else if (!user && !!pass && !!host) url = `redis://:${pass}@${host}:${port}`
    else if (!!user && !pass && !!host) url = `redis://${user}@${host}:${port}`
    else if (!!host) url = `redis://${host}:${port}`



    this.client = createClient({
      url
    })
    this.usingRedis = true;
    this.isConnected = false;
  }

  /**
   * 初期化
   */
  async init() {
    if (!this.usingRedis) return null

    try {
      await this.client.connect();
    } catch (e){
      this.usingRedis = false;
      return;
    }
    this.isConnected = true;
  }

  /**
   * 値のセット
   * @param {*} key
   * @param {*} value
   */
  async setValue(key, value) {
    if (!this.isConnected)
      await this.init();
    if (!this.usingRedis) return null
    await this.client.set(JSON.stringify(key), value)
  }

  /**
   * 値の取得
   * @param {*} key
   */
  async getValue(key) {

    if (!this.isConnected) await this.init()

    if (!this.usingRedis) return null
    return this.client.get(JSON.stringify(key))
  }
}
