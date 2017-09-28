import { IGNORE_BINDINGS } from './Constants'

export const randomString = (length = 25) => {
  const text = []
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < length; i++)
    text.push(possible.charAt(Math.floor(Math.random() * possible.length)))
  return text.join('')
}


export const thousandFormat = x => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}


export const getAllBindings = (item) => {
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
  // Filter out junk/uninteresting binding formats
  allBindings = allBindings.filter(b => {
    return b && !IGNORE_BINDINGS.includes(b)
  })
  return allBindings
}
