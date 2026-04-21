import React, { useEffect, useState } from 'react';
import { db, collection, getDocs, query, where, doc, getDoc, updateDoc, setDoc, orderBy, limit, handleFirestoreError, OperationType, onSnapshot } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Clock, CheckCircle, Star, TrendingUp, Users, AlertCircle, Eye, MessageCircle, Phone, Crown, Zap, Lock, Globe, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { DEFAULT_PROFESSIONAL_IMAGE, DEFAULT_USER_IMAGE } from '../constants';
import { syncPayments } from '../services/paymentService';

export const Dashboard: React.FC = () => {
  const { user, profile, isProfessional } = useAuth();
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [stats, setStats] = useState({ views: 0, contacts: 0 });
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [activeCodes, setActiveCodes] = useState<any[]>([]);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShowSuccess(true);
      searchParams.delete('payment');
      setSearchParams(searchParams);
      // Force a sync with Stripe to ensure premium status is updated
      syncPayments().catch(err => console.error('Auto-sync error:', err));
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user || !isProfessional) {
      setLoading(false);
      return;
    }

    // Listen to professional data in real-time to reflect Premium status immediately
    const unsubscribe = onSnapshot(doc(db, 'professionals', user.uid), (doc) => {
      if (doc.exists()) {
        setProfessionalData(doc.data());
      }
      setLoading(false);
    }, (error) => {
      console.error('Dashboard real-time error:', error);
    });

    return () => unsubscribe();
  }, [user, isProfessional]);

  useEffect(() => {
    if (!user || !isProfessional) return;

    const q = query(
      collection(db, 'review_codes'),
      where('professionalId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const codes = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10);
      setActiveCodes(codes);
    }, (error) => {
      console.error('Active codes error:', error);
    });

    return () => unsubscribe();
  }, [user, isProfessional]);

  useEffect(() => {
    const fetchInteractions = async () => {
      if (!user || !isProfessional) return;
      try {
        const interactionsQuery = query(
          collection(db, 'profile_interactions'),
          where('professionalId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        const interactionsSnap = await getDocs(interactionsQuery);
        const interactionsData = interactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        setInteractions(interactionsData.slice(0, 5));
        
        const viewsCount = interactionsData.filter(i => i.type === 'view').length;
        const contactsCount = interactionsData.filter(i => i.type === 'contact').length;
        
        setStats({ views: viewsCount, contacts: contactsCount });
      } catch (error) {
        console.error('Interactions error:', error);
      }
    };
    fetchInteractions();
  }, [user, isProfessional]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  if (!isProfessional) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-slate-50 rounded-[3rem] p-12 md:p-20 border border-slate-100">
          <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-slate-900 mb-4">Você ainda não é um profissional</h1>
          <p className="text-slate-500 mb-10 max-w-md mx-auto">
            Cadastre seus serviços para ter acesso ao seu perfil e gerenciar seus pedidos e avaliações.
          </p>
          <Link to="/become-professional" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-600/20 inline-block">
            Começar Agora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
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
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-900">Parabéns! Você agora é Premium</h3>
                <p className="text-emerald-700 font-medium">Todos os recursos exclusivos já foram liberados para o seu perfil.</p>
              </div>
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-emerald-400 hover:text-emerald-600">
              <XCircle className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-slate-900">Painel do Profissional</h1>
            {professionalData?.isPremium && (
              <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium">Olá, {profile?.name?.split(' ')[0] || 'Usuário'}! Gerencie seu perfil e acompanhe seu desempenho.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link 
            to={`/profile/${user?.uid}`}
            className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black flex items-center border border-slate-200 hover:bg-slate-50 transition-all shadow-sm group"
          >
            <Eye className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 transition-transform" />
            Minha página
          </Link>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-2xl font-bold flex items-center border border-emerald-100 shadow-sm shadow-emerald-600/5">
            <CheckCircle className="w-5 h-5 mr-2" />
            Perfil Ativo
          </div>
        </div>
      </div>

      {/* Premium Banner */}
      {!professionalData?.isPremium && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 md:p-12 text-white mb-12 relative overflow-hidden shadow-2xl shadow-blue-600/20"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center px-4 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider mb-4">
                <Crown className="w-3 h-3 mr-2" />
                Destaque-se no Pro Indica
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-4">Seja um Profissional Premium</h2>
              <p className="text-blue-100 font-medium max-w-xl">
                Tenha acesso a visitantes do perfil, selos de verificação, página personalizada e muito mais para conquistar 3x mais clientes.
              </p>
            </div>
            <Link 
              to="/premium" 
              className="px-10 py-4 bg-white text-blue-600 rounded-2xl font-black shadow-xl hover:scale-105 transition-transform whitespace-nowrap"
            >
              Conhecer Planos
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        {[
          { label: 'Rating Médio', value: professionalData?.rating || '0.0', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
          { label: 'Serviços Concluídos', value: professionalData?.jobsCompleted || '0', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Visualizações', value: stats.views.toString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Contatos Diretos', value: stats.contacts.toString(), icon: MessageCircle, color: 'text-indigo-500', bg: 'bg-indigo-50' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Review Code Generation Section */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mr-6">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Gerar Código de Avaliação</h3>
              <p className="text-slate-500 font-medium">Gere um código único para seu cliente avaliar seu serviço.</p>
            </div>
          </div>
          
          {professionalData?.isPremium ? (
            <div className="flex items-center gap-4">
              <button
                disabled={isGeneratingCode}
                onClick={async () => {
                  if (!user) return;
                  setIsGeneratingCode(true);
                  
                  try {
                    // Check daily limit (max 5)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const codesQuery = query(
                      collection(db, 'review_codes'),
                      where('professionalId', '==', user.uid)
                    );
                    
                    const codesSnap = await getDocs(codesQuery);
                    const todayCodes = codesSnap.docs.filter(doc => {
                      const data = doc.data();
                      return data.createdAt >= today.toISOString();
                    });

                    if (todayCodes.length >= 5) {
                      alert('Você já atingiu o limite de 5 códigos gerados hoje. Tente novamente amanhã.');
                      setIsGeneratingCode(false);
                      return;
                    }

                    const code = Math.floor(1000 + Math.random() * 9000).toString();
                    const codeId = `${user.uid}_${code}`;
                    
                    await setDoc(doc(db, 'review_codes', codeId), {
                      code,
                      professionalId: user.uid,
                      status: 'active',
                      createdAt: new Date().toISOString()
                    });
                    alert(`Código gerado com sucesso: ${code}. Passe este código para seu cliente.`);
                  } catch (error: any) {
                    console.error('Error generating code:', error);
                    if (error.message?.includes('index')) {
                      alert('O sistema está sendo configurado. Por favor, tente novamente em alguns minutos.');
                    } else {
                      alert('Erro ao gerar código. Verifique sua conexão e tente novamente.');
                    }
                  } finally {
                    setIsGeneratingCode(false);
                  }
                }}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isGeneratingCode ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Novo Código'
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center text-amber-600 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100 font-bold">
              <Lock className="w-5 h-5 mr-2" />
              Recurso exclusivo para Premium
            </div>
          )}
        </div>

        {/* Active Codes List */}
        {professionalData?.isPremium && activeCodes.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Códigos Ativos para Avaliação</h4>
            <div className="flex flex-wrap gap-3">
              {activeCodes.map((c) => (
                <div 
                  key={c.id} 
                  className="flex items-center bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl group relative"
                >
                  <span className="text-lg font-black text-blue-700 mr-2">{c.code}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(c.code);
                      alert('Código copiado!');
                    }}
                    className="p-1 hover:bg-blue-100 rounded-lg transition-colors text-blue-400 hover:text-blue-600"
                    title="Copiar código"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 font-medium italic">
              * Cada código só pode ser usado uma vez por um cliente.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
            {!professionalData?.isPremium && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-2">Painel de Visitantes Bloqueado</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium max-w-xs">
                  Assine o Premium para ver quem são os clientes que estão acessando seu perfil.
                </p>
                <Link
                  to="/premium"
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-600/20"
                >
                  Liberar Agora
                </Link>
              </div>
            )}
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Visitantes e Contatos</h3>
              <Link to="/premium" className="text-blue-600 font-bold text-sm hover:underline">Ver todos</Link>
            </div>
            <div className="p-8">
              {interactions.length > 0 ? (
                <div className="space-y-6">
                  {interactions.map((interaction, i) => (
                    <div key={interaction.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200">
                          <img 
                            src={interaction.clientPhoto || DEFAULT_USER_IMAGE} 
                            alt={interaction.clientName} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{interaction.clientName}</p>
                          <div className="flex flex-col">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              {interaction.type === 'view' ? 'Visualizou seu perfil' : 'Clicou em um contato'}
                            </p>
                            {interaction.clientPhone && (
                              <p className="text-xs font-black text-blue-600 mt-1 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {interaction.clientPhone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                          {interaction.timestamp?.toDate ? interaction.timestamp.toDate().toLocaleDateString('pt-BR') : 'Recentemente'}
                        </p>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${interaction.type === 'view' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {interaction.type === 'view' ? <Eye className="w-3 h-3 mr-1" /> : <Phone className="w-3 h-3 mr-1" />}
                          {interaction.type === 'view' ? 'Visita' : 'Contato'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium italic">Nenhum cliente visualizou seu contato recentemente.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
            <h3 className="text-xl font-black mb-6">Seu Perfil</h3>
            <div className="space-y-6">
              {professionalData?.isPremium && (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                    <Globe className="w-3 h-3 mr-1 text-blue-400" />
                    Link da sua página
                  </p>
                  <p className="text-xs font-mono text-blue-300 break-all">
                    profconnect.com.br/p/{user?.uid?.slice(0, 8)}
                  </p>
                </div>
              )}
              <div>
                <div className="flex justify-between text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">
                  <span>Percentual de Informações Preenchidas</span>
                  <span className="text-blue-400">85%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[85%] rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-3 pt-4">
                <div className="flex items-center text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                  Foto de Perfil
                </div>
                <div className="flex items-center text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                  Descrição Detalhada
                </div>
                <div className="flex items-center text-sm text-slate-300">
                  <AlertCircle className="w-4 h-4 mr-2 text-yellow-400" />
                  Portfólio de Fotos
                </div>
              </div>

              <Link to="/profile/edit" className="block w-full py-4 bg-white text-slate-900 text-center rounded-2xl font-black hover:bg-blue-500 hover:text-white transition-all mt-8">
                Editar Perfil
              </Link>
            </div>
          </div>

          <div className="bg-blue-50 rounded-[2.5rem] p-8 border border-blue-100 mt-8">
            <h3 className="text-xl font-black text-blue-900 mb-4">Dicas para seu Perfil</h3>
            <ul className="space-y-4">
              <li className="flex items-start text-sm text-blue-800">
                <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  <span className="text-[10px] font-bold">1</span>
                </div>
                Use uma foto de perfil profissional e clara.
              </li>
              <li className="flex items-start text-sm text-blue-800">
                <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  <span className="text-[10px] font-bold">2</span>
                </div>
                Descreva detalhadamente suas especialidades.
              </li>
              <li className="flex items-start text-sm text-blue-800">
                <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  <span className="text-[10px] font-bold">3</span>
                </div>
                Mantenha seu portfólio sempre atualizado.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
