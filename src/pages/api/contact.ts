import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Accept form-data (multipart/form-data or application/x-www-form-urlencoded)
    const ct = request.headers.get('content-type') || '';
    let data: Record<string, string> = {};

    if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((v, k) => { if (typeof v === 'string') data[k] = v; });
    } else if (ct.includes('application/json')) {
      data = await request.json();
    }

    const name = (data.name || '').toString().trim();
    const email = (data.email || '').toString().trim();
    const phone = (data.phone || '').toString().trim();
    const message = (data.message || '').toString().trim();

    if (!name || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Datos inválidos' }), { status: 400 });
    }

    // SMTP config via env vars
    const host = process.env.SMTP_HOST || '';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const to = process.env.CONTACT_TO || user || '';

    if (!host || !user || !pass || !to) {
      console.error('SMTP vars missing');
      return new Response(JSON.stringify({ ok: false, error: 'Config de correo pendiente' }), { status: 500 });
    }

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

    const html = `
      <h2>Nuevo contacto HSalud Pro</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Mensaje:</strong><br/>${escapeHtml(message).replace(/\n/g,'<br/>')}</p>
    `;

    await transporter.sendMail({
      from: `HSalud Pro <${user}>`,
      to,
      subject: 'Nuevo contacto desde la web',
      replyTo: email,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('contact error', e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};

function escapeHtml(str: string) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

