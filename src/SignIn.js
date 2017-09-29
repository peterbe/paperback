import React from 'react'

class SignIn extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true
    }
  }

  componentDidMount() {
    const email = localStorage.getItem('email')
    if (email) {
      this.props.sendPasswordResetEmail(email).then(error => {
        if (!error) {
          this.setState({ sent: email })
        }
      })
      this.setState({ email: email })
    }
  }
  render() {
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
      </div>
    )
  }
}

export default SignIn
