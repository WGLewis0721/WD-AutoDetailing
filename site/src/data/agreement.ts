/* Mirror Finish Service Agreement & Waiver, shown before online booking starts (same terms as the AGT site).
   Bump VERSION whenever any clause changes: the fingerprint of the exact text is stored with every response,
   and the server refuses answers given to an older version, so each record proves what the customer saw. */

export const AGREEMENT = {
  version: '1.0.0',
  title: 'Service Agreement & Waiver',
  business: 'Mirror Finish Mobile Detailing',
  clauses: [
    'I authorize Mirror Finish Mobile Detailing to perform the selected detailing services on my vehicle.',
    'Mirror Finish is not liable for pre-existing damage. We document the vehicle’s condition before service begins.',
    'A 20% deposit is required to secure the appointment. The deposit is non-refundable. The remaining balance is due when the service is complete.',
    'Cancellations made less than 24 hours before the appointment forfeit the deposit. Reschedules with 24 hours’ notice or more carry the deposit forward to the new date.',
    'If weather requires a reschedule, you will be notified at least 24 hours in advance, and your full deposit moves to the new date.',
    'Please remove personal valuables from the vehicle before service. Mirror Finish is not responsible for lost or missing items.',
    'We stand behind our work with a satisfaction guarantee. If you are not satisfied, contact us within 24 hours and we will make it right at no additional charge.',
  ],
} as const;

type AgreementText = { version: string; title: string; clauses: readonly string[] };

/** The exact text agreed to, one string: version, then each clause on its own line. */
export const agreementText = (a: AgreementText = AGREEMENT) => [`${a.title} v${a.version}`, ...a.clauses.map((c, i) => `${i + 1}. ${c}`)].join('\n');

/** SHA-256 (hex) of agreementText; identical in the browser and on the server (Web Crypto in both). */
export async function agreementHash(a: AgreementText = AGREEMENT): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(agreementText(a)));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
