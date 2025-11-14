/**
 * Utilidades para manejo de texto
 */

/**
 * Normaliza texto removiendo acentos/tildes para búsquedas flexibles
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado sin acentos, en minúsculas y sin espacios extra
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFD') // Descompone los caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Remueve las marcas diacríticas (acentos)
    .trim();
}

/**
 * Función de búsqueda flexible que ignora acentos
 * @param {string} searchTerm - Término de búsqueda
 * @param {string[]} fields - Array de strings donde buscar
 * @returns {boolean} - true si encuentra coincidencia en algún campo
 */
export function flexibleSearch(searchTerm, fields) {
  if (!searchTerm || !fields || fields.length === 0) return true;
  
  const normalizedSearch = normalizeText(searchTerm);
  
  return fields.some(field => {
    const normalizedField = normalizeText(field || '');
    return normalizedField.includes(normalizedSearch);
  });
}

/**
 * Función de búsqueda para objetos con múltiples campos
 * @param {string} searchTerm - Término de búsqueda
 * @param {Object} item - Objeto donde buscar
 * @param {string[]} fieldsToSearch - Array con nombres de los campos a buscar
 * @returns {boolean} - true si encuentra coincidencia
 */
export function searchInObject(searchTerm, item, fieldsToSearch) {
  if (!searchTerm || !item) return true;
  
  const values = fieldsToSearch.map(field => {
    // Soporte para campos anidados usando notación de punto
    const fieldParts = field.split('.');
    let value = item;
    
    for (const part of fieldParts) {
      value = value?.[part];
      if (value === undefined || value === null) break;
    }
    
    return String(value || '');
  });
  
  return flexibleSearch(searchTerm, values);
}

/**
 * Ejemplos de uso:
 * 
 * // Búsqueda simple
 * normalizeText('José María') // 'jose maria'
 * flexibleSearch('jose', ['José María', 'Ana Sofía']) // true
 * 
 * // Búsqueda en objetos
 * const patient = { name: 'José', last_name: 'García', health_insurance: 'OSDE' };
 * searchInObject('jose garcia', patient, ['name', 'last_name']) // true
 * searchInObject('osde', patient, ['health_insurance']) // true
 */