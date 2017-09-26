const functions = require('firebase-functions')
const admin = require('firebase-admin')
const aws = require('aws-lib')
import search from './search'

// XXX NEEDS WORK
const prodAdv = aws.createProdAdvClient(
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
  process.env.AWS_ASSOCIATE_TAG
)

admin.initializeApp(functions.config().firebase)

exports.search = functions.https.onRequest((req, res) => {
  console.log('REQ.QUERY', req.query)
  console.log('REQ.BODY', req.body)
  res.send('Thanks!')
})
