/**
 * MEIKURAL Real-Time Chart Configuration (Chart.js)
 * Implements 3 distinct horizontal risk background bands:
 *  🟢 Safe Zone: 0.00 - 0.35
 *  🟡 Caution Zone: 0.35 - 0.65
 *  🔴 High Risk / Deepfake Zone: 0.65 - 1.00
 */

// Custom plugin to draw 3 horizontal colored risk bands across the chart canvas
const riskBandsPlugin = {
  id: 'riskBandsPlugin',
  beforeDraw: (chart) => {
    const { ctx, chartArea, scales: { y } } = chart;
    if (!chartArea || !y) return;

    ctx.save();

    // Band Boundaries mapped to Y-scale values
    const y0_00 = y.getPixelForValue(0.00);
    const y0_35 = y.getPixelForValue(0.35);
    const y0_65 = y.getPixelForValue(0.65);
    const y1_00 = y.getPixelForValue(1.00);

    const left = chartArea.left;
    const width = chartArea.right - chartArea.left;

    // 🟢 Safe Zone (0.00 – 0.35)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.13)';
    ctx.fillRect(left, y0_35, width, y0_00 - y0_35);

    // 🟡 Caution Zone (0.35 – 0.65)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.13)';
    ctx.fillRect(left, y0_65, width, y0_35 - y0_65);

    // 🔴 High Risk / Deepfake Zone (0.65 – 1.00)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
    ctx.fillRect(left, y1_00, width, y0_65 - y1_00);

    // Subtle divider lines between zones
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Caution threshold line (0.35)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.beginPath();
    ctx.moveTo(left, y0_35);
    ctx.lineTo(chartArea.right, y0_35);
    ctx.stroke();

    // High risk threshold line (0.65)
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.beginPath();
    ctx.moveTo(left, y0_65);
    ctx.lineTo(chartArea.right, y0_65);
    ctx.stroke();

    // Zone text labels on right edge
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'right';

    ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
    ctx.fillText('🔴 HIGH RISK / DEEPFAKE (0.65 - 1.00)', chartArea.right - 8, y1_00 + 14);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.fillText('🟡 CAUTION (0.35 - 0.65)', chartArea.right - 8, y0_65 + 14);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.fillText('🟢 SAFE ZONE (0.00 - 0.35)', chartArea.right - 8, y0_35 + 14);

    ctx.restore();
  }
};

// Global chart holder
let liveScoreChart = null;

/**
 * Initialize Chart.js with dynamic gradient and risk bands
 */
function initRealtimeChart(canvasId = 'riskScoreChart') {
  const ctx = document.getElementById(canvasId).getContext('2d');

  // Gradient for the passive score line
  const gradientStroke = ctx.createLinearGradient(0, 0, 0, 300);
  gradientStroke.addColorStop(0, '#F43F5E');  // High risk Coral at top
  gradientStroke.addColorStop(0.5, '#F59E0B'); // Caution Amber in mid
  gradientStroke.addColorStop(1, '#10B981');  // Safe Emerald at bottom

  const initialLabels = [];
  const initialData = [];
  const maxPoints = 25;

  const now = new Date();
  for (let i = maxPoints - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 1000);
    initialLabels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    initialData.push(0.12 + Math.random() * 0.08); // Initial baseline safe score
  }

  liveScoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: initialLabels,
      datasets: [
        {
          label: 'Anti-Spoofing Passive Score',
          data: initialData,
          borderColor: gradientStroke,
          borderWidth: 2.5,
          pointBackgroundColor: (context) => {
            const val = context.raw;
            if (val >= 0.65) return '#F43F5E';
            if (val >= 0.35) return '#F59E0B';
            return '#10B981';
          },
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          tension: 0.35,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: 'easeOutQuad'
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0F172A',
          titleColor: '#94A3B8',
          bodyColor: '#F8FAFC',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const score = context.parsed.y;
              let zone = '🟢 Safe';
              if (score >= 0.65) zone = '🔴 High Risk / Deepfake';
              else if (score >= 0.35) zone = '🟡 Caution';
              return `Risk Score: ${score.toFixed(3)} (${zone})`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(51, 65, 85, 0.4)',
            drawTicks: false
          },
          ticks: {
            color: '#94A3B8',
            font: { family: 'JetBrains Mono', size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          min: 0.0,
          max: 1.0,
          grid: {
            color: 'rgba(51, 65, 85, 0.3)',
          },
          ticks: {
            color: '#94A3B8',
            stepSize: 0.2,
            font: { family: 'JetBrains Mono', size: 10 },
            callback: function(value) {
              return value.toFixed(2);
            }
          }
        }
      }
    },
    plugins: [riskBandsPlugin]
  });

  return liveScoreChart;
}

/**
 * Append incoming real-time score to the chart
 * @param {number} score - anti_spoofing.passive_score (0.0 to 1.0)
 * @param {string} timestampStr - Formatted timestamp
 */
function updateChartWithScore(score, timestampStr) {
  if (!liveScoreChart) return;

  const labels = liveScoreChart.data.labels;
  const dataset = liveScoreChart.data.datasets[0];

  const timeLabel = timestampStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  labels.push(timeLabel);
  dataset.data.push(score);

  // Keep a scrolling window of max 30 seconds of telemetry
  if (labels.length > 30) {
    labels.shift();
    dataset.data.shift();
  }

  liveScoreChart.update('none'); // Update without full layout recalculation for 60fps performance
}
