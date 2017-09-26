import React, { Component } from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
import Home from './Home'

import './App.css'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      currentUser: null,
    }

    // Initialize Firebase
    const config = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
    }
    const firebaseApp = firebase.initializeApp(config)
    this.auth = firebaseApp.auth()
    this.auth.onAuthStateChanged(this.onAuthStateChanged)
    if (process.env.REACT_APP_FIREBASE_LOGGING === 'true') {
      firebaseApp.database.enableLogging(true)
    }
    this.database = firebaseApp.database()
  }

  onAuthStateChanged = user => {
    console.log('Current User:', user)
    if (user) {
      this.setState({ currentUser: user })
      if (sessionStorage.getItem('picked')) {
        const item = JSON.parse(sessionStorage.getItem('picked'))
        // const database = firebase.database()
        const newPostKey = this.database.ref().child('posts').push().key;
        const updates = {};
        // console.log('ITEM', item);
        updates[`/books/${newPostKey}`] = {
          Title: item.ItemAttributes.Title,
          ASIN: item.ASIN,
          startedAt: firebase.database.ServerValue.TIMESTAMP,
          Raw: JSON.stringify(item)
        };
        updates[`/user-books/${newPostKey}/${user.uid}`] = new Date()
        this.database.ref().update(updates).then(() => {
          sessionStorage.removeItem('picked')
        })
        .catch((error) => {
          const errorCode = error.code
          const errorMessage = error.message
          console.error('errorCode:', errorCode)
          console.error('errorMessage:', errorMessage)
        })
      }
    } else {
      this.setState({ currentUser: null })
    }
  }

  render() {
    return (
      <Router>
        <div>
          <section className="section">
            <Route exact path="/" render={props => {
              return <Home {...props} currentUser={this.state.currentUser}/>
            }} />
          </section>
        </div>
      </Router>
    )
  }
}

export default App
