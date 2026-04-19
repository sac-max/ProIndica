import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db, doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Star, MapPin, Phone, MessageCircle, Briefcase, Calendar, CheckCircle, Send, 
  User as UserIcon, ChevronLeft, Globe, Instagram, Facebook, Linkedin, Edit, X, 
  ChevronRight, Mail, Crown, ShieldCheck, ShieldAlert, Check, Zap, Award, 
  ThumbsUp, Users as UsersIcon, Share2, ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import { DEFAULT_PROFESSIONAL_IMAGE, DEFAULT_USER_IMAGE } from '../constants';
import { syncPayments } from '../services/paymentService';
import { ProfessionalBadge } from '../components/ProfessionalBadge';

export const Profile: React.FC = () => {
  const { uid } = useParams();
  const { user, profile: currentUserProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(paymentStatus === 'success');
  const [profile, setProfile] = useState<any>(null);
  const [professional, setProfessional] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', code: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (paymentStatus === 'success') {
      const sync = async () => {
        setIsSyncing(true);
        try {
          await syncPayments();
        } catch (error) {
          console.error('Error syncing payments:', error);
        } finally {
          setIsSyncing(false);
          // Auto hide message after 10 seconds
          setTimeout(() => setShowPaymentSuccess(false), 10000);
        }
      };
      sync();
    }
  }, [paymentStatus]);

  useEffect(() => {
    const recordInteraction = async (type: 'view' | 'contact') => {
      if (!uid || (type === 'view' && hasRecordedView)) return;
      
      // Don't record own views
      if (user && user.uid === uid) return;

      try {
        await addDoc(collection(db, 'profile_interactions'), {
          professionalId: uid,
          clientId: user?.uid || null,
          clientName: user?.displayName || currentUserProfile?.name || 'Visitante Anônimo',
          clientPhoto: user?.photoURL || currentUserProfile?.photoURL || '',
          clientPhone: currentUserProfile?.phone || '',
          type,
          timestamp: serverTimestamp()
        });
        if (type === 'view') setHasRecordedView(true);
      } catch (error) {
        console.error('Error recording interaction:', error);
      }
    };

    const fetchData = async () => {
      if (!uid) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile(userData);
          
          if (userData.role === 'professional') {
            const profDoc = await getDoc(doc(db, 'professionals', uid));
            if (profDoc.exists()) {
              setProfessional(profDoc.data());
              // Record view only for professionals
              recordInteraction('view');
            }
          }

          const reviewsQuery = query(collection(db, 'reviews'), where('professionalId', '==', uid));
          const reviewsSnap = await getDocs(reviewsQuery);
          setReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uid, user, currentUserProfile, hasRecordedView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, professional?.portfolio]);

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedPhotoIndex !== null && professional?.portfolio) {
      setSelectedPhotoIndex((selectedPhotoIndex + 1) % professional.portfolio.length);
    }
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedPhotoIndex !== null && professional?.portfolio) {
      setSelectedPhotoIndex((selectedPhotoIndex - 1 + professional.portfolio.length) % professional.portfolio.length);
    }
  };

  const handleContactClick = async () => {
    if (!uid || (user && user.uid === uid)) return;
    try {
      await addDoc(collection(db, 'profile_interactions'), {
        professionalId: uid,
        clientId: user?.uid || null,
        clientName: user?.displayName || currentUserProfile?.name || 'Visitante Anônimo',
        clientPhoto: user?.photoURL || currentUserProfile?.photoURL || '',
        clientPhone: currentUserProfile?.phone || '',
        type: 'contact',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error recording contact click:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile?.name} - Profissional no Pro Indica`,
        text: `Confira o perfil de ${profile?.name} no Pro Indica!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 3000);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uid) return;
    
    if (!currentUserProfile?.phoneVerified) {
      setReviewError('Você precisa verificar seu telefone antes de avaliar um profissional.');
      return;
    }

    if (!professional?.isPremium) {
      setReviewError('Somente profissionais Premium podem receber avaliações.');
      return;
    }

    if (!newReview.code) {
      setReviewError('O código de avaliação é obrigatório.');
      return;
    }

    setSubmitting(true);
    setReviewError(null);
    
    try {
      // Validate code
      const codeId = `${uid}_${newReview.code}`;
      const codeDoc = await getDoc(doc(db, 'review_codes', codeId));
      
      if (!codeDoc.exists() || codeDoc.data().status !== 'active') {
        setReviewError('Código de avaliação inválido ou já utilizado.');
        setSubmitting(false);
        return;
      }

      const reviewData = {
        professionalId: uid,
        clientId: user.uid,
        clientName: user.displayName || currentUserProfile?.name || 'Usuário',
        clientPhoto: user.photoURL || currentUserProfile?.photoURL || '',
        rating: newReview.rating,
        comment: newReview.comment,
        verificationCode: newReview.code,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'reviews'), reviewData);
      
      // Mark code as used
      await updateDoc(doc(db, 'review_codes', codeId), {
        status: 'used',
        usedAt: serverTimestamp(),
        usedBy: user.uid
      });
      
      // Update local reviews
      const updatedReviews = [reviewData, ...reviews];
      setReviews(updatedReviews);
      
      // Recalculate average rating
      const totalRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = Number((totalRating / updatedReviews.length).toFixed(1));
      
      // Update professional document
      await updateDoc(doc(db, 'professionals', uid), {
        rating: averageRating
      });
      
      // Update local professional state
      if (professional) {
        setProfessional({ ...professional, rating: averageRating });
      }

      setNewReview({ rating: 5, comment: '', code: '' });
      alert('Avaliação publicada com sucesso!');
    } catch (error) {
      console.error('Review error:', error);
      setReviewError('Erro ao publicar avaliação. Verifique o código e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!profile) return <div className="text-center py-20 text-slate-500">Usuário não encontrado.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <AnimatePresence>
        {showPaymentSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  {isSyncing ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Pagamento Realizado!</h3>
                  <p className="text-blue-100 text-sm font-medium">
                    {isSyncing 
                      ? "Estamos liberando seus recursos premium..." 
                      : "Parabéns! Sua conta já é Premium e todos os recursos foram liberados."}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentSuccess(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        initialRole="client"
      />
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-blue-600 transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Voltar
        </button>
        {user && user.uid === uid && (
          <Link 
            to="/profile/edit" 
            className="flex items-center px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Info */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm text-center">
            <div className="relative inline-block mb-8">
              <img src={profile.photoURL || DEFAULT_PROFESSIONAL_IMAGE} alt="" className="w-full h-auto aspect-square rounded-[3rem] object-cover border-8 border-white shadow-2xl" referrerPolicy="no-referrer" />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 whitespace-nowrap">
                {professional?.isPremium && <ProfessionalBadge type="premium" size="lg" />}
                {professional?.isVerified && <ProfessionalBadge type="verified" size="lg" />}
                {profile.phoneVerified && (
                  <div className="bg-white px-3 py-1 rounded-full shadow-lg border border-emerald-100 flex items-center gap-1.5" title="Telefone Verificado">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase">Verificado</span>
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-1 flex items-center justify-center gap-2">
              {profile.name}
              {professional?.rating >= 4.8 && <Award className="w-8 h-8 text-amber-500 fill-amber-100" />}
            </h1>
            <p className="text-blue-600 font-black uppercase text-xs tracking-widest mb-8">
              {profile.role === 'professional' ? professional?.categories?.join(' • ') : 'Cliente'}
            </p>
            
            {profile.role === 'professional' && (
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">{professional?.rating || '0.0'}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nota</p>
                </div>
                <div className="text-center border-x border-slate-200">
                  <p className="text-2xl font-black text-slate-900">{professional?.jobsCompleted || '0'}+</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Serviços</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">{reviews.length}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Indicações</p>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 gap-4">
              <div className="flex items-center justify-center text-slate-500 font-bold text-sm">
                <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                {professional?.city}, {professional?.state}
              </div>
              <div className="flex items-center justify-center text-emerald-600 font-black text-xs uppercase tracking-widest leading-none">
                <Zap className="w-5 h-5 mr-2" />
                Responde em média em 30 min
              </div>
              
              <button
                onClick={handleShare}
                className="mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors py-2"
              >
                {showShareSuccess ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    Link copiado!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Compartilhar Perfil
                  </>
                )}
              </button>
            </div>
          </div>

          {profile.role === 'professional' && (
            <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-900 shadow-xl">
              <h3 className="text-xl font-black mb-6 text-slate-900 flex items-center">
                <ThumbsUp className="w-6 h-6 mr-3 text-blue-600" />
                Contratar Agora
              </h3>
              
              <div className="space-y-4">
                <a 
                  href={`https://wa.me/${profile.phone?.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Vi seu perfil no Pro Indica e gostaria de solicitar um orçamento para ' + (professional?.categories?.[0] || 'seus serviços') + '.')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={handleContactClick}
                  className="group flex items-center justify-center w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 gap-3"
                >
                  <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  WHATSAPP DIRETO
                </a>

                {user ? (
                  <button 
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
                  >
                    SOLICITAR ORÇAMENTO
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full py-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all"
                  >
                    VER TELEFONE
                  </button>
                )}
              </div>
              
              <p className="mt-6 text-center text-xs text-slate-400 font-medium">
                Diga que viu no <span className="font-bold text-slate-600">Pro Indica</span> para garantir o melhor atendimento.
              </p>
            </div>
          )}
          
          {profile.role === 'professional' && (
            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="font-black mb-4 flex items-center relative z-10 text-lg">
                <UsersIcon className="w-6 h-6 mr-3" />
                Redes Sociais
              </h3>
              
              <div className="grid grid-cols-2 gap-3 relative z-10">
                {professional?.socialLinks?.instagram && (
                  <a href={`https://instagram.com/${professional.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                    <Instagram size={18} />
                    <span className="text-sm font-bold">Instagram</span>
                  </a>
                )}
                {professional?.socialLinks?.facebook && (
                  <a href={professional.socialLinks.facebook.startsWith('http') ? professional.socialLinks.facebook : `https://facebook.com/${professional.socialLinks.facebook}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                    <Facebook size={18} />
                    <span className="text-sm font-bold">Facebook</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-7 space-y-12">
          {profile.role === 'professional' ? (
            <>
              <section>
                <h2 className="text-3xl font-black text-slate-900 mb-6">Sobre o Profissional</h2>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">
                    {professional?.description || 'Nenhuma descrição detalhada fornecida.'}
                  </p>
                  <div className="grid grid-cols-2 gap-6 mt-8">
                    <div className="flex items-center text-slate-500">
                      <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                      <span className="font-medium">{professional?.city}</span>
                    </div>
                    <div className="flex items-center text-slate-500">
                      <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                      <span className="font-medium">{professional?.experience} de experiência</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-black text-slate-900 mb-6">Categorias e Especialidades</h2>
                <div className="flex flex-wrap gap-3">
                  {professional?.categories?.map((cat: string, index: number) => (
                    <span key={`${cat}-${index}`} className="px-6 py-3 bg-blue-50 text-blue-600 font-bold rounded-2xl border border-blue-100">
                      {cat}
                    </span>
                  ))}
                  {professional?.specialization && (
                    <span className="px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl border border-indigo-100">
                      {professional.specialization}
                    </span>
                  )}
                </div>
              </section>

              {professional?.portfolio && professional.portfolio.length > 0 && (
                <section>
                  <h2 className="text-3xl font-black text-slate-900 mb-6">Portfólio de Trabalhos</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {professional.portfolio.map((photo: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="aspect-square rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
                        onClick={() => setSelectedPhotoIndex(index)}
                      >
                        <img src={photo} alt={`Trabalho ${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-black text-slate-900">Avaliações</h2>
                  <div className="flex items-center bg-yellow-50 px-4 py-2 rounded-xl">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-2" />
                    <span className="text-xl font-black text-yellow-700">{professional?.rating}</span>
                  </div>
                </div>

                {user && user.uid !== uid && (
                  <div className="bg-slate-50 rounded-[2.5rem] p-8 mb-8 border border-slate-100">
                    <h3 className="font-black text-slate-900 mb-6">Deixe sua avaliação</h3>
                    
                    {!professional?.isPremium ? (
                      <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 font-medium flex items-center">
                        <Lock className="w-5 h-5 mr-3 shrink-0" />
                        Somente profissionais Premium podem receber avaliações.
                      </div>
                    ) : !currentUserProfile?.phoneVerified ? (
                      <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 font-medium">
                        <p className="mb-4">Você precisa verificar seu telefone antes de avaliar um profissional.</p>
                        <Link to="/profile/edit" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
                          Verificar Telefone
                        </Link>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-6">
                        {reviewError && (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center">
                            <ShieldAlert className="w-5 h-5 mr-2" />
                            {reviewError}
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Código de Avaliação</label>
                          <input
                            type="text"
                            placeholder="Ex: 8472"
                            maxLength={4}
                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono text-lg tracking-[0.5em] text-center"
                            value={newReview.code}
                            onChange={(e) => setNewReview({ ...newReview, code: e.target.value.replace(/\D/g, '') })}
                            required
                          />
                          <p className="mt-2 text-xs text-slate-400 font-medium">Solicite o código ao profissional após a realização do serviço.</p>
                        </div>

                        <div>
                          <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Sua Nota</label>
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewReview({ ...newReview, rating: star })}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Star className={`w-10 h-10 ${star <= newReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200'}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Seu Comentário</label>
                          <textarea
                            placeholder="Conte como foi sua experiência com este profissional..."
                            className="w-full p-6 bg-white border border-slate-200 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[150px]"
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center shadow-lg shadow-blue-600/20"
                        >
                          <Send className="w-5 h-5 mr-2" />
                          {submitting ? 'Enviando...' : 'Publicar Avaliação'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="space-y-6">
                  {reviews.length > 0 ? (
                    reviews.map((review, i) => (
                      <motion.div
                        key={review.id || i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-4">
                            <img src={review.clientPhoto || DEFAULT_USER_IMAGE} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                            <div>
                              <p className="font-black text-slate-900">{review.clientName}</p>
                              <p className="text-xs text-slate-400 font-bold uppercase">Cliente Verificado</p>
                            </div>
                          </div>
                          <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-lg">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                            <span className="text-sm font-bold text-yellow-700">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-slate-600 leading-relaxed italic">"{review.comment}"</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium italic">Nenhuma avaliação ainda. Seja o primeiro!</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section>
              <h2 className="text-3xl font-black text-slate-900 mb-6">Perfil do Cliente</h2>
              <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm text-center">
                <Briefcase className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Buscando Profissionais</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Este usuário é um cliente em busca dos melhores serviços da região.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhotoIndex !== null && professional?.portfolio && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-5xl w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute -top-12 right-0 md:-right-12 p-2 text-white hover:text-blue-400 transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {professional.portfolio.length > 1 && (
              <>
                <button 
                  onClick={handlePrevPhoto}
                  className="absolute left-0 md:-left-16 p-4 text-white hover:text-blue-400 transition-colors bg-black/20 hover:bg-black/40 rounded-full z-10"
                >
                  <ChevronLeft className="w-10 h-10" />
                </button>
                <button 
                  onClick={handleNextPhoto}
                  className="absolute right-0 md:-right-16 p-4 text-white hover:text-blue-400 transition-colors bg-black/20 hover:bg-black/40 rounded-full z-10"
                >
                  <ChevronRight className="w-10 h-10" />
                </button>
              </>
            )}

            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img 
                src={professional.portfolio[selectedPhotoIndex]} 
                alt="Visualização do Portfólio" 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="mt-6 text-white font-bold bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm">
                {selectedPhotoIndex + 1} / {professional.portfolio.length}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
