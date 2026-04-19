import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession, syncPayments } from '../services/paymentService';
import { Crown, CheckCircle, ShieldCheck, Zap, Eye, Globe, Star, ArrowRight, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';

export const Premium: React.FC = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setShowSuccess(true);
      // Clean up URL
      searchParams.delete('payment');
      setSearchParams(searchParams);
      // Force a sync with Stripe
      syncPayments().catch(err => console.error('Auto-sync error:', err));
    } else if (paymentStatus === 'cancel') {
      setShowCancel(true);
      searchParams.delete('payment');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleUpgrade = async () => {
    if (!user) {
      setError('Você precisa estar logado para assinar o Premium.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createCheckoutSession(user.uid, user.email || '');
      if (result && result.url) {
        setCheckoutUrl(result.url);
        setLoading(false);
        
        if (!result.opened) {
          // If it didn't open automatically, scroll to the manual button
          setTimeout(() => {
            const element = document.getElementById('payment-section');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      }
    } catch (err: any) {
      setError('Ocorreu um erro ao iniciar o pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: Eye,
      title: 'Quem viu seu perfil',
      description: 'Saiba exatamente quais clientes visitaram seu perfil e quando.',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      icon: Globe,
      title: 'Página Personalizada',
      description: 'Tenha um link exclusivo (ex: profconnect.com/seu-nome) para divulgar.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
      icon: ShieldCheck,
      title: 'Selo de Verificado',
      description: 'Ganhe mais confiança dos clientes com o selo oficial de verificação.',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      icon: Zap,
      title: 'Destaque nas Buscas',
      description: 'Apareça no topo dos resultados quando clientes buscarem por sua profissão.',
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      icon: Star,
      title: 'Suporte Prioritário',
      description: 'Atendimento exclusivo e rápido para qualquer dúvida ou problema.',
      color: 'text-purple-500',
      bg: 'bg-purple-50'
    },
    {
      icon: Crown,
      title: 'Recursos Exclusivos',
      description: 'Acesso antecipado a novas ferramentas e funcionalidades da plataforma.',
      color: 'text-rose-500',
      bg: 'bg-rose-50'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex items-center justify-between"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-900">Pagamento Realizado!</h3>
                <p className="text-emerald-700 font-medium">Sua conta está sendo atualizada para Premium. Isso pode levar alguns segundos.</p>
              </div>
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-emerald-400 hover:text-emerald-600">
              <XCircle className="w-6 h-6" />
            </button>
          </motion.div>
        )}

        {showCancel && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 bg-slate-100 border border-slate-200 rounded-[2rem] flex items-center justify-between"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mr-4">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Pagamento Cancelado</h3>
                <p className="text-slate-700 font-medium">A transação não foi concluída. Se tiver dúvidas, entre em contato com o suporte.</p>
              </div>
            </div>
            <button onClick={() => setShowCancel(false)} className="text-slate-400 hover:text-slate-600">
              <XCircle className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-16">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center px-4 py-1.5 bg-amber-100 text-amber-600 rounded-full text-sm font-black uppercase tracking-wider mb-6"
        >
          <Crown className="w-4 h-4 mr-2" />
          Plano Profissional
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6">
          Leve sua carreira para o <span className="text-blue-600">próximo nível</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
          Assine o Pro Indica Premium e tenha todas as ferramentas necessárias para conquistar mais clientes e gerenciar seu negócio com excelência.
        </p>
      </div>

      {checkoutUrl && (
        <motion.div 
          id="payment-section"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto mb-20 bg-slate-900 rounded-[3rem] p-12 text-center border-4 border-blue-500 shadow-2xl shadow-blue-500/20"
        >
          <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Pagamento Pronto!</h2>
          <p className="text-slate-400 mb-10 text-lg font-medium">
            Clique no botão abaixo para abrir a página de pagamento segura do Stripe em uma nova aba e concluir sua assinatura.
          </p>
          <a 
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/40 group"
          >
            Ir para o Pagamento
            <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
          </a>
          <button 
            onClick={() => setCheckoutUrl(null)}
            className="block mx-auto mt-8 text-slate-500 hover:text-white transition-colors font-bold text-sm"
          >
            Voltar para os planos
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {benefits.map((benefit, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className={`w-14 h-14 ${benefit.bg} ${benefit.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <benefit.icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">{benefit.title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              {benefit.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1">
              <h2 className="text-4xl font-black mb-6">Acelere seu Crescimento</h2>
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-blue-200 font-bold group">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 group-hover:bg-blue-500 transition-colors">
                    <CheckCircle className="w-5 h-5 text-blue-400 group-hover:text-white" />
                  </div>
                  Apareça 5x mais nas buscas
                </div>
                <div className="flex items-center text-blue-200 font-bold group">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 group-hover:bg-blue-500 transition-colors">
                    <CheckCircle className="w-5 h-5 text-blue-400 group-hover:text-white" />
                  </div>
                  Selo de Confiança Verificado
                </div>
                <div className="flex items-center text-blue-200 font-bold group">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 group-hover:bg-blue-500 transition-colors">
                    <CheckCircle className="w-5 h-5 text-blue-400 group-hover:text-white" />
                  </div>
                  Painel de Visitantes do seu Perfil
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-400 line-through font-bold">R$ 39,90</span>
                  <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">OFERTA LIMITADA</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black">R$ 10,00</span>
                  <span className="text-slate-400 font-bold italic">/mês no plano anual</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <button
                onClick={handleUpgrade}
                disabled={loading || profile?.isPremium}
                className={`w-full md:w-auto px-12 py-6 rounded-2xl font-black text-lg shadow-2xl transition-all flex items-center justify-center ${
                  profile?.isPremium 
                    ? 'bg-emerald-500 text-white cursor-default' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-50'
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : profile?.isPremium ? (
                  <>
                    <CheckCircle className="w-6 h-6 mr-2" />
                    Já é Premium
                  </>
                ) : (
                  <>
                    Assinar Agora
                    <ArrowRight className="w-6 h-6 ml-2" />
                  </>
                )}
              </button>
              {error && (
                <p className="text-red-400 text-sm font-bold mt-4 text-center">{error}</p>
              )}
              <p className="text-slate-400 text-xs text-center mt-4 font-medium">
                Pagamento seguro via Stripe
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
