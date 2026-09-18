import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";

export default async function HelpPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <main className="help-page">
    <section className="help-card">
      <div className="help-card-glow" aria-hidden="true" />
      <p className="help-eyebrow">PUSAT BANTUAN</p>
      <div className="help-avatar" aria-hidden="true">J</div>
      <p className="help-role">Frontend And Backend Developer</p>
      <h1>Jamaludin</h1>
      <div className="help-email"><span className="help-email-icon">@</span><div><small>Email</small><a href="mailto:321999@gmail.com">321999@gmail.com</a></div></div>
      <p className="help-description">Butuh bantuan atau menemukan kendala? Hubungi kami melalui WhatsApp untuk mendapatkan bantuan.</p>
      <a className="help-contact-button" href="https://wa.me/628225087529" target="_blank" rel="noreferrer"><svg className="help-whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.8 8.8 0 0 0-7.57 13.3L3.2 20.8l4.43-1.17A8.8 8.8 0 1 0 12 3.2Zm0 16.1a7.25 7.25 0 0 1-3.7-1.02l-.27-.16-2.63.7.7-2.56-.18-.28A7.25 7.25 0 1 1 12 19.3Zm3.98-5.35c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.77-1.08-.65-.58-1.09-1.29-1.22-1.51-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.2-.69-1.64-.18-.43-.36-.37-.5-.38h-.43c-.15 0-.39.06-.59.28-.2.22-.77.75-.77 1.83s.79 2.12.9 2.27c.11.15 1.55 2.37 3.76 3.32.52.22.93.36 1.25.46.53.17 1.01.15 1.39.09.42-.06 1.3-.53 1.48-1.04.18-.51.18-.95.13-1.04-.05-.09-.2-.14-.42-.25Z"/></svg><span>Contact Me</span></a>
    </section>
  </main>;
}
