const functions = require('firebase-functions')
const admin = require('firebase-admin')
const aws = require('aws-lib')
const nodemailer = require('nodemailer')
const postmarkTransport = require('nodemailer-postmark-transport')
const search = require('./search').search

// https://firebase.google.com/docs/functions/write-firebase-functions

const config = functions.config()
admin.initializeApp(config.firebase)

// Since this code will be running in the Cloud Functions enviornment
// we call initialize Firestore without any arguments because it
// detects authentication from the environment.
const firestore = admin.firestore()

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
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.json(result)
      }
    })
  } else {
    return res.status(400).json({ error: "'keywords' or 'itemid' missing" })
  }
})

// exports.emailAdmin = functions.firestore
//   .document('user-books/{userId}')
//   .onWrite(event => {
//     console.log('all-books EVENT', event);
//     console.log('event.data', event.data);
//     console.log('event.data.data()', event.data.data());
//   })

// const mailTransport = nodemailer.createTransport(
//   `smtps://${config.email.user}:${config.email.password}@${config.email.host}`
// )

const transport = nodemailer.createTransport(
  postmarkTransport({
    auth: {
      apiKey: config.email.api_key
    }
  })
)

const jsonify = (obj, indentation = 3) => {
  return JSON.stringify(obj, undefined, indentation)
}

exports.emailAdmin = functions.firestore
  .document('user-books/{userId}/books/{ASIN}')
  .onWrite(event => {
    // console.log('2) all-books EVENT', event)
    // console.log('2) event.data', event.data)
    // console.log('2) event.data.data()', event.data.data())
    const book = event.data.data()
    const uid = event.params.userId
    const asin = event.params.ASIN
    console.log(`New Book (${asin}) added to ${uid}:`, book)

    bookAsJson = jsonify(book)
    let mailOptions = {
      from: `"Paperback Watch 📘" <${config.email.admin_from}>`,
      to: config.email.admin_to, // list of receivers
      subject: `Someone (${uid}) added a new book (${asin})`,
      text: `
User uid (${uid}) added a new book.
===================================
${book.Title}
-----------------------------------

${bookAsJson}
`.trim()
      // html: '<b>Hello world?</b>' // html body
    }

    return transport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.warn('Error trying to send email with', mailTransport)
        console.error(error)
        return error
      }
      console.log('Message sent: %s', info.messageId)

      return info.messageId

      // https://stackoverflow.com/questions/47117620/get-a-auth-user-by-its-uid-in-firestore-cloud-function
      // return firestore
      //   .collection('users')
      //   .doc(uid)
      //   .get()
      //   .then(doc => {
      //     console.log(`Looked up user (${uid}):`, jsonify(doc.data()))
      //     return doc.data()
      //   })
      //   .catch(error => {
      //     console.error('Error trying to get a user by uid', error)
      //     return error
      //   })
      //
    })
  })

// const sendEmail = ({ })

const _getAllBindings = item => {
  let allBindings = []
  if (item.AlternateVersions) {
    allBindings = item.AlternateVersions.AlternateVersion
    if (Array.isArray(allBindings)) {
      allBindings = Array.from(new Set(allBindings.map(each => each.Binding)))
    } else {
      allBindings = [allBindings.Binding]
    }
  } else {
    allBindings.push(item.ItemAttributes.Binding)
  }
  return allBindings
}

exports.checkAll = functions.https.onRequest((req, res) => {
  const ref = firestore.collection('all-books')
  // const now = (new Date()).getTime() / 1000
  const now = new Date()
  return ref
    .where('nextCheckAt', '<', now)
    .get()
    .then(querySnapshot => {
      const result = {}
      let count = querySnapshot.docs.length
      console.log('#Books', count)
      if (!count) {
        res.send('No books to check')
      }
      let index = 0
      querySnapshot.forEach(doc => {
        const asin = doc.id
        const book = doc.data()
        const params = { itemid: asin }
        search(client, params, (err, searchResult) => {
          let inPaperback = false
          if (err) {
            throw new Error(err)
            // console.error(`Error searching for ${params}`, err)
          } else {
            const item = searchResult.Items.Item
            const allBindings = _getAllBindings(item)
            console.log(
              `"${item.ItemAttributes.Title}" is available in ${allBindings}`
            )
            inPaperback = allBindings.includes('Paperback')
            result[asin] = inPaperback
            if (inPaperback) {
              console.warn('EMAIL EVERYBODY IN THE users SUB COLLECTION!')
              throw new Error('not implemented error')
            } else {
              const nextCheckAt = now
              nextCheckAt.setSeconds(now.getSeconds() + 3) // number of seconds to check again
              const bookRef = firestore
                .collection('all-books')
                .doc(asin)
                .set({
                  nextCheckAt: nextCheckAt,
                  Item: item
                })
                .then(() => {
                  if (index === count - 1) {
                    res.json(result)
                  } else {
                    index++
                  }
                })
            }
          }
        })
      })
    })
    .catch(error => {
      res.status(500).json(error)
    })
})
