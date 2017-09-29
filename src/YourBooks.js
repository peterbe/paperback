import React from 'react'
import { Link } from 'react-router-dom'

class YourBooks extends React.PureComponent {
  render() {
    const { books } = this.props
    if (!books.length) {
      return null
    }
    return (
      <div className="your-books container">
        <h3 className="title">
          You're watching {books.length} book{books.length === 1 ? '' : 's'}
        </h3>
        {books.map(book => (
          <YourBook
            removeItem={this.props.removeItem}
            key={book.ASIN}
            book={book}
          />
        ))}
      </div>
    )
  }
}

export default YourBooks

class YourBook extends React.PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      confirm: false
    }
  }

  deleteItem = event => {
    event.preventDefault()
    this.props.removeItem(this.props.book)
  }

  deleteItemConfirm = event => {
    event.preventDefault()
    this.setState({ confirm: true })
  }

  cancelConfirmation = event => {
    event.preventDefault()
    this.setState({ confirm: false })
  }

  render() {
    const { book } = this.props
    const item = book.item
    return (
      <article className="media">
        <figure className="media-left">
          <p className="image is-128x128">
            <Link to={`/book/${item.ASIN}`}>
              <img src={item.MediumImage.URL} alt="Book cover" />
            </Link>
          </p>
        </figure>
        <div className="media-content">
          <div className="content">
            <h3 className="title">
              <Link to={`/book/${item.ASIN}`}>
                <strong>{book.Title}</strong>
              </Link>{' '}
              <span className="tag is-medium">
                {item.ItemAttributes.ListPrice
                  ? item.ItemAttributes.ListPrice.FormattedPrice
                  : 'no price yet'}
              </span>
            </h3>
            <h5 className="subtitle">
              By <b>{item.ItemAttributes.Author}</b>,{' '}
              {item.ItemAttributes.NumberOfPages} pages, published{' '}
              {item.ItemAttributes.PublicationDate}
            </h5>
          </div>
        </div>
        <div className="media-right">
          {this.state.confirm ? (
            <Confirmation
              onCancel={this.cancelConfirmation}
              onConfirm={this.deleteItem}
            />
          ) : (
            <button className="delete" onClick={this.deleteItemConfirm} />
          )}
        </div>
      </article>
    )
  }
}

const Confirmation = ({ onCancel, onConfirm }) => {
  return (
    <div>
      <button
        type="button"
        className="button is-small is-primary"
        onClick={onConfirm}
      >
        Yes
      </button>
      <button
        type="button"
        className="button is-small is-light"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
}
