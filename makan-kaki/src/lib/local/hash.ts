// Password hashing for the in-browser demo database (salted SHA-256 via Web Crypto).
async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${salt}$${await sha256(`${salt}:${password}`)}`
}

export async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split('$')
  return (await sha256(`${salt}:${password}`)) === hash
}
