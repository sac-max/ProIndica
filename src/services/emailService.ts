import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const sendWelcomeEmail = async (userName: string, userEmail: string, userRole: string) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS credentials not found. Welcome email not sent.');
    return;
  }

  try {
    const templateParams = {
      to_name: userName,
      to_email: userEmail,
      role: userRole === 'professional' ? 'Profissional' : 'Cliente',
      message: userRole === 'professional' 
        ? 'Estamos felizes em ter você como parceiro. Complete seu perfil para começar a receber orçamentos!' 
        : 'Agora você pode encontrar os melhores profissionais para seus projetos.'
    };

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );

    console.log('Welcome email sent successfully!', response.status, response.text);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
};
