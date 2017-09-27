const functions = require('firebase-functions');
const aws = require('aws-lib')
import search from './search'

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.search = functions.https.onRequest((request, response) => {
  console.log('REQ.QUERY', req.query)
  console.log('REQ.BODY', req.body)
  response.send("Hello from Firebase!");
});
