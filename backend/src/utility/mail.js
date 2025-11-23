

const sgMail = require('@sendgrid/mail');
const ejs = require('ejs');
const { readFile } = require('fs');
const { resolve, dirname } = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(readFile);

if (!process.env.SENDGRID_API_KEY) {
	console.warn('[mail] WARNING: SENDGRID_API_KEY is not set in environment');
} else {
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * sendMail - envoie un e-mail via l'API SendGrid
 * - lève l'exception en cas d'erreur pour que le contrôleur appelant puisse
 *   retourner une réponse d'erreur au client (au lieu de masquer l'erreur).
 */
// sendMail(to, key, type, overrideUrl?)
// If overrideUrl is provided, it will be used as the action URL in the email template
const sendMail = async (to, key, type, overrideUrl) => {
	try {
		console.log('[sendMail] Preparing email for:', to, 'type:', type);
		const path = resolve(dirname(__dirname), 'views', 'mail.ejs');
		const raw = await readFileAsync(path, 'utf8');
		console.log('[sendMail] Loaded mail.ejs template');

		const data = {
			title: type === 'users/verify' ? 'Check email' : 'Reset password',
			body: `Thank you for your registration.\nThere is one last step left before you find the love of your life!\nPlease click this link to ${
				type === 'users/verify' ? 'Verify your account' : 'Reset your password'
			}`,
			action: type === 'users/verify' ? 'Check' : 'Reset',
			url: overrideUrl || `${process.env.API_URL}/api/${type}/${key}`
		};

		console.log('[sendMail] Render data:', { to, type, url: data.url });
		const html = ejs.render(raw, data);
		console.log('[sendMail] HTML rendered, sending with SendGrid API...');

		// Préparer l'expéditeur
		let from = process.env.SENDGRID_FROM || 'noreply@matcha.com';
		if (process.env.SENDGRID_FROM && process.env.SENDGRID_FROM_NAME) {
			from = { email: process.env.SENDGRID_FROM, name: process.env.SENDGRID_FROM_NAME };
		}

		const msg = {
			to,
			from,
			subject: data.title,
			html
		};

		const result = await sgMail.send(msg);
		// SendGrid retourne parfois un tableau; loggons la réponse pour le debugging
		console.log('[sendMail] SendGrid response:', Array.isArray(result) ? result.map(r => r.statusCode) : result);
		return result;
	} catch (err) {
		// Afficher des informations détaillées si SendGrid renvoie une réponse structurée
		if (err && err.response && err.response.body) {
			console.error('[sendMail] SendGrid error response body:', JSON.stringify(err.response.body));
		}
		console.error('[sendMail] Error sending mail:', err && err.message ? err.message : err);
		// Rejeter l'erreur pour que les contrôleurs (register / forget_password) puissent la gérer
		throw err;
	}
};

module.exports = { sendMail };
