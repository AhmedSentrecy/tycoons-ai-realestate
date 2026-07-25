export interface Project {
  id: string;
  image: string;
  badge: string;
  type: string;
  developer: string;
  title: string;
  location: string;
  regionSlug: string;
  price: string;
  priceM: number; // السعر بالمليون جنيه — للبحث بالميزانية
  beds: string;
  area: string;
  delivery: string;
}

export const projects: Project[] = [
  {
    id: "hydepark-villa",
    image: "/images/project-villa.webp",
    badge: "جديد",
    type: "فيلا",
    developer: "Hydepark Developments",
    title: "Standalone Villa Hydepark New Cairo",
    location: "التجمع / القاهرة الجديدة",
    regionSlug: "new-cairo",
    price: "٧٤.٣ مليون جنيه",
    priceM: 74.3,
    beds: "٥",
    area: "٣٢٨ م²",
    delivery: "سنة واحدة",
  },
  {
    id: "hydepark-townhouse",
    image: "/images/project-townhouse.webp",
    badge: "جديد",
    type: "تاون هاوس",
    developer: "Hydepark Developments",
    title: "Townhouse Hydepark New Cairo",
    location: "التجمع / القاهرة الجديدة",
    regionSlug: "new-cairo",
    price: "٢٩.٤ مليون جنيه",
    priceM: 29.4,
    beds: "٣",
    area: "١٥٩ م²",
    delivery: "سنة واحدة",
  },
  {
    id: "lavista-chalet",
    image: "/images/project-chalet.webp",
    badge: "متاح",
    type: "شاليه",
    developer: "La Vista Developments",
    title: "Chalet La Vista North Coast",
    location: "الساحل الشمالي",
    regionSlug: "sahel",
    price: "١٨.٩ مليون جنيه",
    priceM: 18.9,
    beds: "٣",
    area: "١٤٥ م²",
    delivery: "استلام فوري",
  },
  {
    id: "sodic-apartment",
    image: "/images/project-apartment.webp",
    badge: "متاح",
    type: "شقة",
    developer: "SODIC",
    title: "Apartment SODIC West Zayed",
    location: "الشيخ زايد",
    regionSlug: "zayed",
    price: "٦.٨ مليون جنيه",
    priceM: 6.8,
    beds: "٢",
    area: "١٢٠ م²",
    delivery: "سنتين",
  },
  {
    id: "mv-penthouse",
    image: "/images/region-newcairo.webp",
    badge: "جديد",
    type: "بنتهاوس",
    developer: "Mountain View",
    title: "Penthouse MV Grand Valleys",
    location: "التجمع / القاهرة الجديدة",
    regionSlug: "new-cairo",
    price: "٢٢.٥ مليون جنيه",
    priceM: 22.5,
    beds: "٤",
    area: "٢١٠ م²",
    delivery: "سنتين",
  },
  {
    id: "capital-apartment",
    image: "/images/region-capital.webp",
    badge: "متاح",
    type: "شقة",
    developer: "PRE Group",
    title: "Apartment Capital Heights",
    location: "العاصمة الإدارية",
    regionSlug: "capital",
    price: "٢.٤ مليون جنيه",
    priceM: 2.4,
    beds: "٢",
    area: "١١٠ م²",
    delivery: "٣ سنين",
  },
];
