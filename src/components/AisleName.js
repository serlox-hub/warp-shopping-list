'use client';

import { useTranslations } from '@/contexts/LanguageContext';

export default function AisleName({ aisle }) {
  const t = useTranslations();

  // Map of English aisle names to translation keys
  const aisleTranslationMap = {
    'Produce': 'aisles.produce',
    'Dairy': 'aisles.dairy',
    'Meat & Seafood': 'aisles.meatSeafood',
    'Bakery': 'aisles.bakery',
    'Pantry': 'aisles.pantry',
    'Frozen': 'aisles.frozen',
    'Personal Care': 'aisles.personalCare',
    'Household': 'aisles.household',
    'Other': 'aisles.other'
  };

  // If we have a translation for this aisle, use it. Otherwise, return the aisle name as is.
  const translationKey = aisleTranslationMap[aisle];
  return translationKey ? t(translationKey) : aisle;
}