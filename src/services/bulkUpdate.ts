import { db, collection, getDocs, writeBatch, doc } from '../firebase';

export async function updateAllProfessionalPhotos(newPhotoURL: string) {
  try {
    const querySnapshot = await getDocs(collection(db, 'professionals'));
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(document => {
      batch.update(doc(db, 'professionals', document.id), {
        photoURL: newPhotoURL
      });
    });
    
    await batch.commit();
    console.log('Successfully updated all professional photos');
  } catch (error) {
    console.error('Error updating professional photos:', error);
    throw error; // Re-throw to allow UI to handle it
  }
}
