import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Mail, Lock, User, Phone, MapPin, CreditCard, AlertCircle, Building2, Hash, ChevronDown, Briefcase, Wrench, Globe, Instagram, Facebook, Linkedin, ImagePlus, Trash2, Camera, Eye, EyeOff, ArrowRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, setDoc, doc, googleProvider, signInWithPopup, getDoc, handleFirestoreError, OperationType, sendPasswordResetEmail } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { BRAZILIAN_STATES } from '../constants';
import { useCategories } from '../hooks/useCategories';
import { sendWelcomeEmail } from '../services/emailService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onSuccess?: () => void;
  initialRole?: 'client' | 'professional';
  initialIsLogin?: boolean;
}

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, message, onSuccess, initialRole = 'client', initialIsLogin = true }) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const { categories: dynamicCategories, specsMap: dynamicSpecsMap } = useCategories();
  const [userRole, setUserRole] = useState<'client' | 'professional'>(initialRole);
  const [showRoleSelection, setShowRoleSelection] = useState(!initialIsLogin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    address: '',
    number: '',
    city: '',
    cep: '',
    state: '',
    profession: '',
    specialization: '',
    worksPerformed: '',
    website: '',
    instagram: '',
    facebook: '',
    linkedin: ''
  });

  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialIsLogin);
      setUserRole(initialRole);
      setShowRoleSelection(!initialIsLogin);
      setError(null);
      setSuccess(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        cpf: '',
        address: '',
        number: '',
        city: '',
        cep: '',
        state: '',
        profession: '',
        specialization: '',
        worksPerformed: '',
        website: '',
        instagram: '',
        facebook: '',
        linkedin: ''
      });
      setPortfolioPhotos([]);
    }
  }, [isOpen, initialIsLogin, initialRole]);

  useEffect(() => {
    const fetchAddressByCEP = async () => {
      const cleanCEP = formData.cep.replace(/\D/g, '');
      if (cleanCEP.length === 8) {
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
          const data = await response.json();
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              address: data.logradouro || '',
              city: data.localidade || '',
              state: data.uf || ''
            }));
          }
        } catch (err) {
          console.error('Error fetching CEP:', err);
        }
      }
    };
    fetchAddressByCEP();
  }, [formData.cep]);

  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state) {
        setCities([]);
        return;
      }
      setLoadingCities(true);
      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios`);
        const data = await response.json();
        const cityNames = data.map((city: any) => city.nome).sort();
        setCities(cityNames);
      } catch (err) {
        console.error('Error fetching cities:', err);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [formData.state]);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (portfolioPhotos.length + files.length > 10) {
      setError('Você pode enviar no máximo 10 fotos.');
      return;
    }

    setLoading(true);
    try {
      const compressedPhotos = await Promise.all(
        Array.from(files).map((file: File) => compressImage(file))
      );
      setPortfolioPhotos(prev => [...prev, ...compressedPhotos]);
    } catch (err) {
      console.error('Error compressing images:', err);
      setError('Erro ao processar as imagens. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPortfolioPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
        const user = userCredential.user;

        // Create user profile
        const userProfile = {
          uid: user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf,
          address: formData.address,
          number: formData.number,
          city: formData.city,
          cep: formData.cep,
          state: formData.state,
          role: userRole,
          platform: 'web',
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);

        // Send welcome email
        sendWelcomeEmail(formData.name, formData.email, userRole);

        // If professional, redirect to become-professional
        if (userRole === 'professional') {
          navigate('/become-professional');
          onClose();
          return;
        }
      }
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = 'Ocorreu um erro ao processar sua solicitação.';
      
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'E-mail ou senha incorretos. Por favor, verifique seus dados e tente novamente.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado. Verifique o e-mail ou crie uma nova conta.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta. Tente novamente.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso. Você já possui uma conta? Tente fazer login.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'O e-mail fornecido é inválido.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user profile already exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create basic profile for new Google user
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          phone: '',
          cpf: '',
          address: '',
          number: '',
          city: '',
          cep: '',
          state: '',
          role: 'client',
          platform: 'web',
          createdAt: new Date().toISOString()
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      let errorMessage = 'Ocorreu um erro ao entrar com o Google.';
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'A janela de login foi fechada antes de completar o processo.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMessage = 'A solicitação de login foi cancelada.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'O pop-up de login foi bloqueado pelo seu navegador.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[2.5rem] p-8 md:p-12 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#00B67A] rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6">
                <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L4 11H8V21H16V11H20L12 3Z" />
                  <circle cx="12" cy="13" r="2.5" />
                  <path d="M12 16C10 16 8 17 8 18.5V19H16V18.5C16 17 14 16 12 16Z" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">
                {isLogin ? 'Bem-vindo de volta' : (showRoleSelection ? 'Como você quer usar?' : (userRole === 'client' ? 'Crie sua conta' : 'Seja um Parceiro'))}
              </h2>
              <p className="text-slate-500 font-medium">
                {message || (isLogin ? 'Acesse sua conta para continuar.' : (showRoleSelection ? 'Escolha uma opção para prosseguir com seu cadastro.' : 'Se cadastre e tenha acesso total à nossa ferramenta'))}
              </p>
            </div>

            {!isLogin && showRoleSelection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <button
                  onClick={() => {
                    setUserRole('client');
                    setShowRoleSelection(false);
                  }}
                  className="group relative p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Cliente</h3>
                  <p className="text-slate-500 text-sm font-medium">
                    Quero encontrar profissionais qualificados para meus projetos.
                  </p>
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    setUserRole('professional');
                    setShowRoleSelection(false);
                  }}
                  className="group relative p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Profissional</h3>
                  <p className="text-slate-500 text-sm font-medium">
                    Quero oferecer meus serviços e conquistar novos clientes.
                  </p>
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </div>
                </button>
              </div>
            )}

            {!isLogin && !showRoleSelection && (
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => setShowRoleSelection(true)}
                  className="flex items-center text-slate-400 hover:text-blue-600 transition-colors font-bold text-sm"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Voltar
                </button>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setUserRole('client')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all text-xs ${userRole === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Cliente
                  </button>
                  <button
                    onClick={() => setUserRole('professional')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all text-xs ${userRole === 'professional' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Profissional
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-600 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                {error.includes('em uso') && !isLogin && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError(null);
                    }}
                    className="text-blue-600 hover:underline text-left ml-7"
                  >
                    Clique aqui para fazer login
                  </button>
                )}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center text-emerald-600 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {!showRoleSelection && (
              <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="relative">
                    <User className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Nome completo"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="CPF (000.000.000-00)"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="Telefone (00) 00000-0000"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Hash className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="CEP (00000-000)"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Endereço"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="E-mail"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Senha"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!formData.email) {
                        setError('Por favor, insira seu e-mail para recuperar a senha.');
                        setSuccess(null);
                        return;
                      }
                      setLoading(true);
                      setError(null);
                      setSuccess(null);
                      try {
                        await sendPasswordResetEmail(auth, formData.email.trim());
                        setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
                      } catch (err: any) {
                        console.error('Reset password error:', err);
                        setError('Erro ao enviar e-mail de recuperação. Verifique o e-mail informado.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar Agora')}
              </button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-wider">Ou continue com</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Entrar com Google
              </button>
            </form>
          )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-sm mb-2 font-medium">
                {isLogin ? 'Não tem uma conta ainda?' : 'Já possui uma conta?'}
              </p>
              <button 
                type="button"
                onClick={() => {
                  const newIsLogin = !isLogin;
                  setIsLogin(newIsLogin);
                  setShowRoleSelection(!newIsLogin);
                }}
                className="text-blue-600 font-black hover:text-blue-700 transition-colors uppercase tracking-wider text-xs"
              >
                {isLogin ? 'Cadastre-se agora' : 'Faça login'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
