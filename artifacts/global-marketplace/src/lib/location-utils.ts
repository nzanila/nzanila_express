const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bd75c998.nzanila-api.pages.dev');

interface NominatimAddress {
  state?: string;
  county?: string;
  region?: string;
  state_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  hamlet?: string;
  country_code?: string;
  'ISO3166-2-lvl4'?: string;
}

interface LocationResult {
  display_name: string;
  address: NominatimAddress;
  lat: number;
  lng: number;
  country_code: string;
  country: string;
  province: string;
  city: string;
  zone: string;
}

export async function detectLocation(lat: number, lng: number, locale: string = 'en'): Promise<LocationResult> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: { 'Accept-Language': locale } }
  );
  const data = await res.json();
  const addr = data.address || {};

  const countryCode = (data.country_code || addr.country_code || '').toLowerCase();
  const iso = (addr['ISO3166-2-lvl4'] || '').substring(0, 2).toLowerCase();
  const country = data.address?.country || '';

  // For province: try state first, then county, region, state_district, or parse from display_name
  let state = addr.state || addr.county || addr.region || addr.state_district || '';
  
  // If state is empty, try to extract from display_name (e.g. "Kimironko, Gasabo District, City of Kigali, Rwanda")
  if (!state && data.display_name) {
    const parts = data.display_name.split(',').map((s: string) => s.trim());
    // Usually the province/district is the second or third part
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower.includes('district') || lower.includes('province') || lower.includes('region')) {
        state = part.replace(/\s*(district|province|region)\s*$/i, '').trim();
        break;
      }
    }
  }

  const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || '';
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet || '';

  return {
    display_name: data.display_name || '',
    address: addr,
    lat,
    lng,
    country_code: countryCode || iso,
    country,
    province: state,
    city,
    zone: suburb,
  };
}

export async function tryDBMatch(
  location: LocationResult,
  locale: string = 'en'
): Promise<{ province: string; commune: string; zone: string }> {
  const empty = { province: '', commune: '', zone: '' };
  
  try {
    const provRes = await fetch(`${API_BASE}/api/profiles/locations/provinces`);
    const provinces = await provRes.json();
    
    if (!provinces || provinces.length === 0 || !location.province) return empty;

    const matchedProvince = provinces.find((p: any) => {
      const pName = p.name.toLowerCase();
      const sName = location.province.toLowerCase();
      return pName === sName || sName === pName || pName.includes(sName) || sName.includes(pName);
    });

    if (!matchedProvince) return empty;

    const commRes = await fetch(`${API_BASE}/api/profiles/locations/provinces/${matchedProvince.id}/communes`);
    const communes = await commRes.json();

    let matchedCommune = null;
    if (location.city && communes) {
      matchedCommune = communes.find((c: any) => {
        const cName = c.name.toLowerCase();
        return location.city.toLowerCase().includes(cName) || cName.includes(location.city.toLowerCase());
      });
    }

    if (!matchedCommune) return { province: matchedProvince.name, commune: '', zone: '' };

    const zoneRes = await fetch(`${API_BASE}/api/profiles/locations/communes/${matchedCommune.id}/zones`);
    const zones = await zoneRes.json();

    let matchedZone = null;
    if (location.zone && zones) {
      matchedZone = zones.find((z: any) => {
        const zName = z.name.toLowerCase();
        return location.zone.toLowerCase().includes(zName) || zName.includes(location.zone.toLowerCase());
      });
    }

    return {
      province: matchedProvince.name,
      commune: matchedCommune.name,
      zone: matchedZone ? matchedZone.name : '',
    };
  } catch {
    return empty;
  }
}

export async function autoFillAddress(lat: number, lng: number, locale: string = 'en') {
  const location = await detectLocation(lat, lng, locale);
  const dbMatch = await tryDBMatch(location, locale);

  const province = dbMatch.province || location.province;
  const commune = dbMatch.commune || location.city;
  const zone = dbMatch.zone || location.zone;

  console.log('Auto-fill result:', { province, commune, zone, country: location.country });

  return {
    address: location.display_name,
    province,
    commune,
    zone,
    country: location.country,
    countryCode: location.country_code,
    lat,
    lng,
  };
}
