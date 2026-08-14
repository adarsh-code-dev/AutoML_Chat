/**
 * DataMind AutoML - Main Application Orchestrator
 */

window.App = {

  currentRawData: null,
  currentColumns: null,
  currentSchema: null,
  currentHealthScore: 100,
  currentFilename: 'Dataset.csv',
  currentProcessedData: null,

  async init() {
    UIController.init();
    console.log('DataMind AutoML initialized successfully.');
  },

  /**
   * Handle Uploaded File (CSV or Excel)
   */
  async handleFileSelect(file) {
    try {
      this.currentFilename = file.name;
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'csv') {
        const res = await DataParser.parseCSV(file);
        this.processLoadedDataset(res.data, res.columns);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = DataParser.parseExcel(e.target.result);
          this.processLoadedDataset(res.data, res.columns);
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert('Unsupported file format. Please upload a .CSV or .XLSX / .XLS file.');
      }
    } catch (err) {
      alert('Error parsing dataset: ' + err.message);
      console.error(err);
    }
  },

  /**
   * Load Pre-loaded Sample Dataset
   */
  loadSampleDataset(key) {
    const sample = SampleDatasets[key];
    if (!sample) return;

    this.currentFilename = sample.filename;
    Papa.parse(sample.content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columns = results.meta.fields || Object.keys(results.data[0]);
        this.processLoadedDataset(results.data, columns);
      }
    });
  },

  /**
   * Process loaded data & prepare preview UI
   */
  processLoadedDataset(data, columns) {
    this.currentRawData = data;
    this.currentColumns = columns;
    this.currentSchema = DataParser.inferSchema(data, columns);
    this.currentHealthScore = DataParser.computeHealthScore(data, this.currentSchema);

    // Render Preview Table
    UIController.renderDataPreview(data, columns, this.currentSchema, this.currentHealthScore, this.currentFilename);

    // Generate Recommended Goals
    const goals = IntentResolver.generateRecommendedGoals(columns, this.currentSchema);
    UIController.renderRecommendedGoals(goals);
  },

  /**
   * Run AutoML from User Prompt
   */
  runAutoMLFromPrompt(promptText) {
    if (!promptText || promptText.trim() === '') {
      alert('Please enter what you want to know from the dataset or select a recommended goal card.');
      return;
    }

    const goal = IntentResolver.resolveIntent(promptText, this.currentColumns, this.currentSchema);
    this.executeAutoMLPipeline(goal);
  },

  /**
   * Run AutoML from Clicked Goal Card
   */
  runAutoMLFromGoal(goal) {
    this.executeAutoMLPipeline(goal);
  },

  /**
   * Execute Full AutoML Preprocessing, Training & Evaluation Loop
   */
  async executeAutoMLPipeline(goal) {
    UIController.showTrainingState();

    setTimeout(async () => {
      UIController.updateTrainingProgress(20, 'Cleaning dataset, imputing missing values & one-hot encoding categorical features...');

      const taskType = goal.task;
      const targetCol = goal.target;

      // Preprocess data
      const processed = Preprocessor.prepareTrainTest(
        this.currentRawData,
        this.currentColumns,
        this.currentSchema,
        targetCol,
        taskType
      );
      this.currentProcessedData = processed;

      const trainedModels = [];

      if (taskType === 'classification') {
        UIController.updateTrainingProgress(45, 'Training Logistic Regression & Naive Bayes classifiers...');
        const logReg = MLEngine.trainLogisticRegression(processed.XTrain, processed.yTrain, processed.targetClasses.length);
        logReg.eval = Evaluator.evaluateClassification(logReg, processed.XTest, processed.yTest, processed.targetClasses);
        logReg.targetClasses = processed.targetClasses;
        trainedModels.push(logReg);

        const nb = MLEngine.trainNaiveBayes(processed.XTrain, processed.yTrain, processed.targetClasses.length);
        nb.eval = Evaluator.evaluateClassification(nb, processed.XTest, processed.yTest, processed.targetClasses);
        nb.targetClasses = processed.targetClasses;
        trainedModels.push(nb);

        UIController.updateTrainingProgress(75, 'Building Decision Tree & Random Forest Ensembles...');
        const dt = MLEngine.trainDecisionTree(processed.XTrain, processed.yTrain);
        dt.eval = Evaluator.evaluateClassification(dt, processed.XTest, processed.yTest, processed.targetClasses);
        dt.targetClasses = processed.targetClasses;
        trainedModels.push(dt);

        const rf = MLEngine.trainRandomForest(processed.XTrain, processed.yTrain);
        rf.eval = Evaluator.evaluateClassification(rf, processed.XTest, processed.yTest, processed.targetClasses);
        rf.targetClasses = processed.targetClasses;
        trainedModels.push(rf);

      } else if (taskType === 'regression') {
        UIController.updateTrainingProgress(50, 'Fitting Ridge Regularized Linear Regression...');
        const ridge = MLEngine.trainRidgeRegression(processed.XTrain, processed.yTrain);
        ridge.eval = Evaluator.evaluateRegression(ridge, processed.XTest, processed.yTest);
        trainedModels.push(ridge);

        UIController.updateTrainingProgress(80, 'Training Random Forest Regressor Trees...');
        const rfReg = MLEngine.trainRandomForestRegressor(processed.XTrain, processed.yTrain);
        rfReg.eval = Evaluator.evaluateRegression(rfReg, processed.XTest, processed.yTest);
        trainedModels.push(rfReg);

      } else if (taskType === 'clustering') {
        UIController.updateTrainingProgress(60, 'Iterating K-Means Clusters & computing PCA 2D projections...');
        const kmeans = MLEngine.trainKMeans(processed.XTrain, 3);
        kmeans.eval = Evaluator.evaluateClustering(kmeans, processed.XTrain);
        trainedModels.push(kmeans);
      }

      UIController.updateTrainingProgress(95, 'Evaluating holdout validation sets and ranking model leaderboard...');

      setTimeout(() => {
        UIController.updateTrainingProgress(100, 'Training Complete!');

        // Build Leaderboard
        const leaderboard = Evaluator.buildLeaderboard(trainedModels);
        const bestModel = leaderboard[0];

        // Format Feature Importance
        const featureImportances = Evaluator.formatFeatureImportances(processed.featureNames, bestModel.featureImportances || []);

        UIController.renderResults(leaderboard, bestModel, taskType, featureImportances, processed);
      }, 500);

    }, 600);
  },

  /**
   * Reset App State
   */
  resetApp() {
    this.currentRawData = null;
    this.currentColumns = null;
    this.currentSchema = null;
    this.currentProcessedData = null;

    document.getElementById('section-preview').style.display = 'none';
    document.getElementById('section-goal').style.display = 'none';
    document.getElementById('section-training').style.display = 'none';
    document.getElementById('section-results').style.display = 'none';
    document.getElementById('btn-reset').style.display = 'none';

    document.getElementById('file-input').value = '';
    document.getElementById('user-intent-input').value = '';

    document.getElementById('section-upload').scrollIntoView({ behavior: 'smooth' });
  }
};

// Initialize App on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
