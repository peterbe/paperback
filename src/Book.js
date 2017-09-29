import React from 'react'
import { Link } from 'react-router-dom'
import { getAllBindings } from './Utils'
import GetNotified from './GetNotified'
import book256 from './book-256.png'

class Book extends React.PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      fetchError: null,
      notFound: false
    }
  }

  componentWillMount() {
    this.load(this.props.match.params.asin)
  }

  load = asin => {
    console.log('Loading ASIN', asin)
    const serverPrefix = process.env.REACT_APP_SERVER_PREFIX
    let url = serverPrefix + '/search'
    url += `?itemid=${encodeURIComponent(asin)}`
    this.setState({ loading: true })
    fetch(url).then(r => {
      if (r.status === 200) {
        r.json().then(response => {
          // console.log('RESPONSE', response)
          if (response.Items.Item) {
            const item = response.Items.Item
            document.title = item.ItemAttributes.Title
            this.setState({ item: item, fetchError: null, loading: false })
          } else {
            document.title = 'Book Not Found'
            this.setState({ notFound: true, fetchError: null, loading: false })
          }
        })
      } else {
        r.text().then(response => {
          this.setState({
            loading: false,
            fetchError: {
              status: r.status,
              text: response
            }
          })
        })
      }
    })
  }
  render() {
    if (this.state.loading) {
      return (
        <div className="container">
          <h2 className="title is-2">Loading...</h2>
        </div>
      )
    }
    if (this.state.notFound) {
      return (
        <div className="container">
          <div className="notification is-warning">
            <h3 className="title is-2">Book Not Found</h3>
            <p>Can't find that book on Amazon.com</p>
            <p>
              <Link to="/" className="button"><b>Go Back Home</b></Link>
            </p>
          </div>
        </div>
      )
    }
    const { item } = this.state

    const allBindings = getAllBindings(item)
    const inPaperback = allBindings.includes('Paperback')
    const otherBindings = allBindings.filter(
      binding => binding !== 'Paperback'
    )
    return (
      <div className="container">
        <div className="columns">
          <div className="column is-one-quarter" style={{ maxWidth: 300 }}>
            <a href={item.ItemAttributes.DetailsPageURL}>
              {item.LargeImage ? (
                <img src={item.LargeImage.URL} alt="Book cover" />
              ) : (
                <img src={book256} alt="No book cover!" />
              )}
            </a>
          </div>
          <div className="column">
            <h1 className="title">
              {item.ItemAttributes.Title}{' '}
              <span className="tag is-medium">
                {item.ItemAttributes.ListPrice
                  ? item.ItemAttributes.ListPrice.FormattedPrice
                  : 'no price yet'}
              </span>
            </h1>
            <h2 className="subtitle">
              By <b>{item.ItemAttributes.Author}</b>,{' '}
              {item.ItemAttributes.NumberOfPages || '??'} pages, published{' '}
              {item.ItemAttributes.PublicationDate}
            </h2>

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
                yourBooks={this.props.yourBooks}
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
      </div>
    )
  }
}

export default Book
