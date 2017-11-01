import React from 'react'
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
  Link
} from 'react-router-dom'
import firebase from 'firebase'
// Required for side-effects
import 'firebase/firestore'
import Home from './Home'
import Book from './Book'
import SignIn from './SignIn'

import './App.css'

import { randomString } from './Utils'

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      currentUser: null,
      yourBooks: [],
      remoteError: null
    }

    // This is a cache so we can determine whether to add the book
    // when a user adds one.
    // If it's in this cache, we can just add a new entry directly to
    // '/user-books/{user.uid}/'
    this._allKnownBooks = {}

    // Initialize Firebase
    const config = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      // databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
    }
    // const firebaseApp = firebase.initializeApp(config)
    firebase.initializeApp(config)
    this.db = firebase.firestore()
    // this.auth = firebaseApp.auth()
    this.auth = firebase.auth()
    this.auth.onAuthStateChanged(this.onAuthStateChanged)
    // if (process.env.REACT_APP_FIREBASE_LOGGING === 'true') {
    //   firebaseApp.database.enableLogging(true)
    // } else {
    //   firebaseApp.database.enableLogging(false)
    // }
    // this.database = firebaseApp.database()
  }

  onAuthStateChanged = user => {
    // console.log('Current User:', user)
    if (user) {
      this.setState({ currentUser: user }, () => {
        this._fetchYourBooks()
      })
      if (this._picked) {
        const item = this._picked
        this.addItem(item).then(() => {
          delete this._picked
        })
      }
    } else {
      this.setState({ currentUser: null })
    }
  }

  _fetchYourBooks = () => {
    if (!this.state.currentUser) {
      throw new Error('Not logged in')
    }

    const uid = this.state.currentUser.uid
    return this.db
      .collection('user-books')
      .doc(uid)
      .collection('books')
      .onSnapshot(
        snapshot => {
          const yourBooks = []
          snapshot.forEach(doc => {
            const book = doc.data()
            yourBooks.push(book)
          })
          return this.setState({ yourBooks: yourBooks })
        },
        error => {
          console.error(error)
          this._setRemoteError(error, 'Unable to load your books')
          return error
        }
      )
  }

  _setRemoteError = (error, title) => {
    const errorCode = error.code
    const errorMessage = error.message
    console.log('errorCode:', errorCode)
    console.log('errorMessage:', errorMessage)
    this.setState({
      remoteError: {
        title: title,
        code: errorCode,
        message: errorMessage
      }
    })
  }

  addItem = (item, email = '') => {
    if (!this.state.currentUser) {
      if (!email) {
        throw new Error('Email missing')
      }
      localStorage.setItem('email', email)
      const auth = firebase.auth()
      const password = randomString()
      return auth
        .createUserWithEmailAndPassword(email, password)
        .then(() => {
          // Store this picked item temporarily inside 'this'
          // since createUserWithEmailAndPassword will
          // trigger onAuthStateChanged and that's when it's the right
          // time to add it to the user-books ref.
          this._picked = item

          if (this.state.remoteError) {
            this.setState({ remoteError: null })
          }
        })
        .catch(error => {
          if (error.code === 'auth/email-already-in-use') {
            // This gets handled
            return error
          }
          this._setRemoteError(error, 'Unable create user by email')
          return error
        })
    } else {

      const batch = this.db.batch()

      const newData = {
        Title: item.ItemAttributes.Title,
        ASIN: item.ASIN,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        Item: item
      }
      const userBookRef = this.db
        .collection('user-books')
        .doc(this.state.currentUser.uid)
        .collection('books')
        .doc(item.ASIN)
      batch.set(userBookRef, newData)

      const bookUserRef = this.db
        .collection('all-books')
        .doc(item.ASIN)
        .collection('users')
        .doc(this.state.currentUser.uid)
      batch.set(bookUserRef, {
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })

      return batch.commit().then(() => {

      })
      .catch(error => {
        this._setRemoteError(error, 'Batch write failed')
        return error
      })

    }
  }

  removeItem = book => {
    const user = this.state.currentUser
    if (!user) {
      throw new Error('not logged in')
    }
    if (!book.ASIN) {
      throw new Error('no ASIN on book')
    }
    const batch = this.db.batch()
    const userBookRef = this.db
      .collection('user-books')
      .doc(user.uid)
      .collection('books')
      .doc(book.ASIN)
    batch.delete(userBookRef)

    const bookUserRef = this.db
      .collection('all-books')
      .doc(book.ASIN)
      .collection('users')
      .doc(user.uid)
    batch.delete(bookUserRef)

    return batch.commit().then(() => {
      console.log('Refs deleted');
    })
    .catch(error => {
      this._setRemoteError(error, 'Batch delete failed')
      return error
    })

  }

  sendPasswordResetEmail = email => {
    const actionCodeSettings = {}
    const auth = firebase.auth()
    return auth
      .sendPasswordResetEmail(email, actionCodeSettings)
      .then(() => {
        // Password reset email sent.
      })
      .catch(error => {
        this._setRemoteError(error, 'Send a password reset')
        return error
      })
  }

  signIn = (email, password) => {
    const auth = firebase.auth()
    return auth
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        // Should be signed in now
      })
      .catch(error => {
        this._setRemoteError(error, 'Unable sign in')
        return error
      })
  }

  removeRemoteError = () => {
    this.setState({ remoteError: null })
  }

  scrollToYourBooks = event => {
    const elm = document.querySelector('div.your-books')
    if (elm && elm.scrollIntoView) {
      elm.scrollIntoView()
    }
  }

  render() {
    return (
      <Router>
        <div>
          <nav className="navbar" aria-label="main navigation">
            <div className="navbar-brand">
              <Link to="/" className="navbar-item">
                Paperback Watch
              </Link>

              {/* <button className="button navbar-burger">
                <span />
                <span />
                <span />
              </button> */}
            </div>
            <div className="navbar-menu">
              <div className="navbar-end">
                {this.state.yourBooks.length && (
                  <div className="navbar-item has-dropdown is-hoverable">
                    <Link
                      to="/"
                      className="navbar-link"
                      onClick={this.scrollToYourBooks}
                    >
                      Your Books ({this.state.yourBooks.length})
                    </Link>
                    <div className="navbar-dropdown is-right">
                      {this.state.yourBooks.map(book => {
                        return (
                          <Link
                            to={`/book/${book.ASIN}`}
                            key={book.ASIN}
                            className="navbar-item"
                          >
                            {book.Title}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>

          <section className="section">
            {this.state.remoteError && (
              <RemoteError
                error={this.state.remoteError}
                removeError={this.removeRemoteError}
              />
            )}

            <Switch>
              <Route
                exact
                path="/"
                render={props => {
                  return (
                    <Home
                      {...props}
                      yourBooks={this.state.yourBooks}
                      currentUser={this.state.currentUser}
                      addItem={this.addItem}
                      removeItem={this.removeItem}
                    />
                  )
                }}
              />

              <Route
                exact
                path="/book/:asin"
                render={props => {
                  return (
                    <Book
                      {...props}
                      yourBooks={this.state.yourBooks}
                      currentUser={this.state.currentUser}
                      addItem={this.addItem}
                      removeItem={this.removeItem}
                    />
                  )
                }}
              />

              <Route
                path="/signin"
                render={props => {
                  return (
                    <SignIn
                      {...props}
                      signIn={this.signIn}
                      sendPasswordResetEmail={this.sendPasswordResetEmail}
                      currentUser={this.state.currentUser}
                    />
                  )
                }}
              />
              <Redirect exact from="/book" to="/" />

              <Route component={PageNotFound} />
            </Switch>
          </section>
        </div>
      </Router>
    )
  }
}

export default App

// Happens when Firebase yells at us
class RemoteError extends React.PureComponent {
  // constructor(props) {
  //   super(props)
  //
  //   this.state = {
  //     closed: false
  //   }
  // }

  close = event => {
    event.preventDefault()
    this.props.removeError()
  }

  render() {
    const { error } = this.props
    return (
      <div className="modal is-active">
        <div className="modal-background" />
        <div className="modal-content">
          <article className="message is-danger">
            <div className="message-body">
              <h4 className="title is-4">A Server Error Happened</h4>
              <p>
                <b>{error.title}</b>
              </p>
              <p>
                <b>Message:</b> <code>{error.message}</code>
                <br />
                <b>Code:</b> <code>{error.code}</code>
              </p>
            </div>
          </article>
        </div>
        <button
          className="modal-close is-large"
          aria-label="close"
          onClick={this.close}
        />
      </div>
    )
  }
}

class PageNotFound extends React.PureComponent {
  render() {
    return (
      <div className="container">
        <div className="notification is-danger">
          <h3 className="title is-2">Page Not Found</h3>
          <p>
            <Link to="/" className="button">
              <b>Go Back Home</b>
            </Link>
          </p>
        </div>
      </div>
    )
  }
}
