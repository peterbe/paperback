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
