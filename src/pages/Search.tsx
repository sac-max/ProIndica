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
            {queryParam ? `Resultados para "${queryParam}"` : 'Explorar Profissionais'}
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

      {/* Parent Categories Grid - GetNinjas Style */}
      <div className="mb-12 relative">
        <h3 className="text-2xl font-black text-slate-900 mb-8 text-center md:text-left">O que você precisa hoje?</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <motion.button
            whileHover={{ y: -5 }}
            onClick={() => {
              updateFilters({ category: 'all' }, null);
            }}
            className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 h-full ${
              selectedParentId === null && filters.category === 'all'
                ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-600/20'
                : 'bg-white border-slate-100 hover:border-blue-200'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center ${
              selectedParentId === null && filters.category === 'all' ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400'
            }`}>
              <SearchIcon className="w-7 h-7" />
            </div>
            <span className={`text-xs font-black uppercase tracking-widest text-center ${
              selectedParentId === null && filters.category === 'all' ? 'text-white' : 'text-slate-600'
            }`}>Todos</span>
          </motion.button>

          {parentCategories.map((parent) => {
            const Icon = getParentIcon(parent.icon);
            const isActive = selectedParentId === parent.id;
            return (
              <motion.button
                key={parent.id}
                whileHover={{ y: -5 }}
                onClick={() => {
                  const isCurrentParent = selectedParentId === parent.id;
                  const newParentId = isCurrentParent ? null : parent.id;
                  
                  // If switching parent, reset subcategory
                  if (filters.category !== 'all' && categoryToParent[filters.category] !== newParentId) {
                    updateFilters({ category: 'all' }, newParentId);
                  } else {
                    updateFilters({}, newParentId);
                  }
                }}
                className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 h-full ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-600/20 text-white'
                    : 'bg-white border-slate-100 hover:border-blue-200 text-slate-600'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center ${
                  isActive ? 'bg-white/20' : 'bg-slate-50 text-slate-400'
                }`}>
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-center px-2 line-clamp-2">{parent.name}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Mega Menu / Subcategories Panel */}
        <AnimatePresence>
          {selectedParentId && selectedParentCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="overflow-hidden bg-white border border-slate-100 rounded-[3rem] shadow-2xl mb-12 shadow-blue-600/5"
            >
              <div className="p-10 md:p-14">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h4 className="text-3xl font-black text-slate-900 mb-2">
                      {parentCategories.find(p => p.id === selectedParentId)?.name}
                    </h4>
                    <p className="text-slate-500 font-medium">Escolha uma especialidade para refinar sua busca</p>
                  </div>
                  <button 
                    onClick={() => setSelectedParentId(null)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-12">
                  {selectedParentId && CATEGORY_GROUPS[selectedParentId] ? (
                    <>
                      {Object.entries(CATEGORY_GROUPS[selectedParentId]).map(([groupName, groupCategories]) => (
                        <div key={groupName}>
                          <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center">
                            <span className="w-8 h-[2px] bg-blue-600 mr-3"></span>
                            {groupName}
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-1">
                            {groupCategories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => updateFilters({ category: cat })}
                                className={`text-left py-2 px-4 rounded-xl font-bold transition-all flex items-center justify-between group ${
                                  filters.category === cat 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                    : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                              >
                                <span className="text-sm">{cat}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform duration-300 -rotate-90 ${
                                  filters.category === cat ? 'text-white' : 'text-slate-200 group-hover:text-blue-300'
                                }`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {/* Show dynamic categories not in predefined groups */}
                      {(() => {
                        const groupDefined = Object.values(CATEGORY_GROUPS[selectedParentId]).flat();
                        const additional = selectedParentCategories.filter(c => !groupDefined.includes(c));
                        if (additional.length === 0) return null;
                        return (
                          <div>
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center">
                              <span className="w-8 h-[2px] bg-slate-200 mr-3"></span>
                              Outros
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-1">
                              {additional.sort().map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() => updateFilters({ category: cat })}
                                  className={`text-left py-2 px-4 rounded-xl font-bold transition-all flex items-center justify-between group ${
                                    filters.category === cat 
                                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                      : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                  }`}
                                >
                                  <span className="text-sm">{cat}</span>
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 -rotate-90 ${
                                    filters.category === cat ? 'text-white' : 'text-slate-200 group-hover:text-blue-300'
                                  }`} />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-2">
                      {[...selectedParentCategories].sort().map((cat) => (
                        <button
                          key={cat}
                          onClick={() => updateFilters({ category: cat })}
                          className={`text-left py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-between group ${
                            filters.category === cat 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                              : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                        >
                          <span className="text-sm">{cat}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 -rotate-90 ${
                            filters.category === cat ? 'text-white' : 'text-slate-200 group-hover:text-blue-300'
                          }`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-slate-50 h-80 rounded-[2.5rem] animate-pulse border border-slate-100"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AnimatePresence mode="popLayout">
                {sortedProfessionals.length > 0 ? (
                  sortedProfessionals.map((prof, i) => (
                    <motion.div
                      key={prof.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-500"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={prof.coverURL || DEFAULT_COVER_IMAGE} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" 
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
                          {prof.rating >= 4.9 && (prof.jobsCompleted || 0) > 20 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-600 text-[10px] font-black rounded-full shadow-sm border border-blue-100 ring-1 ring-blue-500/10">
                              <ThumbsUp className="w-3 h-3" />
                              MAIS RECOMENDADO
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-6 pt-10">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
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
                            <span className="text-[10px] text-slate-400 font-bold mt-1">12 indicações</span>
                          </div>
                        </div>
                        
                        <p className="text-slate-500 text-sm line-clamp-2 mb-6 font-medium leading-relaxed">
                          {prof.description || 'Profissional qualificado pronto para atender suas necessidades com qualidade e confiança.'}
                        </p>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                          <div className="flex flex-col">
                            <div className="flex items-center text-slate-400 text-xs font-bold mb-1">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-blue-500" />
                              {prof.city}, {prof.state?.substring(0, 2)}
                            </div>
                            <div className="flex items-center text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {prof.jobsCompleted || 0}+ serviços
                            </div>
                            <div className="flex items-center text-amber-600 text-[10px] font-black uppercase tracking-wider mt-0.5">
                              <Zap className="w-3.5 h-3.5 mr-1" />
                              Responde rápido
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewProfile(prof.uid || prof.id)}
                            className="px-6 py-3 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-600/20"
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
