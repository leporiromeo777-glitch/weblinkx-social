/**
 * Quando qualcuno manda il modulo «rapporto» (public/index.html), Netlify lo
 * salva fra i moduli e chiama questa funzione: rifà il controllo, manda il
 * rapporto a chi l'ha chiesto e l'avviso a Romeo, da Gmail.
 *
 * Servono GMAIL_USER (l'indirizzo) e GMAIL_APP_PASSWORD (una «password per le
 * app» di Google, solo nelle variabili del progetto su Netlify: README).
 * Senza, il modulo resta salvato su Netlify e qui non parte nulla.
 */
import type { FormSubmittedEvent } from "@netlify/functions";
import nodemailer from "nodemailer";
import { controlla } from "../../src/controllo";
import { emailAvviso, emailRapporto, FIRMA, PAGINA, type Richiesta } from "../../src/email";

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function campo(dati: Record<string, string>, nome: string, massimo = 200): string | undefined {
  const valore = dati[nome]?.trim();
  return valore ? valore.slice(0, massimo) : undefined;
}

export default {
  async formSubmitted(event: FormSubmittedEvent) {
    const dati = event.data;
    if (dati["form-name"] && dati["form-name"] !== "rapporto") return;
    const email = campo(dati, "email");
    const sito = campo(dati, "sito", 300);
    if (!email || !EMAIL.test(email) || !sito || !campo(dati, "consenso")) {
      console.warn("[rapporto] modulo incompleto");
      return;
    }
    const utente = Netlify.env.get("GMAIL_USER");
    const password = Netlify.env.get("GMAIL_APP_PASSWORD");
    if (!utente || !password) {
      console.warn("[rapporto] mancano GMAIL_USER e GMAIL_APP_PASSWORD: il modulo resta solo su Netlify.");
      return;
    }
    const chi: Richiesta = { email, nome: campo(dati, "nome", 80), telefono: campo(dati, "telefono", 40), attivita: campo(dati, "attivita", 120) };
    const risultato = await controlla(sito, Netlify.env.get("PAGESPEED_API_KEY"));
    const posta = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: utente, pass: password } });
    const da = `"${FIRMA[0]}" <${utente}>`;
    const rapporto = emailRapporto(risultato, chi, Netlify.env.get("URL") ?? PAGINA);
    await posta.sendMail({ from: da, to: email, subject: rapporto.oggetto, text: rapporto.testo, html: rapporto.html });
    const avviso = emailAvviso(risultato, chi);
    await posta.sendMail({ from: da, to: utente, replyTo: email, subject: avviso.oggetto, text: avviso.testo, html: avviso.html });
  },
};
