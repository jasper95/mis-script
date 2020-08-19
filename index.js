require('dotenv').config()
global.Promise = require('bluebird')
const util = require('util')
const csvToJson = require('csvtojson')
const ProgressBar = require('progress');
const axios = require('axios')
const fs = Promise.promisifyAll(require('fs'));
const omit = require('lodash/omit')
const failed = []
const success = []
const instance = axios.create({
  baseURL: process.env.BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.TOKEN}`
  }
})
instance.interceptors.response.use(response => response.data, Promise.reject);
(async () => {
  const data = await csvToJson().fromFile('./data.csv')
  // console.log('data: ', util.inspect(data, false, null));
  const bar = new ProgressBar(':bar :elapsed secs :percent :eta secs', { total: data.length });
  await Promise.mapSeries(data, (e) => instance.post('/api/edp/students', omit(e, 'id'))
    .then((response) => {
      success.push({
        username: e.username,
        id: response.id
      })
      bar.tick()
    })
    .catch((error) => {
      failed.push([{
        name: [e.first_name, e.last_name].join(' '),
        error: error.response.data.error
      }])
      bar.tick()
    }))
  await fs.writeFileAsync('./result.json', JSON.stringify({
    success,
    failed
  }))
  process.exit(0)
})();