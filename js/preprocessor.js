/**
 * DataMind AutoML - Preprocessor Module
 * Implements strict featurization ordering, missing value imputation, one-hot encoding, and scaling.
 */

window.Preprocessor = {

  /**
   * Process raw dataset records into clean numerical tensors X and target vector y
   * @param {Array<Object>} rawData 
   * @param {Array<string>} columns 
   * @param {Object} schema 
   * @param {string|null} targetCol 
   * @param {string} taskType 
   * @returns {{XTrain: Array<Array<number>>, yTrain: Array<any>, XTest: Array<Array<number>>, yTest: Array<any>, featureNames: Array<string>, targetClasses?: Array<string>, scalers: Object}}
   */
  prepareTrainTest(rawData, columns, schema, targetCol, taskType = 'classification') {
    // 1. Filter out ID columns and target from features
    const featureCols = columns.filter(col => col !== targetCol && schema[col]?.type !== 'id' && schema[col]?.type !== 'datetime');

    // 2. Perform 80/20 Train/Test split BEFORE fitting preprocessors (Strict featurization ordering rule)
    const shuffledData = [...rawData].sort(() => 0.5 - Math.random());
    const splitIndex = Math.floor(shuffledData.length * 0.8);
    const trainRaw = shuffledData.slice(0, splitIndex);
    const testRaw = shuffledData.slice(splitIndex);

    // 3. Learn Imputers & Encoders on Training set ONLY
    const featureEncoders = {};
    const featureNames = [];

    featureCols.forEach(col => {
      const colType = schema[col]?.type || 'categorical';

      if (colType === 'numeric') {
        // Learn mean for imputation
        let sum = 0, count = 0;
        trainRaw.forEach(row => {
          const v = Number(row[col]);
          if (!isNaN(v) && row[col] !== null && row[col] !== undefined) {
            sum += v;
            count++;
          }
        });
        const mean = count > 0 ? sum / count : 0;
        featureEncoders[col] = { type: 'numeric', mean };
        featureNames.push(col);

      } else {
        // Learn One-Hot Categories (top 10 most frequent)
        const counts = {};
        trainRaw.forEach(row => {
          const v = String(row[col] ?? 'Missing');
          counts[v] = (counts[v] || 0) + 1;
        });
        const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
        featureEncoders[col] = { type: 'categorical', categories, defaultCat: categories[0] || 'Missing' };

        categories.forEach(cat => {
          featureNames.push(`${col}_${cat}`);
        });
      }
    });

    // 4. Encode Features Vector Matrix
    const encodeRow = (row) => {
      const vec = [];
      featureCols.forEach(col => {
        const enc = featureEncoders[col];
        if (enc.type === 'numeric') {
          let val = Number(row[col]);
          if (isNaN(val) || row[col] === null || row[col] === undefined) {
            val = enc.mean;
          }
          vec.push(val);
        } else {
          const val = String(row[col] ?? 'Missing');
          enc.categories.forEach(cat => {
            vec.push(val === cat ? 1 : 0);
          });
        }
      });
      return vec;
    };

    let XTrain = trainRaw.map(encodeRow);
    let XTest = testRaw.map(encodeRow);

    // 5. Fit Standard Scaler on Training features (z-score: (x - mean)/std)
    const scalers = [];
    const numFeatures = featureNames.length;

    for (let j = 0; j < numFeatures; j++) {
      let sum = 0;
      for (let i = 0; i < XTrain.length; i++) sum += XTrain[i][j];
      const mean = sum / (XTrain.length || 1);

      let varianceSum = 0;
      for (let i = 0; i < XTrain.length; i++) varianceSum += Math.pow(XTrain[i][j] - mean, 2);
      const std = Math.sqrt(varianceSum / (XTrain.length || 1)) || 1e-5;

      scalers.push({ mean, std });
    }

    // Apply scaling to Train and Test
    XTrain = XTrain.map(row => row.map((v, j) => (v - scalers[j].mean) / scalers[j].std));
    XTest = XTest.map(row => row.map((v, j) => (v - scalers[j].mean) / scalers[j].std));

    // 6. Encode Target vector y
    let yTrain = [];
    let yTest = [];
    let targetClasses = undefined;

    if (taskType === 'classification' && targetCol) {
      const classMap = {};
      const uniqueClasses = [];
      trainRaw.forEach(row => {
        const val = String(row[targetCol] ?? 'Unknown');
        if (!(val in classMap)) {
          classMap[val] = uniqueClasses.length;
          uniqueClasses.push(val);
        }
      });

      targetClasses = uniqueClasses;
      yTrain = trainRaw.map(row => classMap[String(row[targetCol] ?? 'Unknown')] ?? 0);
      yTest = testRaw.map(row => classMap[String(row[targetCol] ?? 'Unknown')] ?? 0);

    } else if (taskType === 'regression' && targetCol) {
      const meanTarget = schema[targetCol]?.mean || 0;
      yTrain = trainRaw.map(row => {
        const val = Number(row[targetCol]);
        return isNaN(val) ? meanTarget : val;
      });
      yTest = testRaw.map(row => {
        const val = Number(row[targetCol]);
        return isNaN(val) ? meanTarget : val;
      });
    }

    return {
      XTrain,
      yTrain,
      XTest,
      yTest,
      featureNames,
      targetClasses,
      scalers,
      featureEncoders,
      featureCols
    };
  }
};
