// Real FitSole catalog (scraped from fitsole.shop product feed). Prices in EGP.
// Images are the store's own Shopify CDN photos (transparent — ideal for dark cards).

export type ProductBadge = 'New' | 'Best Seller' | 'Sale' | 'Limited' | 'Verified'
export type ProductBrand = 'Nike' | 'Adidas' | 'Puma' | 'ON' | 'NBA' | 'Wilson'

export interface Product {
  id: string
  name: string
  brand: ProductBrand
  category: string
  price: number
  salePrice?: number
  badge?: ProductBadge
  image: string
  sizes: string[]
  slug: string
}

const ADULT = ['40', '41', '42', '43', '44', '45']
const KIDS = ['33', '34', '35', '36', '37', '38']

export const products: Product[] = [
  {
    id: 'puma-up',
    name: 'PUMA UP',
    brand: 'Puma',
    category: 'Lifestyle',
    price: 4199,
    salePrice: 3569,
    badge: 'Sale',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/372605_07_sv01.png?v=1761576643',
    sizes: ADULT,
    slug: 'puma-up',
  },
  {
    id: 'puma-xray3',
    name: 'X-Ray 3',
    brand: 'Puma',
    category: 'Lifestyle',
    price: 5899,
    badge: 'New',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/400229_11_sv03.png?v=1779319494',
    sizes: ADULT,
    slug: 'puma-x-ray-3',
  },
  {
    id: 'puma-suede',
    name: 'Suede Classic',
    brand: 'Puma',
    category: 'Footwear',
    price: 9299,
    salePrice: 6044,
    badge: 'Sale',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/399781_01.png?v=1761577328',
    sizes: ADULT,
    slug: 'puma-suede-classic',
  },
  {
    id: 'adidas-handball-c',
    name: 'Handball Spezial',
    brand: 'Adidas',
    category: 'Sneakers',
    price: 4799,
    badge: 'Best Seller',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/JI2895_1_FOOTWEAR_Photography_Side_Lateral_Center_View_transparent.png?v=1761566239',
    sizes: ADULT,
    slug: 'adidas-handball-spezial-c',
  },
  {
    id: 'adidas-grandcourt',
    name: 'Grand Court 2.0',
    brand: 'Adidas',
    category: 'Footwear',
    price: 2799,
    salePrice: 1959,
    badge: 'Sale',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/JR5151_1_FOOTWEAR_Photography_Side_Lateral_Center_View_transparent.webp?v=1757644154',
    sizes: ADULT,
    slug: 'adidas-grand-court-2',
  },
  {
    id: 'adidas-taekwondo',
    name: 'Taekwondo Lace',
    brand: 'Adidas',
    category: 'Sneakers',
    price: 8999,
    badge: 'New',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/JS1193_1_FOOTWEAR_Photography_Side_Lateral_Center_View_transparent.webp?v=1757644151',
    sizes: ADULT,
    slug: 'adidas-taekwondo-lace',
  },
  {
    id: 'adidas-ae1',
    name: 'A.E. 1 Low',
    brand: 'Adidas',
    category: 'Basketball',
    price: 8499,
    badge: 'Limited',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/JQ6135_1_FOOTWEAR_Photography_Side_Lateral_Center_View_transparent.webp?v=1757644146',
    sizes: ADULT,
    slug: 'adidas-ae-1-low',
  },
  {
    id: 'adidas-superstar-c',
    name: 'Superstar II',
    brand: 'Adidas',
    category: 'Kids',
    price: 5499,
    salePrice: 2759,
    badge: 'Sale',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/JQ0315_5_FOOTWEAR_Photography_SideMedialCenterView_transparent.png?v=1779184185',
    sizes: KIDS,
    slug: 'adidas-superstar-ii-child',
  },
  {
    id: 'adidas-handball-shoes',
    name: 'Handball Spezial Shoes',
    brand: 'Adidas',
    category: 'Sneakers',
    price: 8499,
    salePrice: 5949,
    badge: 'Sale',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/JH5440_1_FOOTWEAR_Photography_Side_Lateral_Center_View_transparent.webp?v=1757643967',
    sizes: ADULT,
    slug: 'adidas-handball-spezial-shoes',
  },
  {
    id: 'adidas-breaknet',
    name: 'Breaknet 3.0',
    brand: 'Adidas',
    category: 'Footwear',
    price: 3199,
    badge: 'Best Seller',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/JS3676_5_FOOTWEAR_Photography_SideMedialCenterView_transparent.png?v=1779182581',
    sizes: ADULT,
    slug: 'adidas-breaknet-3',
  },
  {
    id: 'on-cloudmonster',
    name: 'Cloudmonster',
    brand: 'ON',
    category: 'Running',
    price: 13000,
    salePrice: 9000,
    badge: 'Sale',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/6197649_461798c6-5f70-4723-96cd-e2d6d67481eb.png?v=1761569815',
    sizes: ADULT,
    slug: 'on-cloudmonster',
  },
  {
    id: 'puma-up-trainers',
    name: 'PUMA UP Trainers',
    brand: 'Puma',
    category: 'Lifestyle',
    price: 4399,
    badge: 'New',
    image: 'https://cdn.shopify.com/s/files/1/0564/0398/4463/files/372605_48_sv01.png?v=1762834180',
    sizes: ADULT,
    slug: 'puma-up-trainers',
  },
]

export const BRAND_COLORS: Record<ProductBrand, string> = {
  Nike: '#F5F5F5',
  Adidas: '#FFFFFF',
  Puma: '#E4A200',
  ON: '#00B4D8',
  NBA: '#C8102E',
  Wilson: '#E87D0D',
}

export const newArrivals = products.filter((p) => p.badge === 'New' || p.badge === 'Limited')
export const bestSellers = products.filter((p) => p.badge === 'Best Seller')
export const onSale = products.filter((p) => p.badge === 'Sale' || p.salePrice)

export function formatPrice(price: number) {
  return `${price.toLocaleString('en-EG')} EGP`
}
