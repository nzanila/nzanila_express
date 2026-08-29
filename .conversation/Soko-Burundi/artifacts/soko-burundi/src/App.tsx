import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BarChart3, CircleCheck, Heart, House, Info,
  Leaf, MapPin, Menu, Minus, PackageCheck, Plus, Search, ShoppingBag,
  SlidersHorizontal, Sparkles, Store, Trash2, Truck, UserRound, Check,
} from 'lucide-react';
import marketBasket from './assets/market-basket.jpg';
import indigoTote from './assets/indigo-tote.jpg';
import earbuds from './assets/earbuds.jpg';

type Language = 'en' | 'fr' | 'rn';
type Currency = 'BIF' | 'USD';
type Category = 'Mode' | 'Électronique' | 'Maison' | 'Beauté' | 'Alimentation' | 'Téléphones' | 'Services';
type Product = {
  id: number; title: string; category: Category; priceBif: number; priceUsd: number; image: string;
  seller: string; sellerLocation: string; condition: string; badge?: string; description: string;
  deliveryTime: string; isFeatured: boolean; stock: number; rating: number;
};
type CartLine = { product: Product; quantity: number };

const products: Product[] = [
  { id: 1, title: 'Panier tressé de Gitega', category: 'Maison', priceBif: 38000, priceUsd: 13.2, image: marketBasket, seller: 'Atelier Umuco', sellerLocation: 'Rohero, Bujumbura', condition: 'Neuf', badge: 'Choix local', description: 'Un panier tressé à la main, solide et lumineux. Chaque pièce est unique, réalisée par les artisanes de Gitega.', deliveryTime: 'Livraison sous 24 h', isFeatured: true, stock: 12, rating: 4.8 },
  { id: 2, title: 'Tote bag indigo Imirimbo', category: 'Mode', priceBif: 28500, priceUsd: 9.9, image: indigoTote, seller: 'Imirimbo Studio', sellerLocation: 'Kinindo, Bujumbura', condition: 'Neuf', badge: 'Fait au Burundi', description: 'Un sac quotidien en toile robuste, teint à l’indigo et fini avec une poche intérieure pratique.', deliveryTime: 'Livraison sous 24–48 h', isFeatured: true, stock: 8, rating: 4.7 },
  { id: 3, title: 'Écouteurs sans fil Kivu Sound', category: 'Électronique', priceBif: 78000, priceUsd: 27.1, image: earbuds, seller: 'Tech Corner Buj', sellerLocation: 'Quartier asiatique', condition: 'Neuf', badge: 'Populaire', description: 'Des écouteurs compacts avec boîtier de charge, connexion rapide et autonomie pour vos trajets.', deliveryTime: 'Livraison le jour même', isFeatured: true, stock: 4, rating: 4.6 },
  { id: 4, title: 'Miel pur des collines', category: 'Alimentation', priceBif: 19000, priceUsd: 6.6, image: marketBasket, seller: 'Rucher Kibira', sellerLocation: 'Ngozi', condition: 'Neuf', description: 'Miel de fleurs sauvages récolté dans les hauteurs du Burundi. Pot de 500 g.', deliveryTime: 'Livraison sous 48 h', isFeatured: false, stock: 24, rating: 4.9 },
  { id: 5, title: 'Chemise en coton Kaze', category: 'Mode', priceBif: 52000, priceUsd: 18.1, image: indigoTote, seller: 'Kaze Créations', sellerLocation: 'Mutanga Nord, Bujumbura', condition: 'Neuf', badge: 'Nouveau', description: 'Chemise légère en coton local, coupe droite et imprimé discret pour tous les jours.', deliveryTime: 'Livraison sous 24 h', isFeatured: true, stock: 6, rating: 4.7 },
  { id: 6, title: 'Samsung Galaxy A14 reconditionné', category: 'Téléphones', priceBif: 420000, priceUsd: 145.8, image: earbuds, seller: 'Mobile Plus', sellerLocation: 'Buyenzi, Bujumbura', condition: 'Très bon état', badge: 'Garantie 7 jours', description: 'Galaxy A14 vérifié, débloqué et prêt à l’emploi. Chargeur inclus.', deliveryTime: 'Livraison sous 24 h', isFeatured: false, stock: 3, rating: 4.5 },
  { id: 7, title: 'Savon naturel au karité', category: 'Beauté', priceBif: 12000, priceUsd: 4.2, image: marketBasket, seller: 'Mwezi Botanique', sellerLocation: 'Kigobe, Bujumbura', condition: 'Neuf', description: 'Savon doux fabriqué avec du karité et des huiles végétales, sans parfum agressif.', deliveryTime: 'Livraison sous 24 h', isFeatured: false, stock: 15, rating: 4.8 },
  { id: 8, title: 'Logo et affiche pour votre activité', category: 'Services', priceBif: 65000, priceUsd: 22.6, image: indigoTote, seller: 'Studio Inkuba', sellerLocation: 'Bujumbura', condition: 'Service', description: 'Un kit visuel simple et soigné pour lancer votre boutique, votre restaurant ou votre événement.', deliveryTime: 'Livraison sous 3 jours', isFeatured: false, stock: 10, rating: 5.0 },
];

const categories: { name: Category; note: string }[] = [
  { name: 'Mode', note: 'Pièces qui ont une histoire' }, { name: 'Électronique', note: 'Le quotidien, mieux équipé' },
  { name: 'Maison', note: 'Pour habiter avec goût' }, { name: 'Beauté', note: 'Rituels tout en douceur' },
  { name: 'Alimentation', note: 'Bon, local, choisi' }, { name: 'Téléphones', note: 'Connecté sans détour' },
  { name: 'Services', note: 'Les talents près de chez vous' },
];

const queryClient = new QueryClient();

