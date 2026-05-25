export function resetPasswordEmail(resetLink: string): string {
  return `
    <div style="font-family: sans-serif; color: #000;">
      <h1>Password reset</h1>
      <p>Hello! You have requested a password reset. Please follow the link below to create a new password:</p>
      <a href="${resetLink}">Confirm password reset</a>
      <p>This link is valid for 1 hour. If you did not request a password reset, simply ignore this message.</p>
    </div>
  `;
}
