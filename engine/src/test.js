import { normalizarUrl } from './lib/db.js';
import { config } from './config.js';

console.log('Dominios permitidos:', config.crawler.dominiosPermitidos);

const urlPrueba = 'https://www.juntadeandalucia.es/organismos/empleoempresaytrabajoautonomo/areas/empleo/incentivos-contratacion/paginas/empleat.html';
console.log('URL de prueba:', urlPrueba);
console.log('Resultado normalizarUrl:', normalizarUrl(urlPrueba));