const copy = {
  en: {
    home: 'Home', discover: 'Discover', sell: 'Sell on Nzanila', about: 'Why Nzanila?', cart: 'Cart', topbar: 'Delivery in Bujumbura and soon across Burundi', locationBadge: 'Bujumbura & the hills', today: 'Today', nearby: 'Finds near you', localDelivery: 'Local delivery', safeArrival: 'Safe payment on arrival', verified: 'Verified sellers', verifiedBody: 'We prefer good neighbours to big promises.', pickedHeading: 'People here picked these', searchBlurb: 'Real products from sellers you can find.', deliveryLabel: 'Delivery', payArrival: 'You only pay when your order arrives.', noProduct: 'Product not found', backToMarket: 'Back to market', checkoutError: 'Please fill in the required fields.', noOnlinePayment: 'No online payment. Prepare exact cash if possible.', stock: 'in stock', lowStock: 'left', shopHeading: 'Shop local products', shopSub: 'Find what you need from sellers near you.', department: 'Departments', allProducts: 'All products', items: 'items', quantity: 'Quantity available', quantityPlaceholder: 'e.g. 12',
    greeting: 'A market that feels close.', hero: 'Buy local. Sell simply.', heroBody: 'Nzanila Express brings Burundi’s trusted sellers and curious buyers together — with delivery to your door and cash when it arrives.',
    browse: 'Explore the market', sellCta: 'Start selling', featured: 'Selected nearby', categories: 'Browse by mood', all: 'See all',
    local: 'Local pick', delivery: 'Cash on delivery', from: 'from', add: 'Add to cart', added: 'Added', details: 'View item',
    search: 'What are you looking for?', results: 'Search results', sort: 'Sort', newest: 'Newest', priceLow: 'Price: low to high', priceHigh: 'Price: high to low',
    cartTitle: 'Your basket', empty: 'Your basket is waiting for its first find.', emptyBody: 'Explore local goods and add something made, grown or chosen in Burundi.', explore: 'Explore products',
    summary: 'Order summary', subtotal: 'Subtotal', deliveryFee: 'Delivery', total: 'Total', free: 'Calculated at checkout',
    checkout: 'Delivery details', name: 'Full name', phone: 'Phone number', address: 'Delivery address', city: 'City / area', note: 'Note for the rider (optional)',
    place: 'Place order', cash: 'Cash on delivery — cash', confirmation: 'Order confirmed', thanks: 'Thank you, your order is on its way.', orderNo: 'Order number',
    sellTitle: 'Put your goods online.', sellBody: 'Your next customer may be one street away. Tell them what you have.', publish: 'Send listing', sent: 'Listing received', sentBody: 'We will review your listing and contact you shortly.', another: 'List another item',
    why: 'Why now, in Burundi?', how: 'How it works', aboutBody: 'Nzanila Express is a digital market built for the way commerce already happens here: through trust, recommendations and a quick conversation.',
    language: 'Language', location: 'Your neighbourhood', noResults: 'No finds for this search.', clear: 'Clear filters', condition: 'Condition', seller: 'Seller',
    listing: 'Your listing', listingHint: 'A few details are enough.', productName: 'Product name', category: 'Category', price: 'Price (BIF)', neighbourhood: 'Your neighbourhood', describe: 'Describe your product', send: 'Send listing', placeholderPrice: 'e.g. 45000', placeholderLocation: 'e.g. Rohero, Bujumbura', stepPresent: 'Introduce it', stepPresentBody: 'A clear title and a photo that catches the eye.', stepVerify: 'We check', stepVerifyBody: 'Our team keeps the market reliable and human.', stepSell: 'You sell', stepSellBody: 'The customer orders, you receive payment on delivery.',
    context: 'The context', contextHeading: 'Local commerce already has the trust.', localTitle: 'A neighbourhood economy', localBody: 'Burundian sellers know their products and their neighbourhoods. We give them space to be found beyond word of mouth.', trustTitle: 'Buy with confidence', trustBody: 'See who sells, where they are and pay when it arrives: online shopping becomes a simple conversation.', cityTitle: 'Start in Bujumbura, think Burundi', cityBody: 'The city is our first playground: short routes, neighbours’ stories and delivery with a face. Little by little, the hills will join us.',
    discoverStep: 'Find', orderStep: 'Order', receiveStep: 'Receive', discoverStepBody: 'Search by category, neighbourhood or simply by mood.', orderStepBody: 'Add to cart and leave your address. No complicated payment.', receiveStepBody: 'The rider calls you. Check your order, then pay in cash.',
  },
  fr: {
    home: 'Accueil', discover: 'Découvrir', sell: 'Vendre sur Nzanila', about: 'Pourquoi Nzanila ?', cart: 'Panier', topbar: 'Livraison à Bujumbura et bientôt partout au Burundi', locationBadge: 'Bujumbura et les collines', today: 'Aujourd’hui', nearby: 'Des trouvailles près de vous', localDelivery: 'Livraison locale', safeArrival: 'Paiement sûr à l’arrivée', verified: 'Vendeurs vérifiés', verifiedBody: 'On préfère les bons voisins aux grands discours.', pickedHeading: 'Les gens d’ici ont choisi', searchBlurb: 'Des produits réels, proposés par des vendeurs que l’on peut retrouver.', deliveryLabel: 'Livraison', payArrival: 'Vous payez seulement lorsque la commande arrive.', noProduct: 'Produit introuvable', backToMarket: 'Retour au marché', checkoutError: 'Veuillez remplir les champs obligatoires.', noOnlinePayment: 'Aucun paiement en ligne. Préparez si possible le montant exact.', stock: 'en stock', lowStock: 'restants', shopHeading: 'Acheter des produits locaux', shopSub: 'Trouvez ce qu’il vous faut auprès de vendeurs près de chez vous.', department: 'Rayons', allProducts: 'Tous les produits', items: 'articles', quantity: 'Quantité disponible', quantityPlaceholder: 'Ex. 12',
    greeting: 'Un marché qui reste proche.', hero: 'Achetez local. Vendez simplement.', heroBody: 'Nzanila Express réunit les vendeurs de confiance et les acheteurs curieux du Burundi — avec livraison à domicile et paiement à l’arrivée.',
    browse: 'Explorer le marché', sellCta: 'Commencer à vendre', featured: 'Sélection à proximité', categories: 'Par envie', all: 'Tout voir',
    local: 'Choix local', delivery: 'Paiement à la livraison', from: 'à partir de', add: 'Ajouter au panier', added: 'Ajouté', details: 'Voir le produit',
    search: 'Que cherchez-vous ?', results: 'Résultats de recherche', sort: 'Trier', newest: 'Nouveautés', priceLow: 'Prix croissant', priceHigh: 'Prix décroissant',
    cartTitle: 'Votre panier', empty: 'Votre panier attend sa première trouvaille.', emptyBody: 'Explorez les produits locaux et ajoutez quelque chose de fabriqué, cultivé ou choisi au Burundi.', explore: 'Explorer les produits',
    summary: 'Résumé de la commande', subtotal: 'Sous-total', deliveryFee: 'Livraison', total: 'Total', free: 'Calculée à la commande',
    checkout: 'Détails de livraison', name: 'Nom complet', phone: 'Numéro de téléphone', address: 'Adresse de livraison', city: 'Ville / quartier', note: 'Note pour le livreur (facultatif)',
    place: 'Confirmer la commande', cash: 'Paiement à la livraison — espèces', confirmation: 'Commande confirmée', thanks: 'Merci, votre commande est en route.', orderNo: 'Numéro de commande',
    sellTitle: 'Mettez vos produits en ligne.', sellBody: 'Votre prochain client est peut-être à une rue. Dites-lui ce que vous proposez.', publish: 'Envoyer l’annonce', sent: 'Annonce reçue', sentBody: 'Nous allons vérifier votre annonce et vous contacter bientôt.', another: 'Publier un autre produit',
    why: 'Pourquoi maintenant, au Burundi ?', how: 'Comment ça marche', aboutBody: 'Nzanila Express est un marché numérique construit sur la façon dont le commerce existe déjà ici : la confiance, les recommandations et la conversation.',
    language: 'Langue', location: 'Votre quartier', noResults: 'Aucun résultat pour cette recherche.', clear: 'Effacer les filtres', condition: 'État', seller: 'Vendeur',
    listing: 'Votre annonce', listingHint: 'Quelques informations suffisent.', productName: 'Nom du produit', category: 'Catégorie', price: 'Prix (BIF)', neighbourhood: 'Votre quartier', describe: 'Décrivez votre produit', send: 'Envoyer l’annonce', placeholderPrice: 'Ex. 45000', placeholderLocation: 'Ex. Rohero, Bujumbura', stepPresent: 'Présentez', stepPresentBody: 'Un titre clair et une photo qui donne envie.', stepVerify: 'On vérifie', stepVerifyBody: 'Notre équipe garde le marché fiable et humain.', stepSell: 'Vous vendez', stepSellBody: 'Le client commande, vous recevez à la livraison.',
    context: 'Le contexte', contextHeading: 'Le commerce local a déjà la confiance.', localTitle: 'Une économie de proximité', localBody: 'Les vendeurs burundais connaissent leurs produits et leurs quartiers. Nous leur donnons un espace pour être trouvés au-delà du bouche-à-oreille.', trustTitle: 'Acheter avec confiance', trustBody: 'Voir qui vend, où la personne se trouve et payer à l’arrivée : l’achat en ligne devient une conversation simple.', cityTitle: 'Commencer à Bujumbura, penser Burundi', cityBody: 'La ville est notre premier terrain de jeu : des trajets courts, des histoires de voisins et une livraison qui a un visage. Petit à petit, les collines nous rejoindront.',
    discoverStep: 'Trouvez', orderStep: 'Commandez', receiveStep: 'Recevez', discoverStepBody: 'Cherchez par catégorie, par quartier ou simplement par envie.', orderStepBody: 'Ajoutez au panier et laissez votre adresse. Aucun paiement compliqué.', receiveStepBody: 'Le livreur vous appelle. Vous vérifiez, puis vous payez en espèces.',
  },
  rn: {
    home: 'Ahabanza', discover: 'Rondera', sell: 'Gurisha kuri Nzanila', about: 'Kubera iki Nzanila?', cart: 'Agakapo', topbar: 'Kuzanira i Bujumbura kandi vuba mu Burundi bwose', locationBadge: 'Bujumbura n’imitumba', today: 'Uyu musi', nearby: 'Ivyiza biri hafi yawe', localDelivery: 'Kuzanira hafi', safeArrival: 'Kuriha bishitse', verified: 'Abadandaza bizewe', verifiedBody: 'Duhitamwo ababanyi beza kuruta amajambo menshi.', pickedHeading: 'Abantu bo ngaha barabihisemwo', searchBlurb: 'Ibidandazwa nyavyo, bitangwa n’abadandaza ushobora kumenya.', deliveryLabel: 'Ukugezwa', payArrival: 'Uriha gusa igihe ivyo watumye bishitse.', noProduct: 'Ico kintu ntikiboneka', backToMarket: 'Subira kw’isoko', checkoutError: 'Uzuza ibisabwa kugira ubandanye.', noOnlinePayment: 'Nta kuriha kuri internet. Nimba bishoboka tegura amahera angana.', stock: 'birahari', lowStock: 'hasigaye', shopHeading: 'Gura ibidandazwa vyo mu gihugu', shopSub: 'Rondera ivyo ukeneye ku badandaza bari hafi yawe.', department: 'Ivyiciro', allProducts: 'Ibidandazwa vyose', items: 'bidandazwa', quantity: 'Igitigiri gisigaye', quantityPlaceholder: 'Nk’akarorero 12',
    greeting: 'Isoko ryegereye.', hero: 'Gura iwacu. Gurisha bitagoranye.', heroBody: 'Nzanila Express ihuza abagurisha n’abaguzi bo mu Burundi — ibidandazwa birakuzanirwa, ukariha amahera bishitse.',
    browse: 'Rondera mw’isoko', sellCta: 'Tangira kugurisha', featured: 'Vyatoranijwe hafi', categories: 'Rondera uko wipfuza', all: 'Raba vyose',
    local: 'Ivy’iwacu', delivery: 'Kuriha bishitse', from: 'kuva kuri', add: 'Shira mu gakapo', added: 'Vyashizweko', details: 'Raba ico kintu',
    search: 'Uriko urondera iki?', results: 'Ivyabonetse', sort: 'Tondeka', newest: 'Bishasha', priceLow: 'Igiciro gito', priceHigh: 'Igiciro kinini',
    cartTitle: 'Agakapo kawe', empty: 'Agakapo kawe karindiriye ico ushima.', emptyBody: 'Rondera ibintu bikorerwa, bihingurwa canke biboneka mu Burundi.', explore: 'Rondera ibidandazwa',
    summary: 'Incamake y’ivyo watumye', subtotal: 'Igiteranyo', deliveryFee: 'Ukugezwa', total: 'Vyose hamwe', free: 'Bibazwa igihe utumye',
    checkout: 'Amakuru yo kukuzanira', name: 'Amazina yose', phone: 'Inomero ya telefone', address: 'Aho uzanirwa', city: 'Igisagara / quartier', note: 'Ijambo ku muzanyi (si ngombwa)',
    place: 'Tumiza ubu', cash: 'Kuriha bishitse — amahera', confirmation: 'Ubutumwa bwemejwe', thanks: 'Murakoze, ivyo watumye biraje.', orderNo: 'Inomero y’ubutumwa',
    sellTitle: 'Shira ivyo ugurisha kuri internet.', sellBody: 'Umuguzi wawe mushasha ashobora kuba hafi. Mutumenyeshe ivyo ufise.', publish: 'Rungika ico ushira', sent: 'Twakiriye ubutumwa', sentBody: 'Tuzobusuzuma, hanyuma tukumenyeshe vuba.', another: 'Shira ikindi kintu',
    why: 'Kubera iki ubu, mu Burundi?', how: 'Uko bikorwa', aboutBody: 'Nzanila Express ni isoko ryo kuri internet ryubakiye ku buryo abadandaza basanzwe bakorana: ukwizigirana, kubwirana no kuyaga.',
    language: 'Ururimi', location: 'Aho uba', noResults: 'Nta co twaronse.', clear: 'Kuraho ivyatoranijwe', condition: 'Uko bimeze', seller: 'Umudandaza',
    listing: 'Ico ushira ku isoko', listingHint: 'Amakuru makeyi arakwiye.', productName: 'Izina ry’ico kintu', category: 'Ubwoko', price: 'Igiciro (BIF)', neighbourhood: 'Aho uba', describe: 'Sigura ico ugurisha', send: 'Rungika ubutumwa', placeholderPrice: 'Nk’akarorero 45000', placeholderLocation: 'Nk’akarorero Rohero, Bujumbura', stepPresent: 'Kigire kizwi', stepPresentBody: 'Izina ryiza n’ifoto ikwega amaso.', stepVerify: 'Turakigenzura', stepVerifyBody: 'Umugwi wacu urinda ko isoko ryizigirwa.', stepSell: 'Uracuruza', stepSellBody: 'Umuguzi aratumiza, ukaronka amahera bishitse.',
    context: 'Uko ibintu bimeze', contextHeading: 'Ubucuruzi bwo hafi burafise ukwizigirana.', localTitle: 'Ubukungu bwo hafi', localBody: 'Abadandaza bo mu Burundi barazi ibidandazwa vyabo n’aho bari. Tubaha ahantu ho kuboneka kuruta kubwirana gusa.', trustTitle: 'Gura wizigiye', trustBody: 'Raba uwuriko aragurisha, aho ari kandi urihe bishitse: kugura kuri internet biba ikiyago coroshe.', cityTitle: 'Dutangurire i Bujumbura, twiyumvire Uburundi', cityBody: 'I gisagara ni ho dutangurira: inzira ngufi, inkuru z’ababanyi n’ukuzanirwa n’umuntu. Buhorobuhoro, n’imitumba izokwinjira.',
    discoverStep: 'Rondera', orderStep: 'Tumiza', receiveStep: 'Akira', discoverStepBody: 'Rondera ku bwoko, aho uri canke ico wipfuza.', orderStepBody: 'Shira mu gakapo, wandike aho uzanirwa. Nta kuriha kugoye.', receiveStepBody: 'Umuzanyi araguhamagara. Suzuma ivyo watumye, uheze urihe.',
  },
} as const;

