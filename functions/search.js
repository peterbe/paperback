const search = (client, keywords, callback) => {
  if (!keywords) {
    throw new Error("keywords can't be empty")
  }
  var params = {
    SearchIndex: 'Books',
    Keywords: keywords,
    ResponseGroup: 'ItemAttributes,Images,AlternateVersions',
  }
  // XXX turn this into a promise instead
  return client.call('ItemSearch', params, callback)
};


module.exports = { search }
