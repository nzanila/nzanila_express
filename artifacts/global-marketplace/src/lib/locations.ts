export interface Zone {
  name: string;
  lat: number;
  lng: number;
}

export interface Commune {
  name: string;
  zones: Zone[];
}

export interface Province {
  name: string;
  communes: Commune[];
}

export const BURUNDI_LOCATIONS: Province[] = [
  {
    name: 'Bujumbura Mairie',
    communes: [
      {
        name: 'Bujumbura Centre',
        zones: [
          { name: 'Quartier Asiatique', lat: -3.3731, lng: 29.3644 },
          { name: 'Rohero', lat: -3.3780, lng: 29.3590 },
          { name: 'Buyenzi', lat: -3.3820, lng: 29.3550 },
          { name: 'Bwiza', lat: -3.3700, lng: 29.3700 },
          { name: 'Cibitoke', lat: -3.3650, lng: 29.3600 },
        ],
      },
      {
        name: 'Bujumbura Nord',
        zones: [
          { name: 'Kamenge', lat: -3.3600, lng: 29.3580 },
          { name: 'Kinama', lat: -3.3500, lng: 29.3550 },
          { name: 'Ngagara', lat: -3.3550, lng: 29.3620 },
          { name: 'Mutakura', lat: -3.3450, lng: 29.3580 },
        ],
      },
      {
        name: 'Bujumbura Sud',
        zones: [
          { name: 'Kigobe', lat: -3.3900, lng: 29.3600 },
          { name: 'Gatamba', lat: -3.3950, lng: 29.3550 },
          { name: 'Kajaga', lat: -3.4000, lng: 29.3500 },
        ],
      },
      {
        name: 'Bujumbura Est',
        zones: [
          { name: 'Kicukiro', lat: -3.3800, lng: 29.3800 },
          { name: 'Gitega', lat: -3.3850, lng: 29.3750 },
          { name: 'Ntahangwa', lat: -3.3750, lng: 29.3850 },
        ],
      },
      {
        name: 'Bujumbura Ouest',
        zones: [
          { name: 'Kiriri', lat: -3.3750, lng: 29.3500 },
          { name: 'Safari', lat: -3.3800, lng: 29.3450 },
          { name: 'Haha', lat: -3.3850, lng: 29.3400 },
        ],
      },
    ],
  },
  {
    name: 'Bujumbura Rural',
    communes: [
      {
        name: 'Isale',
        zones: [
          { name: 'Rugarama', lat: -3.3500, lng: 29.3200 },
          { name: 'Kivoga', lat: -3.3450, lng: 29.3150 },
          { name: 'Nyabagere', lat: -3.3400, lng: 29.3100 },
        ],
      },
      {
        name: 'Mukamba',
        zones: [
          { name: 'Kaburambo', lat: -3.3300, lng: 29.3300 },
          { name: 'Rusororo', lat: -3.3250, lng: 29.3250 },
        ],
      },
      {
        name: 'Kanyosha',
        zones: [
          { name: 'Kibenga', lat: -3.3600, lng: 29.3300 },
          { name: 'Ruziba', lat: -3.3550, lng: 29.3250 },
          { name: 'Mugoboka', lat: -3.3500, lng: 29.3200 },
        ],
      },
      {
        name: 'Muha',
        zones: [
          { name: 'Kanaga', lat: -3.3700, lng: 29.3300 },
          { name: 'Mubone', lat: -3.3650, lng: 29.3250 },
        ],
      },
      {
        name: 'Nyanza-Lac',
        zones: [
          { name: 'Centre', lat: -3.3900, lng: 29.3200 },
          { name: 'Kiziba', lat: -3.3850, lng: 29.3150 },
        ],
      },
    ],
  },
  {
    name: 'Gitega',
    communes: [
      {
        name: 'Gitega Centre',
        zones: [
          { name: 'Centre', lat: -3.4264, lng: 29.9246 },
          { name: 'Kigali', lat: -3.4200, lng: 29.9300 },
          { name: 'Mugere', lat: -3.4300, lng: 29.9200 },
        ],
      },
      {
        name: 'Rutana',
        zones: [
          { name: 'Centre', lat: -3.8734, lng: 30.0854 },
          { name: 'Kibimba', lat: -3.8700, lng: 30.0800 },
        ],
      },
    ],
  },
  {
    name: 'Bubanza',
    communes: [
      {
        name: 'Bubanza Centre',
        zones: [
          { name: 'Centre', lat: -2.9403, lng: 29.3794 },
          { name: 'Kivyiru', lat: -2.9350, lng: 29.3750 },
        ],
      },
    ],
  },
  {
    name: 'Bururi',
    communes: [
      {
        name: 'Bururi Centre',
        zones: [
          { name: 'Centre', lat: -3.9483, lng: 29.6244 },
          { name: 'Matana', lat: -3.9500, lng: 29.6200 },
        ],
      },
    ],
  },
  {
    name: 'Cankuzo',
    communes: [
      {
        name: 'Cankuzo Centre',
        zones: [
          { name: 'Centre', lat: -3.2189, lng: 30.5184 },
        ],
      },
    ],
  },
  {
    name: 'Cibitoke',
    communes: [
      {
        name: 'Cibitoke Centre',
        zones: [
          { name: 'Centre', lat: -2.8888, lng: 29.1238 },
        ],
      },
    ],
  },
  {
    name: 'Kayanza',
    communes: [
      {
        name: 'Kayanza Centre',
        zones: [
          { name: 'Centre', lat: -2.9219, lng: 29.6289 },
        ],
      },
    ],
  },
  {
    name: 'Kirundo',
    communes: [
      {
        name: 'Kirundo Centre',
        zones: [
          { name: 'Centre', lat: -2.5845, lng: 30.0956 },
        ],
      },
    ],
  },
  {
    name: 'Makamba',
    communes: [
      {
        name: 'Makamba Centre',
        zones: [
          { name: 'Centre', lat: -4.1349, lng: 29.8039 },
        ],
      },
    ],
  },
  {
    name: 'Muramvya',
    communes: [
      {
        name: 'Muramvya Centre',
        zones: [
          { name: 'Centre', lat: -3.2684, lng: 29.6083 },
        ],
      },
    ],
  },
  {
    name: 'Muyinga',
    communes: [
      {
        name: 'Muyinga Centre',
        zones: [
          { name: 'Centre', lat: -2.8451, lng: 30.3409 },
        ],
      },
    ],
  },
  {
    name: 'Mwaro',
    communes: [
      {
        name: 'Mwaro Centre',
        zones: [
          { name: 'Centre', lat: -3.5129, lng: 29.6788 },
        ],
      },
    ],
  },
  {
    name: 'Ngozi',
    communes: [
      {
        name: 'Ngozi Centre',
        zones: [
          { name: 'Centre', lat: -2.9075, lng: 29.8305 },
        ],
      },
    ],
  },
  {
    name: 'Rumonge',
    communes: [
      {
        name: 'Rumonge Centre',
        zones: [
          { name: 'Centre', lat: -3.9736, lng: 29.4386 },
        ],
      },
    ],
  },
  {
    name: 'Rutana',
    communes: [
      {
        name: 'Rutana Centre',
        zones: [
          { name: 'Centre', lat: -3.8734, lng: 30.0854 },
        ],
      },
    ],
  },
  {
    name: 'Ruyigi',
    communes: [
      {
        name: 'Ruyigi Centre',
        zones: [
          { name: 'Centre', lat: -3.4753, lng: 30.2484 },
        ],
      },
    ],
  },
];