function formatPrice(product: Product, currency: Currency) {
  return currency === 'BIF'
    ? `${new Intl.NumberFormat('fr-FR').format(product.priceBif)} BIF`
    : `$${product.priceUsd.toFixed(2)}`;
}

function AppShell({ children, lang, setLang, currency, setCurrency, cartCount }: { children: ReactNode; lang: Language; setLang: (l: Language) => void; currency: Currency; setCurrency: (c: Currency) => void; cartCount: number }) {
  const [location, setLocation] = useLocation();
  const t = copy[lang];
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const submitSearch = (e: FormEvent) => { e.preventDefault(); if (search.trim()) setLocation(`/recherche?q=${encodeURIComponent(search.trim())}`); };
  const nav = [{ href: '/', label: t.home }, { href: '/recherche', label: t.discover }, { href: '/vendre', label: t.sell }, { href: '/a-propos', label: t.about }];
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="amazon-header sticky top-0 z-40 text-primary-foreground">
        <div className="amazon-header-main mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-2 lg:px-6">
          <button data-testid="button-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} className="amazon-icon-button lg:hidden" aria-label="Menu"><Menu size={22} /></button>
          <Link href="/" data-testid="link-brand" className="amazon-brand shrink-0">Nzanila<span className="text-accent">.</span></Link>
          <div className="amazon-location hidden items-center gap-2 lg:flex">
            <MapPin size={18} />
            <div><span className="block text-[11px] text-primary-foreground/70">{lang === 'fr' ? 'Livrer à' : 'Deliver to'}</span><strong className="block text-sm">Bujumbura</strong></div>
          </div>
          <form onSubmit={submitSearch} className="amazon-search relative flex min-w-0 flex-1">
            <input data-testid="input-header-search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} className="h-10 w-full border-0 bg-white px-3 text-sm text-foreground outline-none" />
            <button type="submit" aria-label="Search" className="grid w-12 shrink-0 place-items-center bg-accent text-accent-foreground"><Search size={20} /></button>
          </form>
          <div className="hidden items-center gap-4 xl:flex">
            <div className="amazon-nav-label">Hello, {lang === 'fr' ? 'bienvenue' : 'sign in'}<strong>Account</strong></div>
            <div className="amazon-nav-label">Returns<strong>&amp; Orders</strong></div>
          </div>
          <Link href="/panier" data-testid="link-cart" className="amazon-cart relative flex shrink-0 items-end gap-1">
            <ShoppingBag size={28} /><span className="absolute left-[11px] top-0 text-xs font-bold text-accent">{cartCount || ''}</span><strong className="hidden text-sm sm:block">{t.cart}</strong><span className="sr-only">{t.cart}</span>
          </Link>
        </div>
        <nav className="amazon-subnav">
          <div className="mx-auto flex max-w-[1600px] items-center gap-5 px-3 lg:px-6">
            <button data-testid="button-subnav-menu" onClick={() => setMobileOpen(!mobileOpen)} className="flex items-center gap-1.5 text-sm font-bold"><Menu size={18} /> All</button>
            {nav.slice(1).map(item => <Link key={item.href} href={item.href} data-testid={`link-nav-${item.href.slice(1)}`} className={`py-3 text-sm ${location === item.href ? 'font-bold text-accent' : 'text-primary-foreground/90'}`}>{item.label}</Link>)}
            <span className="ml-auto hidden text-sm font-bold text-accent sm:block">{lang === 'fr' ? 'Paiement à la livraison' : 'Cash on delivery'}</span>
          </div>
        </nav>
        {mobileOpen && <div className="amazon-mobile-menu lg:hidden">{nav.map(item => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} data-testid={`link-mobile-nav-${item.href.slice(1) || 'home'}`} className="block border-b border-border py-3 text-sm font-semibold last:border-0">{item.label}</Link>)}</div>}
      </header>
      <main>{children}</main>
      <footer className="mt-16 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-6 px-4 py-8 lg:px-8">
          <Link href="/" className="amazon-brand">Nzanila<span className="text-accent">.</span></Link>
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <Link href="/recherche" data-testid="link-footer-discover" className="hover:text-accent">{t.discover}</Link>
            <Link href="/vendre" data-testid="link-footer-sell" className="hover:text-accent">{t.sellCta}</Link>
            <Link href="/a-propos" data-testid="link-footer-about" className="hover:text-accent">{t.about}</Link>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>{t.language}</span>
            {(['en', 'fr', 'rn'] as Language[]).map(l => <button data-testid={`button-footer-language-${l}`} key={l} onClick={() => setLang(l)} className={`border px-2 py-1 ${lang === l ? 'border-accent text-accent' : 'border-primary-foreground/30 text-primary-foreground/70'}`}>{l.toUpperCase()}</button>)}
            {(['BIF', 'USD'] as Currency[]).map(c => <button data-testid={`button-currency-${c.toLowerCase()}`} key={c} onClick={() => setCurrency(c)} className={`border px-2 py-1 ${currency === c ? 'border-accent text-accent' : 'border-primary-foreground/30 text-primary-foreground/70'}`}>{c}</button>)}
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ product, currency, lang, favorite, onFavorite, onAdd }: { product: Product; currency: Currency; lang: Language; favorite: boolean; onFavorite: (id: number) => void; onAdd: (product: Product) => void }) {
  const t = copy[lang];
  return (
    <article data-testid={`card-product-${product.id}`} className="group fade-up">
        <div className="relative overflow-hidden rounded-sm border border-border bg-card shadow-sm">
        <Link href={`/produit/${product.id}`} data-testid={`link-product-${product.id}`} className="block aspect-square overflow-hidden">
          <img src={product.image} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </Link>
        {product.badge && <span data-testid={`badge-product-${product.id}`} className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur">{product.badge}</span>}
        <button data-testid={`button-favorite-${product.id}`} onClick={() => onFavorite(product.id)} aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 backdrop-blur transition hover:scale-105 ${favorite ? 'text-accent' : 'text-foreground/60'}`}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button>
         <button data-testid={`button-add-product-${product.id}`} onClick={() => onAdd(product)} className="absolute bottom-3 left-3 right-3 flex h-10 items-center justify-center rounded-md bg-accent px-3 text-sm font-bold text-accent-foreground shadow-soft transition hover:brightness-95 active:scale-[.98]"><Plus size={17} /><span className="ml-1.5 hidden sm:inline">{t.add}</span></button>
      </div>
      <Link href={`/produit/${product.id}`} data-testid={`link-product-title-${product.id}`} className="mt-3 block">
         <div className="flex flex-col gap-1"><h3 className="font-semibold leading-tight group-hover:text-primary">{product.title}</h3><span className="font-bold text-foreground">{formatPrice(product, currency)}</span></div>
         <p data-testid={`text-rating-${product.id}`} className="mt-1 flex items-center gap-1 text-xs"><span className="tracking-[.12em] text-accent">★★★★★</span><span className="text-muted-foreground">{product.rating.toFixed(1)}</span></p>
         <p data-testid={`text-seller-${product.id}`} className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} /> {product.sellerLocation}</p>
         <p data-testid={`text-stock-${product.id}`} className={`mt-2 text-xs font-semibold ${product.stock <= 5 ? 'text-accent' : 'text-emerald-700'}`}>{product.stock <= 5 ? `${product.stock} ${t.lowStock}` : `${product.stock} ${t.stock}`}</p>
      </Link>
    </article>
  );
}

function HomePage({ lang, currency, favorites, onFavorite, onAdd }: { lang: Language; currency: Currency; favorites: number[]; onFavorite: (id: number) => void; onAdd: (p: Product) => void }) {
  const t = copy[lang];
  const [activeCat, setActiveCat] = useState<Category | 'Tout'>('Tout');
  const shown = products.filter(p => activeCat === 'Tout' || p.category === activeCat);
  return (
    <div className="min-h-[70vh] bg-muted/20">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Nzanila Express</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t.shopHeading}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t.shopSub}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
              <Truck size={15} className="text-accent" /> {t.cash}
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <button data-testid="button-category-all" onClick={() => setActiveCat('Tout')} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${activeCat === 'Tout' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary'}`}>{t.allProducts}</button>
            {categories.map((cat, i) => <button data-testid={`button-category-${i}`} key={cat.name} onClick={() => setActiveCat(cat.name)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${activeCat === cat.name ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary'}`}>{cat.name}</button>)}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-7 lg:grid-cols-[210px_1fr]">
          <aside className="hidden lg:block">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold text-foreground">{t.department}</h2>
              <div className="mt-3 space-y-1">
                <button onClick={() => setActiveCat('Tout')} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${activeCat === 'Tout' ? 'bg-secondary font-bold text-primary' : 'text-muted-foreground hover:bg-muted'}`}><span>{t.allProducts}</span><span>{products.length}</span></button>
                {categories.map(cat => <button key={cat.name} onClick={() => setActiveCat(cat.name)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${activeCat === cat.name ? 'bg-secondary font-bold text-primary' : 'text-muted-foreground hover:bg-muted'}`}><span>{cat.name}</span><span>{products.filter(p => p.category === cat.name).length}</span></button>)}
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-primary p-4 text-primary-foreground">
              <PackageCheck size={20} className="text-accent" />
              <p className="mt-4 text-sm font-bold">{t.cash}</p>
              <p className="mt-1 text-xs leading-5 text-primary-foreground/70">{t.payArrival}</p>
            </div>
          </aside>
          <main>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">{shown.length}</strong> {t.items}</p>
              <Link href="/recherche" className="text-sm font-bold text-primary">{t.discover} <ArrowRight className="ml-1 inline" size={14} /></Link>
            </div>
            <div data-testid="grid-home-products" className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((p, i) => <div key={p.id} style={{ animationDelay: `${i * 55}ms` }}><ProductCard product={p} currency={currency} lang={lang} favorite={favorites.includes(p.id)} onFavorite={onFavorite} onAdd={onAdd} /></div>)}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SearchPage({ lang, currency, favorites, onFavorite, onAdd }: { lang: Language; currency: Currency; favorites: number[]; onFavorite: (id: number) => void; onAdd: (p: Product) => void }) {
  const t = copy[lang]; const [location] = useLocation(); const params = new URLSearchParams(location.split('?')[1] || ''); const initial = params.get('q') || '';
  const [query, setQuery] = useState(initial); const [cat, setCat] = useState<Category | 'Tout'>('Tout'); const [sort, setSort] = useState('newest');
  const filtered = useMemo(() => { let list = products.filter(p => (!query || `${p.title} ${p.seller} ${p.category}`.toLowerCase().includes(query.toLowerCase())) && (cat === 'Tout' || p.category === cat)); if (sort === 'low') list = [...list].sort((a, b) => a.priceBif - b.priceBif); if (sort === 'high') list = [...list].sort((a, b) => b.priceBif - a.priceBif); return list; }, [query, cat, sort]);
   return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14"><div className="max-w-2xl fade-up"><p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Nzanila / {t.discover}</p><h1 className="display mt-3 text-5xl leading-none text-primary sm:text-6xl">{t.results}</h1><p className="mt-4 text-muted-foreground">{t.searchBlurb}</p></div><div className="mt-10 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center"><div className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input data-testid="input-search-page" value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary" /></div><div className="flex gap-2 overflow-x-auto">{[['Tout', 'Tout'], ...categories.map(c => [c.name, c.name])].map(([value, label]) => <button data-testid={`button-filter-${value}`} key={value} onClick={() => setCat(value as Category | 'Tout')} className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold ${cat === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}>{label}</button>)}</div><div className="flex items-center gap-2 sm:ml-auto"><SlidersHorizontal size={16} className="text-muted-foreground" /><select data-testid="select-sort" value={sort} onChange={e => setSort(e.target.value)} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-bold outline-none"><option value="newest">{t.newest}</option><option value="low">{t.priceLow}</option><option value="high">{t.priceHigh}</option></select></div></div>{filtered.length ? <div data-testid="grid-search-results" className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{filtered.map((p, i) => <div key={p.id} style={{ animationDelay: `${i * 55}ms` }}><ProductCard product={p} currency={currency} lang={lang} favorite={favorites.includes(p.id)} onFavorite={onFavorite} onAdd={onAdd} /></div>)}</div> : <div data-testid="empty-search-results" className="market-texture my-16 rounded-[2rem] border border-dashed border-border bg-secondary/50 px-6 py-16 text-center"><Search className="mx-auto text-accent" size={28} /><h2 className="display mt-4 text-3xl text-primary">{t.noResults}</h2><button data-testid="button-clear-search" onClick={() => { setQuery(''); setCat('Tout'); }} className="mt-5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{t.clear}</button></div>}</div>;
}

function ProductPage({ lang, currency, favorites, onFavorite, onAdd }: { lang: Language; currency: Currency; favorites: number[]; onFavorite: (id: number) => void; onAdd: (p: Product) => void }) {
  const { id } = useParams<{ id: string }>(); const product = products.find(p => p.id === Number(id)); const t = copy[lang];
   if (!product) return <div className="mx-auto max-w-4xl px-4 py-24 text-center"><h1 data-testid="text-product-not-found" className="display text-4xl text-primary">{t.noProduct}</h1><Link href="/recherche" data-testid="link-product-not-found" className="mt-5 inline-block rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">{t.backToMarket}</Link></div>;
   return <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12"><Link href="/recherche" data-testid="link-product-back" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> {t.discover}</Link><div className="grid gap-10 lg:grid-cols-2 lg:gap-16"><div className="relative aspect-square overflow-hidden rounded-[2rem] bg-secondary/70"><img src={product.image} alt={product.title} className="h-full w-full object-cover" />{product.badge && <span className="absolute left-5 top-5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">{product.badge}</span>}</div><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">{product.category}</p><h1 className="display mt-3 text-5xl leading-[.98] text-primary sm:text-6xl">{product.title}</h1><div className="mt-5 flex items-baseline gap-3"><span data-testid="text-product-price" className="text-2xl font-bold text-accent">{formatPrice(product, currency)}</span><span className="text-sm text-muted-foreground">{product.condition}</span></div><p className="mt-6 max-w-lg leading-7 text-muted-foreground">{product.description}</p><div className="mt-7 grid gap-3 border-y border-border py-5 sm:grid-cols-2"><div className="flex gap-3"><MapPin className="shrink-0 text-accent" size={19} /><div><p className="text-xs text-muted-foreground">{t.seller}</p><p className="mt-1 text-sm font-bold">{product.seller}</p><p className="text-xs text-muted-foreground">{product.sellerLocation}</p></div></div><div className="flex gap-3"><Truck className="shrink-0 text-accent" size={19} /><div><p className="text-xs text-muted-foreground">{t.deliveryLabel}</p><p className="mt-1 text-sm font-bold">{product.deliveryTime}</p><p className="text-xs text-muted-foreground">{t.cash}</p></div></div></div><div className="mt-7 flex gap-3"><button data-testid="button-add-detail" onClick={() => onAdd(product)} className="flex-1 rounded-full bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5">{t.add}</button><button data-testid="button-favorite-detail" onClick={() => onFavorite(product.id)} className={`grid w-14 place-items-center rounded-full border ${favorites.includes(product.id) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground'}`}><Heart size={20} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} /></button></div><p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><CircleCheck size={15} className="text-accent" /> {t.payArrival}</p></div></div></div>;
}

