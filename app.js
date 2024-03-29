const config = require('./utils/config')
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('express-async-errors')
const Workflow = require('./models/workflow')
const {customerRouter, initQueue} = require('./controllers/customer')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')
const workspaceRouter = require('./controllers/workspace')
const setupWorkspaceRouter = require('./controllers/setupWorkspace')
const path = require('path')
const schedule = require('node-schedule')
const {zaloGetKey} = require('./services/zalo_service')
const ZaloKey = require('./models/zaloKey')

logger.info('connecting to', config.MONGODB_URI)
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('connected to MongoDB', { useNewUrlParser: true })
  })
  .catch((error) => {
    logger.error('error connection to MongoDB:', error.message)
  })
app.use(cors())
app.use(express.static('build'))
app.use(express.json())
app.use(middleware.requestLogger)

schedule.scheduleJob('0 0 * * *', async () => {
  await Workflow.updateMany({}, {$set: {currentNumber : 0}}) 
  initQueue()
  const refresh_token = await ZaloKey.findOne({})
  const data = {
    refresh_token: refresh_token.refresh_token,
    app_id: process.env.ZALO_APP_ID
  }
  zaloGetKey(data).then(async (response) =>{
    const zaloKey = new ZaloKey({
      access_token: response.access_token,
      refresh_token: response.refresh_token
    })
    const saved = await zaloKey.save()
    console.log(saved)
  })
})

app.use('/api/login', loginRouter)
app.use('/api/users', usersRouter)
app.use('',customerRouter)
app.use('/api/workspace/getbyID',workspaceRouter)
app.use('/api/workspace',setupWorkspaceRouter)
app.use(express.static(path.join(__dirname, 'static')))
app.get('*',(req, res) => {
  res.sendFile(path.resolve(__dirname,'build','index.html'))
})

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)
module.exports = app