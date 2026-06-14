import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Tolère ±1 fenêtre de 30 s (petite dérive d'horloge entre l'appareil et le serveur).
authenticator.options = { window: 1 }

const ISSUER = 'Boussole'

export function genTotpSecret(): string {
  return authenticator.generateSecret()
}

export function verifyTotp(secret: string, token: string): boolean {
  const t = String(token || '').replace(/\s+/g, '')
  if (!secret || !/^\d{6}$/.test(t)) return false
  try { return authenticator.verify({ token: t, secret }) } catch { return false }
}

/** Code courant — utilisé par les tests pour simuler une application d'authentification. */
export function currentTotp(secret: string): string {
  return authenticator.generate(secret)
}

export function otpauthUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret)
}

export async function qrDataUrl(otpauth: string): Promise<string> {
  return QRCode.toDataURL(otpauth, { margin: 1, width: 220 })
}