export const RWANDA_LOCATIONS: Province[] = [
  {
    name: 'Kigali',
    communes: [
      {
        name: 'Gasabo',
        zones: [
          { name: 'Kacyiru', lat: -1.9361, lng: 30.0778 },
          { name: 'Kimironko', lat: -1.9200, lng: 30.0900 },
          { name: 'Kimihurura', lat: -1.9400, lng: 30.0800 },
          { name: 'Remera', lat: -1.9300, lng: 30.0850 },
          { name: 'Gacuriro', lat: -1.9100, lng: 30.0800 },
          { name: 'Bumbogo', lat: -1.9000, lng: 30.0700 },
          { name: 'Gatsata', lat: -1.9250, lng: 30.0650 },
          { name: 'Nyabugogo', lat: -1.9450, lng: 30.0700 },
        ],
      },
      {
        name: 'Kicukiro',
        zones: [
          { name: 'Kicukiro Centre', lat: -1.9600, lng: 30.0800 },
          { name: 'Kagugu', lat: -1.9550, lng: 30.0850 },
          { name: 'Gatenga', lat: -1.9650, lng: 30.0750 },
          { name: 'Kigarama', lat: -1.9700, lng: 30.0800 },
          { name: 'Nyarugunga', lat: -1.9500, lng: 30.0950 },
          { name: 'Kanombe', lat: -1.9550, lng: 30.1000 },
        ],
      },
      {
        name: 'Nyarugenge',
        zones: [
          { name: 'Nyamirambo', lat: -1.9600, lng: 30.0500 },
          { name: 'Gikondo', lat: -1.9550, lng: 30.0550 },
          { name: 'Kanyinya', lat: -1.9500, lng: 30.0450 },
          { name: 'Kimisagara', lat: -1.9500, lng: 30.0600 },
          { name: 'Muhima', lat: -1.9500, lng: 30.0650 },
          { name: 'Rwezamenyo', lat: -1.9550, lng: 30.0600 },
        ],
      },
    ],
  },
  {
    name: 'Eastern Province',
    communes: [
      {
        name: 'Nyagatare',
        zones: [
          { name: 'Centre', lat: -1.2950, lng: 30.3200 },
        ],
      },
      {
        name: 'Gatsibo',
        zones: [
          { name: 'Centre', lat: -1.4300, lng: 30.2200 },
        ],
      },
      {
        name: 'Kayonza',
        zones: [
          { name: 'Centre', lat: -1.8700, lng: 30.5100 },
        ],
      },
      {
        name: 'Kirehe',
        zones: [
          { name: 'Centre', lat: -2.2300, lng: 30.7200 },
        ],
      },
      {
        name: 'Bugesera',
        zones: [
          { name: 'Centre', lat: -2.2200, lng: 30.1200 },
        ],
      },
    ],
  },
  {
    name: 'Northern Province',
    communes: [
      {
        name: 'Musanze',
        zones: [
          { name: 'Centre', lat: -1.4990, lng: 29.6340 },
        ],
      },
      {
        name: 'Gakenke',
        zones: [
          { name: 'Centre', lat: -1.6700, lng: 29.6000 },
        ],
      },
      {
        name: 'Rulindo',
        zones: [
          { name: 'Centre', lat: -1.5400, lng: 29.8900 },
        ],
      },
      {
        name: 'Gicumbi',
        zones: [
          { name: 'Centre', lat: -1.5800, lng: 29.8500 },
        ],
      },
    ],
  },
  {
    name: 'Southern Province',
    communes: [
      {
        name: 'Huye',
        zones: [
          { name: 'Centre', lat: -2.5930, lng: 29.5910 },
        ],
      },
      {
        name: 'Muhanga',
        zones: [
          { name: 'Centre', lat: -2.0100, lng: 29.7400 },
        ],
      },
      {
        name: 'Nyanza',
        zones: [
          { name: 'Centre', lat: -2.3500, lng: 29.7500 },
        ],
      },
      {
        name: 'Gisagara',
        zones: [
          { name: 'Centre', lat: -2.4300, lng: 29.8500 },
        ],
      },
      {
        name: 'Nyaruguru',
        zones: [
          { name: 'Centre', lat: -2.5700, lng: 29.5300 },
        ],
      },
      {
        name: 'Kamonyi',
        zones: [
          { name: 'Centre', lat: -2.0700, lng: 29.7600 },
        ],
      },
    ],
  },
  {
    name: 'Western Province',
    communes: [
      {
        name: 'Rubavu',
        zones: [
          { name: 'Centre', lat: -1.6800, lng: 29.2500 },
        ],
      },
      {
        name: 'Rusizi',
        zones: [
          { name: 'Centre', lat: -2.4900, lng: 28.9100 },
        ],
      },
      {
        name: 'Nyamasheke',
        zones: [
          { name: 'Centre', lat: -2.3300, lng: 29.1300 },
        ],
      },
      {
        name: 'Karongi',
        zones: [
          { name: 'Centre', lat: -2.0600, lng: 29.3900 },
        ],
      },
      {
        name: 'Rutsiro',
        zones: [
          { name: 'Centre', lat: -2.1200, lng: 29.2200 },
        ],
      },
      {
        name: 'Ngororero',
        zones: [
          { name: 'Centre', lat: -1.8700, lng: 29.5300 },
        ],
      },
    ],
  },
];

export function getLocationsForCountry(countryCode: 'BI' | 'RW'): Province[] {
  return countryCode === 'BI' ? BURUNDI_LOCATIONS : RWANDA_LOCATIONS;
}

export function getDefaultCenter(countryCode: 'BI' | 'RW'): { lat: number; lng: number } {
  return countryCode === 'BI'
    ? { lat: -3.3731, lng: 29.3644 } // Bujumbura
    : { lat: -1.9403, lng: 29.8739 }; // Kigali
}

export function getDeliveryAreasForCountry(countryCode: 'BI' | 'RW'): string[] {
  return getLocationsForCountry(countryCode).map((p) => p.name);
}
