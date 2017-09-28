import React from 'react'


class GetNotified extends React.PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      email: '',
      picked: false,
      done: false,
      loading: false,
      errorCode: null,
      errorMessage: null
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
      this.props.addItem(this.props.item, email).then(() => {
        console.log('ADD ITEM THEN')
        this.setState({ done: true, loading: false, picked: true })
      })
    } else {
      this.setState({ loading: true })
      this.props.addItem(this.props.item).then(() => {
        console.log('ADD ITEM THEN')
        this.setState({ done: true, loading: false, picked: true })
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

  render() {
    if (!this.state.picked) {
      return (
        <button type="button" className="button is-primary" onClick={this.pick}>
          Notify me when available in Paperback
        </button>
      )
    } else if (this.state.done) {
      return (
        <div className="notification is-success">
          <h3 className="title is-3">Cool! Will let you know.</h3>
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
