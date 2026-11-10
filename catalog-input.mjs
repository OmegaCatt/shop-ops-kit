import {parseDelimited} from './engine.mjs';
export const CATALOG_FIELDS=['sku','market','title','price','currency','stock','url'];
export function parseCatalog(text,filename='catalog.csv'){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>2_000_000)throw Error('Limit souboru je 2 MB.');
 if(!/\.json$/i.test(filename)){const rows=parseDelimited(text);if(rows.length>10000)throw Error('Maximálně 10 000 řádků.');return rows;}
 let data;try{data=JSON.parse(text)}catch{throw Error('Neplatný JSON.');}
 if(data?.format!=='shop-ops-catalog'||data.version!==1||!Array.isArray(data.products)||data.products.length>10000||Object.keys(data).some(key=>!['format','version','products'].includes(key)))throw Error('JSON musí mít format shop-ops-catalog, version 1 a products (do 10 000).');
 return data.products.map((product,index)=>{
   if(!product||typeof product!=='object'||Array.isArray(product)||Object.keys(product).length!==CATALOG_FIELDS.length||CATALOG_FIELDS.some(key=>!Object.hasOwn(product,key)||typeof product[key]!=='string'||product[key].length>2000))throw Error('Položka '+(index+1)+' musí obsahovat právě sedm textových polí katalogu. Cena a sklad jsou původní textové hodnoty.');
   return {...Object.fromEntries(CATALOG_FIELDS.map(key=>[key,product[key].trim()])),_row:index+1,_location:'products['+index+']',_format:'json'};
 });
}
export const catalogJson=rows=>JSON.stringify({format:'shop-ops-catalog',version:1,products:rows.map(row=>Object.fromEntries(CATALOG_FIELDS.map(key=>[key,String(row[key]??'')])) )},null,2);
