const process = require('process')
const express = require('express')
const bodyParser = require('body-parser')
const search = require('./functions/search').search

const aws = require('aws-lib')
const env = require('node-env-file')
const app = express()

app.use(bodyParser.json())

env(__dirname + '/.env')

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('AWS_ACCESS_KEY_ID environment variable missing')
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_SECRET_ACCESS_KEY environment variable missing')
}
if (!process.env.AWS_ASSOCIATE_TAG) {
  throw new Error('AWS_ASSOCIATE_TAG environment variable missing')
}
const prodAdv = aws.createProdAdvClient(
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
  process.env.AWS_ASSOCIATE_TAG
)

console.log('Loaded using tag: ' + process.env.AWS_ASSOCIATE_TAG)

app.get('/', function(req, res) {
  res.send('Hello World!')
})

const cache = {}

app.get('/api/search', function(req, res) {
  const keywords = req.query.keywords
  const itemid = req.query.itemid

  if (keywords || itemid) {
    if (keywords && cache[keywords]) {
      console.log('Cache hit (keywords)!', keywords)
      res.json(cache[keywords])
    } else if (itemid && cache[itemid]) {
      console.log('Cache hit (itemid)!', itemid)
      res.json(cache[itemid])
    } else {
      const params = { keywords, itemid }
      search(prodAdv, params, (err, result) => {
        if (err) {
          res.status(500).json(err)
        } else {
          if (keywords) {
            console.log(`Successfully found something for '${keywords}'`)
            cache[keywords] = result
          } else if (itemid) {
            console.log(`Successfully found something for '${itemid}'`)
            cache[itemid] = result
          }
          res.json(result)
        }
      })
    }
  } else {
    return res.status(400).json({ error: "'keywords' or 'itemid' missing" })
  }
})

var port = parseInt(process.env.PORT || 4000, 10)

app.listen(port, function() {
  console.log('Listening on port ' + port)
})
