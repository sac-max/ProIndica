import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';
import { ProfileEdit } from './pages/ProfileEdit';
import { Dashboard } from './pages/Dashboard';
import { BecomeProfessional } from './pages/BecomeProfessional';
import { Premium } from './pages/Premium';
import { Admin } from './pages/Admin';
import { HowItWorks } from './pages/HowItWorks';
import { HelpCenter } from './pages/HelpCenter';
import { TermsOfUse } from './pages/TermsOfUse';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { AuthProvider } from './context/AuthContext';
import { seedData } from './lib/seed';
import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MessageCircle } from 'lucide-react';
import { db, collection, addDoc, serverTimestamp, increment, doc, setDoc } from './firebase';

export default function App() {
  useEffect(() => {
    seedData();
    
    // Track global access
    const trackAccess = async () => {
      try {
        const statsRef = doc(db, 'stats', 'global');
        await setDoc(statsRef, {
          totalAccesses: increment(1),
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error tracking access:', error);
      }
    };
    
    trackAccess();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-slate-50 relative">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/profile/:uid" element={<Profile />} />
                <Route path="/profile/edit" element={<ProfileEdit />} />
                <Route path="/become-professional" element={<BecomeProfessional />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/help-center" element={<HelpCenter />} />
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
              </Routes>
            </main>

            {/* Floating Support Button */}
            <a 
              href="https://wa.me/5515997777362?text=Olá! Preciso de suporte com o Pro Indica."
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-8 right-8 z-50 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group"
              title="Falar com Suporte"
            >
              <MessageCircle className="w-8 h-8" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap">
                Suporte
              </span>
            </a>

            <footer className="bg-slate-900 text-white py-20">
              <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-[52px] h-[52px]">
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
                      <span className="text-white">Pro</span>
                      <span className="text-[#2B82FB] ml-1">Indica</span>
                    </div>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Conectando você aos melhores profissionais da sua região com segurança e confiança.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-6 uppercase tracking-widest text-sm text-slate-500">Plataforma</h4>
                  <ul className="space-y-4 text-slate-400">
                    <li><Link to="/search" className="hover:text-blue-400 transition-colors">Buscar Profissionais</Link></li>
                    <li><Link to="/become-professional" className="hover:text-blue-400 transition-colors">Seja um Parceiro</Link></li>
                    <li><Link to="/how-it-works" className="hover:text-blue-400 transition-colors">Como Funciona</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-6 uppercase tracking-widest text-sm text-slate-500">Suporte</h4>
                  <ul className="space-y-4 text-slate-400">
                    <li><Link to="/help-center" className="hover:text-blue-400 transition-colors">Central de Ajuda</Link></li>
                    <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Termos de Uso</Link></li>
                    <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacidade</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-6 uppercase tracking-widest text-sm text-slate-500">Newsletter</h4>
                  <p className="text-slate-400 text-sm mb-4">Receba dicas e novidades no seu e-mail.</p>
                  <div className="flex gap-2">
                    <input type="email" placeholder="Seu e-mail" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
                    <button className="bg-blue-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">OK</button>
                  </div>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-4 mt-20 pt-8 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; 2026 Pro Indica. Todos os direitos reservados.</p>
              </div>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
