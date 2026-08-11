// api/contact.js
// POST /api/contact — sends a contact-form submission to Philip by email via Resend.

const { Resend } = require('resend');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TO_ADDRESS = 'philipmead@meadamericana.com';
const FROM_ADDRESS = `Mead Americana Website <contact@${process.env.RESEND_EMAIL_DOMAIN}>`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { name, email, message, company } = req.body || {};

  // Honeypot: a hidden field real visitors never fill in.
  if (company) {
    return res.status(200).json({ ok: true });
  }

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }
  if (name.length > 200 || email.length > 200 || message.length > 5000) {
    return res.status(400).json({ error: 'One of the fields is too long.' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [TO_ADDRESS],
      replyTo: email.trim(),
      subject: `New inquiry from ${name.trim()}`,
      text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(502).json({ error: 'Unable to send your message right now.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact handler error:', err);
    return res.status(502).json({ error: 'Unable to send your message right now.' });
  }
};
