import { recordDependency } from './depStatus'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const MAIL_FROM = process.env.MAIL_FROM || 'contact@elafrit.com'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

/**
 * Envoie un email transactionnel via l'API Brevo.
 * En l'absence de clé (dev), le message est journalisé au lieu d'être envoyé.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!BREVO_API_KEY) {
    console.log(`[mailer:DEV] (pas de BREVO_API_KEY) → ${to} | ${subject}\n${html}\n`)
    return
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: MAIL_FROM, name: 'Boussole' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      recordDependency('brevo', false, `HTTP ${res.status}`)
      console.error(`[mailer] Échec Brevo (${res.status}) : ${await res.text()}`)
    } else {
      recordDependency('brevo', true)
    }
  } catch (e) {
    recordDependency('brevo', false, e instanceof Error ? e.message : String(e))
    console.error('[mailer] Erreur réseau Brevo :', e)
  }
}

function layout(title: string, body: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
    <h2 style="color:#16324f">Boussole</h2>
    <h3>${title}</h3>
    ${body}
    <hr><p style="color:#888;font-size:12px">Boussole — UE FAD130 (Cnam). Pour vos droits : dpo@elafrit.com</p>
  </div>`
}

export function verificationEmail(token: string) {
  const link = `${APP_URL}/verifier-email?token=${token}`
  return {
    subject: 'Boussole — activez votre compte',
    html: layout(
      'Activez votre compte',
      `<p>Bienvenue ! Cliquez sur le lien ci-dessous pour activer votre compte :</p>
       <p><a href="${link}">${link}</a></p>
       <p>Ce lien est valable 48&nbsp;heures.</p>`,
    ),
  }
}

export function resetEmail(token: string) {
  const link = `${APP_URL}/reinitialiser?token=${token}`
  return {
    subject: 'Boussole — réinitialisation du mot de passe',
    html: layout(
      'Réinitialisation du mot de passe',
      `<p>Pour définir un nouveau mot de passe, cliquez sur le lien ci-dessous :</p>
       <p><a href="${link}">${link}</a></p>
       <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    ),
  }
}

/** Digest hebdomadaire de l'accompagnateur : le corps HTML est construit par le module pilotage. */
export function digestEmail(titre: string, bodyHtml: string) {
  return { subject: `Boussole — ${titre}`, html: layout(titre, `${bodyHtml}<p><a href="${APP_URL}/tableau-de-bord">Ouvrir mon tableau de bord</a></p>`) }
}
