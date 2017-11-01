import React from 'react'
import { Link } from 'react-router-dom'
import { absoluteUrl } from './Utils'

class GetNotified extends React.PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      email: '',
      picked: false,
      done: false,
      loading: false,
      mustSignIn: false
    }
  }

  submit = event => {
    event.preventDefault()
    const currentUser = this.props.currentUser
    if (!currentUser) {
      const email = this.refs.email.value.trim()
      if (!email) {
        return
      }
      this.setState({ loading: true })
      this.props.addItem(this.props.item, email).then(error => {
        if (error) {
          this.setState({ done: false, loading: false, picked: false })
          if (error.code === 'auth/email-already-in-use') {
            this.setState({ mustSignIn: true })
          }
        } else {
          this.setState({ done: true, loading: false, picked: true })
        }
      })
    } else {
      this.setState({ loading: true })
      this.props.addItem(this.props.item).then(error => {
        if (error) {
          this.setState({ done: false, loading: false, picked: false })
        } else {
          this.setState({ done: true, loading: false, picked: true })
        }
      })
    }
  }

  pick = event => {
    if (this.props.currentUser) {
      this.submit(event)
    } else {
      event.preventDefault()
      this.setState({ picked: true })
    }
  }

  cancel = event => {
    event.preventDefault()
    this.setState({ picked: false })
  }

  closeMustSignIn = event => {
    event.preventDefault()
    this.setState({ mustSignIn: false })
  }

  alreadyInYourBooks = () => {
    return this.props.yourBooks && this.props.yourBooks.filter(book => {
      return this.props.item.ASIN === book.ASIN
    }).length
  }

  render() {
    if (this.state.mustSignIn) {
      return <div className="notification is-warning">
        <button className="delete" />
        <p>
          <b>You must sign in</b>
        </p>
        <p>
          If you have used your email before, you first have to sign in.
        </p>
        <p>
          <Link to="/signin" className="button is-medium">Sign In</Link>
        </p>
      </div>
    }

    if (this.alreadyInYourBooks()) {
      return (
        <div className="notification is-success">
          <p>
            <b>You're already watching this book.</b>
          </p>
        </div>
      )
    }
    if (this.state.done || this.props.inYourBooks) {
      return (
        <div className="notification is-success">
          <h3 className="title is-3">Cool! Will let you know.</h3>
          <h5 className="subtitle">
            Please be a good friend and share this with your friends.
            <br />
            <br />
            <b>Share Link:</b>{' '}
            <Link to={`/book/${this.props.item.ASIN}`}>
              {absoluteUrl(`/book/${this.props.item.ASIN}`)}
            </Link>
          </h5>
        </div>
      )
    }
    if (!this.state.picked) {
      return (
        <div>
          <p><b>Not available in Paperback!</b></p>
          <button type="button" className="button is-primary" onClick={this.pick}>
            Notify me when available in Paperback
          </button>
        </div>
      )
    } else {
      const email = localStorage.getItem('email') || ''
      return (
        <form onSubmit={this.submit}>
          <p>
            Put in <b>your email address</b> and I'll email you{' '}
            <b>when this book is available in Paperback</b>.
          </p>
          <div className="field has-addons">
            <div className="control">
              <input
                className="input is-medium"
                ref="email"
                type="email"
                placeholder="you@example.com"
                defaultValue={email}
              />
            </div>
            <div className="control">
              <button
                type="submit"
                className={
                  this.state.loading
                    ? 'button is-info is-medium is-loading'
                    : 'button is-info is-medium'
                }
              >
                Submit
              </button>
            </div>
          </div>
          <button type="button" className="button" onClick={this.cancel}>
            Cancel
          </button>
        </form>
      )
    }
  }
}

export default GetNotified
