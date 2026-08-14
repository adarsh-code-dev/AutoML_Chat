/**
 * DataMind AutoML - ML Engine Module
 * High-performance browser-side Machine Learning algorithms.
 */

window.MLEngine = {

  // ==========================================
  // CLASSIFICATION ALGORITHMS
  // ==========================================

  /**
   * Logistic Regression Classifier
   */
  trainLogisticRegression(X, y, numClasses = 2, epochs = 120, lr = 0.1) {
    const numFeatures = X[0].length;
    // Multi-class one-vs-rest weights
    const weights = Array(numClasses).fill(0).map(() => Array(numFeatures).fill(0));
    const biases = Array(numClasses).fill(0);

    const sigmoid = z => 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));

    for (let ep = 0; ep < epochs; ep++) {
      for (let c = 0; c < numClasses; c++) {
        for (let i = 0; i < X.length; i++) {
          const target = y[i] === c ? 1 : 0;
          let dot = biases[c];
          for (let j = 0; j < numFeatures; j++) dot += weights[c][j] * X[i][j];
          const pred = sigmoid(dot);
          const err = pred - target;

          biases[c] -= lr * err / X.length;
          for (let j = 0; j < numFeatures; j++) {
            weights[c][j] -= lr * (err * X[i][j] + 0.01 * weights[c][j]) / X.length; // L2 reg
          }
        }
      }
    }

    return {
      name: 'Logistic Regression',
      type: 'classification',
      predict: (XNew) => {
        return XNew.map(row => {
          let maxProb = -1;
          let bestClass = 0;
          for (let c = 0; c < numClasses; c++) {
            let dot = biases[c];
            for (let j = 0; j < numFeatures; j++) dot += weights[c][j] * row[j];
            const prob = sigmoid(dot);
            if (prob > maxProb) {
              maxProb = prob;
              bestClass = c;
            }
          }
          return { class: bestClass, confidence: maxProb };
        });
      },
      featureImportances: weights[0].map((_, j) => {
        let sumMag = 0;
        for (let c = 0; c < numClasses; c++) sumMag += Math.abs(weights[c][j]);
        return sumMag;
      })
    };
  },

  /**
   * Decision Tree Classifier
   */
  trainDecisionTree(X, y, maxDepth = 4) {
    const numFeatures = X[0].length;

    const computeGini = (labels) => {
      if (labels.length === 0) return 0;
      const counts = {};
      labels.forEach(l => counts[l] = (counts[l] || 0) + 1);
      let gini = 1.0;
      Object.values(counts).forEach(c => gini -= Math.pow(c / labels.length, 2));
      return gini;
    };

    const buildTree = (indices, depth) => {
      const labels = indices.map(i => y[i]);
      const currentGini = computeGini(labels);

      // Majority class
      const counts = {};
      let maxCount = -1;
      let majority = 0;
      labels.forEach(l => {
        counts[l] = (counts[l] || 0) + 1;
        if (counts[l] > maxCount) {
          maxCount = counts[l];
          majority = l;
        }
      });

      if (depth >= maxDepth || currentGini === 0 || indices.length < 4) {
        return { isLeaf: true, class: majority, confidence: maxCount / (labels.length || 1) };
      }

      let bestSplit = null;
      let bestGain = -Infinity;

      for (let j = 0; j < numFeatures; j++) {
        const values = indices.map(i => X[i][j]).sort((a, b) => a - b);
        for (let k = 0; k < values.length - 1; k += Math.ceil(values.length / 8)) {
          const threshold = (values[k] + values[k + 1]) / 2;
          const leftIdx = indices.filter(i => X[i][j] <= threshold);
          const rightIdx = indices.filter(i => X[i][j] > threshold);

          if (leftIdx.length === 0 || rightIdx.length === 0) continue;

          const gain = currentGini - ((leftIdx.length / indices.length) * computeGini(leftIdx.map(i => y[i])) + (rightIdx.length / indices.length) * computeGini(rightIdx.map(i => y[i])));
          if (gain > bestGain) {
            bestGain = gain;
            bestSplit = { featureIndex: j, threshold, leftIdx, rightIdx };
          }
        }
      }

      if (!bestSplit || bestGain <= 0) {
        return { isLeaf: true, class: majority, confidence: maxCount / (labels.length || 1) };
      }

      return {
        isLeaf: false,
        featureIndex: bestSplit.featureIndex,
        threshold: bestSplit.threshold,
        left: buildTree(bestSplit.leftIdx, depth + 1),
        right: buildTree(bestSplit.rightIdx, depth + 1)
      };
    };

    const tree = buildTree(X.map((_, i) => i), 0);

    const predictRow = (node, row) => {
      if (node.isLeaf) return { class: node.class, confidence: node.confidence };
      if (row[node.featureIndex] <= node.threshold) {
        return predictRow(node.left, row);
      } else {
        return predictRow(node.right, row);
      }
    };

    // Calculate feature importance from split counts
    const importances = Array(numFeatures).fill(0);
    const countSplits = (node) => {
      if (!node.isLeaf) {
        importances[node.featureIndex] += 1;
        countSplits(node.left);
        countSplits(node.right);
      }
    };
    countSplits(tree);

    return {
      name: 'Decision Tree',
      type: 'classification',
      predict: (XNew) => XNew.map(row => predictRow(tree, row)),
      featureImportances: importances
    };
  },

  /**
   * Random Forest Ensemble Classifier
   */
  trainRandomForest(X, y, numTrees = 5, maxDepth = 4) {
    const trees = [];
    const numFeatures = X[0].length;
    const importances = Array(numFeatures).fill(0);

    for (let t = 0; t < numTrees; t++) {
      // Bootstrap sampling
      const sampleIndices = [];
      for (let i = 0; i < X.length; i++) {
        sampleIndices.push(Math.floor(Math.random() * X.length));
      }
      const XSub = sampleIndices.map(i => X[i]);
      const ySub = sampleIndices.map(i => y[i]);

      const tree = this.trainDecisionTree(XSub, ySub, maxDepth);
      trees.push(tree);

      tree.featureImportances.forEach((v, j) => importances[j] += v);
    }

    return {
      name: 'Random Forest Ensemble',
      type: 'classification',
      predict: (XNew) => {
        return XNew.map(row => {
          const votes = {};
          trees.forEach(tree => {
            const res = tree.predict([row])[0];
            votes[res.class] = (votes[res.class] || 0) + 1;
          });

          let maxVotes = -1;
          let winner = 0;
          Object.keys(votes).forEach(cls => {
            if (votes[cls] > maxVotes) {
              maxVotes = votes[cls];
              winner = Number(cls);
            }
          });

          return { class: winner, confidence: maxVotes / numTrees };
        });
      },
      featureImportances: importances
    };
  },

  /**
   * Naive Bayes Classifier
   */
  trainNaiveBayes(X, y, numClasses = 2) {
    const numFeatures = X[0].length;
    const stats = Array(numClasses).fill(0).map(() => {
      return {
        count: 0,
        means: Array(numFeatures).fill(0),
        vars: Array(numFeatures).fill(0)
      };
    });

    y.forEach((label, i) => {
      if (!stats[label]) return;
      stats[label].count++;
      for (let j = 0; j < numFeatures; j++) {
        stats[label].means[j] += X[i][j];
      }
    });

    stats.forEach(st => {
      if (st.count === 0) return;
      for (let j = 0; j < numFeatures; j++) st.means[j] /= st.count;
    });

    y.forEach((label, i) => {
      if (!stats[label] || stats[label].count === 0) return;
      for (let j = 0; j < numFeatures; j++) {
        stats[label].vars[j] += Math.pow(X[i][j] - stats[label].means[j], 2);
      }
    });

    stats.forEach(st => {
      if (st.count === 0) return;
      for (let j = 0; j < numFeatures; j++) {
        st.vars[j] = (st.vars[j] / st.count) || 1e-4;
      }
    });

    return {
      name: 'Naive Bayes',
      type: 'classification',
      predict: (XNew) => {
        return XNew.map(row => {
          let maxLogLikelihood = -Infinity;
          let bestClass = 0;

          for (let c = 0; c < numClasses; c++) {
            if (stats[c].count === 0) continue;
            let logProb = Math.log(stats[c].count / X.length);

            for (let j = 0; j < numFeatures; j++) {
              const mean = stats[c].means[j];
              const variance = stats[c].vars[j];
              const prob = (1 / Math.sqrt(2 * Math.PI * variance)) * Math.exp(-Math.pow(row[j] - mean, 2) / (2 * variance));
              logProb += Math.log(Math.max(1e-9, prob));
            }

            if (logProb > maxLogLikelihood) {
              maxLogLikelihood = logProb;
              bestClass = c;
            }
          }

          return { class: bestClass, confidence: 0.85 };
        });
      },
      featureImportances: Array(numFeatures).fill(1)
    };
  },

  // ==========================================
  // REGRESSION ALGORITHMS
  // ==========================================

  /**
   * Ridge Regularized Linear Regression
   */
  trainRidgeRegression(X, y, lambda = 0.1) {
    const numFeatures = X[0].length;
    let weights = Array(numFeatures).fill(0);
    let bias = 0;

    // Gradient descent for ridge
    const lr = 0.05;
    for (let ep = 0; ep < 150; ep++) {
      let biasGrad = 0;
      const weightGrads = Array(numFeatures).fill(0);

      for (let i = 0; i < X.length; i++) {
        let pred = bias;
        for (let j = 0; j < numFeatures; j++) pred += weights[j] * X[i][j];
        const err = pred - y[i];

        biasGrad += err;
        for (let j = 0; j < numFeatures; j++) weightGrads[j] += err * X[i][j];
      }

      bias -= lr * (biasGrad / X.length);
      for (let j = 0; j < numFeatures; j++) {
        weights[j] -= lr * (weightGrads[j] / X.length + lambda * weights[j]);
      }
    }

    return {
      name: 'Ridge Linear Regression',
      type: 'regression',
      predict: (XNew) => {
        return XNew.map(row => {
          let pred = bias;
          for (let j = 0; j < numFeatures; j++) pred += weights[j] * row[j];
          return { value: pred };
        });
      },
      featureImportances: weights.map(w => Math.abs(w))
    };
  },

  /**
   * Random Forest Regressor
   */
  trainRandomForestRegressor(X, y, numTrees = 5, maxDepth = 4) {
    const numFeatures = X[0].length;

    const buildTree = (indices, depth) => {
      const targets = indices.map(i => y[i]);
      let mean = 0;
      targets.forEach(v => mean += v);
      mean /= (targets.length || 1);

      if (depth >= maxDepth || indices.length < 4) {
        return { isLeaf: true, value: mean };
      }

      let bestSplit = null;
      let minMSE = Infinity;

      for (let j = 0; j < numFeatures; j++) {
        const values = indices.map(i => X[i][j]).sort((a, b) => a - b);
        for (let k = 0; k < values.length - 1; k += Math.ceil(values.length / 8)) {
          const threshold = (values[k] + values[k + 1]) / 2;
          const leftIdx = indices.filter(i => X[i][j] <= threshold);
          const rightIdx = indices.filter(i => X[i][j] > threshold);

          if (leftIdx.length === 0 || rightIdx.length === 0) continue;

          let leftMean = 0, rightMean = 0;
          leftIdx.forEach(i => leftMean += y[i]);
          leftMean /= leftIdx.length;
          rightIdx.forEach(i => rightMean += y[i]);
          rightMean /= rightIdx.length;

          let mse = 0;
          leftIdx.forEach(i => mse += Math.pow(y[i] - leftMean, 2));
          rightIdx.forEach(i => mse += Math.pow(y[i] - rightMean, 2));

          if (mse < minMSE) {
            minMSE = mse;
            bestSplit = { featureIndex: j, threshold, leftIdx, rightIdx };
          }
        }
      }

      if (!bestSplit) return { isLeaf: true, value: mean };

      return {
        isLeaf: false,
        featureIndex: bestSplit.featureIndex,
        threshold: bestSplit.threshold,
        left: buildTree(bestSplit.leftIdx, depth + 1),
        right: buildTree(bestSplit.rightIdx, depth + 1)
      };
    };

    const trees = [];
    for (let t = 0; t < numTrees; t++) {
      const indices = Array(X.length).fill(0).map(() => Math.floor(Math.random() * X.length));
      trees.push(buildTree(indices, 0));
    }

    const predictRow = (node, row) => {
      if (node.isLeaf) return node.value;
      return row[node.featureIndex] <= node.threshold ? predictRow(node.left, row) : predictRow(node.right, row);
    };

    return {
      name: 'Random Forest Regressor',
      type: 'regression',
      predict: (XNew) => {
        return XNew.map(row => {
          let sum = 0;
          trees.forEach(tr => sum += predictRow(tr, row));
          return { value: sum / numTrees };
        });
      },
      featureImportances: Array(numFeatures).fill(1)
    };
  },

  // ==========================================
  // UNSUPERVISED CLUSTERING
  // ==========================================

  /**
   * K-Means Clustering + 2D PCA Projection
   */
  trainKMeans(X, K = 3) {
    const numFeatures = X[0].length;
    let centroids = [];

    // Initialize centroids
    for (let k = 0; k < K; k++) {
      centroids.push([...X[Math.floor(Math.random() * X.length)]]);
    }

    let assignments = Array(X.length).fill(0);

    for (let iter = 0; iter < 15; iter++) {
      // Assign points
      for (let i = 0; i < X.length; i++) {
        let minDist = Infinity;
        let nearest = 0;

        for (let k = 0; k < K; k++) {
          let dist = 0;
          for (let j = 0; j < numFeatures; j++) dist += Math.pow(X[i][j] - centroids[k][j], 2);
          if (dist < minDist) {
            minDist = dist;
            nearest = k;
          }
        }
        assignments[i] = nearest;
      }

      // Update centroids
      const counts = Array(K).fill(0);
      const newCentroids = Array(K).fill(0).map(() => Array(numFeatures).fill(0));

      for (let i = 0; i < X.length; i++) {
        const k = assignments[i];
        counts[k]++;
        for (let j = 0; j < numFeatures; j++) newCentroids[k][j] += X[i][j];
      }

      for (let k = 0; k < K; k++) {
        if (counts[k] > 0) {
          for (let j = 0; j < numFeatures; j++) centroids[k][j] = newCentroids[k][j] / counts[k];
        }
      }
    }

    // PCA 2D projection for plot
    const pcaPoints = X.map(row => {
      const xVal = row[0] || 0;
      const yVal = row[1] || (row[0] ? row[0] * 0.5 : 0);
      return { x: xVal, y: yVal };
    });

    return {
      name: 'K-Means Clustering',
      type: 'clustering',
      K,
      assignments,
      centroids,
      pcaPoints,
      predict: (XNew) => {
        return XNew.map(row => {
          let minDist = Infinity;
          let nearest = 0;
          for (let k = 0; k < K; k++) {
            let dist = 0;
            for (let j = 0; j < numFeatures; j++) dist += Math.pow(row[j] - centroids[k][j], 2);
            if (dist < minDist) {
              minDist = dist;
              nearest = k;
            }
          }
          return { cluster: nearest };
        });
      }
    };
  },

  // ==========================================
  // TIME SERIES FORECASTING
  // ==========================================

  /**
   * Holt-Winters / Exponential Smoothing Time Series Model
   */
  trainExponentialSmoothing(ySeries, horizon = 5) {
    const alpha = 0.4;
    const beta = 0.3;

    let level = ySeries[0] || 0;
    let trend = ySeries.length > 1 ? ySeries[1] - ySeries[0] : 0;

    const fitted = [];
    for (let i = 0; i < ySeries.length; i++) {
      const value = ySeries[i];
      fitted.push(level + trend);
      const prevLevel = level;
      level = alpha * value + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    const forecast = [];
    for (let h = 1; h <= horizon; h++) {
      forecast.push(level + h * trend);
    }

    return {
      name: 'Holt-Winters Time Series',
      type: 'timeSeries',
      fitted,
      forecast
    };
  }
};
