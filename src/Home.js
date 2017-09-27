import React, { Component } from 'react'

class Home extends Component {
  constructor(props) {
    super(props)

    this.state = {}
  }

  componentWillMount() {
    document.title = 'Paperback Watch'
  }

  render() {
    return (
      <Search
        currentUser={this.props.currentUser}
        addItem={this.props.addItem}
      />
    )
  }
}

export default Home

const extractASINFromSearch = s => {
  try {
    const url = new URL(s)
    if (url.hostname.indexOf('.amazon.') > -1) {
      const pathParts = url.pathname.split('/')
      return pathParts[3]
    }
  } catch (ex) {
    return null
  }
  return null
}

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
    let url = '/api/search'
    const asin = extractASINFromSearch(q)
    if (asin) {
      url += `?itemid=${encodeURIComponent(asin)}`
    } else {
      url += `?keywords=${encodeURIComponent(q)}`
    }

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
    // const q = this.refs.search.value.trim()
    // console.log('Q', q)
  }

  render() {
    return (
      <div className="container">
        <form onSubmit={this.submit}>
          <div className="field has-addons">
            <div className="control is-expanded">
              <input
                type="search"
                ref="search"
                className="input"
                // value="Bernie Sanders Guide to Political Revolution"
                // value="https://www.amazon.com/Bernie-Sanderss-Guide-Political-Revolution/dp/125xx0138906/ref=pd_rhf_ee_1?_encoding=UTF8&pd_rd_i=1250138906&pd_rd_r=27NTYDDKBS5V7E9CDR2R&pd_rd_w=Gbwfq&pd_rd_wg=nhtmd&psc=1&refRID=27NTYDDKBS5V7E9CDR2R"
                // value="https://www.amazon.com/Bernie-Sanderss-Guide-Political-Revolution/dp/1250138906/ref=pd_rhf_ee_1?_encoding=UTF8&pd_rd_i=1250138906&pd_rd_r=27NTYDDKBS5V7E9CDR2R&pd_rd_w=Gbwfq&pd_rd_wg=nhtmd&psc=1&refRID=27NTYDDKBS5V7E9CDR2R"
                onChange={this.onChangeSearch}
              />
            </div>
            <div className="control">
              <button
                type="submit"
                className={
                  this.state.loading
                    ? 'button is-primary is-loading'
                    : 'button is-primary'
                }
              >
                Search
              </button>
            </div>
          </div>
          {this.state.loading && (
            <p className="help">Searching Amazon.com...</p>
          )}
        </form>

        {this.state.searchResult && (
          <SearchResult
            addItem={this.props.addItem}
            result={this.state.searchResult}
            currentUser={this.props.currentUser}
          />
        )}
      </div>
    )
  }
}

class SearchResult extends Component {
  render() {
    const { result, currentUser } = this.props
    // If it was an ItemLookup, the result.Items.Item is NOT an array
    if (result.Items.Request.Errors) {
      return <SearchResultError error={result.Items.Request.Errors.Error} />
    }
    if (!Array.isArray(result.Items.Item)) {
      result.Items.Item = [result.Items.Item]
      result.Items.TotalResults = 1
    } else {
      // If it was an ItemLookup and NOTHING was found result.Items.Item
      // is a single array whose only value is 'undefined'
      if (
        result.Items.Item.length === 1 &&
        result.Items.Item[0] === undefined
      ) {
        result.Items.Item = []
        result.Items.TotalResults = 0
      }
    }
    return (
      <div>
        <h4 className="title is-4">{result.Items.TotalResults} books found</h4>
        {result.Items.Item.map(item => {
          let allBindings = []
          if (item.AlternateVersions) {
            allBindings = item.AlternateVersions.AlternateVersion
            if (Array.isArray(allBindings)) {
              allBindings = Array.from(
                new Set(allBindings.map(each => each.Binding))
              )
            } else {
              allBindings = [allBindings.Binding]
            }
          } else {
            allBindings.push(item.ItemAttributes.Binding)
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
                    {item.ItemAttributes.ListPrice
                      ? item.ItemAttributes.ListPrice.FormattedPrice
                      : 'no price yet'}
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
                  <GetNotified
                    item={item}
                    currentUser={currentUser}
                    addItem={this.props.addItem}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}

const SearchResultError = ({ error }) => {
  return (
    <article className="message is-danger">
      <div className="message-body">
        <p>
          <b>Unable to complete the Amazon.com search.</b>
        </p>
        <p>
          <b>Message:</b> <code>{error.Message}</code>
          <br />
          <b>Code:</b> <code>{error.Code}</code>
        </p>
      </div>
    </article>
  )
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
        <button
          type="button"
          className="button is-primary is-large"
          onClick={this.pick}
        >
          Get notified when available in Paperback
        </button>
      )
    } else if (this.state.done) {
      return <h3 className="title is-3">Cool! Will let you know.</h3>
    } else {
      const email = localStorage.getItem('email') || ''
      // const email = this.props.currentUser ? this.props.currentUser.email : oldEmail
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

          {this.state.errorMessage && (
            <article className="message is-danger">
              <div className="message-body">
                <p>
                  <b>Unable to register your email due to an error.</b>
                </p>
                <p>
                  <b>Message:</b> <code>{this.state.errorMessage}</code>
                  <br />
                  <b>Code:</b> <code>{this.state.errorCode}</code>
                </p>
              </div>
            </article>
          )}
        </form>
      )
    }
  }
}
