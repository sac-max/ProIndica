import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, doc, getDoc, updateDoc, updatePassword, reauthenticateWithCredential, EmailAuthProvider, query, where, getDocs, collection, auth, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Briefcase, CheckCircle, ArrowRight, ShieldCheck, Star, Zap, Globe, Instagram, Facebook, Linkedin, ImagePlus, Trash2, Camera, MapPin, Hash, ChevronLeft, Save, Lock, Eye, EyeOff, AlertCircle, Phone, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { BRAZILIAN_STATES, DEFAULT_PROFESSIONAL_IMAGE, DEFAULT_COVER_IMAGE } from '../constants';
import { useCategories } from '../hooks/useCategories';

export const ProfileEdit: React.FC = () => {
  const { user, profile, isProfessional } = useAuth();
  const { categories: dynamicCategories, specsMap: dynamicSpecsMap } = useCategories();
  const [formData, setFormData] = useState({
    name: '',
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
    coverURL: '',
    phone: ''
  });
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [showPhoneCodeInput, setShowPhoneCodeInput] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const profDoc = await getDoc(doc(db, 'professionals', user.uid));
        if (profDoc.exists()) {
          const data = profDoc.data();
          setFormData({
            name: data.name || profile?.name || '',
            profession: data.profession || '',
            specialization: data.specialization || '',
            description: data.description || '',
            categories: data.categories?.join(', ') || '',
            experience: data.experience || '',
            city: data.city || profile?.city || '',
            state: data.state || profile?.state || '',
            cep: data.cep || profile?.cep || '',
            address: data.address || profile?.address || '',
            number: data.number || profile?.number || '',
            worksPerformed: data.worksPerformed || '',
            website: data.socialLinks?.website || '',
            instagram: data.socialLinks?.instagram || '',
            facebook: data.socialLinks?.facebook || '',
            linkedin: data.socialLinks?.linkedin || '',
            photoURL: data.photoURL || profile?.photoURL || '',
            coverURL: data.coverURL || '',
            phone: data.phone || profile?.phone || ''
          });
          setPortfolioPhotos(data.portfolio || []);
        } else if (profile) {
          setFormData(prev => ({
            ...prev,
            name: profile.name || '',
            city: profile.city || '',
            state: profile.state || '',
            cep: profile.cep || '',
            address: profile.address || '',
            number: profile.number || '',
            photoURL: profile.photoURL || '',
            phone: profile.phone || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, profile]);

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

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessingPhotos(true);
      try {
        const compressedPhoto = await compressImage(file);
        setFormData(prev => ({ ...prev, coverURL: compressedPhoto }));
      } catch (err) {
        console.error('Error compressing cover photo:', err);
        alert('Erro ao processar a foto de capa. Verifique o formato do arquivo.');
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
    try {
      const profData = {
        name: formData.name,
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
        photoURL: formData.photoURL,
        coverURL: formData.coverURL,
        phone: formData.phone
      };

      // Update both users and professionals collections
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        city: formData.city,
        state: formData.state,
        cep: formData.cep,
        address: formData.address,
        number: formData.number,
        photoURL: formData.photoURL,
        phone: formData.phone
      });

      if (isProfessional) {
        await updateDoc(doc(db, 'professionals', user.uid), profData);
      }

      navigate(`/profile/${user.uid}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!user) return;
    if (!formData.phone) {
      alert('Por favor, insira um número de telefone primeiro.');
      return;
    }
    
    // Format phone to E.164 (+55...)
    let formattedPhone = formData.phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }
    formattedPhone = '+' + formattedPhone;

    if (formattedPhone.length < 12) {
      alert('Por favor, insira um número de telefone válido com DDD (ex: 11999999999).');
      return;
    }

    setVerifyingPhone(true);
    try {
      // Check if phone is already in use by another user
      const usersQuery = query(collection(db, 'users'), where('phone', '==', formData.phone));
      const usersSnap = await getDocs(usersQuery);
      
      const otherUser = usersSnap.docs.find(d => d.id !== user.uid);
      if (otherUser) {
        alert('Este número de telefone já está sendo usado por outra conta.');
        setVerifyingPhone(false);
        return;
      }
      
      // Setup Recaptcha
      try {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
        
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
            if (recaptchaVerifierRef.current) {
              recaptchaVerifierRef.current.clear();
              recaptchaVerifierRef.current = null;
            }
          }
        });
      } catch (reError) {
        console.error('Recaptcha init error:', reError);
        alert('Erro ao carregar o verificador de segurança. Por favor, recarregue a página.');
        setVerifyingPhone(false);
        return;
      }
      
      const appVerifier = recaptchaVerifierRef.current;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setShowPhoneCodeInput(true);
      alert('Um código de verificação foi enviado via SMS para o seu celular.');
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      
      // Reset recaptcha on error
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }

      if (error.code === 'auth/invalid-phone-number') {
        alert('Número de telefone inválido. Use o formato: (11) 99999-9999');
      } else if (error.code === 'auth/too-many-requests') {
        alert('Muitas tentativas. Tente novamente mais tarde.');
      } else if (error.code === 'auth/operation-not-allowed') {
        alert('O serviço de SMS não está habilitado no Firebase Console. Ative o provedor "Telefone" em Authentication.');
      } else {
        alert(`Erro ao enviar SMS: ${error.message || 'Verifique sua conexão.'}`);
      }
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleConfirmPhoneCode = async () => {
    if (!user || !confirmationResult) return;
    
    setVerifyingPhone(true);
    try {
      await confirmationResult.confirm(phoneVerificationCode);
      
      const updateData: any = {
        phoneVerified: true,
        phone: formData.phone
      };
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      if (isProfessional) {
        await updateDoc(doc(db, 'professionals', user.uid), {
          phone: formData.phone
        });
      }
      
      alert('Telefone verificado com sucesso!');
      setShowPhoneCodeInput(false);
      setPhoneVerificationCode('');
      setConfirmationResult(null);
    } catch (error: any) {
      console.error('Error confirming code:', error);
      if (error.code === 'auth/invalid-verification-code') {
        alert('Código incorreto. Verifique o SMS recebido.');
      } else {
        alert('Erro ao confirmar verificação. Tente novamente.');
      }
    } finally {
      setVerifyingPhone(false);
    }
  };

  const isEmailUser = user?.providerData.some(p => p.providerId === 'password');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setChangingPassword(true);
    setPasswordStatus({ type: null, message: '' });

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email.trim(), passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, passwordData.newPassword);
      
      setPasswordStatus({ type: 'success', message: 'Senha alterada com sucesso!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordSection(false), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      let msg = 'Erro ao alterar senha.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = 'Senha atual incorreta.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'A nova senha é muito fraca.';
      }
      setPasswordStatus({ type: 'error', message: msg });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-blue-600 transition-colors font-bold">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Voltar
        </button>
        <h1 className="text-3xl font-black text-slate-900">Editar Perfil</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Basic Info */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl space-y-8">
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center">
              <ShieldCheck className="w-6 h-6 mr-2 text-blue-600" />
              Informações Básicas
            </h3>

            {/* Cover Photo Upload */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Foto de Capa</label>
                {isProfessional && !profile?.isPremium && (
                  <Link to="/premium" className="text-amber-600 flex items-center text-[10px] font-black uppercase tracking-wider bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    <Lock className="w-3 h-3 mr-1" />
                    Recurso Premium
                  </Link>
                )}
              </div>
              <div className="relative group h-48 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-slate-100">
                <img 
                  src={formData.coverURL || DEFAULT_COVER_IMAGE} 
                  alt="Cover Preview" 
                  className={`w-full h-full object-cover ${processingPhotos ? 'opacity-50' : 'opacity-100'} transition-opacity`}
                  referrerPolicy="no-referrer"
                />
                {(!isProfessional || profile?.isPremium) && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-8 h-8 text-white" />
                    <input type="file" className="sr-only" accept="image/*" onChange={handleCoverPhotoUpload} disabled={processingPhotos} />
                  </label>
                )}
              </div>
            </div>

            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center space-y-6 py-6">
              <div className="relative group">
                <div className="w-96 h-96 rounded-[4rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-100 relative">
                  <img 
                    src={formData.photoURL || DEFAULT_PROFESSIONAL_IMAGE} 
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
                {(!isProfessional || profile?.isPremium) && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[4rem]">
                    <Camera className="w-12 h-12 text-white" />
                    <input type="file" className="sr-only" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleProfilePhotoUpload} disabled={processingPhotos} />
                  </label>
                )}
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                {isProfessional && !profile?.isPremium ? 'Assine o Premium para alterar sua foto' : 'Toque na foto para alterar'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Nome Completo</label>
                <input
                  type="text"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={profile?.phoneVerified}
                      />
                      {profile?.phoneVerified && (
                        <div className="absolute right-4 top-4 text-emerald-500" title="Verificado">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    {!profile?.phoneVerified && !showPhoneCodeInput && (
                      <button
                        type="button"
                        onClick={handleVerifyPhone}
                        disabled={verifyingPhone}
                        className="px-6 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all flex items-center shrink-0 shadow-lg shadow-blue-600/20"
                      >
                        {verifyingPhone ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Verificar'
                        )}
                      </button>
                    )}
                  </div>

                  {showPhoneCodeInput && !profile?.phoneVerified && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4"
                    >
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Digite o código enviado via SMS</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          className="flex-grow p-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-widest"
                          value={phoneVerificationCode}
                          onChange={(e) => setPhoneVerificationCode(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                          type="button"
                          onClick={handleConfirmPhoneCode}
                          disabled={verifyingPhone || phoneVerificationCode.length < 6}
                          className="px-6 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPhoneCodeInput(false);
                            setPhoneVerificationCode('');
                            setConfirmationResult(null);
                          }}
                          className="px-4 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-300 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </motion.div>
                  )}
                  <div id="recaptcha-container"></div>
                </div>
                {!profile?.phoneVerified && (
                  <p className="mt-2 text-[10px] text-amber-600 font-bold uppercase tracking-wider flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Verificação obrigatória para avaliar profissionais
                  </p>
                )}
              </div>
            </div>
          </div>

          {isProfessional && (
            <div className="space-y-6 pt-8 border-t border-slate-100">
              <h3 className="text-xl font-black text-slate-900 flex items-center">
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
          )}
        </div>

        {/* Address */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl space-y-8">
          <h3 className="text-xl font-black text-slate-900 flex items-center">
            <MapPin className="w-6 h-6 mr-2 text-blue-600" />
            Localização
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {isProfessional && (
          <>
            {/* Portfolio */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
              {isProfessional && !profile?.isPremium && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mb-2">Portfólio Bloqueado</h4>
                  <p className="text-sm text-slate-500 mb-6 font-medium">
                    Assine o Premium para exibir fotos dos seus trabalhos e atrair mais clientes.
                  </p>
                  <Link
                    to="/premium"
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-600/20"
                  >
                    Ver Planos
                  </Link>
                </div>
              )}
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
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl space-y-8">
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
          </>
        )}

        {/* Change Password Section */}
        {isEmailUser && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 flex items-center">
                <Lock className="w-6 h-6 mr-2 text-blue-600" />
                Segurança
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
              >
                {showPasswordSection ? 'Cancelar' : 'Alterar Senha'}
              </button>
            </div>

            {showPasswordSection && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                {passwordStatus.type && (
                  <div className={`p-4 rounded-2xl flex items-center font-bold text-sm ${passwordStatus.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {passwordStatus.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                    {passwordStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Senha Atual</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-4 top-4 text-slate-400 hover:text-blue-600"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-4 top-4 text-slate-400 hover:text-blue-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-4 top-4 text-slate-400 hover:text-blue-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center"
                >
                  {changingPassword ? 'Alterando...' : 'Confirmar Alteração'}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center"
        >
          <Save className="mr-2 w-6 h-6" />
          {submitting ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
};
