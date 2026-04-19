import React from 'react';
import { CheckCircle, Search, MessageSquare, Star, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      title: "Busque o Profissional",
      description: "Utilize nossos filtros inteligentes para encontrar o especialista ideal por categoria, cidade ou especialidade.",
      icon: Search,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Analise o Perfil",
      description: "Veja fotos de trabalhos anteriores, avaliações de outros clientes e a experiência detalhada do profissional.",
      icon: ShieldCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Entre em Contato",
      description: "Fale diretamente com o profissional via WhatsApp ou E-mail para solicitar orçamentos e tirar dúvidas.",
      icon: MessageSquare,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      title: "Avalie o Serviço",
      description: "Após a conclusão, deixe sua avaliação para ajudar outros usuários a escolherem os melhores parceiros.",
      icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-50"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-20">
        <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Como Funciona o <span className="text-blue-600">Pro Indica</span></h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Nossa plataforma foi desenhada para ser simples, rápida e segura para quem busca e para quem oferece serviços.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className={`w-16 h-16 ${step.bg} ${step.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
              <step.icon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">{step.title}</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -mr-48 -mt-48"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-black mb-8">Vantagens para Clientes</h2>
            <ul className="space-y-6">
              {[
                "Acesso gratuito a milhares de profissionais qualificados",
                "Filtros por localização para encontrar quem está perto de você",
                "Sistema de avaliações reais para maior segurança",
                "Contato direto e sem intermediários"
              ].map((item, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-blue-400 mr-4 flex-shrink-0" />
                  <span className="text-lg text-slate-300 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10">
            <Zap className="w-12 h-12 text-blue-400 mb-6" />
            <h3 className="text-2xl font-black mb-4">É Profissional?</h3>
            <p className="text-slate-400 mb-8 text-lg">
              Aumente sua visibilidade, gerencie seu portfólio e receba contatos diretos de clientes interessados no seu trabalho.
            </p>
            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              Cadastrar Meus Serviços
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
