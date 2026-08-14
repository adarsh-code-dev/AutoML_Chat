/**
 * DataMind AutoML - Intent Resolver Module
 * Analyzes natural language queries and auto-suggests candidate ML tasks based on schema.
 */

window.IntentResolver = {

  /**
   * Resolve user intent query into target column & ML task type
   * @param {string} prompt 
   * @param {Array<string>} columns 
   * @param {Object} schema 
   * @returns {{target: string|null, task: 'classification'|'regression'|'clustering'|'timeSeries', confidence: number, explanation: string}}
   */
  resolveIntent(prompt, columns, schema) {
    const text = prompt.toLowerCase().trim();

    // 1. Detect task type keywords
    const isClustering = text.includes('group') || text.includes('cluster') || text.includes('segment') || text.includes('persona');
    const isForecast = text.includes('forecast') || text.includes('future') || text.includes('time series') || text.includes('trend') || text.includes('over time');

    // 2. Find target column matching text
    let matchedCol = null;
    let maxMatchLen = 0;

    columns.forEach(col => {
      const colClean = col.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const words = colClean.split(' ').filter(w => w.length > 2);

      words.forEach(w => {
        if (text.includes(w) && w.length > maxMatchLen) {
          matchedCol = col;
          maxMatchLen = w.length;
        }
      });
    });

    if (isClustering) {
      return {
        target: null,
        task: 'clustering',
        confidence: 0.9,
        explanation: 'Identified unsupervised clustering goal to group data points into distinct segments.'
      };
    }

    if (isForecast) {
      // Find datetime column
      const dateCol = columns.find(c => schema[c]?.type === 'datetime') || columns.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time') || c.toLowerCase().includes('month'));
      const numCol = matchedCol && schema[matchedCol]?.type === 'numeric' ? matchedCol : columns.find(c => schema[c]?.type === 'numeric');
      
      return {
        target: numCol,
        dateColumn: dateCol,
        task: 'timeSeries',
        confidence: 0.85,
        explanation: `Identified time-series forecasting task to predict ${numCol || 'target'} across time.`
      };
    }

    // Default to Supervised Classification / Regression
    if (!matchedCol) {
      // Fallback: Pick last categorical column (for classification) or last numeric column (for regression)
      const potentialCategorical = columns.filter(c => schema[c]?.type === 'categorical' && schema[c]?.uniqueCount <= 10);
      const potentialNumeric = columns.filter(c => schema[c]?.type === 'numeric');

      if (potentialCategorical.length > 0) {
        matchedCol = potentialCategorical[potentialCategorical.length - 1];
      } else if (potentialNumeric.length > 0) {
        matchedCol = potentialNumeric[potentialNumeric.length - 1];
      } else {
        matchedCol = columns[columns.length - 1];
      }
    }

    const colMeta = schema[matchedCol];
    if (colMeta && (colMeta.type === 'categorical' || colMeta.uniqueCount <= 15)) {
      return {
        target: matchedCol,
        task: 'classification',
        confidence: 0.88,
        explanation: `Selected column "${matchedCol}" (${colMeta.uniqueCount} distinct classes) for Classification modeling.`
      };
    } else {
      return {
        target: matchedCol,
        task: 'regression',
        confidence: 0.88,
        explanation: `Selected continuous numeric column "${matchedCol}" for Regression price/value prediction.`
      };
    }
  },

  /**
   * Auto-generate Recommended Goal Cards based on Dataset Schema
   */
  generateRecommendedGoals(columns, schema) {
    const goals = [];

    // 1. Check for Classification targets (Categorical or binary columns)
    const classCols = columns.filter(c => {
      const info = schema[c];
      return info && (info.type === 'categorical' || (info.uniqueCount >= 2 && info.uniqueCount <= 10)) && info.type !== 'id';
    });

    classCols.forEach(col => {
      goals.push({
        title: `Predict ${col}`,
        task: 'classification',
        target: col,
        badge: 'Classification',
        badgeClass: 'badge-purple',
        icon: 'fa-user-check',
        description: `Classify target outcomes (${schema[col].uniqueValuesArray.slice(0, 3).join(', ')}...) using surrounding features.`
      });
    });

    // 2. Check for Regression targets (Numeric continuous columns)
    const regCols = columns.filter(c => {
      const info = schema[c];
      return info && info.type === 'numeric' && info.uniqueCount > 10 && !c.toLowerCase().includes('id');
    });

    regCols.slice(0, 2).forEach(col => {
      goals.push({
        title: `Predict ${col}`,
        task: 'regression',
        target: col,
        badge: 'Regression',
        badgeClass: 'badge-blue',
        icon: 'fa-chart-line',
        description: `Estimate continuous value of ${col} (Range: ${schema[col].min} to ${schema[col].max}).`
      });
    });

    // 3. Always offer Unsupervised Clustering
    const numColsCount = columns.filter(c => schema[c]?.type === 'numeric').length;
    if (numColsCount >= 2) {
      goals.push({
        title: 'Discover Data Clusters & Patterns',
        task: 'clustering',
        target: null,
        badge: 'Clustering',
        badgeClass: 'badge-amber',
        icon: 'fa-diagram-project',
        description: `Automatically group data points into distinct behavioral segments without explicit labels.`
      });
    }

    // 4. Time Series if datetime column exists
    const dateCol = columns.find(c => schema[c]?.type === 'datetime' || c.toLowerCase().includes('date') || c.toLowerCase().includes('year'));
    if (dateCol && regCols.length > 0) {
      goals.push({
        title: `Forecast ${regCols[0]} over time`,
        task: 'timeSeries',
        target: regCols[0],
        dateColumn: dateCol,
        badge: 'Time Series',
        badgeClass: 'badge-green',
        icon: 'fa-clock',
        description: `Model historical trends over ${dateCol} to project future periods.`
      });
    }

    return goals;
  }
};
