import React from 'react'
import { Redirect, Link } from 'react-router-dom'

class SignIn extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      sent: null,
      email: ''
    }
  }

  componentDidMount() {
    const email = localStorage.getItem('email')
    if (email) {
      // XXX probably want to use a localStorage to guard this from
      // firing repeatedly and excessively.
      this.props.sendPasswordResetEmail(email).then(error => {
        if (!error) {
          this.setState({ sent: email })
        }
      })
      this.setState({ email: email })
    }
  }

  submit = event => {
    event.preventDefault()
    const email = this.refs.email.value.trim()
    const password = this.refs.password.value.trim()
    this.props.signIn(email, password).then(error => {
      if (!error) {
        this.setState({ redirectHome: true })
      }
    })
  }
  render() {
    if (this.state.redirectHome) {
      return <Redirect to="/" />
    }
    return (
      <div className="container">
        <h2 className="title">Sign In</h2>
        <h3 className="subtitle">
          If you have entered your email before (perhaps a different time or
          different device), to use the same email again you have to sign in
          now.
        </h3>

        {this.state.sent && (
          <div className="notification is-info">
            A password reset email as been sent to{' '}
            <code>{this.state.sent}</code>.
          </div>
        )}

        <form method="post" onSubmit={this.submit}>
          <div className="field">
            <label className="label">Email</label>
            <div className="control">
              <input
                className="input"
                ref="email"
                type="email"
                placeholder="youremail@example.com"
                defaultValue={this.state.email}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Password</label>
            <div className="control">
              <input className="input" ref="password" type="password" />
            </div>
          </div>

          <div className="field is-grouped">
            <div className="control">
              <button className="button is-primary">Submit</button>
            </div>
            <div className="control">
              <Link to="/" className="button is-link">Cancel</Link>
            </div>
          </div>
        </form>
      </div>
    )
  }
}

export default SignIn