function CartPage({ lang, currency, cart, setCart }: { lang: Language; currency: Currency; cart: CartLine[]; setCart: (c: CartLine[]) => void }) {
  const t = copy[lang]; const [checkout, setCheckout] = useState(false); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState(''); const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', note: '' });
  const subtotal = cart.reduce((sum, line) => sum + (currency === 'BIF' ? line.product.priceBif : line.product.priceUsd) * line.quantity, 0); const delivery = cart.length ? (currency === 'BIF' ? 5000 : 1.74) : 0;
  const price = (value: number) => currency === 'BIF' ? `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} BIF` : `$${value.toFixed(2)}`;
  const update = (id: number, delta: number) => setCart(cart.map(line => line.product.id === id ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line));
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.name || !form.phone || !form.address || !form.city) { setError(t.checkoutError); return; } setError(''); setConfirmed(true); };
  if (confirmed) return <div className="mx-auto max-w-2xl px-4 py-14 text-center lg:py-24"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/15 text-accent pop"><Check size={35} /></div><p className="mt-7 text-xs font-bold uppercase tracking-[.22em] text-accent">Nzanila Express</p><h1 data-testid="status-order-confirmation" className="display mt-3 text-5xl leading-none text-primary">{t.confirmation}</h1><p className="mx-auto mt-5 max-w-md leading-7 text-muted-foreground">{t.thanks}</p><div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border bg-card p-5 text-left"><div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.orderNo}</span><strong>#NZ-{Math.floor(1000 + Math.random() * 8000)}</strong></div><div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">{t.total}</span><strong className="text-accent">{price(subtotal + delivery)}</strong></div><div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs font-medium text-primary"><CircleCheck size={16} /> {t.cash}</div></div><Link href="/" data-testid="link-confirmation-home" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground">{t.home}</Link></div>;
  if (!cart.length) return <div className="mx-auto max-w-2xl px-4 py-20 text-center lg:py-28"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary text-primary"><ShoppingBag size={30} /></div><h1 data-testid="text-empty-cart" className="display mt-7 text-4xl text-primary">{t.empty}</h1><p className="mt-3 text-muted-foreground">{t.emptyBody}</p><Link href="/recherche" data-testid="link-empty-cart-explore" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground">{t.explore}</Link></div>;
   return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14"><Link href="/recherche" data-testid="link-cart-back" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> {t.discover}</Link><div className="grid gap-10 lg:grid-cols-[1fr_390px]"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Nzanila / {t.cart}</p><h1 className="display mt-3 text-5xl text-primary">{checkout ? t.checkout : t.cartTitle}</h1>{!checkout ? <div className="mt-8 space-y-3">{cart.map(line => <div data-testid={`row-cart-${line.product.id}`} key={line.product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4"><img src={line.product.image} alt="" className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><h2 className="font-bold leading-tight">{line.product.title}</h2><p className="mt-1 text-xs text-muted-foreground">{line.product.sellerLocation}</p></div><button data-testid={`button-remove-cart-${line.product.id}`} onClick={() => setCart(cart.filter(x => x.product.id !== line.product.id))} className="text-muted-foreground hover:text-destructive"><Trash2 size={17} /></button></div><div className="mt-5 flex items-center justify-between"><div className="flex items-center rounded-full border border-border"><button data-testid={`button-decrease-cart-${line.product.id}`} onClick={() => update(line.product.id, -1)} className="p-2 text-muted-foreground hover:text-primary"><Minus size={14} /></button><span data-testid={`text-quantity-${line.product.id}`} className="min-w-6 text-center text-sm font-bold">{line.quantity}</span><button data-testid={`button-increase-cart-${line.product.id}`} onClick={() => update(line.product.id, 1)} className="p-2 text-muted-foreground hover:text-primary"><Plus size={14} /></button></div><strong className="text-accent">{price((currency === 'BIF' ? line.product.priceBif : line.product.priceUsd) * line.quantity)}</strong></div></div></div>)}</div> : <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-7">{[['name', t.name], ['phone', t.phone], ['address', t.address], ['city', t.city]].map(([key, label]) => <label key={key} className="block text-sm font-bold">{label}<input data-testid={`input-checkout-${key}`} required value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-primary" /></label>)}<label className="block text-sm font-bold">{t.note}<textarea data-testid="input-checkout-note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={3} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-4 font-normal outline-none focus:border-primary" /></label>{error && <p data-testid="text-checkout-error" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}<div className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-sm"><CircleCheck className="mt-0.5 shrink-0 text-accent" size={18} /><div><strong>{t.cash}</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">{t.noOnlinePayment}</p></div></div><button data-testid="button-place-order" type="submit" className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground">{t.place}</button></form>}</div><aside className="h-fit rounded-2xl bg-primary p-6 text-primary-foreground lg:sticky lg:top-32"><h2 className="text-sm font-bold uppercase tracking-[.15em]">{t.summary}</h2><div className="mt-6 space-y-3 text-sm"><div className="flex justify-between text-primary-foreground/70"><span>{t.subtotal}</span><span>{price(subtotal)}</span></div><div className="flex justify-between text-primary-foreground/70"><span>{t.deliveryFee}</span><span>{price(delivery)}</span></div></div><div className="my-5 border-t border-primary-foreground/15" /><div className="flex items-end justify-between"><span className="font-bold">{t.total}</span><span data-testid="text-cart-total" className="text-2xl font-bold text-accent">{price(subtotal + delivery)}</span></div>{!checkout && <button data-testid="button-checkout" onClick={() => setCheckout(true)} className="mt-7 w-full rounded-full bg-accent py-3.5 text-sm font-bold text-accent-foreground transition hover:-translate-y-0.5">{t.place} <ArrowRight className="ml-1 inline" size={16} /></button>}<p className="mt-4 text-center text-xs text-primary-foreground/55">{t.free}</p></aside></div></div>;
}

