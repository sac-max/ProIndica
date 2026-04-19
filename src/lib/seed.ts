import { db, collection, getDocs, addDoc, doc, setDoc, getDoc } from '../firebase';
import { CATEGORY_SPECIALIZATIONS, BRAZILIAN_STATES, DEFAULT_PROFESSIONAL_IMAGE, DEFAULT_COVER_IMAGE } from '../constants';

export const seedData = async () => {
  try {
    console.log('Seeding/Updating data...');
    
    const sampleProfessionals: any[] = [];
    let profId = 1;

    // Generate professionals for each category and its specializations
    Object.entries(CATEGORY_SPECIALIZATIONS).forEach(([category, specializations]) => {
      specializations.forEach((spec) => {
        const stateObj = BRAZILIAN_STATES[Math.floor(Math.random() * BRAZILIAN_STATES.length)];
        const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Fortaleza', 'Brasília', 'Recife', 'Manaus'];
        const city = cities[Math.floor(Math.random() * cities.length)];
        
        sampleProfessionals.push({
          uid: `prof_gen_${profId}`,
          name: `${category} ${spec} ${profId}`,
          email: `prof${profId}@example.com`,
          phone: `(11) 9${Math.floor(10000000 + Math.random() * 90000000)}`,
          photoURL: DEFAULT_PROFESSIONAL_IMAGE,
          coverURL: DEFAULT_COVER_IMAGE,
          role: 'professional',
          description: `Especialista em ${category} com foco em ${spec}. Atendimento de alta qualidade e compromisso com o cliente.`,
          categories: [category],
          experience: `${Math.floor(Math.random() * 20) + 1} anos`,
          city: city,
          state: stateObj.value,
          averagePrice: Math.floor(Math.random() * 500) + 50,
          rating: Number((Math.random() * 1.5 + 3.5).toFixed(1)),
          jobsCompleted: Math.floor(Math.random() * 200),
          isPremium: Math.random() > 0.8,
          skills: [spec, 'Atendimento', 'Qualidade']
        });
        profId++;
      });
    });

    for (const prof of sampleProfessionals) {
      console.log(`Seeding/Updating professional: ${prof.name}`);
      // Create/Update user doc
      await setDoc(doc(db, 'users', prof.uid), {
        uid: prof.uid,
        name: prof.name,
        email: prof.email,
        phone: prof.phone,
        photoURL: prof.photoURL,
        role: 'professional',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Create/Update professional doc
      await setDoc(doc(db, 'professionals', prof.uid), {
        uid: prof.uid,
        name: prof.name,
        photoURL: prof.photoURL,
        coverURL: prof.coverURL,
        description: prof.description,
        categories: prof.categories,
        experience: prof.experience,
        city: prof.city,
        state: prof.state,
        averagePrice: prof.averagePrice,
        rating: prof.rating,
        jobsCompleted: prof.jobsCompleted,
        isPremium: prof.isPremium,
        skills: prof.skills
      }, { merge: true });
    }
    console.log('Seeding process completed.');
  } catch (error) {
    console.warn('Seeding skipped or failed:', error);
  }
};
