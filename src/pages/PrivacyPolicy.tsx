import React from 'react';
import { ShieldCheck, Lock, Eye, Database, Share2, Bell, Shield, Key } from 'lucide-react';
import { motion } from 'motion/react';

export const PrivacyPolicy: React.FC = () => {
  const policies = [
    {
      title: "Coleta de Dados",
      description: "Coletamos informações básicas como nome, e-mail, telefone e localização para fornecer e melhorar nossos serviços. Para profissionais, coletamos dados adicionais como CPF e informações profissionais.",
      icon: Database,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Uso das Informações",
      description: "Seus dados são usados para conectar você a profissionais ou clientes, personalizar sua experiência e enviar comunicações importantes sobre sua conta.",
      icon: Eye,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Segurança de Dados",
      description: "Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração.",
      icon: Lock,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      title: "Compartilhamento",
      description: "Não vendemos seus dados para terceiros. Compartilhamos informações apenas com profissionais ou clientes quando você inicia um contato ou solicita um serviço.",
      icon: Share2,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-20">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Política de <span className="text-blue-600">Privacidade</span></h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
          Sua privacidade é nossa prioridade. Saiba como protegemos e tratamos seus dados pessoais no Pro Indica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
        {policies.map((policy, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"
          >
            <div className={`w-14 h-14 ${policy.bg} ${policy.color} rounded-2xl flex items-center justify-center mb-8`}>
              <policy.icon className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">{policy.title}</h2>
            <p className="text-slate-500 text-lg leading-relaxed font-medium">
              {policy.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -ml-48 -mb-48"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-4xl font-black mb-8">Seus Direitos (LGPD)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { icon: Shield, title: "Acesso", text: "Você pode solicitar uma cópia de todos os seus dados que armazenamos." },
                { icon: Key, title: "Correção", text: "Você tem o direito de corrigir dados incompletos ou inexatos." },
                { icon: Bell, title: "Exclusão", text: "Você pode solicitar a exclusão total da sua conta e de seus dados." },
                { icon: ShieldCheck, title: "Portabilidade", text: "Você pode solicitar a transferência de seus dados para outro serviço." }
              ].map((right, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <right.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">{right.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{right.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 flex flex-col justify-center text-center">
            <h3 className="text-2xl font-black mb-4">Dúvidas?</h3>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              Para qualquer questão relacionada à privacidade, entre em contato com nosso Encarregado de Dados (DPO).
            </p>
            <a href="mailto:dpo@jobconection.com.br" className="text-blue-400 font-black text-lg mb-2 hover:text-blue-300 transition-colors">
              dpo@jobconection.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