function SellPage({ lang }: { lang: Language }) {
  const t = copy[lang]; const [sent, setSent] = useState(false); const [form, setForm] = useState({ title: '', category: 'Mode', price: '', stock: '', location: '', phone: '', description: '' }); const submit = (e: FormEvent) => { e.preventDefault(); setSent(true); };
  if (sent) return <div className="mx-auto max-w-xl px-4 py-20 text-center lg:py-28"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/15 text-accent"><Check size={35} /></div><h1 data-testid="status-sell-confirmation" className="display mt-7 text-5xl text-primary">{t.sent}</h1><p className="mt-4 leading-7 text-muted-foreground">{t.sentBody}</p><button data-testid="button-sell-another" onClick={() => { setSent(false); setForm({ title: '', category: 'Mode', price: '', stock: '', location: '', phone: '', description: '' }); }} className="mt-8 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground">{t.another}</button></div>;
  return <div className="market-texture min-h-[70vh] px-4 py-10 lg:px-8 lg:py-16"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.75fr_1fr] lg:gap-20"><div className="fade-up"><p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Nzanila / {t.sell}</p><h1 className="display mt-3 text-5xl leading-[.96] text-primary sm:text-6xl">{t.sellTitle}</h1><p className="mt-5 max-w-md text-lg leading-7 text-muted-foreground">{t.sellBody}</p><div className="mt-10 space-y-5">{[['01', t.stepPresent, t.stepPresentBody], ['02', t.stepVerify, t.stepVerifyBody], ['03', t.stepSell, t.stepSellBody]].map(([no, title, body]) => <div className="flex gap-4" key={no}><span className="display text-2xl text-accent">{no}</span><div><h3 className="font-bold text-primary">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{body}</p></div></div>)}</div></div><form onSubmit={submit} className="fade-up fade-up-2 rounded-[2rem] border border-border bg-card p-5 shadow-market sm:p-8"><div className="mb-6 flex items-center justify-between"><div><h2 className="display text-2xl text-primary">{t.listing}</h2><p className="mt-1 text-xs text-muted-foreground">{t.listingHint}</p></div><Store className="text-accent" /></div><div className="space-y-4"><label className="block text-sm font-bold">{t.productName}<input data-testid="input-sell-title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-primary" /></label><div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-bold">{t.category}<select data-testid="select-sell-category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-primary">{categories.map(c => <option key={c.name}>{c.name}</option>)}</select></label><label className="block text-sm font-bold">{t.price}<input data-testid="input-sell-price" required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder={t.placeholderPrice} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">{t.quantity}<input data-testid="input-sell-stock" required min="1" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder={t.quantityPlaceholder} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-primary" /></label></div><label className="block text-sm font-bold">{t.neighbourhood}<input data-testid="input-sell-location" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder={t.placeholderLocation} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">{t.phone}<input data-testid="input-sell-phone" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+257 ..." className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">{t.describe}<textarea data-testid="input-sell-description" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-4 font-normal outline-none focus:border-primary" /></label></div><button data-testid="button-submit-sell" type="submit" className="mt-6 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground">{t.send} <ArrowRight className="ml-1 inline" size={16} /></button></form></div></div>;
}

