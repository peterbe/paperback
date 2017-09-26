import React, { Component } from 'react'
import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'

class Home extends Component {
  constructor(props) {
    super(props)

    this.state = {}
  }

  componentWillMount() {
    document.title = 'Paperback Watch'
  }

  render() {
    return <Search />
  }
}

export default Home

class Search extends Component {
  constructor(props) {
    super(props)

    this.state = {
      search: '',
      loading: false,
      fetchError: null
    }
  }

  submit = event => {
    event.preventDefault()
    const q = this.refs.search.value.trim()
    console.log('Search for', q)
    const url = '/api/search?keywords=' + encodeURIComponent(q)
    this.setState({ loading: true })
    fetch(url).then(r => {
      this.setState({ loading: false })
      if (r.status === 200) {
        r.json().then(response => {
          console.log('RESPONSE', response)
          this.setState({ searchResult: response })
        })
      } else {
        r.text().then(response => {
          this.setState({
            fetchError: {
              status: r.status,
              text: response
            }
          })
        })
      }
    })
  }

  onChangeSearch = event => {
    const q = this.refs.search.value.trim()
    console.log('Q', q)
  }

  render() {
    const { currentUser } = this.props
    return (
      <div>
        <form onSubmit={this.submit}>
          <div className="field has-addons">
            <div className="control is-expanded">
              <input
                type="search"
                ref="search"
                className="input"
                value="Bernie Sanders Guide to Political Revolution"
                onChange={this.onChangeSearch}
              />
            </div>
            <div className="control">
              <button
                type="submit"
                className={this.state.loading ? 'button is-loading' : 'button'}
              >
                Search
              </button>
            </div>
            {this.state.loading && (
              <p className="help">Searching Amazon.com...</p>
            )}
          </div>
        </form>

        {this.state.searchResult && (
          <SearchResult
            result={this.state.searchResult}
            currentUser={currentUser}
          />
        )}
      </div>
    )
  }
}

class SearchResult extends Component {
  render() {
    const { result, currentUser } = this.props
    return (
      <div>
        <h4 className="title is-4">{result.Items.TotalResults} books found</h4>
        {result.Items.Item.map(item => {
          let allBindings = item.AlternateVersions.AlternateVersion
          if (Array.isArray(allBindings)) {
            allBindings = Array.from(
              new Set(allBindings.map(each => each.Binding))
            )
          } else {
            allBindings = [allBindings.Binding]
          }
          const inPaperback = allBindings.includes('Paperback')
          return (
            <div className="columns" key={item.ASIN}>
              <div className="column is-one-quarter" style={{ maxWidth: 300 }}>
                <a title={item.ItemAttributes.Title} href={item.DetailPageURL}>
                  <img src={item.LargeImage.URL} alt="Book cover" />
                </a>
              </div>
              <div className="column">
                <h2 className="title">
                  {item.ItemAttributes.Title}{' '}
                  <span className="tag is-medium">
                    {item.ItemAttributes.ListPrice.FormattedPrice}
                  </span>
                </h2>
                <h3 className="subtitle">
                  By <b>{item.ItemAttributes.Author}</b>,{' '}
                  {item.ItemAttributes.NumberOfPages} pages, published{' '}
                  {item.ItemAttributes.PublicationDate}
                </h3>
                {inPaperback ? (
                  <p>
                    <a href={item.DetailPageURL}>
                      Already available in Paperback!
                    </a>
                  </p>
                ) : (
                  <GetNotified item={item} currentUser={currentUser} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}

const createRandomPassword = (length = 25) => {
  const text = []
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < length; i++)
    text.push(possible.charAt(Math.floor(Math.random() * possible.length)))
  return text.join('')
}


class GetNotified extends Component {
  constructor(props) {
    super(props)

    this.state = {
      email: '',
      picked: false,
      done: false,
      loading: false,
      errorCode: null,
      errorMessage: null,
    }
  }

  submit = event => {
    event.preventDefault()
    const email = this.refs.email.value.trim()
    if (!email) {
      return
    }
    this.setState({ loading: true })
    console.log('REGISTER:', email)
    localStorage.setItem('email', email)
    const auth = firebase.auth()
    const password = createRandomPassword()
    auth
      .createUserWithEmailAndPassword(email, password)
      .then(() => {
        console.log('THEN called');
        sessionStorage.setItem('picked', JSON.stringify(this.props.item))
        this.setState({ done: true, loading: false })
      })
      .catch((error) => {
        this.setState({ loading: false })
        // Handle Errors here.
        const errorCode = error.code
        const errorMessage = error.message
        console.log('errorCode:', errorCode)
        console.log('errorMessage:', errorMessage)
        this.setState({
          errorCode: errorCode,
          errorMessage: errorMessage,
        })
      })
  }

  pick = event => {
    event.preventDefault()
    this.setState({ picked: true })
  }

  cancel = event => {
    event.preventDefault()
    this.setState({ picked: false })
  }

  render() {
    const { item, currentUser } = this.props
    if (!this.state.picked) {
      return (
        <a
          href={item.DetailPageURL}
          className="button is-primary is-large"
          onClick={this.pick}
        >
          Get notified when available in Paperback
        </a>
      )
    } else if (this.state.done) {
      return (
        <h3 className="title is-3">Cool! Will let you know.</h3>
      )
    } else {
      const oldEmail = localStorage.getItem('email') || ''
      const email = currentUser ? currentUser.email : oldEmail
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

          { this.state.errorMessage &&
          <article className="message is-danger">
            <div className="message-body">
              <p><b>Unable to register your email due to an error.</b></p>
              <p>
                <b>Message:</b> <code>{this.state.errorMessage}</code><br/>
                <b>Code:</b> <code>{this.state.errorCode}</code>
              </p>
            </div>
          </article>
          }
        </form>
      )
    }
  }
}
