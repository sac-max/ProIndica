import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PROFESSIONAL_IMAGE } from '../constants';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import { User, LogOut, Menu, X, ShieldCheck, Eye, Crown } from 'lucide-react';
import { AuthModal } from './AuthModal';

export const Navbar: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialRole, setInitialRole] = useState<'client' | 'professional'>('client');
  const [initialIsLogin, setInitialIsLogin] = useState(true);
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        initialRole={initialRole}
        initialIsLogin={initialIsLogin}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative w-[52px] h-[52px] group-hover:scale-105 transition-transform">
              {/* Perfect Replica of Logo: Blue Frame, White Background, Blue Arrow, Blue Person with White Stroke */}
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
                {/* Outer Blue Frame with subtle gradient feel */}
                <rect x="8" y="8" width="84" height="84" rx="24" stroke="#2B82FB" strokeWidth="10" fill="white" />
                
                {/* Blue Arrow with sharp precision */}
                <path d="M50 20L22 48H36V80H64V48H78L50 20Z" fill="#2B82FB" />
                
                {/* Person Silhouette with sharp definition */}
                <circle cx="50" cy="64" r="10" fill="white" />
                <path d="M30 88C30 75 39 68 50 68C61 68 70 75 70 88" fill="white" />
                
                {/* Inland Person Icon */}
                <circle cx="50" cy="64" r="7.5" fill="#2B82FB" />
                <path d="M34 88C34 78 40 73 50 73C60 73 66 78 66 88" fill="#2B82FB" />
              </svg>
            </div>
            <div className="flex items-center text-[2rem] font-black tracking-tight">
              <span className="text-[#0A1633]">Pro</span>
              <span className="text-[#2B82FB] ml-1">Indica</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6 ml-auto">
            <Link to="/search" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">
              Explorar
            </Link>

            {user && profile?.role === 'professional' && (
              <Link to={`/profile/${user.uid}`} className="text-slate-600 hover:text-blue-600 font-medium transition-colors flex items-center">
                <Eye className="w-4 h-4 mr-1.5" />
                Ver minha página
              </Link>
            )}
            
            {!user && (
              <button
                onClick={() => {
                  setInitialRole('professional');
                  setInitialIsLogin(false);
                  setIsAuthModalOpen(true);
                }}
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
              >
                Quero ser um Parceiro
              </button>
            )}
            
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link to="/admin" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">
                    Admin
                  </Link>
                )}
                {profile?.role === 'professional' && (
                  <Link to="/premium" className="text-amber-600 hover:text-amber-700 font-bold transition-colors flex items-center">
                    <Crown className="w-4 h-4 mr-1.5" />
                    Premium
                  </Link>
                )}
                <Link to="/profile/edit" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">
                  Configurações
                </Link>
                {profile?.role === 'professional' && (
                  <Link to="/dashboard" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">
                    Dashboard
                  </Link>
                )}
                <Link to={`/profile/${user.uid}`} className="flex items-center space-x-2 p-1 pr-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-all">
                  <img src={user.photoURL || DEFAULT_PROFESSIONAL_IMAGE} alt="" className="w-8 h-8 rounded-full border border-white shadow-sm" referrerPolicy="no-referrer" />
                  <span className="text-sm font-semibold text-slate-700">{profile?.name?.split(' ')[0] || 'Usuário'}</span>
                </Link>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setInitialRole('client');
                  setInitialIsLogin(true);
                  setIsAuthModalOpen(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Entrar
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-600">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col space-y-2">
            <Link to="/search" className="p-3 text-slate-600 font-medium rounded-xl hover:bg-slate-50" onClick={() => setIsMenuOpen(false)}>
              Explorar Profissionais
            </Link>
            {!user && (
              <button
                onClick={() => {
                  setInitialRole('professional');
                  setInitialIsLogin(false);
                  setIsAuthModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="p-3 text-slate-600 font-medium rounded-xl hover:bg-slate-50 text-left"
              >
                Quero ser um Parceiro
              </button>
            )}
            {user ? (
              <>
                <Link to={`/profile/${user.uid}`} className="p-3 text-slate-600 font-medium rounded-xl hover:bg-slate-50 flex items-center" onClick={() => setIsMenuOpen(false)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver minha página
                </Link>
                <Link to="/premium" className="p-3 text-amber-600 font-bold rounded-xl hover:bg-amber-50 flex items-center" onClick={() => setIsMenuOpen(false)}>
                  <Crown className="w-4 h-4 mr-2" />
                  Seja Premium
                </Link>
                <Link to="/profile/edit" className="p-3 text-slate-600 font-medium rounded-xl hover:bg-slate-50" onClick={() => setIsMenuOpen(false)}>
                  Configurações
                </Link>
                {profile?.role === 'professional' && (
                  <Link to="/dashboard" className="p-3 text-slate-600 font-medium rounded-xl hover:bg-slate-50" onClick={() => setIsMenuOpen(false)}>
                    Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" className="p-3 text-slate-600 font-medium rounded-xl hover:bg-slate-50" onClick={() => setIsMenuOpen(false)}>
                    Painel Admin
                  </Link>
                )}
                <button onClick={logout} className="p-3 text-red-600 font-medium rounded-xl hover:bg-red-50 text-left">
                  Sair
                </button>
              </>
            ) : (
              <button onClick={() => { 
                setInitialRole('client'); 
                setInitialIsLogin(true);
                setIsAuthModalOpen(true); 
                setIsMenuOpen(false); 
              }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">
                Entrar / Cadastrar
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
