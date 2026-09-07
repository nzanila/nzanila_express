-- Populate category names in the three shipped UI languages.
--
-- name_en / name_fr / name_sw existed but were NULL for all 28 rows, so every caller fell
-- back to categories.name (English) regardless of the visitor's language. The translations
-- themselves come from artifacts/api-server/src/category-i18n.ts, which was written as a
-- code-side fallback when DDL looked unavailable; this moves them into the database so the
-- marketplace, Seller Central and AI research all resolve a name from one place.
--
-- Joined on slug, not id: slugs are stable and already how the marketplace addresses a
-- category in a URL, whereas ids shift if the catalogue is reseeded.
--
-- name_rn is deliberately left alone. Kirundi was retired from the UI, not from the data.

WITH translations (slug, name_en, name_fr, name_sw) AS (
  VALUES
    ('accessories', 'Accessories', 'Accessoires', 'Vifaa vya mapambo'),
    ('agriculture-and-farming', 'Agriculture and farming', 'Agriculture et élevage', 'Kilimo na ufugaji'),
    ('beauty-and-personal-care', 'Beauty and personal care', 'Beauté et soins personnels', 'Urembo na utunzaji binafsi'),
    ('books-and-school-supplies', 'Books and school supplies', 'Livres et fournitures scolaires', 'Vitabu na vifaa vya shule'),
    ('building-materials', 'Building materials', 'Matériaux de construction', 'Vifaa vya ujenzi'),
    ('childrens-clothing', 'Children clothing', 'Vêtements enfant', 'Nguo za watoto'),
    ('cleaning-and-household', 'Cleaning and household', 'Nettoyage et ménage', 'Usafi na vifaa vya nyumbani'),
    ('clothing-and-shoes', 'Clothing and shoes', 'Vêtements et chaussures', 'Nguo na viatu'),
    ('cooking-ingredients', 'Cooking ingredients', 'Ingrédients de cuisine', 'Viungo vya kupikia'),
    ('drinks', 'Drinks', 'Boissons', 'Vinywaji'),
    ('energy-and-solar', 'Energy and solar', 'Énergie et solaire', 'Nishati na sola'),
    ('food-and-groceries', 'Food and groceries', 'Alimentation et épicerie', 'Chakula na mboga'),
    ('fruits-and-vegetables', 'Fruits and vegetables', 'Fruits et légumes', 'Matunda na mboga'),
    ('health-and-medical', 'Health and medical', 'Santé et médical', 'Afya na matibabu'),
    ('home-and-furniture', 'Home and furniture', 'Maison et meubles', 'Nyumbani na samani'),
    ('jewellery-and-watches', 'Jewellery and watches', 'Bijoux et montres', 'Vito na saa'),
    ('mens-clothing', 'Men clothing', 'Vêtements homme', 'Nguo za wanaume'),
    ('office-and-business-supplies', 'Office and business supplies', 'Fournitures de bureau', 'Vifaa vya ofisi na biashara'),
    ('other', 'Other', 'Autre', 'Nyingine'),
    ('packaging-and-printing', 'Packaging and printing', 'Emballage et impression', 'Ufungaji na uchapishaji'),
    ('phones-and-electronics', 'Phones and electronics', 'Téléphones et électronique', 'Simu na elektroniki'),
    ('rice-and-grains', 'Rice and grains', 'Riz et céréales', 'Mchele na nafaka'),
    ('services', 'Services', 'Services', 'Huduma'),
    ('shoes', 'Shoes', 'Chaussures', 'Viatu'),
    ('tools-and-hardware', 'Tools and hardware', 'Outils et quincaillerie', 'Zana na vifaa'),
    ('toys-baby-and-kids', 'Toys, baby and kids', 'Jouets, bébé et enfants', 'Vichezeo na watoto'),
    ('vehicles-and-spare-parts', 'Vehicles and spare parts', 'Véhicules et pièces détachées', 'Magari na vipuri'),
    ('womens-clothing', 'Women clothing', 'Vêtements femme', 'Nguo za wanawake')
)
UPDATE categories c
SET name_en = t.name_en,
    name_fr = t.name_fr,
    name_sw = t.name_sw
FROM translations t
WHERE c.slug = t.slug;
