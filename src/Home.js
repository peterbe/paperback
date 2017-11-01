import React from 'react'
import { Link } from 'react-router-dom'
import { throttle } from 'throttle-debounce'
import queryString from 'query-string'
import { thousandFormat, getAllBindings } from './Utils'
import book256 from './book-256.png'
import GetNotified from './GetNotified'
import YourBooks from './YourBooks'

import './Home.css'

class Home extends React.PureComponent {
  constructor(props) {
    super(props)

    // console.log('Home constructor and initialSearch=', this._getSearch(this.props));
    this.state = {
      initialSearch: this._getSearch(this.props)
    }
  }

  _getSearch = props => {
    if (props.location.search) {
      const qs = queryString.parse(props.location.search)
      if (qs.q) {
        return qs.q
      }
    }
    return ''
  }

  // componentDidMount() {
  //   console.log('Home componentDidMount and initialSearch=', this._getSearch(this.props));
  // }

  componentWillMount() {
    document.title = 'Paperback Watch'
  }

  searchSubmitted = q => {
    this.props.history.push({ search: `?q=${encodeURIComponent(q)}` })
  }

  searchUpdated = q => {
    // this.props.location.search = `?q=${encodeURIComponent(q)}`
  }

  componentWillReceiveProps(nextProps) {
    const search = this._getSearch(nextProps)
    // console.log('Home componentWillReceiveProps and initialSearch=', search);
    if (this.state.initialSearch !== search) {
      this.setState({ initialSearch: search })
    }
  }

  // componentDidUpdate() {
  //   console.log('UPDATE', this.props.location);
  // }

