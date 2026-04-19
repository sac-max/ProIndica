import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy } from '../firebase';
import { COMMON_CATEGORIES, CATEGORY_SPECIALIZATIONS, PARENT_CATEGORIES, CATEGORY_TO_PARENT } from '../constants';
import { ParentCategory } from '../types';

export const useCategories = () => {
  const [categories, setCategories] = useState<string[]>(COMMON_CATEGORIES);
  const [specsMap, setSpecsMap] = useState<Record<string, string[]>>(CATEGORY_SPECIALIZATIONS);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>(PARENT_CATEGORIES);
  const [categoryToParent, setCategoryToParent] = useState<Record<string, string>>(CATEGORY_TO_PARENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('name')));
        if (!catSnap.empty) {
          const names: string[] = [];
          const mapping: Record<string, string[]> = {};
          const catToParentMapping: Record<string, string> = { ...CATEGORY_TO_PARENT };
          
          catSnap.forEach(doc => {
            const data = doc.data();
            names.push(data.name);
            mapping[data.name] = data.specializations || [];
            // If it's a dynamic category not in static map, default to 'outros' if not specified
            if (!catToParentMapping[data.name]) {
              catToParentMapping[data.name] = data.parentId || 'outros';
            }
          });

          // Ensure "Outros" is at the end if it exists
          const sortedNames = names.filter(n => n !== 'Outros');
          if (names.includes('Outros')) {
            sortedNames.push('Outros');
          }

          setCategories(sortedNames);
          setSpecsMap(mapping);
          setCategoryToParent(catToParentMapping);
        }
      } catch (error) {
        console.error('Error fetching dynamic categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, specsMap, parentCategories, categoryToParent, loading };
};
