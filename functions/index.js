const functions = require('firebase-functions')
const aws = require('aws-lib')
const search = require('./search').search

// https://firebase.google.com/docs/functions/write-firebase-functions

const config = functions.config()
const client = aws.createProdAdvClient(
  config.aws.access_key_id,
  config.aws.secret_access_key,
  config.aws.associate_tag
)

exports.search = functions.https.onRequest((req, res) => {
  const keywords = req.query.keywords
  const itemid = req.query.itemid

  if (keywords || itemid) {
    const params = { keywords, itemid }

    search(client, params, (err, result) => {
      if (err) {
        res.status(500).json(err)
      } else {
        if (keywords) {
          console.log(`Successfully found something for '${keywords}'`)
        } else if (itemid) {
          console.log(`Successfully found something for '${itemid}'`)
        }
        res.json(result)
      }
    })
  } else {
    return res.status(400).json({ error: "'keywords' or 'itemid' missing" })
  }
})
