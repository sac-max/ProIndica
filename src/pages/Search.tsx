import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { db, collection, getDocs } from '../firebase';
import { 
  Search as SearchIcon, Star, MapPin, Filter, X, ChevronDown, Crown, ShieldCheck, ShieldAlert,
  Hammer, Home, Smartphone, Code, Briefcase, Activity, Book, Car, Plus, Music, Sparkles,
  CheckCircle2, Award, Zap, ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Professional } from '../types';
import { DEFAULT_PROFESSIONAL_IMAGE, DEFAULT_COVER_IMAGE, BRAZILIAN_STATES, CATEGORY_GROUPS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { AuthModal } from '../components/AuthModal';
import { ProfessionalBadge } from '../components/ProfessionalBadge';

export const Search: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories: dynamicCategories, specsMap: dynamicSpecsMap, parentCategories, categoryToParent } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  // Parent Category selection
  const [selectedParentId, setSelectedParentId] = useState<string | null>(searchParams.get('parentId'));

  useEffect(() => {
    const pId = searchParams.get('parentId');
    if (pId !== selectedParentId) {
      setSelectedParentId(pId);
    }
  }, [searchParams]);

  // Filter states
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    state: searchParams.get('state') || '',
    city: searchParams.get('city') || '',
    skill: searchParams.get('skill') || '',
    maxPrice: Number(searchParams.get('maxPrice')) || 1000,
    minRating: Number(searchParams.get('minRating')) || 0,
  });

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'professionals'));
        let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Professional));
        
        // Apply search query
        if (queryParam) {
          const lowerQuery = queryParam.toLowerCase();
          results = results.filter(p => 
            p.name?.toLowerCase().includes(lowerQuery) || 
            p.categories?.some((c: string) => c.toLowerCase().includes(lowerQuery)) ||
            p.description?.toLowerCase().includes(lowerQuery) ||
            p.skills?.some((s: string) => s.toLowerCase().includes(lowerQuery))
          );
        }

        // Apply filters
        if (filters.category !== 'all') {
          results = results.filter(p => p.categories?.includes(filters.category));
        } else if (selectedParentId) {
          // Filter by any category belonging to this parent
          results = results.filter(p => 
            p.categories?.some(cat => categoryToParent[cat] === selectedParentId)
          );
        }
        if (filters.state) {
          results = results.filter(p => p.state === filters.state);
        }
        if (filters.city) {
          results = results.filter(p => p.city?.toLowerCase().includes(filters.city.toLowerCase()));
        }
        if (filters.skill) {
          results = results.filter(p => p.skills?.some(s => s.toLowerCase().includes(filters.skill.toLowerCase())));
        }
        if (filters.maxPrice < 1000) {
          results = results.filter(p => (p.averagePrice || 0) <= filters.maxPrice);
        }
        if (filters.minRating > 0) {
          results = results.filter(p => p.rating >= filters.minRating);
        }

        // Prioritize Premium Professionals and sort
        results.sort((a, b) => {
          // Both are premium or both are not
          if (a.isPremium === b.isPremium) {
            // Then sort by rating
            return (b.rating || 0) - (a.rating || 0);
          }
          // Premium comes first
          return a.isPremium ? -1 : 1;
        });

        setProfessionals(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfessionals();
  }, [queryParam, filters]);

  const updateFilters = (newFilters: Partial<typeof filters>, newParentId?: string | null) => {
    let updated = { ...filters, ...newFilters };
    
    // Reset skill if category changes to something that has specific specializations
    if (newFilters.category && newFilters.category !== filters.category) {
      updated.skill = '';
    }

    setFilters(updated);
    if (newParentId !== undefined) {
      setSelectedParentId(newParentId);
    }
    
    // Update URL params
    const params: any = {};
    if (queryParam) params.q = queryParam;
    
    // Determine the parent ID to use
    const finalParentId = newParentId !== undefined ? newParentId : selectedParentId;
    if (finalParentId) params.parentId = finalParentId;
    
    if (updated.category !== 'all') params.category = updated.category;
    if (updated.state) params.state = updated.state;
    if (updated.city) params.city = updated.city;
    if (updated.skill) params.skill = updated.skill;
    if (updated.maxPrice < 1000) params.maxPrice = updated.maxPrice.toString();
    if (updated.minRating > 0) params.minRating = updated.minRating.toString();
    setSearchParams(params);
  };

  const clearFilters = () => {
    const cleared = { category: 'all', state: '', city: '', skill: '', maxPrice: 1000, minRating: 0 };
    setFilters(cleared);
    setSelectedParentId(null);
    setSearchParams(queryParam ? { q: queryParam } : {});
  };

  const getParentIcon = (iconName: string | undefined) => {
    switch(iconName) {
      case 'Hammer': return Hammer;
      case 'Home': return Home;
      case 'Smartphone': return Smartphone;
      case 'Code': return Code;
      case 'Briefcase': return Briefcase;
      case 'Activity': return Activity;
      case 'Book': return Book;
      case 'Car': return Car;
      case 'Music': return Music;
      case 'Sparkles': return Sparkles;
      default: return Plus;
    }
  };

  const selectedParentCategories = dynamicCategories.filter(cat => categoryToParent[cat] === selectedParentId);

  const handleViewProfile = (profId: string) => {
    if (!user) {
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

  const sortedProfessionals = [...professionals].sort((a, b) => {
    // Calculated score for ranking: base rating * (log of jobs + constant)
    // This rewards professionals who have high rating AND high volume
    const scoreA = (a.rating || 0) * (Math.log10((a.jobsCompleted || 0) + 10));
    const scoreB = (b.rating || 0) * (Math.log10((b.jobsCompleted || 0) + 10));

    // 1. Premium first (it's the top tier differentiator)
    if (a.isPremium && !b.isPremium) return -1;
    if (!a.isPremium && b.isPremium) return 1;
    
    // 2. Verified second
    if (a.isVerified && !b.isVerified) return -1;
    if (!a.isVerified && b.isVerified) return 1;

    // 3. Score-based ranking (Rating + Experience)
    if (Math.abs(scoreB - scoreA) > 0.01) {
      return scoreB - scoreA;
    }

    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        message="Se cadastre e tenha acesso total à nossa ferramenta"
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            {queryParam ? `Resultados para "${queryParam}"` : 'Encontrar Profissionais'}
          </h1>
          <p className="text-slate-500 font-medium">Encontramos {professionals.length} profissionais qualificados</p>
        </div>
        
        <button 
          onClick={() => setShowMobileFilters(true)}
          className="md:hidden flex items-center justify-center space-x-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 shadow-sm"
        >
          <Filter className="w-5 h-5" />
          <span>Filtros</span>
          {(filters.state || filters.city || filters.skill || filters.category !== 'all' || filters.maxPrice < 1000 || filters.minRating > 0) && (
            <span className="w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">!</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Filter Box - Horizontal at the top */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 flex items-center">
              <Filter className="w-6 h-6 mr-3 text-blue-600" />
              Filtros de Busca
            </h3>
            <button onClick={clearFilters} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center">
              <X className="w-4 h-4 mr-1" />
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={filters.category}
                onChange={(e) => updateFilters({ category: e.target.value })}
              >
                <option value="all">Todas as categorias</option>
                {dynamicCategories
                  .filter(cat => !selectedParentId || categoryToParent[cat] === selectedParentId)
                  .map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Especialização</label>
              <div className="relative">
                {filters.category !== 'all' && dynamicSpecsMap[filters.category] ? (
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={filters.skill}
                    onChange={(e) => updateFilters({ skill: e.target.value })}
                  >
                    <option value="">Todas as especializações</option>
                    {dynamicSpecsMap[filters.category].map((spec: string) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input 
                      type="text" 
                      placeholder="Ex: Ar condicionado"
                      className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={filters.skill}
                      onChange={(e) => updateFilters({ skill: e.target.value })}
                    />
                    <SearchIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={filters.state}
                onChange={(e) => updateFilters({ state: e.target.value })}
              >
                <option value="">Todos os Estados</option>
                {BRAZILIAN_STATES.map(state => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Cidade</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={filters.city}
                onChange={(e) => updateFilters({ city: e.target.value })}
              >
                <option value="">Todas as Cidades</option>
                {Array.from(new Set(professionals.map(p => p.city))).filter(Boolean).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-8 pt-8 border-t border-slate-50 items-end">
            <div className="md:col-span-1">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-slate-700">Preço Máximo</label>
                <span className="text-blue-600 font-black">R$ {filters.maxPrice}{filters.maxPrice === 1000 ? '+' : ''}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                step="50"
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={filters.maxPrice}
                onChange={(e) => updateFilters({ maxPrice: Number(e.target.value) })}
              />
              <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                <span>R$ 0</span>
                <span>R$ 1000+</span>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-4">Avaliação Mínima</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => updateFilters({ minRating: star })}
                    className="focus:outline-none group"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        filters.minRating >= star 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-slate-200 group-hover:text-yellow-200'
                      } transition-all duration-200 transform group-hover:scale-110`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-1">
              <button 
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center"
              >
                <SearchIcon className="w-5 h-5 mr-2" />
                Buscar Agora
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-slate-50 h-72 rounded-[2rem] animate-pulse border border-slate-100"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {sortedProfessionals.length > 0 ? (
                  sortedProfessionals.map((prof, i) => (
                    <motion.div
                      key={prof.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-500 flex flex-col"
                    >
                      <div className="relative h-32 overflow-hidden">
                        <img 
                          src={prof.coverURL || DEFAULT_COVER_IMAGE} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                        
                        {/* Profile Photo Overlay */}
                        <div className="absolute -bottom-4 left-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white">
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
                          {prof.rating >= 4.9 && (prof.jobsCompleted || 0) > 20 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-600 text-[10px] font-black rounded-full shadow-sm border border-blue-100 ring-1 ring-blue-500/10">
                              <ThumbsUp className="w-3 h-3" />
                              MAIS RECOMENDADO
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 pt-8 flex-grow flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0">
                            <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 truncate">
                              {prof.name}
                              {prof.rating >= 4.8 && <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                            </h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {prof.categories?.slice(0, 1).map((cat: string, catIdx: number) => (
                                <span key={`${prof.id}-cat-${catIdx}`} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-wider border border-slate-100 truncate max-w-[100px]">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0">
                            <div className="flex items-center bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-100">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-0.5" />
                              <span className="text-xs font-black text-amber-700">{prof.rating}</span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-slate-500 text-[11px] line-clamp-2 mb-4 font-medium leading-relaxed flex-grow">
                          {prof.description || 'Profissional qualificado pronto para atender suas necessidades com qualidade e confiança.'}
                        </p>

                        <div className="flex flex-col gap-3 pt-4 border-t border-slate-50 mt-auto">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                            <div className="flex items-center text-slate-400 text-[10px] font-bold">
                              <MapPin className="w-3 h-3 mr-1 text-blue-500" />
                              {prof.city}, {prof.state?.substring(0, 2)}
                            </div>
                            <div className="flex items-center text-emerald-600 text-[9px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {prof.jobsCompleted || 0}+ serviços
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewProfile(prof.uid || prof.id)}
                            className="w-full py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-blue-600/20 uppercase tracking-widest"
                          >
                            VER PERFIL
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="bg-slate-50 rounded-[3rem] p-12 max-w-md mx-auto border border-slate-100">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-sm">
                        <SearchIcon className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">Nenhum resultado</h3>
                      <p className="text-slate-500 font-medium">Tente ajustar seus filtros para encontrar o que procura.</p>
                      <button onClick={clearFilters} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-colors shadow-xl shadow-blue-600/20">
                        Limpar todos os filtros
                      </button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <AnimatePresence>
        {showMobileFilters && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-h-[90vh] rounded-t-[3rem] p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900">Filtros</h3>
                <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="space-y-6 pb-10">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:outline-none"
                    value={filters.category}
                    onChange={(e) => updateFilters({ category: e.target.value })}
                  >
                    <option value="all">Todas as categorias</option>
                    {dynamicCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Especialização</label>
                  {filters.category !== 'all' && dynamicSpecsMap[filters.category] ? (
                    <select 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:outline-none"
                      value={filters.skill}
                      onChange={(e) => updateFilters({ skill: e.target.value })}
                    >
                      <option value="">Todas as especializações</option>
                      {dynamicSpecsMap[filters.category].map((spec: string) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Todas as especializações"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:outline-none"
                      value={filters.skill}
                      onChange={(e) => updateFilters({ skill: e.target.value })}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:outline-none"
                    value={filters.state}
                    onChange={(e) => updateFilters({ state: e.target.value })}
                  >
                    <option value="">Todos os Estados</option>
                    {BRAZILIAN_STATES.map(state => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cidade</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:outline-none"
                    value={filters.city}
                    onChange={(e) => updateFilters({ city: e.target.value })}
                  >
                    <option value="">Todas as Cidades</option>
                    {Array.from(new Set(professionals.map(p => p.city))).filter(Boolean).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Preço Máximo</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="1000" 
                    step="50"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilters({ maxPrice: Number(e.target.value) })}
                  />
                  <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                    <span>R$ 0</span>
                    <span className="text-blue-600">R$ {filters.maxPrice}{filters.maxPrice === 1000 ? '+' : ''}</span>
                    <span>R$ 1000+</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Avaliação Mínima</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => updateFilters({ minRating: star })}
                        className="focus:outline-none"
                      >
                        <Star 
                          className={`w-8 h-8 ${
                            filters.minRating >= star 
                              ? 'text-yellow-400 fill-yellow-400' 
                              : 'text-slate-200'
                          } transition-colors`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                  <button 
                    onClick={() => setShowMobileFilters(false)}
                    className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-600/20"
                  >
                    Buscar
                  </button>
                  <button 
                    onClick={() => { clearFilters(); setShowMobileFilters(false); }}
                    className="w-full py-4 text-slate-400 font-bold"
                  >
                    Limpar tudo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