  render() {
    return (
      <div>
        <section className="hero is-bold">
          <div className="hero-body">
            <div className="container">
              <h1 className="title">Paperback Watch</h1>
              <h2 className="subtitle">
                Get Notified When A Book Becomes Available In <b>Paperback</b>{' '}
                On <b>Amazon.com</b>
              </h2>
            </div>
          </div>
        </section>
        <Search
          initialSearch={this.state.initialSearch}
          currentUser={this.props.currentUser}
          addItem={this.props.addItem}
          searchSubmitted={this.searchSubmitted}
          searchUpdated={this.searchUpdated}
          yourBooks={this.props.yourBooks}
        />
        {this.props.yourBooks.length ? (
          <YourBooks
            removeItem={this.props.removeItem}
            books={this.props.yourBooks}
          />
        ) : (
          <FAQs />
        )}
      </div>
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

class Search extends React.PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      search: this.props.initialSearch,
      loading: false,
      fetchError: null,
      searchResult: null
    }

    this.searchThrottled = throttle(1600, this.search)
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.searchResult) {
      if (nextProps.initialSearch !== this.state.search) {
        console.log(
          `Wipe searchResult because initialSearch=${nextProps.initialSearch}`
        )
        this.refs.search.value = nextProps.initialSearch
        this.setState({ searchResult: null, fetchError: null })
      }
    } else if (this.state.search !== nextProps.initialSearch) {
      this.refs.search.value = nextProps.initialSearch
      this.setState({ search: nextProps.initialSearch })
    }
  }

  componentWillUnmount() {
    this.dismounted = true
  }

  componentDidMount() {
    if (this.props.initialSearch) {
      this.refs.search.value = this.props.initialSearch
      this.search(this.props.initialSearch)
    }
    window.setTimeout(() => {
      if (!this.dismounted) {
        if (!this.props.yourBooks.length) {
          this.refs.search.focus()
        }
      }
    }, 1000)
  }

  submit = event => {
    event.preventDefault()
    const q = this.refs.search.value.trim()
    if (q) {
      this.search(q)
      this.props.searchSubmitted(q)
    }
  }

  search = q => {
    console.log('Searching', q)
    // const serverPrefix = process.env.REACT_APP_SERVER_PREFIX
    let url = '/api/search'
    const asin = extractASINFromSearch(q)
    if (asin) {
      url += `?itemid=${encodeURIComponent(asin)}`
    } else {
      url += `?keywords=${encodeURIComponent(q)}`
    }
    this.setState({ loading: true, search: q })
    fetch(url).then(r => {
      this.setState({ loading: false })
      if (r.status === 200) {
        r.json().then(response => {
          // console.log('RESPONSE', response)
          if (
            response.Items &&
            response.Items.Item &&
            Array.isArray(response.Items.Item)
          ) {
            // Do some hackish filtering of junk
            response.Items.Item = response.Items.Item.filter(item => {
              if (
                !item.LargeImage &&
                (!item.ItemAttributes.NumberOfPages ||
                  !item.ItemAttributes.ListPrice)
              ) {
                return false
              }
              const title = item.ItemAttributes.Title
              if (!item.ItemAttributes.ListPrice && title.startsWith('[')) {
                return false
              }
              return true
            })
          }
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
    // autocomplete?
    const q = this.refs.search.value.trim()
    this.props.searchUpdated(q)
    if (q) {
      this.searchThrottled(q)
    } else if (this.state.searchResult) {
      this.setState({ searchResult: null })
    }
  }

  onPickedExample = q => {
    this.refs.search.value = q
    // console.log(this.refs.search)
    // console.log(this.refs.search.value)
    this.search(q)
    this.props.searchSubmitted(q)
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
                onChange={this.onChangeSearch}
                placeholder="The name of the book you want in Paperback"
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
            <p className="help">
              Searching Amazon.com for <b>{this.state.search}</b>...
            </p>
          )}
          {!this.state.search &&
            !this.state.searchResult &&
            !this.props.yourBooks.length && (
              <ShowExampleSearches onPicked={this.onPickedExample} />
            )}
        </form>

        <SearchResult
          addItem={this.props.addItem}
          result={this.state.searchResult}
          currentUser={this.props.currentUser}
          yourBooks={this.props.yourBooks}
        />
      </div>
    )
  }
}

class ShowExampleSearches extends React.PureComponent {
  load = (event, example) => {
    event.preventDefault()
    const q = `${example[0]} by ${example[1]}`
    this.props.onPicked(q)
  }
  makeHref = q => {
    return `/?q=${encodeURIComponent(q)}`
  }
  render() {
    const examples = [
      ['Astrophysics for People in a Hurry', 'Neil deGrasse Tyson'],
      ['Leonardo da Vinci', 'Walter Isaacson'],
      [
        'Killing England: The Brutal Struggle for American Independence',
        "Bill O'Reilly"
      ],
      ['Bernie Sanders Guide to Political Revolution', 'Bernie Sanders']
    ]
    return (
      <div className="examples container content">
        <h4>For example...</h4>
        <ul>
          {examples.map(example => {
            return (
              <li key={example[0]}>
                <a
                  href={this.makeHref(example[0])}
                  onClick={event => this.load(event, example)}
                >
                  <b>{example[0]}</b> by {example[1]}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }
}

class SearchResult extends React.PureComponent {
  render() {
    const { result } = this.props
    if (!result) {
      return null
    }
    // If it was an ItemLookup, the result.Items.Item is NOT an array
    if (result.Items.Request.Errors) {
      const error = result.Items.Request.Errors.Error
      console.log('ERRORS', error)
      if (error.Code === 'AWS.ECommerceService.NoExactMatches') {
        return <SearchResultNone message={error.Message} />
      }
      return <SearchResultError error={error} />
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

    // const listedASINs = []

    const yourASINs = this.props.yourBooks.map(book => book.ASIN)
    return (
      <div>
        <h5 className="title is-5">
          {thousandFormat(result.Items.TotalResults)} books found
        </h5>
        {result.Items.Item.map(item => {
          // console.log(listedASINs);
          // listedASINs.push(item.ASIN)
          // let allBindings = []
          // if (item.AlternateVersions) {
          //   allBindings = item.AlternateVersions.AlternateVersion
          //   if (Array.isArray(allBindings)) {
          //     allBindings = Array.from(
          //       new Set(allBindings.map(each => each.Binding))
          //     )
          //   } else {
          //     allBindings = [allBindings.Binding]
          //   }
          // } else {
          //   allBindings.push(item.ItemAttributes.Binding)
          // }
          // // Filter out junk/uninteresting binding formats
          // allBindings = allBindings.filter(b => {
          //   return b && !IGNORE_BINDINGS.includes(b)
          // })
          const allBindings = getAllBindings(item)
          const inPaperback = allBindings.includes('Paperback')
          const otherBindings = allBindings.filter(
            binding => binding !== 'Paperback'
          )
          const inYourBooks = yourASINs.includes(item.ASIN)
          return (
            <div className="columns" key={item.ASIN}>
              <div className="column is-one-quarter" style={{ maxWidth: 300 }}>
                <Link
                  to={`/book/${item.ASIN}`}
                  title={item.ItemAttributes.Title}
                >
                  {item.LargeImage ? (
                    <img src={item.LargeImage.URL} alt="Book cover" />
                  ) : (
                    <img src={book256} alt="No book cover!" />
                  )}
                </Link>
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
                  {item.ItemAttributes.NumberOfPages || '??'} pages, published{' '}
                  {item.ItemAttributes.PublicationDate}
                </h3>
                {inPaperback ? (
                  <p>
                    <a href={item.DetailPageURL}>
                      <b>Already available in Paperback!</b>
                    </a>
                  </p>
                ) : (
                  <GetNotified
                    item={item}
                    currentUser={this.props.currentUser}
                    addItem={this.props.addItem}
                    inYourBooks={inYourBooks}
                  />
                )}
                <p className="other-bindings">
                  Also available in{' '}
                  {otherBindings.map((binding, i) => (
                    <span key={binding} className="tag is-small">
                      {binding}
                    </span>
                  ))}
                </p>
                <p>
                  <a href={item.DetailPageURL}>On Amazon.com</a>
                </p>
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

const SearchResultNone = ({ message }) => {
  return (
    <article className="message">
      <div className="message-body">
        <p>
          <b>Nothing found.</b>
        </p>
        <p>
          <b>Message from Amazon:</b> <code>{message}</code>
        </p>
      </div>
    </article>
  )
}

const FAQs = () => {
  return (
    <div className="faqs container content">
      <h2>Frequently Asked Questions</h2>
      <h3>Is it free?</h3>
      <p>
        Yes, <b>absolutely free</b>.<br />
        You can watch as many books as you like.
      </p>
      <h3>Is it safe?</h3>
      <p>
        Absolutely! The email address you enter, will{' '}
        <b>never be shared or used</b> for any marketing purposes.
      </p>
      <h3>How does it work?</h3>
      <p>
        <b>Search</b> for the book you prefer in Paperback.<br />
        <b>Enter</b> your email address.<br />
        <b>Receive</b> an email when it's available in Paperback.
      </p>
      <h3>Who built this application?</h3>
      <p>
        Me, <a href="https://www.peterbe.com/about">Peter Bengtsson</a>, in my
        spare time. I wanted to buy a book but it was not available in
        Paperback. I wrote a program that automatically checks every day and
        thought it would be useful to other people.
      </p>
      <h3>Only Amazon.com? Not Amazon UK, France, etc.?</h3>
      <p>
        For now, only Amazon.com. And only for watching specifically for
        Paperback bindings of books.<br />
        Think it should be for other countries and other types of products
        and/or bindings? Then{' '}
        <a href="https://www.peterbe.com/contact">contact me</a>.
      </p>
    </div>
  )
}
