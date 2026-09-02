import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { 
  Store, Star, MapPin, Clock, Shield, Truck, Package, 
  MessageSquare, Phone, ChevronRight, ChevronLeft, Filter, Grid,
  CheckCircle, Award, TrendingUp, Users, ShoppingCart,
  Heart, Share2, ExternalLink, ArrowLeft, Search, Camera,
  Factory, Settings, Target, BarChart3, FileCheck, Zap, Globe
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

// Radar Chart Component
function RadarChart({ data }: { data: { label: string; value: number; max: number }[] }) {
  const size = 200;
  const center = size / 2;
  const radius = 80;
  const angleStep = (2 * Math.PI) / data.length;

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / data[index].max) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = data.map((d, i) => {
    const point = getPoint(i, d.value);
    return `${point.x},${point.y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={data.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = radius * scale;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      
      {/* Axis lines */}
      {data.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(angle)}
            y2={center + radius * Math.sin(angle)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}
      
      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(249, 115, 22, 0.2)"
        stroke="#f97316"
        strokeWidth="2"
      />
      
      {/* Data points */}
      {data.map((d, i) => {
        const point = getPoint(i, d.value);
        return (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#f97316"
          />
        );
      })}
      
      {/* Labels */}
      {data.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelR = radius + 20;
        const x = center + labelR * Math.cos(angle);
        const y = center + labelR * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-gray-600"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// Image Gallery Component
function ImageGallery({ images }: { images: string[] }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="space-y-2">
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
        {images[selected] ? (
          <img src={images[selected]} alt="" className="w-full h-full object-cover" />
        ) : (
          <Camera size={48} className="text-gray-300" />
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSelected(idx)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
              selected === idx ? 'border-orange-500' : 'border-transparent'
            }`}
          >
            <img src={images[idx]} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductPhoto({ product, className = '' }: { product: any; className?: string }) {
  const [broken, setBroken] = useState(false);

  if (broken || !product.image) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <Package size={28} className="text-gray-300" />
      </div>
    );
  }

  return (
    <img
      src={product.image}
      alt={product.name}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

// Store Profile Page - Alibaba-style
export default function StoreProfilePage() {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState('home');
  const [contactOpen, setContactOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fallback mock data
  const mockStore = {
    id: 1,
    name: 'Kigali Fresh Traders',
    slug: 'kigali-fresh-traders',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop&crop=faces',
    banner: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1600&h=400&fit=crop&crop=center',
    description: 'Premium agricultural products and food supplies from Burundi. We specialize in high-quality rice, beans, cassava flour, and fresh produce. Serving buyers across East Africa since 2018.',
    shortDescription: 'Premium agricultural products and food supplies',
    verified: true,
    verificationType: 'Custom Manufacturer',
    yearsActive: 6,
    location: 'Bujumbura, Burundi',
    province: 'Bujumbura Mairie',
    mainCategories: ['Food and groceries', 'Agriculture and farming'],
    badges: ['#1 best seller in Rice & Grains', 'Annual sales US $450,000+'],
    rating: 4.8,
    reviewCount: 234,
    responseRate: 98,
    responseTime: '2 hours',
    onTimeDelivery: 95,
    totalOrders: 1560,
    totalRevenue: '$450,000+',
    transactionVolume: 'USD $90,000+ · 280 orders',
    employeeCount: '10-50',
    yearEstablished: 2018,
    certifications: ['ISO 9001', 'HACCP', 'Fair Trade'],
    performanceMetrics: {
      responseRate: { value: 98, avg: 85 },
      onTimeDelivery: { value: 95, avg: 80 },
      qualityScore: { value: 92, avg: 78 },
      serviceScore: { value: 96, avg: 82 },
    },
    manufacturerCapabilities: {
      customization: [
        { name: 'Customized on Demand', available: true },
        { name: 'Sample Processing', available: true },
      ],
      tradeAndMarket: [
        { name: 'Years exporting', value: '6' },
        { name: 'Product Categories', value: '3' },
      ],
      production: [
        { name: 'Floor space (m²)', value: '2,000' },
        { name: 'Total Line Operators', value: '25' },
      ],
      qualityControl: [
        { name: 'Product inspection method', value: 'In-house' },
        { name: 'QC inspectors', value: '5' },
      ],
    },
    customizations: [
      { type: 'Material', options: ['Rice', 'Beans', 'Cassava', 'Maize'] },
      { type: 'Packaging', options: ['25kg bags', '50kg bags', 'Custom'] },
    ],
    tradeCapabilities: {
      exportMarkets: ['Kenya', 'Tanzania', 'Rwanda', 'DRC', 'Uganda'],
      minOrder: '100 kg',
      paymentMethods: ['Mobile Money', 'Bank Transfer', 'Cash'],
      deliveryTerms: ['FOB', 'CIF', 'DDP'],
    },
    productionCapacity: {
      dailyOutput: '5,000 kg',
      productionLines: 3,
      qualityControl: 'In-house testing',
      floorSpace: '2,000 m²',
    },
    galleryImages: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=400&fit=crop',
    ],
    contactInfo: {
      phone: '+257 79 123 456',
      whatsapp: '+257 79 123 456',
      email: 'sales@kigalifresh.bi',
      address: 'Avenue de la Plage, Bujumbura',
    },
    operatingHours: 'Monday - Saturday: 7:00 AM - 6:00 PM',
  };

  const mockProducts = [
    { id: 1, name: 'Premium Rice (25kg bag)', price: 45000, unit: 'bag', moq: 10, stock: 500, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop', category: 'Rice and grains', verified: true },
    { id: 2, name: 'Fresh Beans (50kg bag)', price: 85000, unit: 'bag', moq: 5, stock: 200, image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=400&h=300&fit=crop', category: 'Rice and grains', verified: true },
    { id: 3, name: 'Cassava Flour (25kg)', price: 35000, unit: 'bag', moq: 20, stock: 1000, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', category: 'Rice and grains', verified: true },
    { id: 4, name: 'Vegetable Oil (20L)', price: 58500, unit: 'tin', moq: 10, stock: 150, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', category: 'Cooking ingredients', verified: false },
    { id: 5, name: 'Sugar (50kg bag)', price: 42000, unit: 'bag', moq: 10, stock: 300, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop', category: 'Cooking ingredients', verified: true },
    { id: 6, name: 'Maize Grain (100kg)', price: 67000, unit: 'bag', moq: 5, stock: 400, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop', category: 'Rice and grains', verified: true },
    { id: 7, name: 'Fresh Cassava (per kg)', price: 1500, unit: 'kg', moq: 100, stock: 2000, image: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=300&fit=crop', category: 'Fruits and vegetables', verified: false },
    { id: 8, name: 'Green Bananas (per kg)', price: 2000, unit: 'kg', moq: 50, stock: 1500, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', category: 'Fruits and vegetables', verified: false },
  ];

  const videoItems = [
    { title: 'Inside our production process', duration: '02:32', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&h=520&fit=crop' },
    { title: 'Quality control and packaging', duration: '00:45', image: 'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=900&h=520&fit=crop' },
    { title: 'Meet our professional team', duration: '01:17', image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900&h=520&fit=crop' },
  ];

  const eventImages = [
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900&h=560&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&h=560&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&h=560&fit=crop',
  ];

  const hydrateStore = (remoteStore: any) => ({
    ...mockStore,
    ...remoteStore,
    mainCategories: remoteStore.mainCategories?.length ? remoteStore.mainCategories : mockStore.mainCategories,
    badges: remoteStore.badges?.length ? remoteStore.badges : mockStore.badges,
    certifications: remoteStore.certifications?.length ? remoteStore.certifications : mockStore.certifications,
    galleryImages: remoteStore.galleryImages?.length ? remoteStore.galleryImages : mockStore.galleryImages,
    performanceMetrics: { ...mockStore.performanceMetrics, ...(remoteStore.performanceMetrics || {}) },
    manufacturerCapabilities: { ...mockStore.manufacturerCapabilities, ...(remoteStore.manufacturerCapabilities || {}) },
    customizations: remoteStore.customizations?.length ? remoteStore.customizations : mockStore.customizations,
    tradeCapabilities: { ...mockStore.tradeCapabilities, ...(remoteStore.tradeCapabilities || {}) },
    productionCapacity: { ...mockStore.productionCapacity, ...(remoteStore.productionCapacity || {}) },
    contactInfo: { ...mockStore.contactInfo, ...(remoteStore.contactInfo || {}) },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch store by slug
        const storeRes = await fetch(`${API_BASE}/api/stores/${slug}`);
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setStore(hydrateStore(storeData.store));
          
          // Fetch store products
          const productsRes = await fetch(`${API_BASE}/api/stores/${storeData.store.id}/products`);
          if (productsRes.ok) {
            const productsData = await productsRes.json();
            setProducts(productsData.products || []);
          }
        } else {
          // Fallback to mock data if API not available
          setStore(mockStore);
          setProducts(mockProducts);
        }
      } catch {
        // Fallback to mock data
        setStore(mockStore);
        setProducts(mockProducts);
      }
      setLoading(false);
    };
    
    fetchData();
  }, [slug]);

  const money = (value: number) => `${value.toLocaleString()} BIF`;

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const categories = [...new Set(products.map(p => p.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200"></div>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Store not found</p>
      </div>
    );
  }

  const radarData = [
    { label: 'Response', value: store.responseRate, max: 100 },
    { label: 'Delivery', value: store.onTimeDelivery, max: 100 },
    { label: 'Quality', value: store.performanceMetrics.qualityScore.value, max: 100 },
    { label: 'Service', value: store.performanceMetrics.serviceScore.value, max: 100 },
  ];

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-[#222]">
      {/* Alibaba-style utility header */}
      <div className="border-b border-[#e44e00] bg-[#ff6a00] text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 text-[10px] sm:px-6">
          <Link href="/" className="shrink-0 font-extrabold tracking-wide">nzanila.com</Link>
          <div className="hidden flex-1 items-center justify-center gap-4 sm:flex">
            <span>Wholesale marketplace</span>
            <span>Sell on Nzanila</span>
            <span>Help</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/auth" className="font-bold hover:underline">Sign in</Link>
            <button aria-label="Messages"><MessageSquare size={13} /></button>
            <button aria-label="Cart"><ShoppingCart size={13} /></button>
          </div>
        </div>
      </div>

      {/* Supplier masthead */}
      <div className="relative h-28 overflow-hidden bg-[#d9efff] sm:h-36">
        {store.banner && (
          <img src={store.banner} alt="" className="h-full w-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#c7e7fb]/95 via-[#d9efff]/70 to-transparent"></div>
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-white shadow-sm sm:h-16 sm:w-16">
            {store.logo ? <img src={store.logo} alt={store.name} className="h-full w-full object-cover" /> : <Store size={25} className="text-[#1677d2]" />}
          </div>
          <div className="min-w-0 text-[#123d63]">
            <p className="truncate text-sm font-extrabold sm:text-lg">{store.name}</p>
            <p className="mt-0.5 truncate text-[10px] sm:text-xs">{store.location} · {store.yearsActive} years · {store.mainCategories[0]}</p>
            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-[#1677d2]">
              <Shield size={10} /> Verified supplier
            </div>
          </div>
          <div className="ml-auto hidden gap-2 sm:flex">
            <button className="rounded bg-[#ff6a00] px-3 py-1.5 text-[10px] font-bold text-white">Contact supplier</button>
            <button className="rounded border border-[#1677d2] bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-[#1677d2]">Chat now</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Store identity strip */}
        <div className="hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-4 border-white bg-white shadow-md sm:h-24 sm:w-24">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <Store size={36} className="text-blue-600" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
                    {store.name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 sm:text-sm">
                    {store.verified && (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                        <Shield size={10} /> Verified {store.verificationType}
                      </span>
                    )}
                    <span>{store.yearsActive}yrs</span>
                    <span>·</span>
                    <span>{store.location}</span>
                  </p>
                  
                <p className="mt-2 text-xs text-gray-500 sm:text-sm">
                    Main categories: {store.mainCategories.join(' > ')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setContactOpen(true)} className="flex items-center gap-2 rounded bg-[#ff6a00] px-3 py-2 text-xs font-bold text-white hover:bg-[#e55f00] sm:px-4">
                <MessageSquare size={15} /> Contact supplier
              </button>
              <button onClick={() => setContactOpen(true)} className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50 sm:px-4">
                <Phone size={15} /> Chat now
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            {store.badges.map((badge: string, idx: number) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">
                {idx === 0 && <Award size={11} />}
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Store navigation */}
        <div className="mb-5 overflow-x-auto border-b-4 border-[#1677d2] bg-white shadow-sm">
          <div className="flex min-w-max items-center">
            {[
              { id: 'home', label: 'Home' },
              { id: 'products', label: 'Products' },
              { id: 'profile', label: 'Company profile' },
              { id: 'warehouse', label: 'Warehouse' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-r border-gray-100 px-5 py-3 text-xs font-semibold transition-colors sm:px-7 sm:text-sm ${
                  activeTab === tab.id
                    ? 'bg-[#1677d2] text-white'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-[#1677d2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 px-3">
              <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                <Search size={14} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="Search in this store"
                  className="w-28 bg-transparent text-xs outline-none sm:w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-2xl overflow-hidden h-80">
              {store.banner && (
                <img src={store.banner} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/60 to-transparent"></div>
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-2xl px-8">
                  <p className="text-white/80 text-sm mb-2">New Brand, New Updated.</p>
                  <h2 className="text-4xl font-bold text-white mb-2">{store.name}</h2>
                  <p className="text-white/90 text-sm mb-6">{store.description}</p>
                  <div className="flex gap-3">
                    <Link href={`/store/${slug}/products`}>
                      <button className="px-6 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 flex items-center gap-2">
                        View More <ChevronRight size={16} />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
              {/* Right side product preview */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3">
                  {products.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-2 w-48">
                      <ProductPhoto product={p} className="h-12 w-12 rounded" />
                      <div>
                        <p className="text-[10px] text-gray-900 font-medium line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-orange-600 font-bold">{money(p.price)}/{p.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Carousel Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`}></div>
                ))}
              </div>
            </div>

            {/* Product Category Section */}
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h3 className="font-bold text-gray-900 mb-8 text-xl text-center">Product Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {(store.mainCategories.length > 0 ? store.mainCategories.slice(0, 6) : ['Food', 'Clothing', 'Electronics', 'Beauty', 'Home', 'Building']).map((cat: string, idx: number) => {
                  const categoryProduct = products.find((product) => product.category === cat) || products[idx % Math.max(products.length, 1)];
                  return (
                    <button
                      key={idx}
                      onClick={() => { setActiveTab('products'); setSelectedCategory(cat); }}
                      className="relative overflow-hidden rounded-xl h-48 group"
                    >
                      {categoryProduct?.image ? (
                        <img src={categoryProduct.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 bg-blue-600" />
                      )}
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <Package size={28} className="mb-2" />
                        <p className="font-bold text-lg">{cat}</p>
                        <p className="text-xs text-white/80">[{Math.floor(Math.random() * 50) + 10} products]</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Company Stats - Blue Background */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { value: store.productionCapacity?.floorSpace || '60000m²', label: 'Factory Blueprint' },
                  { value: store.productionCapacity?.dailyOutput || '50000pcs', label: 'Monthly Capacity' },
                  { value: store.employeeCount || '3000', label: 'Workers, Staff' },
                  { value: store.tradeCapabilities?.exportMarkets?.length ? `${store.tradeCapabilities.exportMarkets.length}0+` : '90+', label: 'Countries Customer' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-white/70 mt-2">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Highlights */}
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { title: 'Professional', desc: 'Supplying quality products with our professionalism, everything goes well and you can trust us.', icon: Award },
                  { title: 'Production', desc: 'Meticulous production team with advanced technology in production line and management.', icon: Factory },
                  { title: 'OEM&ODM', desc: 'More than 10 years rich experience in OEM & ODM orders, let all people enjoy the best quality.', icon: Settings },
                  { title: 'Competitive Price', desc: 'Aim to help customers save cost and get best quality product in the first time.', icon: TrendingUp },
                ].map((highlight, idx) => (
                  <div key={idx} className="text-center p-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <highlight.icon size={24} className="text-blue-600" />
                    </div>
                    <p className="font-bold text-gray-900 mb-2">{highlight.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{highlight.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Products */}
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-xl">Featured Products</h3>
                <Link href={`/store/${slug}/products`}>
                  <button className="text-sm text-orange-600 hover:underline flex items-center gap-1">
                    View More <ChevronRight size={14} />
                  </button>
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.slice(0, 10).map(product => (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <div className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <ProductPhoto product={product} className="h-full w-full" />
                        {product.verified && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</h4>
                        <p className="text-sm font-bold text-orange-600">{money(product.price)}/{product.unit}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Request CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-xl mb-2">Looking for something specific?</h3>
                  <p className="text-white/80">Request a catalog for detailed product specs, pricing, and more</p>
                </div>
                <button onClick={() => setContactOpen(true)} className="px-8 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600">
                  Request catalog
                </button>
              </div>
            </div>

            {/* Product videos */}
            <section className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1677d2]">See it in action</p>
                  <h3 className="mt-1 text-xl font-bold text-gray-900">Product Video</h3>
                </div>
                <span className="text-xs text-gray-500">Factory and product showcase</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {videoItems.map((video) => (
                  <button key={video.title} onClick={() => setContactOpen(true)} className="group overflow-hidden rounded-lg border border-gray-200 text-left">
                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                      <img src={video.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      <span className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/35"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#1677d2] shadow-lg">▶</span></span>
                      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{video.duration}</span>
                    </div>
                    <p className="p-3 text-sm font-semibold text-gray-900">{video.title}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Company story */}
            <section className="overflow-hidden rounded-xl bg-[#08469b] text-white shadow-sm">
              <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
                <div className="p-6 sm:p-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">About the supplier</p>
                  <h3 className="mt-2 text-2xl font-bold">{store.name}</h3>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100">{store.description} Our team combines dependable supply, strict quality control, and responsive service to help wholesale buyers grow with confidence.</p>
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-5 sm:grid-cols-4">
                    <div><p className="text-lg font-bold">{store.yearEstablished}</p><p className="text-[10px] text-blue-200">Established</p></div>
                    <div><p className="text-lg font-bold">{store.employeeCount}</p><p className="text-[10px] text-blue-200">Team size</p></div>
                    <div><p className="text-lg font-bold">{store.responseRate}%</p><p className="text-[10px] text-blue-200">Response rate</p></div>
                    <div><p className="text-lg font-bold">{store.onTimeDelivery}%</p><p className="text-[10px] text-blue-200">On-time delivery</p></div>
                  </div>
                </div>
                <div className="relative min-h-48 overflow-hidden bg-blue-900">
                  <img src={store.galleryImages[2]} alt="Supplier team" className="h-full w-full object-cover opacity-65" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#08469b] via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 text-sm"><p className="font-bold">{store.location}</p><p className="mt-1 text-xs text-blue-100">{store.operatingHours}</p></div>
                </div>
              </div>
            </section>

            {/* Certificates and events */}
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">Certificate Display</h3>
                <div className="grid grid-cols-3 gap-3">
                  {store.certifications.map((cert: string, idx: number) => (
                    <div key={cert} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      <img src={store.galleryImages[idx % store.galleryImages.length]} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                      <p className="p-2 text-center text-[11px] font-bold text-gray-700">{cert}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">Event Exhibition</h3>
                <div className="grid grid-cols-3 gap-3">
                  {eventImages.map((image, idx) => <img key={image} src={image} alt={`Supplier event ${idx + 1}`} className="aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />)}
                </div>
                <p className="mt-4 text-xs leading-5 text-gray-500">Meet our team at upcoming trade events and arrange a product demonstration for your business.</p>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="flex">
              {/* Left Sidebar - Categories */}
              <div className="w-64 border-r border-gray-200 p-4">
                <h4 className="font-bold text-gray-900 mb-4 text-sm">Top ranking</h4>
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">Product categories</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs ${
                        selectedCategory === 'all' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All products
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs ${
                          selectedCategory === cat ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Store Stats */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{store?.rating}</p>
                    <p className="text-[10px] text-gray-500">Rating</p>
                  </div>
                </div>
              </div>

              {/* Right Content - Products */}
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">All products</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{filteredProducts.length} products</span>
                  </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <Link key={product.id} href={`/products/${product.id}`}>
                      <div className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <ProductPhoto product={product} className="h-full w-full" />
                          {product.verified && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                              Verified
                            </span>
                          )}
                          <button className="absolute top-2 right-2 p-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart size={14} className="text-gray-400" />
                          </button>
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</h4>
                          <p className="text-sm font-bold text-orange-600">{money(product.price)}/{product.unit}</p>
                          <p className="text-[10px] text-gray-500 mt-1">MOQ: {product.moq} {product.unit}s</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500">Previous</button>
                  <button className="px-3 py-1 bg-orange-500 text-white rounded text-xs font-bold">1</button>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">2</button>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">3</button>
                  <span className="text-xs text-gray-400">...</span>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">Next</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Top Section - Performance + Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance on Nzanila */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  Seller performance on Nzanila
                  <span className="text-gray-400 cursor-help">ⓘ</span>
                </h3>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                    #1 best seller in {store.mainCategories[0]}
                  </span>
                </div>

                <div className="flex justify-center mb-4">
                  <RadarChart data={radarData} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{store.responseRate}%</p>
                    <p className="text-xs text-gray-500">Response rate</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{store.onTimeDelivery}%</p>
                    <p className="text-xs text-gray-500">On-time delivery</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{store.responseTime}</p>
                    <p className="text-xs text-gray-500">Avg response time</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">{store.totalRevenue}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Online transactions</p>
                  <p className="text-sm font-bold text-gray-900">{store.transactionVolume}</p>
                </div>
              </div>

              {/* Image Gallery */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <ImageGallery images={store.galleryImages} />
              </div>
            </div>

            {/* Manufacturer Capability Cards */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                Manufacturer capability
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">Verified by SGS</span>
                <span className="text-gray-400 cursor-help">ⓘ</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Customization */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings size={16} className="text-blue-600" />
                    <p className="font-semibold text-sm">Customization</p>
                  </div>
                  {store.manufacturerCapabilities.customization.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{item.name}</span>
                      {item.available ? (
                        <CheckCircle size={14} className="text-blue-500" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  ))}
                  <button className="text-xs text-blue-600 mt-2 hover:underline">Learn more</button>
                </div>

                {/* Trade & Market */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={16} className="text-blue-600" />
                    <p className="font-semibold text-sm">Trade & market</p>
                  </div>
                  {store.manufacturerCapabilities.tradeAndMarket.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                  <button className="text-xs text-blue-600 mt-2 hover:underline">Learn more</button>
                </div>

                {/* R&D */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={16} className="text-blue-600" />
                    <p className="font-semibold text-sm">R&D</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">R&D engineers</span>
                      <span className="font-medium">4</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">MD engineers</span>
                      <span className="font-medium">6</span>
                    </div>
                  </div>
                  <button className="text-xs text-blue-600 mt-2 hover:underline">Learn more</button>
                </div>

                {/* Production */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Factory size={16} className="text-blue-600" />
                    <p className="font-semibold text-sm">Production</p>
                  </div>
                  {store.manufacturerCapabilities.production.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                  <button className="text-xs text-blue-600 mt-2 hover:underline">Learn more</button>
                </div>

                {/* Quality Control */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck size={16} className="text-blue-600" />
                    <p className="font-semibold text-sm">Quality control</p>
                  </div>
                  {store.manufacturerCapabilities.qualityControl.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                  <button className="text-xs text-blue-600 mt-2 hover:underline">Learn more</button>
                </div>

                {/* Featured Services */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-blue-600" />
                    <p className="font-semibold text-sm">Featured services</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle size={12} className="text-blue-500" />
                      <span className="text-gray-600">Trade Assurance</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle size={12} className="text-blue-500" />
                      <span className="text-gray-600">On-time Delivery</span>
                    </div>
                  </div>
                  <button className="text-xs text-blue-600 mt-2 hover:underline">Learn more</button>
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-6">Products</h3>

              {/* Category Filters */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Grid size={14} /> All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Package size={14} /> {cat}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredProducts.slice(0, 12).map(product => (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <div className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <ProductPhoto product={product} className="h-full w-full" />
                        {product.verified && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className="text-[10px] font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</h4>
                        <p className="text-xs font-bold text-orange-600">{money(product.price)}/{product.unit}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Customization Options */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Customization available</h3>
              <div className="grid grid-cols-2 gap-4">
                {store.customizations.map((custom: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Settings size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{custom.type}</p>
                      <p className="text-xs text-gray-500">{custom.options.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Request CTA */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Package size={24} className="text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Looking for something specific?</h3>
                  <p className="text-sm text-gray-500">Request a catalog for detailed product specs, pricing, and more</p>
                </div>
                <button className="px-6 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600">
                  Request catalog
                </button>
              </div>
            </div>

            {/* Verified Manufacturer */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield size={24} className="text-blue-600" />
                <h3 className="font-bold text-blue-900">Verified Manufacturer capability</h3>
                <span className="text-blue-600 cursor-help">ⓘ</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-blue-600" />
                  <span className="text-sm text-blue-800">Trade Assurance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-blue-600" />
                  <span className="text-sm text-blue-800">Verified Identity</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-blue-600" />
                  <span className="text-sm text-blue-800">On-time Delivery</span>
                </div>
              </div>
              <button className="text-sm text-blue-600 mt-4 hover:underline flex items-center gap-1">
                Download report <ExternalLink size={12} />
              </button>
            </div>

            {/* Trade & Market + R&D */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Trade & market</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">active ⓘ</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Years exporting</span>
                    <span className="font-bold">{store.yearsActive} years</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Business type</span>
                    <span className="font-bold">Seller</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Main products</span>
                    <span className="font-bold">{store.mainCategories.join(', ')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Nearest port</span>
                    <span className="font-bold">Kigali Port</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Export market</span>
                    <span className="font-bold">{store.tradeCapabilities.exportMarkets.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">R&D</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">active ⓘ</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">4</p>
                    <p className="text-xs text-gray-500">R&D engineers</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">6</p>
                    <p className="text-xs text-gray-500">MD engineers</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">Customization services</p>
                    <p className="text-xs text-gray-500">OEM, ODM</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">Customization options</p>
                    <p className="text-xs text-gray-500">Logo, Material</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Production */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Production</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">active ⓘ</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Floor space (m²)</p>
                  <p className="text-lg font-bold text-gray-900">{store.productionCapacity.floorSpace}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Annual production capacity</p>
                  <p className="text-lg font-bold text-gray-900">{store.productionCapacity.dailyOutput}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Production lines</p>
                  <p className="text-lg font-bold text-gray-900">{store.productionCapacity.productionLines}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Shift</p>
                  <p className="text-lg font-bold text-gray-900">2</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['Outsourcing', 'Injection Blowing', 'Punching', 'Cutting', 'Assembling', 'Packing'].map((process, idx) => (
                  <div key={idx} className="text-center p-2 bg-gray-100 rounded text-xs text-gray-600">
                    {process}
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Control + Featured Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Quality control</h3>
                <div className="space-y-3">
                  {['Spike Inspection', 'DM Process Analytics', 'Test Approach', 'Procedure/method'].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">{item}</span>
                      <CheckCircle size={16} className="text-green-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Featured services</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Entrusted Capability</span>
                    <CheckCircle size={16} className="text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Certifications</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {store.certifications.map((cert: string, idx: number) => (
                  <div key={idx} className="flex-shrink-0 p-4 border border-gray-200 rounded-xl text-center min-w-[120px]">
                    <FileCheck size={24} className="text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-900">{cert}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'warehouse' && (
          <div className="space-y-6">
            {/* Warehouse Banner */}
            <div className="relative h-80 overflow-hidden rounded-2xl bg-gray-700">
              <img src={store.galleryImages[1] || store.banner} alt="Warehouse" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-800/50 to-transparent"></div>
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-2xl px-8">
                  <h2 className="text-4xl font-bold text-white mb-2">Stock in Warehouse</h2>
                  <p className="text-white/90 text-lg mb-4">Help you to save tax</p>
                  <p className="text-white/70 text-sm">{store.location}</p>
                </div>
              </div>
              {/* Product thumbnails */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex gap-3">
                {products.slice(0, 4).map((p, i) => (
                  <div key={i} className="bg-white rounded-lg p-2 w-20 h-24 flex items-center justify-center">
                    <ProductPhoto product={p} className="h-full w-full rounded object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Warehouse Products */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Warehouse Products</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {products.slice(0, 12).map(product => (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <div className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <ProductPhoto product={product} className="h-full w-full" />
                      </div>
                      <div className="p-2">
                        <h4 className="text-[10px] font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</h4>
                        <p className="text-xs font-bold text-orange-600">{money(product.price)}/{product.unit}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Store footer */}
      <footer className="mt-10 bg-[#172b4d] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div><p className="text-lg font-extrabold text-[#ff6a00]">nzanila.com</p><p className="mt-3 text-xs leading-5 text-blue-100">Wholesale sourcing for businesses across Burundi and East Africa.</p></div>
          <div><h4 className="text-sm font-bold">Get support</h4><div className="mt-3 space-y-2 text-xs text-blue-100"><Link href="/messages" className="block hover:text-white">Help Center</Link><Link href="/orders" className="block hover:text-white">Check order status</Link><Link href="/orders" className="block hover:text-white">Returns and refunds</Link></div></div>
          <div><h4 className="text-sm font-bold">Trade protection</h4><div className="mt-3 space-y-2 text-xs text-blue-100"><span className="block">Safe buyer payments</span><span className="block">On-time delivery</span><span className="block">Supplier verification</span></div></div>
          <div><h4 className="text-sm font-bold">Sell on Nzanila</h4><div className="mt-3 space-y-2 text-xs text-blue-100"><Link href="/onboarding" className="block hover:text-white">Start selling</Link><Link href="/seller/22" className="block hover:text-white">Seller profile</Link><Link href="/" className="block hover:text-white">About Nzanila</Link></div></div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-[10px] text-blue-200">© 2026 Nzanila Express · Trade with confidence</div>
      </footer>

      {contactOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1677d2]">Supplier contact</p><h2 className="mt-1 text-xl font-bold text-gray-900">Send an inquiry</h2></div><button onClick={() => { setContactOpen(false); setRequestSent(false); }} className="text-2xl text-gray-400" aria-label="Close">×</button></div>
            {requestSent ? <div className="py-10 text-center"><CheckCircle size={42} className="mx-auto text-emerald-500" /><p className="mt-3 font-bold text-gray-900">Request saved for follow-up</p><p className="mt-1 text-sm text-gray-500">The supplier will receive your inquiry in the next messaging release.</p></div> : <form onSubmit={(event) => { event.preventDefault(); setRequestSent(true); }} className="mt-5 space-y-3"><input required placeholder="Your name" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1677d2]" /><input required type="number" min="1" placeholder="Quantity needed" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1677d2]" /><textarea required rows={4} defaultValue={`Hello ${store.name}, I would like more information about your products.`} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1677d2]" /><button type="submit" className="w-full rounded-lg bg-[#ff6a00] px-4 py-3 text-sm font-bold text-white hover:bg-[#e55f00]">Send inquiry</button></form>}
          </div>
        </div>
      )}

      {/* Floating Contact Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <button onClick={() => setContactOpen(true)} aria-label="Contact supplier" className="w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 flex items-center justify-center">
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
  );
}
