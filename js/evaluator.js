/**
 * DataMind AutoML - Evaluator Module
 * Evaluates model metrics (Accuracy, F1, R2, RMSE), builds comparison leaderboard, and extracts feature importances.
 */

window.Evaluator = {

  /**
   * Evaluate Classification Model
   */
  evaluateClassification(model, XTest, yTest, targetClasses = ['Class 0', 'Class 1']) {
    const predictions = model.predict(XTest);
    const numClasses = targetClasses.length;

    let correct = 0;
    const confMatrix = Array(numClasses).fill(0).map(() => Array(numClasses).fill(0));

    predictions.forEach((pred, i) => {
      const actual = yTest[i] ?? 0;
      const predicted = pred.class ?? 0;

      if (actual === predicted) correct++;
      if (confMatrix[actual] && confMatrix[actual][predicted] !== undefined) {
        confMatrix[actual][predicted]++;
      }
    });

    const accuracy = correct / (XTest.length || 1);

    // Calculate Macro F1 Score
    let sumF1 = 0;
    for (let c = 0; c < numClasses; c++) {
      let tp = confMatrix[c][c];
      let fp = 0, fn = 0;
      for (let k = 0; k < numClasses; k++) {
        if (k !== c) {
          fp += confMatrix[k][c];
          fn += confMatrix[c][k];
        }
      }
      const precision = tp / (tp + fp || 1);
      const recall = tp / (tp + fn || 1);
      const f1 = (2 * precision * recall) / (precision + recall || 1);
      sumF1 += f1;
    }

    const macroF1 = sumF1 / numClasses;

    return {
      accuracy: Math.round(accuracy * 1000) / 10, // e.g. 94.5%
      f1Score: Math.round(macroF1 * 100) / 100,
      confMatrix,
      primaryMetricName: 'Accuracy',
      primaryMetricVal: `${Math.round(accuracy * 1000) / 10}%`,
      secondaryMetricName: 'F1-Score',
      secondaryMetricVal: `${Math.round(macroF1 * 100) / 100}`,
      rawScore: accuracy
    };
  },

  /**
   * Evaluate Regression Model
   */
  evaluateRegression(model, XTest, yTest) {
    const predictions = model.predict(XTest);
    const n = yTest.length;

    let sumActual = 0;
    yTest.forEach(v => sumActual += v);
    const meanActual = sumActual / (n || 1);

    let ssTot = 0;
    let ssRes = 0;
    let sumAbsErr = 0;

    predictions.forEach((pred, i) => {
      const actual = yTest[i];
      const predicted = pred.value;
      const err = actual - predicted;

      ssRes += err * err;
      ssTot += Math.pow(actual - meanActual, 2);
      sumAbsErr += Math.abs(err);
    });

    const r2 = 1 - (ssRes / (ssTot || 1e-5));
    const rmse = Math.sqrt(ssRes / (n || 1));
    const mae = sumAbsErr / (n || 1);

    return {
      r2Score: Math.round(r2 * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      mae: Math.round(mae * 100) / 100,
      primaryMetricName: 'R² Score',
      primaryMetricVal: `${Math.round(r2 * 100) / 100}`,
      secondaryMetricName: 'RMSE',
      secondaryMetricVal: `${Math.round(rmse * 100) / 100}`,
      rawScore: r2,
      actualVsPred: predictions.slice(0, 30).map((p, i) => ({ actual: yTest[i], predicted: p.value }))
    };
  },

  /**
   * Evaluate Clustering Model
   */
  evaluateClustering(model, X) {
    // Compute Silhouette Score approximation
    const K = model.K;
    const assignments = model.assignments;
    const centroids = model.centroids;

    let totalDistWithin = 0;
    for (let i = 0; i < X.length; i++) {
      const k = assignments[i];
      let d = 0;
      for (let j = 0; j < X[0].length; j++) d += Math.pow(X[i][j] - centroids[k][j], 2);
      totalDistWithin += Math.sqrt(d);
    }

    const avgDist = totalDistWithin / (X.length || 1);
    const approxSilhouette = Math.max(0.1, 1 - (avgDist / 5));

    return {
      silhouette: Math.round(approxSilhouette * 100) / 100,
      inertia: Math.round(totalDistWithin),
      primaryMetricName: 'Silhouette Score',
      primaryMetricVal: `${Math.round(approxSilhouette * 100) / 100}`,
      secondaryMetricName: 'Inertia (WSS)',
      secondaryMetricVal: `${Math.round(totalDistWithin)}`,
      rawScore: approxSilhouette
    };
  },

  /**
   * Build Sorted Model Leaderboard
   */
  buildLeaderboard(modelResults) {
    const sorted = [...modelResults].sort((a, b) => b.eval.rawScore - a.eval.rawScore);

    sorted.forEach((item, index) => {
      item.rank = index + 1;
      item.isWinner = index === 0;
    });

    return sorted;
  },

  /**
   * Format Feature Importances
   */
  formatFeatureImportances(featureNames, rawImportances) {
    let sum = 0;
    rawImportances.forEach(v => sum += Math.abs(v));
    sum = sum || 1;

    const items = featureNames.map((name, i) => {
      const score = Math.abs(rawImportances[i] || 0) / sum;
      return { name, score: Math.round(score * 1000) / 10 };
    });

    items.sort((a, b) => b.score - a.score);
    return items.slice(0, 8); // Top 8 features
  }
};
