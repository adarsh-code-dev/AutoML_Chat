/**
 * DataMind AutoML - Data Parser Module
 * Handles CSV and Excel (.xlsx, .xls) file parsing, schema inference, and summary stats.
 */

window.DataParser = {
  
  /**
   * Parse CSV File or String
   * @param {File|string} fileInput 
   * @returns {Promise<{data: Array<Object>, columns: Array<string>, sheets?: Array<string>}>}
   */
  async parseCSV(fileInput) {
    return new Promise((resolve, reject) => {
      Papa.parse(fileInput, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0 && results.data.length === 0) {
            return reject(new Error('Failed to parse CSV file: ' + results.errors[0].message));
          }
          const columns = results.meta.fields || (results.data[0] ? Object.keys(results.data[0]) : []);
          resolve({
            data: results.data,
            columns: columns.map(c => c.trim())
          });
        },
        error: (err) => reject(err)
      });
    });
  },

  /**
   * Parse Excel (.xlsx / .xls) File
   * @param {ArrayBuffer} arrayBuffer 
   * @param {string} [sheetName] 
   * @returns {{data: Array<Object>, columns: Array<string>, sheetNames: Array<string>, selectedSheet: string}}
   */
  parseExcel(arrayBuffer, sheetName = null) {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      if (!sheetNames || sheetNames.length === 0) {
        throw new Error('No worksheets found in Excel file.');
      }

      const targetSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
      const worksheet = workbook.Sheets[targetSheet];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      if (rawData.length === 0) {
        throw new Error(`Sheet "${targetSheet}" is empty.`);
      }

      const columns = Object.keys(rawData[0]).map(c => String(c).trim());

      return {
        data: rawData,
        columns,
        sheetNames,
        selectedSheet: targetSheet
      };
    } catch (err) {
      throw new Error('Failed to parse Excel file: ' + err.message);
    }
  },

  /**
   * Infer Column Data Types & Detailed Schema Info
   * @param {Array<Object>} data 
   * @param {Array<string>} columns 
   * @returns {Object<string, {type: 'numeric'|'categorical'|'datetime'|'id', missing: number, uniqueCount: number, min?: number, max?: number, mean?: number, samples: Array}>}
   */
  inferSchema(data, columns) {
    const schema = {};
    const sampleSize = Math.min(data.length, 500);

    columns.forEach(col => {
      let numericCount = 0;
      let missingCount = 0;
      let dateCount = 0;
      const uniqueValues = new Set();
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      const samples = [];

      for (let i = 0; i < data.length; i++) {
        const val = data[i][col];

        if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) {
          missingCount++;
          continue;
        }

        uniqueValues.add(String(val));
        if (samples.length < 5) samples.push(val);

        // Check if numeric
        const num = Number(val);
        if (!isNaN(num) && typeof val !== 'boolean') {
          numericCount++;
          sum += num;
          if (num < min) min = num;
          if (num > max) max = num;
        }

        // Check date
        if (typeof val === 'string' && val.length > 5 && !isNaN(Date.parse(val)) && isNaN(Number(val))) {
          dateCount++;
        }
      }

      const validRows = data.length - missingCount;
      let type = 'categorical';

      if (validRows > 0 && (numericCount / validRows) > 0.8) {
        // If unique count equals total rows and integers, might be ID
        if (uniqueValues.size === data.length && (col.toLowerCase().includes('id') || col.toLowerCase().includes('index'))) {
          type = 'id';
        } else {
          type = 'numeric';
        }
      } else if (validRows > 0 && (dateCount / validRows) > 0.7) {
        type = 'datetime';
      } else if (uniqueValues.size === data.length && data.length > 20) {
        type = 'id';
      }

      schema[col] = {
        type,
        missing: missingCount,
        missingPct: Math.round((missingCount / data.length) * 100),
        uniqueCount: uniqueValues.size,
        uniqueValuesArray: Array.from(uniqueValues).slice(0, 50),
        min: min === Infinity ? undefined : min,
        max: max === -Infinity ? undefined : max,
        mean: numericCount > 0 ? sum / numericCount : undefined,
        samples
      };
    });

    return schema;
  },

  /**
   * Compute Overall Dataset Health Score (0 - 100%)
   */
  computeHealthScore(data, schema) {
    const totalCells = data.length * Object.keys(schema).length;
    let totalMissing = 0;
    Object.values(schema).forEach(s => totalMissing += s.missing);

    const missingRatio = totalMissing / (totalCells || 1);
    let score = 100 - Math.round(missingRatio * 100);
    if (score < 0) score = 0;
    return score;
  }
};
