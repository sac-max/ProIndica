import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, doc, setDoc, updateDoc } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Briefcase, CheckCircle, ArrowRight, ShieldCheck, Star, Zap, Globe, Instagram, Facebook, Linkedin, ImagePlus, Trash2, Camera, MapPin, Hash, User as UserIcon, Crown, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { BRAZILIAN_STATES, DEFAULT_PROFESSIONAL_IMAGE } from '../constants';
import { useCategories } from '../hooks/useCategories';

import { createCheckoutSession } from '../services/paymentService';

export const BecomeProfessional: React.FC = () => {
  const { user, profile } = useAuth();
  const { categories: dynamicCategories, specsMap: dynamicSpecsMap } = useCategories();
  const [step, setStep] = useState<'plan' | 'form'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');
  const [formData, setFormData] = useState({
    profession: '',
    specialization: '',
    description: '',
    categories: '',
    experience: '',
    city: '',
    state: '',
    cep: '',
    address: '',
    number: '',
    worksPerformed: '',
    website: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    photoURL: '',
    phone: ''
  });
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const navigate = useNavigate();

  const handleCEPChange = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: cleanCEP }));
    
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error('CEP fetch error:', error);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessingPhotos(true);
      try {
        const compressedPhoto = await compressImage(file);
        setFormData(prev => ({ ...prev, photoURL: compressedPhoto }));
      } catch (err) {
        console.error('Error compressing profile photo:', err);
        alert('Erro ao processar a foto de perfil. Verifique o formato do arquivo.');
      } finally {
        setProcessingPhotos(false);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if (portfolioPhotos.length + files.length > 10) {
        alert('Você pode enviar no máximo 10 fotos.');
        return;
      }
      setProcessingPhotos(true);
      try {
        const compressedPhotos = await Promise.all(
          Array.from(files).map((file: File) => compressImage(file))
        );
        setPortfolioPhotos(prev => [...prev, ...compressedPhotos].slice(0, 10));
      } catch (err) {
        console.error('Error compressing images:', err);
        alert('Erro ao processar algumas imagens. Verifique se os arquivos são imagens válidas.');
      } finally {
        setProcessingPhotos(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPortfolioPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setPaymentError(null);
    try {
      const profData = {
        uid: user.uid,
        name: profile?.name || user.displayName || '',
        email: user.email || '',
        phone: formData.phone,
        cpf: profile?.cpf || '',
        address: formData.address,
        number: formData.number,
        city: formData.city,
        cep: formData.cep,
        state: formData.state,
        profession: formData.profession,
        specialization: formData.specialization,
        description: formData.description,
        categories: formData.categories.split(',').map(c => c.trim()),
        experience: formData.experience,
        worksPerformed: formData.worksPerformed,
        portfolio: portfolioPhotos,
        socialLinks: {
          website: formData.website,
          instagram: formData.instagram,
          facebook: formData.facebook,
          linkedin: formData.linkedin
        },
        photoURL: formData.photoURL || user.photoURL || '',
        rating: 0.0,
        jobsCompleted: 0,
        isPremium: profile?.isPremium === true || selectedPlan === 'premium',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'professionals', user.uid), profData);
      await updateDoc(doc(db, 'users', user.uid), { 
        role: 'professional',
        phone: formData.phone,
        photoURL: formData.photoURL || user.photoURL || ''
      });
      
      if (selectedPlan === 'premium') {
        try {
          const result = await createCheckoutSession(user.uid, user.email || '');
          if (result && result.url) {
            setCheckoutUrl(result.url);
            setSubmitting(false);
            
            if (!result.opened) {
              setTimeout(() => {
                const element = document.getElementById('payment-section');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
            }
          }
        } catch (err: any) {
          setPaymentError('Não foi possível abrir a tela de pagamento. Verifique se você preencheu as chaves do Stripe nas configurações (Secrets) ou tente abrir o app em uma nova aba.');
          setSubmitting(false);
          return;
        }
      } else {
        navigate(`/profile/${user.uid}`);
      }
    } catch (error) {
      console.error('Error becoming professional:', error);
      setPaymentError('Ocorreu um erro ao processar seu cadastro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <div className="bg-slate-50 rounded-[3rem] p-12 md:p-20 border border-slate-100">
        <Zap className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h1 className="text-4xl font-black text-slate-900 mb-4">Pronto para crescer?</h1>
        <p className="text-xl text-slate-500 mb-10 max-w-lg mx-auto">
          Faça login para cadastrar seus serviços e começar a receber pedidos hoje mesmo.
        </p>
        <button onClick={() => navigate('/')} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20">
          Voltar para Home
        </button>
      </div>
    </div>
  );

  if (step === 'plan') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Escolha seu <span className="text-blue-600">Plano de Carreira</span></h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            Selecione como você deseja aparecer para seus clientes e comece a receber pedidos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-white p-10 rounded-[3rem] border-2 transition-all cursor-pointer flex flex-col ${
              selectedPlan === 'free' ? 'border-blue-600 shadow-2xl shadow-blue-600/10' : 'border-slate-100 hover:border-slate-200'
            }`}
            onClick={() => setSelectedPlan('free')}
          >
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Plano Gratuito</h3>
              <p className="text-slate-500 font-medium">Ideal para quem está começando agora.</p>
            </div>
            
            <div className="text-4xl font-black text-slate-900 mb-8">Grátis</div>

            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex items-center text-slate-600 font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
                Perfil Profissional Básico
              </li>
              <li className="flex items-center text-slate-600 font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
                Aparecer nas buscas
              </li>
              <li className="flex items-center text-slate-600 font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
                Receber avaliações
              </li>
            </ul>

            <button
              onClick={() => { setSelectedPlan('free'); setStep('form'); }}
              className={`w-full py-4 rounded-2xl font-black transition-all ${
                selectedPlan === 'free' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Começar Grátis
            </button>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-slate-900 p-10 rounded-[3rem] border-2 transition-all cursor-pointer flex flex-col relative overflow-hidden ${
              selectedPlan === 'premium' ? 'border-blue-500 shadow-2xl shadow-blue-500/20' : 'border-transparent hover:border-white/10'
            }`}
            onClick={() => setSelectedPlan('premium')}
          >
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-2 rounded-bl-3xl font-black text-xs uppercase tracking-widest">
              Recomendado
            </div>
            
            <div className="mb-8">
              <h3 className="text-2xl font-black text-white mb-2 flex items-center">
                <Crown className="w-6 h-6 mr-2 text-amber-400" />
                Plano Premium
              </h3>
              <p className="text-slate-400 font-medium">Destaque-se e conquiste 3x mais clientes.</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-500 line-through font-bold">R$ 40,00</span>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">75% OFF</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">R$ 10,00</span>
                <span className="text-slate-400 font-bold">/mês</span>
              </div>
            </div>

            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex items-center text-slate-300 font-medium">
                <CheckCircle className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                Selo de Verificado no Perfil
              </li>
              <li className="flex items-center text-slate-300 font-medium">
                <CheckCircle className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                Destaque no topo das buscas
              </li>
              <li className="flex items-center text-slate-300 font-medium">
                <CheckCircle className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                Ver quem visitou seu perfil
              </li>
              <li className="flex items-center text-slate-300 font-medium">
                <CheckCircle className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                Link personalizado (Sua Página)
              </li>
              <li className="flex items-center text-slate-300 font-medium">
                <CheckCircle className="w-5 h-5 text-blue-400 mr-3 shrink-0" />
                Suporte prioritário 24h
              </li>
            </ul>

            <button
              onClick={() => { setSelectedPlan('premium'); setStep('form'); }}
              className={`w-full py-4 rounded-2xl font-black transition-all ${
                selectedPlan === 'premium' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/10 text-white'
              }`}
            >
              Escolher Premium
            </button>
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Você poderá alterar seu plano a qualquer momento nas configurações do seu perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">Seja um Parceiro <span className="text-blue-600">Pro Indica</span></h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Preencha seus dados profissionais e conecte-se com milhares de clientes em sua região.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Benefits */}
        <div className="space-y-6">
          {[
            { title: 'Maior Visibilidade', desc: 'Apareça para clientes que já estão buscando seus serviços.', icon: Zap, color: 'bg-blue-100 text-blue-600' },
            { title: 'Gestão de Avaliações', desc: 'Construa sua reputação com feedbacks reais de clientes.', icon: Star, color: 'bg-yellow-100 text-yellow-600' },
            { title: 'Segurança Total', desc: 'Plataforma segura para você e seus clientes.', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-600' }
          ].map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-6"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${benefit.color}`}>
                <benefit.icon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-slate-900">{benefit.title}</h3>
                <p className="text-sm text-slate-500">{benefit.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Form */}
        <motion.div
          id="payment-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl"
        >
          {checkoutUrl ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Quase lá!</h2>
              <p className="text-slate-500 mb-10 max-w-md mx-auto font-medium">
                Seu perfil foi criado com sucesso. Agora, clique no botão abaixo para concluir o pagamento da sua assinatura Premium com segurança no Stripe.
              </p>
              <a 
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 group"
              >
                Ir para o Pagamento
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
              <p className="mt-8 text-slate-400 text-sm font-medium">
                O pagamento será aberto em uma nova aba para sua segurança.
              </p>
            </div>
          ) : (
            <>
              {paymentError && (
                <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {paymentError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center">
                <UserIcon className="w-6 h-6 mr-2 text-blue-600" />
                Sua Foto de Perfil
              </h3>

              {/* Profile Photo Upload */}
              <div className="flex flex-col items-center space-y-6 py-6">
                <div className="relative group">
                  <div className="w-96 h-96 rounded-[4rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-100 relative">
                    <img 
                      src={formData.photoURL || user.photoURL || DEFAULT_PROFESSIONAL_IMAGE} 
                      alt="Profile Preview" 
                      className={`w-full h-full object-cover ${processingPhotos ? 'opacity-50' : 'opacity-100'} transition-opacity`}
                      referrerPolicy="no-referrer"
                    />
                    {processingPhotos && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[4rem]">
                    <Camera className="w-12 h-12 text-white" />
                    <input type="file" className="sr-only" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleProfilePhotoUpload} disabled={processingPhotos} />
                  </label>
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Toque na foto para alterar</p>
              </div>

              <h3 className="text-xl font-black text-slate-900 flex items-center pt-4">
                <Briefcase className="w-6 h-6 mr-2 text-blue-600" />
                Informações Profissionais
              </h3>

              {/* Guia de Profissões (Horizontal Scroll) */}
              <div className="space-y-4">
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest">Guia de Profissões</label>
                <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar scroll-smooth">
                  {dynamicCategories.filter(cat => cat !== 'Outros').map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, profession: cat, specialization: '' })}
                      className={`flex-shrink-0 px-6 py-3 rounded-2xl font-bold text-sm transition-all border ${
                        formData.profession === cat
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Profissão</label>
                  <select
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value, specialization: '' })}
                    required
                  >
                    <option value="">Selecione sua profissão</option>
                    {dynamicCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Especialização</label>
                  {formData.profession && dynamicSpecsMap[formData.profession] ? (
                    <div className="space-y-4">
                      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar scroll-smooth">
                        {dynamicSpecsMap[formData.profession].map((spec: string) => (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => setFormData({ ...formData, specialization: spec })}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all border ${
                              formData.specialization === spec
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                : 'bg-white border-slate-100 text-slate-500 hover:border-blue-100 hover:bg-blue-50'
                            }`}
                          >
                            {spec}
                          </button>
                        ))}
                      </div>
                      <select
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        required
                      >
                        <option value="">Ou selecione aqui</option>
                        {dynamicSpecsMap[formData.profession].map((spec: string) => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Alta Tensão"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      required
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Categorias (separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: Residencial, Comercial, Industrial"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Experiência</label>
                <input
                  type="text"
                  placeholder="Ex: 10 anos de atuação"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Descrição das Habilidades</label>
                <textarea
                  placeholder="Detalhe suas principais competências..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Trabalhos Realizados</label>
                <textarea
                  placeholder="Descreva alguns dos seus principais projetos ou serviços..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium min-h-[100px]"
                  value={formData.worksPerformed}
                  onChange={(e) => setFormData({ ...formData, worksPerformed: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center">
                <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                Localização
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00000-000"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                      value={formData.cep}
                      onChange={(e) => handleCEPChange(e.target.value)}
                      maxLength={9}
                      required
                    />
                    {loadingCEP && <div className="absolute right-4 top-4 animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Estado</label>
                  <select
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  >
                    <option value="">Selecione...</option>
                    {BRAZILIAN_STATES.map(state => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Cidade</label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Endereço</label>
                  <input
                    type="text"
                    placeholder="Rua, Avenida..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Número</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Portfolio */}
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center">
                <Camera className="w-6 h-6 mr-2 text-blue-600" />
                Portfólio (Até 10 fotos)
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {portfolioPhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group">
                    <img src={photo || undefined} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {portfolioPhotos.length < 10 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-500 transition-all relative">
                    {processingPhotos ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    ) : (
                      <>
                        <ImagePlus className="w-8 h-8 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Adicionar</span>
                      </>
                    )}
                    <input type="file" className="sr-only" accept="image/png, image/jpeg, image/jpg, image/webp" multiple onChange={handlePhotoUpload} disabled={processingPhotos} />
                  </label>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center">
                <Globe className="w-6 h-6 mr-2 text-blue-600" />
                Links e Redes Sociais
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <Globe className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Website / Portfólio Online"
                    className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Instagram className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Instagram"
                    className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Facebook className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Facebook"
                    className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Linkedin className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="LinkedIn"
                    className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center"
            >
              {submitting ? 'Cadastrando...' : 'Finalizar Cadastro'}
              <ArrowRight className="ml-2 w-6 h-6" />
            </button>
          </form>
        </>
      )}
    </motion.div>
      </div>
    </div>
  );
};
