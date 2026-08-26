import { getEmailProvider, SendEmailOptions } from "./provider";

export async function sendEmail(options: SendEmailOptions) {
  const provider = getEmailProvider();
  return provider.sendEmail(options);
}
