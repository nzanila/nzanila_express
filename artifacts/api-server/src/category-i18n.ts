// Category names in the three shipped UI languages: French, Kiswahili, English.
//
// This lives in code rather than the database on purpose. The `categories` table has
// name_en / name_fr / name_rn columns but every one of them is NULL for all 28 rows, and
// there is no name_sw column at all, so Swahili had nowhere to live. Adding the column
// needs DDL, which PostgREST cannot do. Keeping the table here means the marketplace,
// Seller Central and the AI research search all resolve a category name the same way,
// and it is reviewable in git instead of being invisible production state.
//
// Keyed by slug: slugs are stable, unique, and already how the marketplace addresses a
// category in a URL. If a slug is missing here, callers fall back to categories.name.

export type CategoryLocale = 'fr' | 'sw' | 'en';

export const CATEGORY_I18N: Record<string, Record<CategoryLocale, string>> = {
  'food-and-groceries': { fr: 'Alimentation et épicerie', sw: 'Chakula na mboga', en: 'Food and groceries' },
  'clothing-and-shoes': { fr: 'Vêtements et chaussures', sw: 'Nguo na viatu', en: 'Clothing and shoes' },
  'phones-and-electronics': { fr: 'Téléphones et électronique', sw: 'Simu na elektroniki', en: 'Phones and electronics' },
  'beauty-and-personal-care': { fr: 'Beauté et soins personnels', sw: 'Urembo na utunzaji binafsi', en: 'Beauty and personal care' },
  'home-and-furniture': { fr: 'Maison et meubles', sw: 'Nyumbani na samani', en: 'Home and furniture' },
  'building-materials': { fr: 'Matériaux de construction', sw: 'Vifaa vya ujenzi', en: 'Building materials' },
  'agriculture-and-farming': { fr: 'Agriculture et élevage', sw: 'Kilimo na ufugaji', en: 'Agriculture and farming' },
  'vehicles-and-spare-parts': { fr: 'Véhicules et pièces détachées', sw: 'Magari na vipuri', en: 'Vehicles and spare parts' },
  'books-and-school-supplies': { fr: 'Livres et fournitures scolaires', sw: 'Vitabu na vifaa vya shule', en: 'Books and school supplies' },
  'services': { fr: 'Services', sw: 'Huduma', en: 'Services' },
  'other': { fr: 'Autre', sw: 'Nyingine', en: 'Other' },
  'rice-and-grains': { fr: 'Riz et céréales', sw: 'Mchele na nafaka', en: 'Rice and grains' },
  'fruits-and-vegetables': { fr: 'Fruits et légumes', sw: 'Matunda na mboga', en: 'Fruits and vegetables' },
  'drinks': { fr: 'Boissons', sw: 'Vinywaji', en: 'Drinks' },
  'cooking-ingredients': { fr: 'Ingrédients de cuisine', sw: 'Viungo vya kupikia', en: 'Cooking ingredients' },
  'mens-clothing': { fr: 'Vêtements homme', sw: 'Nguo za wanaume', en: 'Men clothing' },
  'womens-clothing': { fr: 'Vêtements femme', sw: 'Nguo za wanawake', en: 'Women clothing' },
  'childrens-clothing': { fr: 'Vêtements enfant', sw: 'Nguo za watoto', en: 'Children clothing' },
  'shoes': { fr: 'Chaussures', sw: 'Viatu', en: 'Shoes' },
  'accessories': { fr: 'Accessoires', sw: 'Vifaa vya mapambo', en: 'Accessories' },
  'jewellery-and-watches': { fr: 'Bijoux et montres', sw: 'Vito na saa', en: 'Jewellery and watches' },
  'health-and-medical': { fr: 'Santé et médical', sw: 'Afya na matibabu', en: 'Health and medical' },
  'energy-and-solar': { fr: 'Énergie et solaire', sw: 'Nishati na sola', en: 'Energy and solar' },
  'tools-and-hardware': { fr: 'Outils et quincaillerie', sw: 'Zana na vifaa', en: 'Tools and hardware' },
  'toys-baby-and-kids': { fr: 'Jouets, bébé et enfants', sw: 'Vichezeo na watoto', en: 'Toys, baby and kids' },
  'cleaning-and-household': { fr: 'Nettoyage et ménage', sw: 'Usafi na vifaa vya nyumbani', en: 'Cleaning and household' },
  'office-and-business-supplies': { fr: 'Fournitures de bureau', sw: 'Vifaa vya ofisi na biashara', en: 'Office and business supplies' },
  'packaging-and-printing': { fr: 'Emballage et impression', sw: 'Ufungaji na uchapishaji', en: 'Packaging and printing' },
};

/** Display name for a category in one locale, falling back to the stored English name. */
export function categoryName(slug: string | null | undefined, fallback: string, locale: CategoryLocale): string {
  const row = slug ? CATEGORY_I18N[slug] : undefined;
  return row?.[locale] || fallback;
}

/** Every name a category is known by, in all three languages, for search matching. */
export function categoryAliases(slug: string | null | undefined, fallback: string): string[] {
  const row = slug ? CATEGORY_I18N[slug] : undefined;
  const names = row ? [row.fr, row.sw, row.en] : [];
  return [...new Set([fallback, ...names].filter(Boolean))];
}