function AboutPage({ lang }: { lang: Language }) {
  const t = copy[lang]; return <div><section className="bg-primary px-4 py-16 text-primary-foreground lg:px-8 lg:py-24"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Nzanila / Nzanila Express</p><h1 className="display mt-5 max-w-4xl text-5xl leading-[.95] sm:text-7xl">{t.why}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-primary-foreground/70">{t.aboutBody}</p></div></section><section className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-accent">{t.context}</p><h2 className="display mt-3 text-4xl leading-tight text-primary">{t.contextHeading}</h2></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-secondary p-6"><Leaf className="text-accent" size={24} /><h3 className="mt-8 font-bold text-primary">{t.localTitle}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t.localBody}</p></div><div className="rounded-2xl bg-accent p-6 text-accent-foreground"><UserRound size={24} /><h3 className="mt-8 font-bold">{t.trustTitle}</h3><p className="mt-2 text-sm leading-6 text-accent-foreground/75">{t.trustBody}</p></div><div className="rounded-2xl border border-border bg-card p-6 sm:col-span-2"><MapPin className="text-accent" size={24} /><h3 className="mt-8 font-bold text-primary">{t.cityTitle}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t.cityBody}</p></div></div></div></section><section className="bg-secondary/60 px-4 py-14 lg:px-8 lg:py-20"><div className="mx-auto max-w-7xl"><div className="max-w-lg"><p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Nzanila / Parcours</p><h2 className="display mt-3 text-4xl text-primary">{t.how}</h2></div><div className="mt-9 grid gap-0 md:grid-cols-3">{[['01', t.discoverStep, t.discoverStepBody], ['02', t.orderStep, t.orderStepBody], ['03', t.receiveStep, t.receiveStepBody]].map(([n, title, body]) => <div key={n} className="border-t border-primary/20 p-5 pl-0 md:border-l md:border-t-0 md:pl-6"><span className="display text-3xl text-accent">{n}</span><h3 className="mt-6 text-xl font-bold text-primary">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{body}</p></div>)}</div></div></section><section className="mx-auto max-w-7xl px-4 py-14 text-center lg:px-8 lg:py-20"><Sparkles className="mx-auto text-accent" size={25} /><h2 className="display mx-auto mt-4 max-w-2xl text-4xl leading-tight text-primary">La prochaine bonne trouvaille est peut-être déjà dans votre quartier.</h2><Link href="/recherche" data-testid="link-about-discover" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground">{t.discover} <ArrowRight className="ml-2" size={16} /></Link></section></div>;
}

