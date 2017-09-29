import React from 'react'
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
  Link
} from 'react-router-dom'
import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
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

  componentDidMount() {
    // create a mapping of ALL books we have already
    this.database.ref('/books').on('value', snapshot => {
      snapshot.forEach(child => {
        this._allKnownBooks[child.val().ASIN] = child.key
      })
    })
  }

  onAuthStateChanged = user => {
    console.log('Current User:', user)
    if (user) {
      this.setState({ currentUser: user }, () => {
        this._fetchYourBooks()
      })
      if (this._picked) {
        const item = this._picked
        this.addItem(item).then(() => {
          // this._fetchYourBooks()
          delete this._picked
          // sessionStorage.removeItem('picked')
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
    const ref = this.database.ref(`/user-books/${this.state.currentUser.uid}`)
    // const yourBooks = []
    return ref.once('value', snapshot => {
      // const yourBooks = []
      snapshot.forEach(childSnapshot => {
        var childKey = childSnapshot.key
        this.database
          .ref(`/books/${childKey}`)
          .orderByChild('createdAt')
          .once('value', bookSnapshot => {
            const book = bookSnapshot.val()
            book.key = bookSnapshot.key
            book.item = JSON.parse(book.Raw)
            delete book.Raw
            // yourBooks.push(book)
            this.setState((state, props) => {
              console.log('Your book:', book);
              return { yourBooks: [...state.yourBooks, book] }
            })
          })
      })
    })
    // return ref.on('child_added', snapshot => {
    //   console.log(snapshot.key, snapshot.val());
    // })
    // ref.once('value').then(snapshot => {
    //   // const yourBooks = this.state.yourBooks
    //   const value = snapshot.val()
    //   if (value) {
    //     // Only add it if it's not already there.
    //     // console.log('VALUE:', value)
    //     // console.log('EXISTING:', yourBooks.map(a => a.ASIN))
    //     yourBooks.push(value)
    //     this.setState({ yourBooks: yourBooks })
    //   }
    // })
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
          // Handle Errors here.
          const errorCode = error.code
          const errorMessage = error.message
          console.log('errorCode:', errorCode)
          console.log('errorMessage:', errorMessage)
          this.setState({
            remoteError: {
              title: 'Unable create user by email',
              code: errorCode,
              message: errorMessage
            }
          })
          return error
        })
    } else {
      // We need to decide whether to first add the book first.
      const newPostKey =
        this._allKnownBooks[item.ASIN] || this.database.ref('/books').push().key

      return this.database
        .ref(`/books/${newPostKey}`)
        .set({
          Title: item.ItemAttributes.Title,
          ASIN: item.ASIN,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          Raw: JSON.stringify(item)
        })
        .then(() => {
          const user = this.state.currentUser
          return this.database
            .ref(`/user-books/${user.uid}/${newPostKey}`)
            .push()
            .set({
              startedAt: firebase.database.ServerValue.TIMESTAMP
            })
            .then(() => {
              if (this.state.remoteError) {
                this.setState({ remoteError: null })
              }
              return this._fetchYourBooks()
            })
            .catch(error => {
              const errorCode = error.code
              const errorMessage = error.message
              console.error('errorCode:', errorCode)
              console.error('errorMessage:', errorMessage)
              this.setState({
                remoteError: {
                  title: 'Unable to save user and book combination',
                  code: errorCode,
                  message: errorMessage
                }
              })
            })
        })
        .catch(error => {
          const errorCode = error.code
          const errorMessage = error.message
          console.error('errorCode:', errorCode)
          console.error('errorMessage:', errorMessage)
          this.setState({
            remoteError: {
              title: 'Unable to save book',
              code: errorCode,
              message: errorMessage
            }
          })
        })
    }
  }

  removeItem = book => {
    const user = this.state.currentUser
    this.database
      .ref(`/user-books/${user.uid}/${book.key}`)
      .remove()
      .then(() => {
        this._fetchYourBooks()
      })
  }

  sendPasswordResetEmail = email => {
    const actionCodeSettings = {}
    const auth = firebase.auth()
    return auth.sendPasswordResetEmail(email, actionCodeSettings)
    .then(() => {
      // Password reset email sent.
    })
    .catch(function(error) {
      const errorCode = error.code
      const errorMessage = error.message
      console.error('errorCode:', errorCode)
      console.error('errorMessage:', errorMessage)
      this.setState({
        remoteError: {
          title: 'Unable to save book',
          code: errorCode,
          message: errorMessage
        }
      })
      return error
    });
  }

  removeRemoteError = () => {
    this.setState({remoteError: null})
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

              <button className="button navbar-burger">
                <span />
                <span />
                <span />
              </button>
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
                      sendPasswordResetEmail={this.sendPasswordResetEmail}
                      currentUser={this.state.currentUser}
                    />
                  )
                }}
              />
              <Redirect exact from="/book" to="/" />

              <Route component={PageNotFound} />
            </Switch>

            <YourBooks
              removeItem={this.removeItem}
              books={this.state.yourBooks}
            />
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
        <div className="modal-background"></div>
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
        <button className="modal-close is-large" aria-label="close"
          onClick={this.close}></button>
      </div>
    )
  }
}

class YourBooks extends React.PureComponent {
  render() {
    const { books } = this.props
    if (!books.length) {
      return null
    }
    return (
      <div className="your-books container">
        <h3 className="title">
          You're watching {books.length} book{books.length === 1 ? '' : 's'}
        </h3>
        {books.map(book => (
          <YourBook
            removeItem={this.props.removeItem}
            key={book.ASIN}
            book={book}
          />
        ))}
      </div>
    )
  }
}

class YourBook extends React.PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      confirm: false
    }
  }

  deleteItem = event => {
    event.preventDefault()
    this.props.removeItem(this.props.book)
  }

  deleteItemConfirm = event => {
    event.preventDefault()
    this.setState({ confirm: true })
  }

  cancelConfirmation = event => {
    event.preventDefault()
    this.setState({ confirm: false })
  }

  render() {
    const { book } = this.props
    const item = book.item
    return (
      <article className="media">
        <figure className="media-left">
          <p className="image is-128x128">
            <img src={item.MediumImage.URL} alt="Book cover" />
          </p>
        </figure>
        <div className="media-content">
          <div className="content">
            <h3 className="title">
              <strong>{book.Title}</strong>{' '}
              <span className="tag is-medium">
                {item.ItemAttributes.ListPrice
                  ? item.ItemAttributes.ListPrice.FormattedPrice
                  : 'no price yet'}
              </span>
            </h3>
            <h5 className="subtitle">
              By <b>{item.ItemAttributes.Author}</b>,{' '}
              {item.ItemAttributes.NumberOfPages} pages, published{' '}
              {item.ItemAttributes.PublicationDate}
            </h5>
          </div>
        </div>
        <div className="media-right">
          {this.state.confirm ? (
            <Confirmation
              onCancel={this.cancelConfirmation}
              onConfirm={this.deleteItem}
            />
          ) : (
            <button className="delete" onClick={this.deleteItemConfirm} />
          )}
        </div>
      </article>
    )
  }
}

const Confirmation = ({ onCancel, onConfirm }) => {
  return (
    <div>
      <button
        type="button"
        className="button is-small is-primary"
        onClick={onConfirm}
      >
        Yes
      </button>
      <button
        type="button"
        className="button is-small is-light"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
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
