export function confirmationEmail(confirmLink: string): string {
  return `
    <div style="font-family: sans-serif; color: #000;">
      <h1>Email confirmation</h1>
      <p>Hello! To confirm your email address, please follow the link below:</p>
      <a href="${confirmLink}">Confirm email</a>
      <p>This link is valid for 1 hour. If you do not request confirmation, simply ignore this message.</p>
    </div>
  `;
}