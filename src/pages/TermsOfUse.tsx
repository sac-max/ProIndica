import React from 'react';
import { ShieldCheck, FileText, CheckCircle, AlertCircle, Scale, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const TermsOfUse: React.FC = () => {
  const sections = [
    {
      title: "1. Aceitação dos Termos",
      content: "Ao acessar e usar o Pro Indica, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.",
      icon: CheckCircle
    },
    {
      title: "2. Descrição do Serviço",
      content: "O Pro Indica é uma plataforma de intermediação que conecta clientes a profissionais. Não somos responsáveis pela execução dos serviços, pagamentos ou qualquer disputa entre as partes.",
      icon: FileText
    },
    {
      title: "3. Responsabilidades do Usuário",
      content: "Os usuários são responsáveis por manter a confidencialidade de suas contas e por todas as atividades que ocorrem sob sua conta. Informações falsas ou enganosas podem resultar na suspensão da conta.",
      icon: UserCheck
    },
    {
      title: "4. Conduta do Profissional",
      content: "Profissionais cadastrados devem fornecer informações verídicas sobre suas qualificações e experiências. O uso de fotos de terceiros sem autorização é estritamente proibido.",
      icon: ShieldCheck
    },
    {
      title: "5. Limitação de Responsabilidade",
      content: "O Pro Indica não será responsável por quaisquer danos diretos, indiretos, incidentais ou consequentes resultantes do uso ou da incapacidade de usar o serviço.",
      icon: AlertCircle
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center mb-20">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
          <Scale className="w-10 h-10" />
        </div>
        <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Termos de <span className="text-blue-600">Uso</span></h1>
        <p className="text-xl text-slate-500 font-medium">
          Última atualização: 04 de Abril de 2026
        </p>
      </div>

      <div className="space-y-12 mb-24">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                <section.icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">{section.title}</h2>
                <p className="text-slate-500 leading-relaxed text-lg font-medium">
                  {section.content}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 text-center">
        <h3 className="text-2xl font-black text-slate-900 mb-4">Dúvidas sobre os termos?</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto text-lg font-medium">
          Se você tiver qualquer dúvida sobre nossos termos de uso, entre em contato com nosso departamento jurídico.
        </p>
        <a 
          href="https://wa.me/5515997777362?text=Olá! Preciso de suporte com os Termos de Uso do Pro Indica."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-colors shadow-xl shadow-blue-600/20"
        >
          Falar com Suporte
        </a>
      </div>
    </div>
  );
};
