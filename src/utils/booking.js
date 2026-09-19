export function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.round(ms / 86400000)
}

export function parseRoomIds(value) {
  if (typeof value !== 'string' || value === '') return []
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}

export function moneyToCents(value) {
  return Math.round(Number(value) * 100)
}

export function centsToMoney(cents) {
  return (cents / 100).toFixed(2)
}