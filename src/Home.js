import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { throttle } from 'throttle-debounce'
import queryString from 'query-string'
import { thousandFormat, getAllBindings } from './Utils'
import book256 from './book-256.png'
import GetNotified from './GetNotified'
import YourBooks from './YourBooks'

import './Home.css'

class Home extends Component {
  constructor(props) {
    super(props)

    let initialSearch = ''
    if (this.props.location.search) {
      const qs = queryString.parse(this.props.location.search)
      if (qs.q) {
        initialSearch = qs.q
      }
    }
    this.state = {
      initialSearch: initialSearch
    }
  }

  componentWillMount() {
    document.title = 'Paperback Watch'
  }

  searchSubmitted = q => {
    this.props.history.push({ search: `?q=${encodeURIComponent(q)}` })
  }

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

  componentWillReceiveProps(props) {
    if (this.state.searchResult) {
      this.setState({ searchResult: null, fetchError: null })
    }
  }
  componentDidMount() {
    if (this.props.initialSearch) {
      this.search(this.props.initialSearch)
    }
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
    if (q) {
      this.searchThrottled(q)
    } else if (this.state.searchResult) {
      this.setState({ searchResult: null })
    }
  }

  onPickedExample = q => {
    this.refs.search.value = q
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
            !this.props.yourBooks && (
              <ShowExampleSearches onPicked={this.onPickedExample} />
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
      ['Bernie Sanders Guide to Political Revolution', 'Bernie Sanders'],
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

    // const listedASINs = []
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
        Absolutely! The <b>email address you enter</b>, when you've found your
        book is <b>never shown or shared</b>.<br />
        Your email address is <b>never used for any other marketing</b>{' '}
        purposes.<br />
        It is stored in a Google Firebase cloud database, secured by Google.
      </p>
      <h3>How does it work?</h3>
      <p>
        You <b>search for you the book</b> you <b>prefer in Paperback</b> and
        when you've found it, you click to <b>type in your email address</b>.
        Then I'll query Amazon.com's database every day to see if it's now
        available in Paperback. When it's finally available (if ever!){' '}
        <b>you get an email with a link</b> if you want to buy the book.
      </p>
      <h3>Who built this application?</h3>
      <p>
        Built by a web developer called{' '}
        <a href="https://www.peterbe.com/about">Peter Bengtsson</a> in his spare
        time. He found a book he wanted to buy but decided not to, because the
        book was only available in Hardcover and Kindle. <br />
        Instead of manually checking Amazon.com every day, he wrote a program
        that automates this. Thinking this might be useful to others, he made
        this application everyone who prefers Paperback over Hardcover (or
        Kindle).<br />
        This is <b>not an Amazon.com product</b>. To be able to programmatically
        query Amazon.com's database he uses the Amazon Affiliates Product
        Advertising API.
      </p>
      <h3>Does Peter make money on this?</h3>
      <p>
        Yes and no. If any, a tiny amount. To be able to programmatically query
        Amazon.com's database you have to use the Amazon Affiliates Product
        Advertising API whose links always contain an affiliate tag. It won't
        affect your control or purchasing history.
      </p>
      <h3>Only Amazon.com? Not Amazon UK, France, etc.?</h3>
      <p>
        For now, only Amazon.com. And only for watching specifically for
        Paperback bindings of books.<br />
        Think it should be for other countries and other types of products
        and/or bindings, then{' '}
        <a href="https://www.peterbe.com/contact">contact Peter</a>.
      </p>
    </div>
  )
}
