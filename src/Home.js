import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { throttle } from 'throttle-debounce'
import queryString from 'query-string'
import { thousandFormat, getAllBindings } from './Utils'
import book256 from './book-256.png'
import GetNotified from './GetNotified'
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

  searchSubmitted = (q) => {
    this.props.history.push({search: `?q=${encodeURIComponent(q)}`})
  }

  render() {
    return (
      <div>
      <section className="hero is-bold">
        <div className="hero-body">
          <div className="container">
            <h1 className="title">
              Paperback Watch
            </h1>
            <h2 className="subtitle">
              Get Notified When A Book Becomes Available in <b>Paperback</b> on <b>Amazon.com</b>
            </h2>
          </div>
        </div>
      </section>
      <Search
        initialSearch={this.state.initialSearch}
        currentUser={this.props.currentUser}
        addItem={this.props.addItem}
        searchSubmitted={this.searchSubmitted}
      />
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
      searchResult: null,
    }

    this.searchThrottled = throttle(1600, this.search)
  }

  componentWillReceiveProps(props) {
    if (this.state.searchResult) {
      this.setState({searchResult: null, fetchError: null})
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
    const serverPrefix = process.env.REACT_APP_SERVER_PREFIX
    let url = serverPrefix + '/search'
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
      this.setState({searchResult: null})
    }

  }

  render() {
    console.log('Search.render');
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
            <p className="help">
              Searching Amazon.com for <b>{this.state.search}</b>...
            </p>
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
                    <span key={binding} className="tag is-small">{binding}</span>
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
