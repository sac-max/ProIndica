import React, { useEffect, useState } from 'react';
import { db, collection, getDocs, deleteDoc, doc, updateDoc, writeBatch, serverTimestamp, setDoc } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Users, Briefcase, Trash2, Star, CheckCircle, XCircle, Search, AlertTriangle, Image as ImageIcon, Database, Upload, FileText, Download, TrendingUp, DollarSign, MousePointer2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { updateAllProfessionalPhotos } from '../services/bulkUpdate';
import { DEFAULT_PROFESSIONAL_IMAGE, DEFAULT_USER_IMAGE, COMMON_CATEGORIES, CATEGORY_SPECIALIZATIONS, PARENT_CATEGORIES, CATEGORY_TO_PARENT } from '../constants';

export const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkUpdate, setConfirmBulkUpdate] = useState(false);
  const [activeView, setActiveView] = useState<'professionals' | 'users' | 'bulk-import' | 'dashboard' | 'categories'>('dashboard');
  const [updatingPhotos, setUpdatingPhotos] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('outros');
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newSpecName, setNewSpecName] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [resettingRatings, setResettingRatings] = useState(false);
  const [selectedBulkPhoto, setSelectedBulkPhoto] = useState<string>(DEFAULT_PROFESSIONAL_IMAGE);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleResetRatings = async () => {
    if (!confirm('Deseja realmente zerar as avaliações fake? Isso recalculará o rating de todos os profissionais com base em avaliações reais.')) return;
    
    setResettingRatings(true);
    let updatedCount = 0;
    let errorCount = 0;
    try {
      const profSnap = await getDocs(collection(db, 'professionals'));
      const reviewSnap = await getDocs(collection(db, 'reviews'));
      
      const allReviews = reviewSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Found ${profSnap.size} professionals and ${reviewSnap.size} reviews.`);
      
      const batch = writeBatch(db);
      const results: any[] = [];

      for (const profDoc of profSnap.docs) {
        const profId = profDoc.id;
        const profData = profDoc.data();
        
        // Filter reviews for this professional
        const profReviews = allReviews.filter((r: any) => r.professionalId === profId);
        
        let newRating = 0.0;
        if (profReviews.length > 0) {
          const total = profReviews.reduce((acc, r: any) => acc + Number(r.rating || 0), 0);
          newRating = Number((total / profReviews.length).toFixed(1));
        }
        
        // Check if rating actually needs update to save on writes
        if (profData.rating !== newRating) {
          // Ensure required fields for firestore rules validation are present
          // If they are missing in the doc, we should probably include them if we can
          // but updateDoc only sends the changed fields. 
          // Firestore rules 'request.resource.data' is the result of merging.
          // If the existing doc is missing 'categories', the update will fail.
          
          const updateData: any = { rating: newRating };
          
          // Safety check: if the doc is missing required fields, add them from the doc itself
          // to ensure the merged result passes validation
          if (!profData.uid) updateData.uid = profId;
          if (!profData.name) updateData.name = profData.name || 'Profissional';
          if (!profData.email) updateData.email = profData.email || '';
          if (!profData.categories) updateData.categories = profData.categories || ['Geral'];

          batch.update(doc(db, 'professionals', profId), updateData);
          updatedCount++;
        }
        results.push({ id: profId, rating: newRating });
      }
      
      if (updatedCount > 0) {
        await batch.commit();
      }
      
      // Update local state
      setProfessionals(prev => prev.map(p => {
        const result = results.find(r => r.id === p.id);
        return result ? { ...p, rating: result.rating } : p;
      }));
      
      alert(`Avaliações recalculadas com sucesso! ${updatedCount} profissionais atualizados.`);
    } catch (error) {
      console.error('Error resetting ratings:', error);
      alert('Erro ao recalcular avaliações. Verifique o console para mais detalhes.');
    } finally {
      setResettingRatings(false);
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

  const handlePhotoSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessingPhoto(true);
      try {
        const compressed = await compressImage(file);
        setSelectedBulkPhoto(compressed);
      } catch (err) {
        console.error('Error compressing photo:', err);
        alert('Erro ao processar a imagem.');
      } finally {
        setProcessingPhoto(false);
      }
    }
  };

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const profSnap = await getDocs(collection(db, 'professionals'));
      const userSnap = await getDocs(collection(db, 'users'));
      const statsSnap = await getDocs(collection(db, 'stats'));
      const paymentSnap = await getDocs(collection(db, 'payments'));
      
      setProfessionals(profSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPayments(paymentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const catSnap = await getDocs(collection(db, 'categories'));
      const firestoreCats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Automatic synchronization of missing default categories
      const missingDefaults = COMMON_CATEGORIES.filter(catName => 
        catName !== 'Outros' && !firestoreCats.find(c => (c as any).name === catName)
      );
      
      // Also check for 'Outros'
      const hasOutros = firestoreCats.find(c => (c as any).name === 'Outros');
      if (!hasOutros) missingDefaults.push('Outros');

      if (missingDefaults.length > 0) {
        try {
          const batch = writeBatch(db);
          missingDefaults.forEach(catName => {
            const catRef = doc(db, 'categories', catName);
            batch.set(catRef, {
              name: catName,
              parentId: CATEGORY_TO_PARENT[catName] || 'outros',
              specializations: catName === 'Outros' ? ['Geral'] : (CATEGORY_SPECIALIZATIONS[catName] || []),
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
          
          // Re-fetch everything to ensure we have IDs and full data
          const newCatSnap = await getDocs(collection(db, 'categories'));
          const syncedCats = newCatSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          setCategoriesList(syncedCats);
        } catch (error) {
          console.error('Error auto-syncing missing categories:', error);
          // Fallback to merge display if sync fails
          const merged = [...firestoreCats];
          setCategoriesList(merged.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));
        }
      } else {
        const sortedCats = firestoreCats.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setCategoriesList(sortedCats);
      }
      
      const globalStats = statsSnap.docs.find(d => d.id === 'global')?.data();
      setStats(globalStats || { totalAccesses: 0 });
    } catch (error) {
      console.error('Admin fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const handleSyncPayments = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-payments');
      const data = await response.json();
      if (data.success) {
        alert(`${data.syncedCount} novos pagamentos sincronizados com sucesso!`);
        await fetchData();
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      alert(`Erro ao sincronizar: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const collectionName = activeView === 'professionals' ? 'professionals' : 'users';
      await deleteDoc(doc(db, collectionName, id));
      if (activeView === 'professionals') {
        setProfessionals(professionals.filter(p => p.id !== id));
      } else {
        setUsers(users.filter(u => u.id !== id));
      }
      setConfirmDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const togglePremium = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'professionals', id), { isPremium: !current });
      setProfessionals(professionals.map(p => p.id === id ? { ...p, isPremium: !current } : p));
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleBulkUpdatePhotos = async () => {
    setConfirmBulkUpdate(false);
    setUpdatingPhotos(true);
    try {
      await updateAllProfessionalPhotos(selectedBulkPhoto);
      // Refresh data
      const profSnap = await getDocs(collection(db, 'professionals'));
      setProfessionals(profSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      alert('Todas as fotos foram atualizadas com sucesso!');
    } catch (error) {
      console.error('Bulk update error:', error);
      alert('Erro ao atualizar as fotos. Verifique o console para mais detalhes.');
    } finally {
      setUpdatingPhotos(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      ['Nome', 'CPF', 'Categoria', 'Especialização', 'Sobre o Profissional', 'Telefone', 'CEP', 'Número da residencia', 'Email']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo Importação');
    XLSX.writeFile(workbook, 'modelo_importacao_pro_indica.xlsx');
  };

  const exportDatabase = async () => {
    try {
      setImporting(true);
      setImportLog(['Iniciando exportação do banco de dados...']);
      
      // Fetch all professionals
      const profSnap = await getDocs(collection(db, 'professionals'));
      const profs = profSnap.docs.map(doc => {
        const data = doc.data();
        return {
          'Tipo': 'Profissional',
          'Nome': data.name || '',
          'CPF': data.cpf || '',
          'Categoria': Array.isArray(data.categories) ? data.categories.join(', ') : (data.categories || ''),
          'Especialização': data.specialization || '',
          'Sobre o Profissional': data.description || '',
          'Telefone': data.phone || '',
          'CEP': data.zipCode || '',
          'Número da residencia': data.houseNumber || '',
          'Email': data.email || '',
          'Plataforma': data.platform || 'web',
          'Premium': data.isPremium ? 'Sim' : 'Não',
          'Rating': data.rating || 0,
          'Data Cadastro': data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : ''
        };
      });

      // Fetch all users
      const userSnap = await getDocs(collection(db, 'users'));
      const usersList = userSnap.docs.map(doc => {
        const data = doc.data();
        return {
          'Tipo': 'Usuário/Cliente',
          'Nome': data.name || '',
          'CPF': '',
          'Categoria': '',
          'Especialização': '',
          'Sobre o Profissional': '',
          'Telefone': data.phone || '',
          'CEP': '',
          'Número da residencia': '',
          'Email': data.email || '',
          'Plataforma': data.platform || 'web',
          'Premium': '',
          'Rating': '',
          'Data Cadastro': data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : ''
        };
      });

      const combinedData = [...profs, ...usersList];
      
      const worksheet = XLSX.utils.json_to_sheet(combinedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Banco de Dados Completo');
      
      XLSX.writeFile(workbook, `backup_pro_indica_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setImportLog(prev => [...prev, 'Exportação concluída com sucesso!']);
      alert('Banco de dados exportado com sucesso!');
    } catch (error: any) {
      console.error('Export error:', error);
      setImportLog(prev => [...prev, `Erro na exportação: ${error.message}`]);
      alert('Erro ao exportar banco de dados.');
    } finally {
      setImporting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    setImportLog(['Lendo arquivo Excel...']);
    
    try {
      const reader = new FileReader();
      
      const data = await new Promise<any[]>((resolve, reject) => {
        reader.onload = (e) => {
          try {
            const bstr = e.target?.result;
            const workbook = XLSX.read(bstr, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(importFile);
      });

      setImportLog(prev => [...prev, `Arquivo lido. Processando ${data.length} registros...`]);

      let successCount = 0;
      let errorCount = 0;
      
      for (const item of data) {
        try {
          // Map Excel columns to our fields based on the requested order
          const name = item.Nome || item.name;
          const categoriesRaw = item.Categoria || item.categories;
          
          if (!name || !categoriesRaw) {
            setImportLog(prev => [...prev, `Erro: Registro sem nome ou categoria ignorado.`]);
            errorCount++;
            continue;
          }

          const categories = typeof categoriesRaw === 'string' 
            ? categoriesRaw.split(',').map(c => c.trim()) 
            : Array.isArray(categoriesRaw) ? categoriesRaw : [categoriesRaw];

          const profId = item.UID || item.uid || item.id || doc(collection(db, 'professionals')).id;
          
          const profData = {
            name,
            cpf: item.CPF || '',
            categories,
            specialization: item.Especialização || '',
            description: item['Sobre o Profissional'] || '',
            phone: item.Telefone || '',
            zipCode: item.CEP || '',
            houseNumber: item['Número da residencia'] || '',
            email: item.Email || '',
            uid: profId,
            id: profId,
            platform: 'web',
            rating: 5.0,
            isPremium: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            photoURL: DEFAULT_PROFESSIONAL_IMAGE,
            reviewsCount: 0
          };

          await setDoc(doc(db, 'professionals', profId), profData);
          successCount++;
          if (successCount % 5 === 0) {
            setImportLog(prev => [...prev, `${successCount} profissionais importados...`]);
          }
        } catch (err: any) {
          console.error('Error importing item:', item, err);
          errorCount++;
          setImportLog(prev => [...prev, `Erro ao importar ${item.Nome || item.name || 'item'}: ${err.message}`]);
        }
      }

      setImportLog(prev => [...prev, `--- Importação Concluída ---`]);
      setImportLog(prev => [...prev, `Sucesso: ${successCount}`]);
      setImportLog(prev => [...prev, `Erros: ${errorCount}`]);
      
      // Refresh data
      const profSnap = await getDocs(collection(db, 'professionals'));
      setProfessionals(profSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      if (errorCount === 0) {
        alert(`${successCount} profissionais importados com sucesso!`);
        setImportFile(null);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setImportLog(prev => [...prev, `ERRO CRÍTICO: ${err.message}`]);
      alert('Erro ao processar arquivo Excel. Verifique o formato.');
    } finally {
      setImporting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const catId = newCategoryName.trim();
      await setDoc(doc(db, 'categories', catId), {
        name: catId,
        parentId: newCategoryParentId,
        specializations: [],
        createdAt: serverTimestamp()
      });
      setCategoriesList(prev => [...prev, { id: catId, name: catId, parentId: newCategoryParentId, specializations: [] }]);
      setNewCategoryName('');
      setNewCategoryParentId('outros');
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(`Excluir a categoria "${id}" e todas as suas especializações?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategoriesList(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleAddSpecialization = async (catId: string) => {
    if (!newSpecName.trim()) return;
    const cat = categoriesList.find(c => c.id === catId);
    if (!cat) return;

    const updatedSpecs = [...(cat.specializations || []), newSpecName.trim()];
    try {
      // Use setDoc with merge to support both new and existing categories
      await setDoc(doc(db, 'categories', catId), {
        name: cat.name,
        specializations: updatedSpecs,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setCategoriesList(prev => prev.map(c => c.id === catId ? { ...c, specializations: updatedSpecs } : c));
      setNewSpecName('');
    } catch (error) {
      console.error('Error adding specialization:', error);
    }
  };

  const handleDeleteSpecialization = async (catId: string, specName: string) => {
    const cat = categoriesList.find(c => c.id === catId);
    if (!cat) return;

    const updatedSpecs = (cat.specializations || []).filter((s: string) => s !== specName);
    try {
      await setDoc(doc(db, 'categories', catId), {
        specializations: updatedSpecs,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setCategoriesList(prev => prev.map(c => c.id === catId ? { ...c, specializations: updatedSpecs } : c));
    } catch (error) {
      console.error('Error deleting specialization:', error);
    }
  };

  const handleExportCategories = () => {
    const data = categoriesList.map(cat => ({
      Profissao: cat.name,
      Especializacoes: (cat.specializations || []).join(', ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categorias");
    XLSX.writeFile(wb, "proindica_categorias.xlsx");
  };

  const handleCategoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setNotification({ message: `Arquivo "${file.name}" selecionado. Clique em confirmar para importar.`, type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const processCategoryImport = async () => {
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) throw new Error('Não foi possível ler o conteúdo do arquivo.');

        const wb = XLSX.read(dataBuffer, { type: 'array' });
        
        let allData: any[] = [];
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(ws) as any[];
          if (sheetData.length > 0) {
            allData = sheetData;
            break;
          }
        }

        if (allData.length === 0) {
          setNotification({ message: 'O arquivo parece estar vazio ou em formato incompatível.', type: 'error' });
          setTimeout(() => setNotification(null), 5000);
          return;
        }

        setLoading(true);
        let count = 0;
        const itemsToProcess: any[] = [];
        const processedNames = new Set<string>();

        for (const item of allData) {
          const keys = Object.keys(item);
          if (keys.length === 0) continue;

          const findKey = (search: string) => keys.find(k => {
            const cleanKey = k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return cleanKey.includes(search);
          });
          
          let professionKey = findKey('profissao') || findKey('profession') || findKey('name') || findKey('categoria');
          let specsKey = findKey('especializacao') || findKey('specialization') || findKey('specs');
          
          if (!professionKey) professionKey = keys[0];
          if (!specsKey && keys.length > 1) specsKey = keys[1];

          const rawName = item[professionKey];
          if (!rawName) continue;
          
          const name = String(rawName).trim();
          if (!name || processedNames.has(name.toLowerCase())) continue;

          let specs: string[] = [];
          const specsRaw = item[specsKey];
          if (typeof specsRaw === 'string') {
            specs = specsRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
          } else if (Array.isArray(specsRaw)) {
            specs = specsRaw.map(s => String(s).trim()).filter(s => s !== '');
          } else if (specsRaw !== undefined && specsRaw !== null) {
            specs = [String(specsRaw).trim()];
          }

          itemsToProcess.push({ name, specs });
          processedNames.add(name.toLowerCase());
        }

        if (itemsToProcess.length === 0) {
          setNotification({ message: 'Nenhuma profissão válida encontrada.', type: 'error' });
          setLoading(false);
          return;
        }

        const CHUNK_SIZE = 400;
        for (let i = 0; i < itemsToProcess.length; i += CHUNK_SIZE) {
          const chunk = itemsToProcess.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          
          chunk.forEach((item) => {
            const catId = item.name.replace(/[\/\.\#\$\/\[\]]/g, '-').trim();
            const catRef = doc(db, 'categories', catId);
            batch.set(catRef, {
              name: item.name,
              specializations: item.specs,
              updatedAt: serverTimestamp()
            }, { merge: true });
            count++;
          });
          
          await batch.commit();
        }

        await fetchData();
        setImportFile(null);
        setNotification({ message: `Arquivo importado com sucesso! ${count} categorias processadas.`, type: 'success' });
        setTimeout(() => setNotification(null), 6000);
      } catch (error: any) {
        console.error('Fatal Import Error:', error);
        setNotification({ message: 'Erro ao processar arquivo.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(importFile);
  };

  if (!isAdmin) return <div className="text-center py-20 font-bold text-red-500">Acesso Negado.</div>;
  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const filteredProfs = professionals.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center">
            <div className="w-12 h-12 bg-[#00B67A] rounded-2xl flex items-center justify-center shadow-lg mr-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L4 11H8V21H16V11H20L12 3Z" />
                <circle cx="12" cy="13" r="2.5" />
                <path d="M12 16C10 16 8 17 8 18.5V19H16V18.5C16 17 14 16 12 16Z" />
              </svg>
            </div>
            Painel Administrativo
          </h1>
          <p className="text-slate-500 font-medium">Gestão de usuários, profissionais e plataforma.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => { setActiveView('dashboard'); setSearchTerm(''); }}
            className={`flex-1 md:flex-none p-4 rounded-2xl border transition-all text-center min-w-[120px] ${
              activeView === 'dashboard' 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white border-slate-100 text-slate-900 shadow-sm hover:border-blue-200'
            }`}
          >
            <TrendingUp className={`w-6 h-6 mx-auto mb-1 ${activeView === 'dashboard' ? 'text-white' : 'text-blue-600'}`} />
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeView === 'dashboard' ? 'text-blue-100' : 'text-slate-400'}`}>Painel</p>
          </button>
          <button 
            onClick={() => { setActiveView('users'); setSearchTerm(''); }}
            className={`flex-1 md:flex-none p-4 rounded-2xl border transition-all text-center min-w-[120px] ${
              activeView === 'users' 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white border-slate-100 text-slate-900 shadow-sm hover:border-blue-200'
            }`}
          >
            <p className="text-2xl font-black">{users.length}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeView === 'users' ? 'text-blue-100' : 'text-slate-400'}`}>Usuários</p>
          </button>
          <button 
            onClick={() => { setActiveView('professionals'); setSearchTerm(''); }}
            className={`flex-1 md:flex-none p-4 rounded-2xl border transition-all text-center min-w-[120px] ${
              activeView === 'professionals' 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white border-slate-100 text-slate-900 shadow-sm hover:border-blue-200'
            }`}
          >
            <p className="text-2xl font-black">{professionals.length}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeView === 'professionals' ? 'text-blue-100' : 'text-slate-400'}`}>Profissionais</p>
          </button>
          <button 
            onClick={() => { setActiveView('categories'); setSearchTerm(''); }}
            className={`flex-1 md:flex-none p-4 rounded-2xl border transition-all text-center min-w-[120px] ${
              activeView === 'categories' 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white border-slate-100 text-slate-900 shadow-sm hover:border-blue-200'
            }`}
          >
            <Briefcase className={`w-6 h-6 mx-auto mb-1 ${activeView === 'categories' ? 'text-white' : 'text-blue-600'}`} />
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeView === 'categories' ? 'text-blue-100' : 'text-slate-400'}`}>Categorias</p>
          </button>
          <button 
            onClick={() => { setActiveView('bulk-import'); setSearchTerm(''); }}
            className={`flex-1 md:flex-none p-4 rounded-2xl border transition-all text-center min-w-[120px] ${
              activeView === 'bulk-import' 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white border-slate-100 text-slate-900 shadow-sm hover:border-blue-200'
            }`}
          >
            <Database className={`w-6 h-6 mx-auto mb-1 ${activeView === 'bulk-import' ? 'text-white' : 'text-blue-600'}`} />
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeView === 'bulk-import' ? 'text-blue-100' : 'text-slate-400'}`}>Dados</p>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-black text-slate-900">
              {activeView === 'professionals' ? 'Gerenciar Profissionais' : 
               activeView === 'users' ? 'Gerenciar Usuários' : 
               activeView === 'dashboard' ? 'Painel de Indicadores' : 
               activeView === 'categories' ? 'Profissões e Especializações' : 'Gestão de Dados'}
            </h3>
            {activeView === 'dashboard' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{loading ? 'Atualizando...' : 'Atualizar Dados'}</span>
                </button>
                <button
                  onClick={handleSyncPayments}
                  disabled={syncing}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black hover:bg-emerald-100 transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizar com Stripe'}</span>
                </button>
              </div>
            )}
            {activeView === 'professionals' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setConfirmBulkUpdate(true)}
                  disabled={updatingPhotos}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{updatingPhotos ? 'Atualizando...' : 'Atualizar Todas as Fotos'}</span>
                </button>
                <button
                  onClick={handleResetRatings}
                  disabled={resettingRatings}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black hover:bg-amber-100 transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  <Star className="w-4 h-4" />
                  <span>{resettingRatings ? 'Calculando...' : 'Zerar Avaliações Fake'}</span>
                </button>
              </div>
            )}
          </div>
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder={activeView === 'professionals' ? "Filtrar por nome ou cidade..." : "Filtrar por nome ou e-mail..."}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeView === 'categories' ? (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-black text-slate-900">Gestão de Profissões</h4>
                <div className="flex items-center space-x-3">
                  {importFile ? (
                    <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] font-black text-blue-800 truncate max-w-[150px]">{importFile.name}</span>
                      <button 
                        onClick={() => setImportFile(null)}
                        className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                      >
                        <XCircle className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={processCategoryImport}
                        className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black hover:bg-blue-700 transition-all uppercase tracking-widest shadow-md shadow-blue-600/20"
                      >
                        Confirmar
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all uppercase tracking-wider cursor-pointer border border-transparent hover:border-blue-200">
                      <Upload className="w-4 h-4" />
                      <span>Selecionar Excel</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".xlsx, .xls"
                        onChange={handleCategoryFileSelect} 
                      />
                    </label>
                  )}
                  <button
                    onClick={handleExportCategories}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all uppercase tracking-wider"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {notification && (
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
                  >
                    <div className={`p-4 rounded-3xl shadow-2xl flex items-center space-x-4 border backdrop-blur-md ${
                      notification.type === 'success' 
                        ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200' 
                        : 'bg-red-50/90 text-red-700 border-red-200'
                    }`}>
                      <div className={`p-2 rounded-2xl ${
                        notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {notification.type === 'success' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-sm font-black uppercase tracking-tight">{notification.message}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100/50">
                      <th className="p-6 text-left text-xs font-black text-slate-400 uppercase tracking-widest w-1/4">Profissão</th>
                      <th className="p-6 text-left text-xs font-black text-slate-400 uppercase tracking-widest w-1/4">Categoria Pai</th>
                      <th className="p-6 text-left text-xs font-black text-slate-400 uppercase tracking-widest w-1/3">Especializações</th>
                      <th className="p-6 text-center text-xs font-black text-slate-400 uppercase tracking-widest w-1/6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Add New Row */}
                    <tr className="bg-blue-50/30">
                      <td className="p-6">
                        <input
                          type="text"
                          placeholder="Nova profissão..."
                          className="w-full p-3 bg-white border border-blue-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                      </td>
                      <td className="p-6">
                        <select
                          className="w-full p-3 bg-white border border-blue-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={newCategoryParentId}
                          onChange={(e) => setNewCategoryParentId(e.target.value)}
                        >
                          {PARENT_CATEGORIES.map(pc => (
                            <option key={pc.id} value={pc.id}>{pc.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-6 text-sm text-slate-400 font-medium italic">
                        Adicione a profissão primeiro para incluir especializações
                      </td>
                      <td className="p-6 text-center">
                        <button
                          onClick={handleAddCategory}
                          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10"
                        >
                          Incluir
                        </button>
                      </td>
                    </tr>

                    {/* Existing Categories */}
                    {categoriesList.map((cat) => (
                      <tr key={cat.id} className="hover:bg-white transition-colors">
                        <td className="p-6 align-top">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="flex-grow p-2 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none text-slate-900 font-black text-lg transition-all"
                                defaultValue={cat.name}
                                onBlur={async (e) => {
                                  if (e.target.value !== cat.name) {
                                    try {
                                      // If template, we create a new doc. If existing, we update.
                                      // Since name change is tricky (renaming ID), we just save to ID = new name
                                      const newName = e.target.value.trim();
                                      if (!newName) return;
                                      
                                      await setDoc(doc(db, 'categories', newName), {
                                        name: newName,
                                        parentId: cat.parentId || 'outros',
                                        specializations: cat.specializations || [],
                                        updatedAt: serverTimestamp()
                                      });
                                      
                                      // If name changed, delete the old one
                                      if (cat.id !== newName) {
                                        await deleteDoc(doc(db, 'categories', cat.id));
                                      }
                                      
                                      await fetchData(); // Easiest way to sync state
                                    } catch (error) {
                                      console.error('Error updating category name:', error);
                                    }
                                  }
                                }}
                              />
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ID: {cat.id}</p>
                          </div>
                        </td>
                        <td className="p-6 align-top">
                          <select
                            className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={cat.parentId || 'outros'}
                            onChange={async (e) => {
                              try {
                                const newParentId = e.target.value;
                                await updateDoc(doc(db, 'categories', cat.id), {
                                  parentId: newParentId,
                                  updatedAt: serverTimestamp()
                                });
                                await fetchData();
                              } catch (error) {
                                console.error('Error updating category parent:', error);
                              }
                            }}
                          >
                            {PARENT_CATEGORIES.map(pc => (
                              <option key={pc.id} value={pc.id}>{pc.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-6 align-top">
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {cat.specializations?.map((spec: string) => (
                                <span 
                                  key={spec} 
                                  className="group flex items-center px-3 py-1 bg-white border border-slate-100 text-slate-600 text-[11px] font-bold rounded-lg hover:border-red-200 hover:text-red-600 transition-all cursor-pointer"
                                  onClick={() => handleDeleteSpecialization(cat.id, spec)}
                                >
                                  {spec}
                                  <XCircle className="w-3.5 h-3.5 ml-2 text-slate-300 group-hover:text-red-500 transition-colors" />
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2 max-w-sm">
                              <input
                                type="text"
                                placeholder="Nova especialização..."
                                className="flex-grow p-2 bg-white border border-slate-100 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={editingCategory === cat.id ? newSpecName : ''}
                                onFocus={() => { setEditingCategory(cat.id); setNewSpecName(''); }}
                                onChange={(e) => setNewSpecName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddSpecialization(cat.id)}
                              />
                              <button
                                onClick={() => handleAddSpecialization(cat.id)}
                                className="px-3 py-2 bg-slate-900 text-white rounded-lg font-bold text-[10px] hover:bg-blue-600 transition-all uppercase tracking-wider"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center align-top">
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Excluir Profissão"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeView === 'dashboard' ? (
            <div className="p-8 space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-blue-600 font-bold text-xs bg-blue-100 px-2 py-1 rounded-lg">Total</span>
                  </div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Usuários</p>
                  <p className="text-3xl font-black text-slate-900">{users.length}</p>
                </div>

                <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <span className="text-indigo-600 font-bold text-xs bg-indigo-100 px-2 py-1 rounded-lg">Total</span>
                  </div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Profissionais</p>
                  <p className="text-3xl font-black text-slate-900">{professionals.length}</p>
                </div>

                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-600 rounded-2xl text-white">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded-lg">Real</span>
                  </div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Faturamento</p>
                  <p className="text-3xl font-black text-slate-900">
                    R$ {payments.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-600 rounded-2xl text-white">
                      <MousePointer2 className="w-6 h-6" />
                    </div>
                    <span className="text-amber-600 font-bold text-xs bg-amber-100 px-2 py-1 rounded-lg">Total</span>
                  </div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Acessos</p>
                  <p className="text-3xl font-black text-slate-900">{stats?.totalAccesses || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-lg font-black text-slate-900 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                      Crescimento da Base
                    </h4>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { name: 'Jan', usuários: 12, profissionais: 5 },
                        { name: 'Fev', usuários: 19, profissionais: 8 },
                        { name: 'Mar', usuários: 32, profissionais: 15 },
                        { name: 'Abr', usuários: users.length, profissionais: professionals.length },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend iconType="circle" />
                        <Line type="monotone" dataKey="usuários" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="profissionais" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-lg font-black text-slate-900 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-amber-500" />
                      Assinaturas
                    </h4>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Premium', value: professionals.filter(p => p.isPremium).length },
                            { name: 'Grátis', value: professionals.filter(p => !p.isPremium).length },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#f59e0b" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-lg font-black text-slate-900 flex items-center">
                      <Briefcase className="w-5 h-5 mr-2 text-indigo-600" />
                      Distribuição por Categoria
                    </h4>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={
                        Object.entries(
                          professionals.reduce((acc: any, p) => {
                            const cat = p.categories?.[0] || 'Outros';
                            acc[cat] = (acc[cat] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 10)
                      }>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-lg font-black text-slate-900 flex items-center">
                      <Database className="w-5 h-5 mr-2 text-blue-500" />
                      Origem dos Cadastros
                    </h4>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Web', value: users.filter(u => !u.platform || u.platform === 'web').length },
                            { name: 'iOS', value: users.filter(u => u.platform === 'ios').length },
                            { name: 'Android', value: users.filter(u => u.platform === 'android').length },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-3">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-lg font-black text-slate-900 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                      Transações Recentes
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50">
                          <th className="pb-4">Data</th>
                          <th className="pb-4">Usuário</th>
                          <th className="pb-4">E-mail</th>
                          <th className="pb-4">Valor</th>
                          <th className="pb-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Nenhuma transação registrada ainda.</td>
                          </tr>
                        ) : (
                          payments.sort((a, b) => {
                            const dateA = a.timestamp?.seconds || 0;
                            const dateB = b.timestamp?.seconds || 0;
                            return dateB - dateA;
                          }).slice(0, 5).map((payment) => (
                            <tr key={payment.id} className="group hover:bg-slate-50 transition-colors">
                              <td className="py-4 text-sm text-slate-600">
                                {payment.timestamp?.seconds ? new Date(payment.timestamp.seconds * 1000).toLocaleDateString('pt-BR') : '---'}
                              </td>
                              <td className="py-4 font-bold text-slate-900 text-sm">
                                {users.find(u => u.id === payment.userId)?.name || 'Usuário'}
                              </td>
                              <td className="py-4 text-slate-500 text-sm">{payment.userEmail}</td>
                              <td className="py-4 font-black text-emerald-600 text-sm">
                                R$ {payment.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-4">
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                  Aprovado
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'bulk-import' ? (
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                    <h4 className="text-lg font-black text-blue-900 mb-2 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Instruções do Excel
                    </h4>
                    <p className="text-blue-700 text-sm mb-4 font-medium">
                      Suba um arquivo .xlsx ou .xls com as seguintes colunas (cabeçalhos):
                    </p>
                    <div className="bg-white/50 rounded-2xl p-4 overflow-x-auto">
                      <table className="w-full text-[10px] font-bold text-blue-800">
                        <thead>
                          <tr className="border-b border-blue-200">
                            <th className="pb-2 text-left">Ordem</th>
                            <th className="pb-2 text-left">Coluna</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          <tr><td className="py-1">1</td><td className="py-1">Nome</td></tr>
                          <tr><td className="py-1">2</td><td className="py-1">CPF</td></tr>
                          <tr><td className="py-1">3</td><td className="py-1">Categoria</td></tr>
                          <tr><td className="py-1">4</td><td className="py-1">Especialização</td></tr>
                          <tr><td className="py-1">5</td><td className="py-1">Sobre o Profissional</td></tr>
                          <tr><td className="py-1">6</td><td className="py-1">Telefone</td></tr>
                          <tr><td className="py-1">7</td><td className="py-1">CEP</td></tr>
                          <tr><td className="py-1">8</td><td className="py-1">Número da residencia</td></tr>
                          <tr><td className="py-1">9</td><td className="py-1">Email</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <button 
                      onClick={downloadTemplate}
                      className="w-full mt-4 py-3 bg-white text-blue-600 border-2 border-blue-200 rounded-xl font-black text-xs hover:bg-blue-50 transition-all flex items-center justify-center"
                    >
                      <Upload className="w-4 h-4 mr-2 rotate-180" />
                      Baixar Modelo Excel
                    </button>
                    <button 
                      onClick={exportDatabase}
                      disabled={importing}
                      className="w-full mt-3 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg shadow-slate-900/20"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Banco Completo (.xlsx)
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest">
                      Selecionar Arquivo Excel
                    </label>
                    
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className={`w-full py-12 px-6 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all ${
                        importFile 
                          ? 'border-emerald-400 bg-emerald-50' 
                          : 'border-slate-200 bg-slate-50 group-hover:border-blue-400 group-hover:bg-blue-50'
                      }`}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                          importFile ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          <Upload className="w-8 h-8" />
                        </div>
                        <p className={`text-lg font-black ${importFile ? 'text-emerald-900' : 'text-slate-900'}`}>
                          {importFile ? importFile.name : 'Arraste ou clique para subir'}
                        </p>
                        <p className="text-slate-500 font-medium mt-1">Formatos aceitos: .xlsx, .xls</p>
                      </div>
                    </div>

                    <button
                      onClick={handleBulkImport}
                      disabled={importing || !importFile}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Importando...
                        </>
                      ) : (
                        <>
                          <Database className="w-5 h-5 mr-2" />
                          Processar Excel
                        </>
                      )}
                    </button>
                    
                    {importFile && (
                      <button 
                        onClick={() => setImportFile(null)}
                        className="w-full text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
                      >
                        Remover arquivo
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                  <h4 className="text-lg font-black text-slate-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />
                    Log de Processamento
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 h-[450px] overflow-y-auto font-mono text-xs space-y-1">
                    {importLog.length === 0 ? (
                      <p className="text-slate-400 italic">Nenhuma atividade registrada.</p>
                    ) : (
                      importLog.map((log, i) => (
                        <p key={i} className={log.startsWith('Erro') ? 'text-red-500' : 'text-slate-600'}>
                          {log}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'professionals' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Profissional</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Categorias</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Cidade</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProfs.map((prof) => (
                  <tr key={prof.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center space-x-4">
                        <img src={prof.photoURL || DEFAULT_PROFESSIONAL_IMAGE} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-slate-900">{prof.name}</p>
                          <div className="flex items-center text-xs text-yellow-600 font-bold">
                            <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                            {prof.rating}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-wrap gap-1">
                        {prof.categories?.map((cat: string) => (
                          <span key={cat} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md uppercase">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-6 text-sm text-slate-500 font-medium">{prof.city}</td>
                    <td className="p-6">
                      <button
                        onClick={() => togglePremium(prof.id, prof.isPremium)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                          prof.isPremium ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {prof.isPremium ? 'Premium' : 'Standard'}
                      </button>
                    </td>
                    <td className="p-6">
                      <button
                        onClick={() => setConfirmDelete(prof.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">E-mail</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Papel</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center space-x-4">
                        <img src={u.photoURL || DEFAULT_USER_IMAGE} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        <p className="font-bold text-slate-900">{u.name}</p>
                      </div>
                    </td>
                    <td className="p-6 text-sm text-slate-500 font-medium">{u.email}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        u.role === 'admin' ? 'bg-red-100 text-red-600' : 
                        u.role === 'professional' ? 'bg-blue-100 text-blue-600' : 
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role || 'cliente'}
                      </span>
                    </td>
                    <td className="p-6">
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bulk Update Confirmation Modal */}
      <AnimatePresence>
        {confirmBulkUpdate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmBulkUpdate(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6 overflow-hidden">
                {selectedBulkPhoto ? (
                  <img src={selectedBulkPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10" />
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Atualizar Fotos</h3>
              <p className="text-slate-500 mb-6">
                Escolha uma nova foto e confirme para alterar a foto de <strong>TODOS</strong> os profissionais.
              </p>
              
              <div className="mb-8">
                <label className="block w-full py-3 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <span className="text-sm font-bold text-slate-500">
                    {processingPhoto ? 'Processando...' : 'Selecionar Nova Foto'}
                  </span>
                  <input 
                    type="file" 
                    className="sr-only" 
                    accept="image/*" 
                    onChange={handlePhotoSelection}
                    disabled={processingPhoto}
                  />
                </label>
                {selectedBulkPhoto !== DEFAULT_PROFESSIONAL_IMAGE && (
                  <button 
                    onClick={() => setSelectedBulkPhoto(DEFAULT_PROFESSIONAL_IMAGE)}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Restaurar Padrão
                  </button>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setConfirmBulkUpdate(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkUpdatePhotos}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 mb-8">
                Tem certeza que deseja remover este {activeView === 'professionals' ? 'profissional' : 'usuário'}? Esta ação não pode ser desfeita.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
