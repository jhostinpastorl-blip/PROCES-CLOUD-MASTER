export interface InvitationTemplateData {
  inviterName: string;
  companyName: string;
  inviteUrl: string;
  expiresInHours: number;
}

export function renderInvitationEmail(data: InvitationTemplateData) {
  const subject = `Invitación a formar parte de ${data.companyName} en PROCESA Cloud`;
  const text = `Hola,\n\n${data.inviterName} te ha invitado a unirte a ${data.companyName} en PROCESA Cloud.\n\nPara aceptar tu invitación, ingresa al siguiente enlace:\n${data.inviteUrl}\n\nEste enlace vencerá en ${data.expiresInHours} horas.\n\nEquipo PROCESA Cloud`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"/><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#090d16;color:#f1f5f9;padding:24px;}.card{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:32px;max-width:560px;margin:0 auto;}.btn{display:inline-block;background:#3b82f6;color:#ffffff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin:20px 0;}.muted{color:#94a3b8;font-size:13px;}</style></head>
      <body>
        <div class="card">
          <h2 style="color:#38bdf8;margin-top:0;">PROCESA CLOUD</h2>
          <p>Hola,</p>
          <p><strong>${data.inviterName}</strong> te ha invitado a unirte al equipo de <strong>${data.companyName}</strong> en PROCESA Cloud.</p>
          <a class="btn" href="${data.inviteUrl}">Aceptar Invitación</a>
          <p class="muted">El enlace expirará automáticamente en ${data.expiresInHours} horas por motivos de seguridad.</p>
          <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;"/>
          <p class="muted" style="margin-bottom:0;">PROCESA Cloud · Plataforma de Operaciones Empresariales</p>
        </div>
      </body>
    </html>
  `;
  return { subject, text, html };
}

export function renderTrialWelcomeEmail(data: { companyName: string; planName: string; days: number }) {
  const subject = `Bienvenido a PROCESA Cloud — Período de prueba iniciado para ${data.companyName}`;
  const text = `¡Bienvenido a PROCESA Cloud!\n\nTu empresa ${data.companyName} ha iniciado un período de prueba de ${data.days} días en el plan ${data.planName}.\n\nAccede a tu plataforma en: ${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard\n\nEquipo PROCESA Cloud`;
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:sans-serif;background:#090d16;color:#f1f5f9;padding:24px;">
        <div style="background:#111827;border:1px solid #1e293b;border-radius:12px;padding:32px;max-width:560px;margin:0 auto;">
          <h2 style="color:#10b981;margin-top:0;">PROCESA CLOUD</h2>
          <p>¡Bienvenido a bordo!</p>
          <p>Tu empresa <strong>${data.companyName}</strong> ha sido configurada con éxito con un período de prueba de <strong>${data.days} días</strong> en el plan <strong>${data.planName}</strong>.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard" style="color:#38bdf8;font-weight:600;">Ingresar a mi Dashboard →</a></p>
        </div>
      </body>
    </html>
  `;
  return { subject, text, html };
}

export function renderTrialExpiringEmail(data: { companyName: string; daysRemaining: number }) {
  const subject = `Aviso de Suscripción: Te quedan ${data.daysRemaining} días de prueba en PROCESA Cloud`;
  const text = `Tu período de prueba para ${data.companyName} finalizará en ${data.daysRemaining} días. Contacta a PROCESA CORP para seleccionar tu plan comercial.`;
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:sans-serif;background:#090d16;color:#f1f5f9;padding:24px;">
        <div style="background:#111827;border:1px solid #1e293b;border-radius:12px;padding:32px;max-width:560px;margin:0 auto;">
          <h2 style="color:#f59e0b;margin-top:0;">PROCESA CLOUD</h2>
          <p>Aviso importante de suscripción:</p>
          <p>Te recordamos que a tu empresa <strong>${data.companyName}</strong> le restan <strong>${data.daysRemaining} días</strong> de período de prueba gratuito.</p>
          <p>Para asegurar la continuidad de tu operación sin interrupciones, comunícate con nuestro equipo.</p>
        </div>
      </body>
    </html>
  `;
  return { subject, text, html };
}
