export function distanceKm(a, b) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function offsetFrom(origin, dxKm, dyKm) {
  return {
    lat: origin.lat + dyKm / 111,
    lng: origin.lng + dxKm / (111 * Math.cos((origin.lat * Math.PI) / 180)),
  }
}

// 只顯示約略距離，以 0.5 公里為間隔
export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '距離未知'
  if (km < 0.5) return '不到 0.5 公里'
  if (km > 50) return `約 ${Math.round(km)} 公里`
  return `約 ${Math.ceil(km * 2) / 2} 公里`
}

export function withinDistance(km, filter) {
  if (filter === 'near1') return km <= 1
  if (filter === 'near2') return km <= 2
  return true
}
