import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEFAULT_PROFESSIONAL_IMAGE, DEFAULT_COVER_IMAGE } from '../constants';
import { db, collection, getDocs, query, where, limit, orderBy } from '../firebase';
import { 
  Search, Star, MapPin, CheckCircle, ArrowRight, ShieldCheck, Users, Briefcase,
  Hammer, Home as HomeIcon, Smartphone, Code, Music, Sparkles, Book, Car, Plus,
  CheckCircle2, Award
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { PARENT_CATEGORIES } from '../constants';
import { ProfessionalBadge } from '../components/ProfessionalBadge';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredProfessionals, setFeaturedProfessionals] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [initialRole, setInitialRole] = useState<'client' | 'professional'>('client');

  useEffect(() => {
    const fetchFeatured = async () => {
      // Fetch Premium for Hero/Featured
      const q = query(collection(db, 'professionals'), where('isPremium', '==', true), limit(3));
      const snap = await getDocs(q);
      setFeaturedProfessionals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Top Rated for Regional Ranking
      const qTop = query(collection(db, 'professionals'), orderBy('rating', 'desc'), limit(4));
      const snapTop = await getDocs(qTop);
      setTopRated(snapTop.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchFeatured();
  }, []);

  const handleViewProfile = (profId: string) => {
    if (!user) {
      setInitialRole('client');
      setPendingProfileId(profId);
      setIsAuthModalOpen(true);
    } else {
      navigate(`/profile/${profId}`);
    }
  };

  const handleAuthSuccess = () => {
    if (pendingProfileId) {
      navigate(`/profile/${pendingProfileId}`);
      setPendingProfileId(null);
    }
  };

  const getParentIcon = (iconName: string | undefined) => {
    switch(iconName) {
      case 'Hammer': return Hammer;
      case 'Home': return HomeIcon;
      case 'Smartphone': return Smartphone;
      case 'Code': return Code;
      case 'Briefcase': return Briefcase;
      case 'Activity': return CheckCircle; // Fallback to check
      case 'Book': return Book;
      case 'Car': return Car;
      case 'Music': return Music;
      case 'Sparkles': return Sparkles;
      default: return Plus;
    }
  };

  return (
    <div className="space-y-20 pb-20">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        message="Se cadastre e tenha acesso total à nossa ferramenta"
        initialRole={initialRole}
      />
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[url('https://firebasestorage.googleapis.com/v0/b/antigravity-build.appspot.com/o/user_uploads%2FIMG_20240403_185804.jpg?alt=media')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-900"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 border border-blue-500/30">
              A maior rede de profissionais verificados do Brasil
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Encontre o profissional <br className="hidden md:block" />
              <span className="text-blue-500">perfeito</span> para você.
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              O Pro Indica conecta você aos melhores prestadores de serviço com <span className="text-white border-b-2 border-blue-600">indicação real</span> e reputação garantida.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/search"
                className="group w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/40 flex items-center justify-center"
              >
                Buscar Profissional
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
              <button
                onClick={() => {
                  if (!user) {
                    setInitialRole('professional');
                    setIsAuthModalOpen(true);
                  } else {
                    navigate('/become-professional');
                  }
                }}
                className="w-full sm:w-auto px-10 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-md"
              >
                Sou Profissional
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Users, label: 'Usuários Ativos', value: '50k+', color: 'text-blue-600' },
            { icon: Briefcase, label: 'Profissionais', value: '12k+', color: 'text-indigo-600' },
            { icon: ShieldCheck, label: 'Serviços Realizados', value: '100k+', color: 'text-emerald-600' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-6"
            >
              <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                <p className="text-slate-500 font-medium">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories Grid - GetNinjas Style */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4">O que você está procurando?</h2>
          <p className="text-slate-500 text-lg">Escolha uma categoria e encontre os melhores profissionais</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {PARENT_CATEGORIES.map((parent) => {
            const Icon = getParentIcon(parent.icon);
            return (
              <motion.button
                key={parent.id}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => navigate(`/search?parentId=${parent.id}`)}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-600/10 transition-all group flex flex-col items-center text-center h-full"
              >
                <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                  <Icon className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-slate-900">{parent.name}</h3>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Featured Professionals */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Profissionais Recomendados</h2>
            <p className="text-slate-500 text-lg font-medium">Os mais bem avaliados e confiáveis da rede Pro Indica</p>
          </div>
          <Link to="/search" className="inline-flex items-center px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all">
            Ver todos <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredProfessionals.map((prof, i) => (
            <motion.div
              key={prof.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={prof.coverURL || DEFAULT_COVER_IMAGE} 
                  alt="Cover" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                
                {/* Profile Photo Overlay */}
                <div className="absolute -bottom-6 left-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white">
                    <img 
                      src={prof.photoURL || DEFAULT_PROFESSIONAL_IMAGE} 
                      alt={prof.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
                  {prof.isPremium && <ProfessionalBadge type="premium" size="sm" />}
                  {prof.isVerified && <ProfessionalBadge type="verified" size="sm" />}
                </div>
              </div>
              <div className="p-6 pt-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      {prof.name}
                      {prof.rating >= 4.8 && <Award className="w-5 h-5 text-amber-500" />}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {prof.categories?.slice(0, 2).map((cat: string, catIdx: number) => (
                        <span key={`${prof.id}-cat-${catIdx}`} className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-black rounded-md uppercase tracking-wider border border-slate-100">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mr-1" />
                      <span className="text-sm font-black text-amber-700">{prof.rating}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold mt-1">12 avaliações</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center text-slate-500 text-xs font-bold">
                    <MapPin className="w-4 h-4 mr-1 text-blue-500" />
                    {prof.city}, {prof.state?.substring(0, 2)}
                  </div>
                  <div className="flex items-center text-emerald-600 text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {prof.jobsCompleted || 10}+ serviços
                  </div>
                </div>

                <button
                  onClick={() => handleViewProfile(prof.uid)}
                  className="mt-6 block w-full py-3 bg-slate-900 text-white text-center rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-600/20"
                >
                  Ver Perfil Completo
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Regional Ranking - Differentiation */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Melhores da sua Região</h2>
              <p className="text-slate-500 font-medium">Profissionais indicados em destaque no seu estado</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topRated.length > 0 ? (
              topRated.map((item, i) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -5 }}
                  onClick={() => handleViewProfile(item.id)}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 bg-blue-600/5 rounded-bl-3xl flex items-center justify-center font-black text-blue-600 text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                    #{i + 1}
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    <img src={item.photoURL || `https://picsum.photos/seed/${item.name}/100/100`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm truncate max-w-[120px]">{item.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">
                      {item.categories?.[0] || 'Profissional'} • {item.city}
                    </p>
                    <div className="flex items-center mt-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />
                      <span className="text-xs font-black text-slate-700">{item.rating}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse"></div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          
          <h2 className="text-4xl md:text-5xl font-black mb-6 relative z-10">Pronto para começar?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto relative z-10">
            Seja você um cliente buscando qualidade ou um profissional querendo crescer, o Pro Indica é o seu lugar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link to="/search" className="w-full sm:w-auto px-10 py-4 bg-white text-blue-600 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-xl">
              Encontrar Profissional
            </Link>
            <button
              onClick={() => {
                if (!user) {
                  setInitialRole('professional');
                  setIsAuthModalOpen(true);
                } else {
                  navigate('/become-professional');
                }
              }}
              className="w-full sm:w-auto px-10 py-4 bg-blue-700 text-white rounded-2xl font-black text-lg hover:bg-blue-800 transition-colors"
            >
              Cadastrar meus Serviços
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
