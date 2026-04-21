import React from 'react';
import { Search, HelpCircle, MessageSquare, Phone, Mail, ChevronRight, AlertCircle, ShieldCheck, User, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

export const HelpCenter: React.FC = () => {
  const faqs = [
    {
      category: "Para Clientes",
      icon: User,
      questions: [
        { q: "Como encontro um profissional?", a: "Você pode usar a barra de busca na página inicial ou ir para a página de busca e filtrar por categoria, estado e cidade." },
        { q: "O serviço é gratuito para clientes?", a: "Sim! O Pro Indica não cobra nenhuma taxa dos clientes para buscar e entrar em contato com profissionais." },
        { q: "Como avalio um profissional?", a: "Após realizar um serviço, vá ao perfil do profissional e use a seção de avaliações no final da página." }
      ]
    },
    {
      category: "Para Profissionais",
      icon: Briefcase,
      questions: [
        { q: "Como me cadastro como profissional?", a: "Clique em 'Seja um Parceiro' no menu superior, preencha seus dados e crie seu perfil profissional." },
        { q: "Como edito meu perfil?", a: "Faça login, vá ao seu 'Painel de Controle' e clique em 'Editar Perfil' para atualizar suas informações e portfólio." },
        { q: "O que é o Perfil Premium?", a: "O Perfil Premium dá destaque ao seu perfil nas buscas e permite adicionar mais fotos ao seu portfólio." }
      ]
    },
    {
      category: "Segurança e Conta",
      icon: ShieldCheck,
      questions: [
        { q: "Como altero minha senha?", a: "No momento, a alteração de senha deve ser feita através do link 'Esqueci minha senha' na tela de login." },
        { q: "Meus dados estão seguros?", a: "Sim, utilizamos tecnologias de ponta para proteger suas informações pessoais e garantir a privacidade dos seus dados." }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-20">
        <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Central de <span className="text-blue-600">Ajuda</span></h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Encontre respostas para as dúvidas mais comuns ou entre em contato com nosso suporte.
        </p>
        
        <div className="max-w-2xl mx-auto relative">
          <input 
            type="text" 
            placeholder="Como podemos ajudar hoje?" 
            className="w-full p-6 pl-16 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-24">
        {faqs.map((section, idx) => (
          <div key={idx} className="space-y-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <section.icon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">{section.category}</h2>
            </div>
            
            <div className="space-y-4">
              {section.questions.map((faq, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                    {faq.q}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">
                    {faq.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-white text-center">
        <h2 className="text-3xl font-black mb-6">Ainda precisa de ajuda?</h2>
        <p className="text-blue-100 mb-12 max-w-xl mx-auto text-lg">
          Nossa equipe de suporte está pronta para atender você de segunda a sexta, das 9h às 18h.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            { icon: Mail, label: "E-mail", value: "suporte@jobconection.com.br", href: "mailto:suporte@jobconection.com.br" },
            { icon: MessageSquare, label: "WhatsApp", value: "(15) 99777-7362", href: "https://wa.me/5515997777362?text=Olá! Preciso de suporte com o Pro Indica." }
          ].map((contact, i) => (
            <a 
              key={i} 
              href={contact.href}
              target={contact.href.startsWith('http') ? "_blank" : undefined}
              rel={contact.href.startsWith('http') ? "noopener noreferrer" : undefined}
              className="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 hover:bg-white/20 transition-colors group"
            >
              <contact.icon className="w-8 h-8 mx-auto mb-4 text-blue-200 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-2">{contact.label}</p>
              <p className="text-xl font-black">{contact.value}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
