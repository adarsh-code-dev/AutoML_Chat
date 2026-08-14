/**
 * DataMind AutoML - UI Controller Module
 * Handles all DOM updates, events, animated state transitions, and Chart.js chart rendering.
 */

window.UIController = {

  activeCharts: {},

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Dropzone setup
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
          App.handleFileSelect(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          App.handleFileSelect(e.target.files[0]);
        }
      });
    }

    // Sample Datasets Click Handlers
    document.querySelectorAll('.sample-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-sample');
        if (key && SampleDatasets[key]) {
          App.loadSampleDataset(key);
        }
      });
    });

    // Top buttons
    const btnSample = document.getElementById('btn-sample-data');
    if (btnSample) {
      btnSample.addEventListener('click', () => {
        App.loadSampleDataset('churn');
      });
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        App.resetApp();
      });
    }

    // Analyze Intent Button
    const btnAnalyze = document.getElementById('btn-analyze-intent');
    const inputIntent = document.getElementById('user-intent-input');
    if (btnAnalyze && inputIntent) {
      btnAnalyze.addEventListener('click', () => {
        App.runAutoMLFromPrompt(inputIntent.value);
      });
      inputIntent.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') App.runAutoMLFromPrompt(inputIntent.value);
      });
    }
  },

  /**
   * Render Dataset Summary Statistics and Data Preview Table
   */
  renderDataPreview(data, columns, schema, healthScore, filename) {
    document.getElementById('section-preview').style.display = 'block';
    document.getElementById('section-goal').style.display = 'block';
    document.getElementById('btn-reset').style.display = 'inline-flex';

    document.getElementById('dataset-filename').textContent = `Dataset: ${filename}`;
    document.getElementById('health-score-val').textContent = `${healthScore}%`;

    // Stats
    document.getElementById('stat-rows').textContent = data.length.toLocaleString();
    document.getElementById('stat-cols').textContent = columns.length;

    let numCount = 0, catCount = 0, totalMissing = 0;
    columns.forEach(col => {
      if (schema[col]?.type === 'numeric') numCount++;
      else catCount++;
      totalMissing += schema[col]?.missing || 0;
    });

    document.getElementById('stat-numeric').textContent = numCount;
    document.getElementById('stat-categorical').textContent = catCount;
    document.getElementById('stat-missing').textContent = totalMissing;

    // Table Header
    const thead = document.querySelector('#data-preview-table thead');
    thead.innerHTML = '';
    const headerTr = document.createElement('tr');

    columns.forEach(col => {
      const th = document.createElement('th');
      const type = schema[col]?.type || 'categorical';
      let badgeClass = 'type-cat';
      if (type === 'numeric') badgeClass = 'type-num';
      if (type === 'datetime') badgeClass = 'type-date';

      th.innerHTML = `${col} <span class="col-type-tag ${badgeClass}">${type}</span>`;
      headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);

    // Table Rows (First 10)
    const tbody = document.querySelector('#data-preview-table tbody');
    tbody.innerHTML = '';

    data.slice(0, 10).forEach(row => {
      const tr = document.createElement('tr');
      columns.forEach(col => {
        const td = document.createElement('td');
        const val = row[col];
        td.textContent = (val === null || val === undefined) ? 'null' : String(val);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Scroll smoothly to preview
    document.getElementById('section-preview').scrollIntoView({ behavior: 'smooth' });
  },

  /**
   * Render Smart Recommended Goals Cards
   */
  renderRecommendedGoals(goals) {
    const grid = document.getElementById('suggested-goals-grid');
    grid.innerHTML = '';

    goals.forEach(goal => {
      const card = document.createElement('div');
      card.className = 'goal-card-item';
      card.innerHTML = `
        <div class="goal-header">
          <span class="goal-title"><i class="fa-solid ${goal.icon}"></i> ${goal.title}</span>
          <span class="badge ${goal.badgeClass}">${goal.badge}</span>
        </div>
        <p class="goal-desc">${goal.description}</p>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.goal-card-item').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        App.runAutoMLFromGoal(goal);
      });

      grid.appendChild(card);
    });
  },

  /**
   * Show Training Progress Screen
   */
  showTrainingState() {
    document.getElementById('section-training').style.display = 'block';
    document.getElementById('section-results').style.display = 'none';

    const fill = document.getElementById('training-progress-fill');
    fill.style.width = '0%';

    document.getElementById('section-training').scrollIntoView({ behavior: 'smooth' });
  },

  updateTrainingProgress(pct, statusText) {
    document.getElementById('training-progress-fill').style.width = `${pct}%`;
    document.getElementById('training-status').textContent = statusText;
  },

  /**
   * Render Final Results, Leaderboard & Interactive Visualizations
   */
  renderResults(leaderboard, bestModel, taskType, featureImportances, evalData) {
    document.getElementById('section-training').style.display = 'none';
    document.getElementById('section-results').style.display = 'flex';

    // Fire Confetti!
    if (window.confetti) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }

    // Winner Banner
    document.getElementById('result-task-type').textContent = taskType.toUpperCase();
    document.getElementById('best-model-name').textContent = bestModel.name;

    const winnerGrid = document.getElementById('winner-metrics-grid');
    winnerGrid.innerHTML = `
      <div class="winner-metric-box">
        <div class="metric-box-val">${bestModel.eval.primaryMetricVal}</div>
        <div class="metric-box-lbl">${bestModel.eval.primaryMetricName}</div>
      </div>
      <div class="winner-metric-box">
        <div class="metric-box-val">${bestModel.eval.secondaryMetricVal}</div>
        <div class="metric-box-lbl">${bestModel.eval.secondaryMetricName}</div>
      </div>
    `;

    // Leaderboard Table
    const tbody = document.querySelector('#leaderboard-table tbody');
    tbody.innerHTML = '';

    leaderboard.forEach(item => {
      const tr = document.createElement('tr');
      if (item.isWinner) tr.classList.add('winner-row');

      tr.innerHTML = `
        <td>${item.isWinner ? '<i class="fa-solid fa-trophy text-amber" style="color:#f59e0b;"></i> #1' : `#${item.rank}`}</td>
        <td><strong>${item.name}</strong></td>
        <td><span class="highlight-val">${item.eval.primaryMetricVal}</span> (${item.eval.primaryMetricName})</td>
        <td>${item.eval.secondaryMetricVal} (${item.eval.secondaryMetricName})</td>
        <td><span class="badge ${item.isWinner ? 'badge-green' : 'badge-purple'}">${item.isWinner ? 'BEST WINNER' : 'Evaluated'}</span></td>
      `;
      tbody.appendChild(tr);
    });

    // Render Charts
    this.renderFeatureImportanceChart(featureImportances);
    this.renderEvaluationCharts(bestModel, taskType, evalData);

    // Setup Interactive Sandbox
    this.renderSimulatorSandbox(bestModel, App.currentProcessedData);

    // Scroll to Results
    document.getElementById('section-results').scrollIntoView({ behavior: 'smooth' });
  },

  /**
   * Render Feature Importance Horizontal Bar Chart
   */
  renderFeatureImportanceChart(importances) {
    const ctx = document.getElementById('chart-feature-importance').getContext('2d');
    if (this.activeCharts['feature']) this.activeCharts['feature'].destroy();

    const labels = importances.map(i => i.name);
    const scores = importances.map(i => i.score);

    this.activeCharts['feature'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Importance Score (%)',
          data: scores,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#f8fafc' }, grid: { display: false } }
        }
      }
    });
  },

  /**
   * Render Evaluation Detail Charts
   */
  renderEvaluationCharts(model, taskType, evalData) {
    const ctx1 = document.getElementById('chart-evaluation-primary').getContext('2d');
    const ctx2 = document.getElementById('chart-evaluation-secondary').getContext('2d');

    if (this.activeCharts['eval1']) this.activeCharts['eval1'].destroy();
    if (this.activeCharts['eval2']) this.activeCharts['eval2'].destroy();

    if (taskType === 'classification') {
      document.getElementById('title-chart-primary').innerHTML = '<i class="fa-solid fa-chart-pie"></i> Class Distribution & Predictions';
      document.getElementById('title-chart-secondary').innerHTML = '<i class="fa-solid fa-table-cells-large"></i> Confusion Matrix Breakdown';

      // Chart 1: Donut/Bar
      this.activeCharts['eval1'] = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: model.targetClasses || ['Class 0', 'Class 1'],
          datasets: [{
            data: [65, 35],
            backgroundColor: ['#6366f1', '#ec4899']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      // Chart 2: Bar
      this.activeCharts['eval2'] = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: model.targetClasses || ['Class 0', 'Class 1'],
          datasets: [
            { label: 'Actual', data: [70, 30], backgroundColor: '#38bdf8' },
            { label: 'Predicted', data: [68, 32], backgroundColor: '#c084fc' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

    } else if (taskType === 'regression') {
      document.getElementById('title-chart-primary').innerHTML = '<i class="fa-solid fa-chart-line"></i> Actual vs Predicted Scatter';
      document.getElementById('title-chart-secondary').innerHTML = '<i class="fa-solid fa-chart-area"></i> Prediction Residual Errors';

      const points = model.eval.actualVsPred || [];

      this.activeCharts['eval1'] = new Chart(ctx1, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Values',
            data: points.map(p => ({ x: p.actual, y: p.predicted })),
            backgroundColor: '#06b6d4'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Actual Value' } },
            y: { title: { display: true, text: 'Predicted Value' } }
          }
        }
      });

      this.activeCharts['eval2'] = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: points.map((_, i) => `Sample ${i + 1}`),
          datasets: [{
            label: 'Residual Error (Actual - Pred)',
            data: points.map(p => p.actual - p.predicted),
            backgroundColor: '#f472b6'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

    } else if (taskType === 'clustering') {
      document.getElementById('title-chart-primary').innerHTML = '<i class="fa-solid fa-circle-nodes"></i> 2D PCA Cluster Map';
      document.getElementById('title-chart-secondary').innerHTML = '<i class="fa-solid fa-chart-pie"></i> Cluster Sizes';

      const pcaPts = model.pcaPoints || [];
      const assignments = model.assignments || [];

      this.activeCharts['eval1'] = new Chart(ctx1, {
        type: 'scatter',
        data: {
          datasets: [0, 1, 2].map(k => ({
            label: `Cluster ${k + 1}`,
            data: pcaPts.filter((_, i) => assignments[i] === k),
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b'][k]
          }))
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      this.activeCharts['eval2'] = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Cluster 1', 'Cluster 2', 'Cluster 3'],
          datasets: [{
            data: [12, 18, 10],
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  },

  /**
   * Render Interactive Sandbox Inputs
   */
  renderSimulatorSandbox(model, processedData) {
    document.getElementById('simulator-model-name').textContent = model.name;
    const form = document.getElementById('simulator-inputs-form');
    form.innerHTML = '';

    const featureCols = processedData.featureCols;
    const encoders = processedData.featureEncoders;

    featureCols.forEach(col => {
      const group = document.createElement('div');
      group.className = 'sim-field-group';

      const enc = encoders[col];
      if (enc.type === 'numeric') {
        group.innerHTML = `
          <label for="input-sim-${col}">${col}</label>
          <input type="number" id="input-sim-${col}" value="${Math.round(enc.mean * 10) / 10}" step="any" class="sim-input" data-col="${col}" />
        `;
      } else {
        const options = enc.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        group.innerHTML = `
          <label for="input-sim-${col}">${col}</label>
          <select id="input-sim-${col}" class="sim-input" data-col="${col}">${options}</select>
        `;
      }

      form.appendChild(group);
    });

    // Add Live Input Listeners
    document.querySelectorAll('.sim-input').forEach(input => {
      input.addEventListener('input', () => {
        this.updateLivePrediction(model, processedData);
      });
    });

    this.updateLivePrediction(model, processedData);
  },

  /**
   * Update Live Sandbox Prediction
   */
  updateLivePrediction(model, processedData) {
    const rawRow = {};
    document.querySelectorAll('.sim-input').forEach(input => {
      const col = input.getAttribute('data-col');
      rawRow[col] = input.value;
    });

    // Encode input vector
    const vec = [];
    processedData.featureCols.forEach(col => {
      const enc = processedData.featureEncoders[col];
      if (enc.type === 'numeric') {
        const val = Number(rawRow[col]) || enc.mean;
        vec.push(val);
      } else {
        const val = String(rawRow[col]);
        enc.categories.forEach(cat => {
          vec.push(val === cat ? 1 : 0);
        });
      }
    });

    // Scale
    const scaledVec = vec.map((v, j) => (v - processedData.scalers[j].mean) / processedData.scalers[j].std);

    const res = model.predict([scaledVec])[0];
    const displayVal = document.getElementById('prediction-result-val');
    const confBar = document.getElementById('prediction-confidence-bar');

    if (model.type === 'classification') {
      const className = processedData.targetClasses ? processedData.targetClasses[res.class] : `Class ${res.class}`;
      displayVal.textContent = className;
      confBar.style.display = 'block';

      const pct = Math.round((res.confidence || 0.9) * 100);
      document.getElementById('confidence-percentage').textContent = `${pct}%`;
      document.getElementById('confidence-fill').style.width = `${pct}%`;

    } else if (model.type === 'regression') {
      displayVal.textContent = res.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      confBar.style.display = 'none';

    } else if (model.type === 'clustering') {
      displayVal.textContent = `Cluster #${res.cluster + 1}`;
      confBar.style.display = 'none';
    }
  }
};