function RouterContent({ lang, currency, favorites, cart, setCart, onFavorite, onAdd }: { lang: Language; currency: Currency; favorites: number[]; cart: CartLine[]; setCart: (c: CartLine[]) => void; onFavorite: (id: number) => void; onAdd: (p: Product) => void }) {
  return <Switch><Route path="/" component={() => <HomePage lang={lang} currency={currency} favorites={favorites} onFavorite={onFavorite} onAdd={onAdd} />} /><Route path="/recherche" component={() => <SearchPage lang={lang} currency={currency} favorites={favorites} onFavorite={onFavorite} onAdd={onAdd} />} /><Route path="/produit/:id" component={() => <ProductPage lang={lang} currency={currency} favorites={favorites} onFavorite={onFavorite} onAdd={onAdd} />} /><Route path="/panier" component={() => <CartPage lang={lang} currency={currency} cart={cart} setCart={setCart} />} /><Route path="/vendre" component={() => <SellPage lang={lang} />} /><Route path="/a-propos" component={() => <AboutPage lang={lang} />} /><Route component={NotFound} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [lang, setLang] = useState<Language>('en'); const [currency, setCurrency] = useState<Currency>('BIF'); const [favorites, setFavorites] = useState<number[]>([]); const [cart, setCart] = useState<CartLine[]>([]); const [notice, setNotice] = useState('');
  const onFavorite = (id: number) => setFavorites(favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id]);
  const onAdd = (product: Product) => { setCart(current => { const found = current.find(x => x.product.id === product.id); return found ? current.map(x => x.product.id === product.id ? { ...x, quantity: x.quantity + 1 } : x) : [...current, { product, quantity: 1 }]; }); setNotice(product.title); window.setTimeout(() => setNotice(''), 1800); };
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><AppShell lang={lang} setLang={setLang} currency={currency} setCurrency={setCurrency} cartCount={cart.reduce((n, x) => n + x.quantity, 0)}><RouterContent lang={lang} currency={currency} favorites={favorites} cart={cart} setCart={setCart} onFavorite={onFavorite} onAdd={onAdd} /></AppShell>{notice && <div data-testid="status-add-to-cart" className="pop fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-market"><CircleCheck size={17} className="text-accent" /> Ajouté au panier</div>}</RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;