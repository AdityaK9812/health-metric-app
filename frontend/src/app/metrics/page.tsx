'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Metric {
  id: number;
  user_id: number;
  metric_type: string;
  value: number;
  unit: string;
  notes: string;
  recorded_at: string;
}

export default function Metrics() {
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetricType, setSelectedMetricType] = useState('weight');
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchMetrics();
    
    // Set up polling to refresh metrics every 2 seconds
    const intervalId = setInterval(fetchMetrics, 2000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/metrics/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      // Parse values as numbers and sort by recorded_at
      const processedData = data.map((metric: Metric) => ({
        ...metric,
        value: typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value,
        recorded_at: new Date(metric.recorded_at).toISOString()
      })).sort((a: Metric, b: Metric) => {
        const dateA = new Date(a.recorded_at).getTime();
        const dateB = new Date(b.recorded_at).getTime();
        return dateB - dateA;
      });
      setMetrics(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filterMetricsByType = (type: string) => {
    return metrics.filter(metric => metric.metric_type === type);
  };

  const filterMetricsByTime = (metrics: Metric[]) => {
    const now = new Date();
    const filtered = metrics.filter(metric => {
      const metricDate = new Date(metric.recorded_at);
      const diffTime = now.getTime() - metricDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      switch (timeRange) {
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        case 'year':
          return diffDays <= 365;
        default:
          return true;
      }
    });
    return filtered;
  };

  const getDefaultUnit = (metricType: string): string => {
    switch (metricType) {
      case 'weight':
        return 'kg';
      case 'heart_rate':
        return 'bpm';
      case 'blood_pressure':
        return 'mmHg';
      case 'sleep':
        return 'hrs';
      case 'blood_sugar':
        return 'mg/dL';
      case 'body_temp':
        return '°C';
      case 'oxygen':
        return '%';
      case 'steps':
        return 'steps';
      default:
        return '';
    }
  };

  const getChartData = () => {
    const filteredMetrics = filterMetricsByTime(filterMetricsByType(selectedMetricType));
    const sortedMetrics = [...filteredMetrics].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    return {
      labels: sortedMetrics.map(metric => {
        const date = new Date(metric.recorded_at);
        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        return istDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Kolkata'
        });
      }),
      datasets: [
        {
          label: `${selectedMetricType.replace('_', ' ')} (${getDefaultUnit(selectedMetricType)})`,
          data: sortedMetrics.map(metric => metric.value),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ],
      sortedMetrics: sortedMetrics
    };
  };

  const getMetricStats = () => {
    const filteredMetrics = filterMetricsByTime(filterMetricsByType(selectedMetricType));
    if (filteredMetrics.length === 0) return { avg: 0, min: 0, max: 0 };

    const values = filteredMetrics.map(m => m.value);
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  };

  const formatTooltipDate = (dateString: string) => {
    const date = new Date(dateString);
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getMetricStats();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Metrics Analysis</h1>
          <p className="text-gray-600">Track and analyze your health metrics over time</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-3">Metric Type</label>
              <select
                value={selectedMetricType}
                onChange={(e) => setSelectedMetricType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 transition duration-150 ease-in-out"
              >
                <option value="weight">Weight</option>
                <option value="heart_rate">Heart Rate</option>
                <option value="blood_pressure">Blood Pressure</option>
                <option value="sleep">Sleep</option>
                <option value="blood_sugar">Blood Sugar</option>
                <option value="body_temp">Body Temperature</option>
                <option value="oxygen">Oxygen Saturation</option>
                <option value="steps">Step Count</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-3">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 transition duration-150 ease-in-out"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-blue-800 mb-1">Latest Value</h3>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-blue-900">
                  {(() => {
                    const filteredMetrics = filterMetricsByType(selectedMetricType);
                    return filteredMetrics.length > 0 
                      ? filteredMetrics[0].value.toFixed(1) 
                      : '0';
                  })()}
                </p>
                <p className="ml-2 text-sm text-blue-800">
                  {getDefaultUnit(selectedMetricType)}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-green-800 mb-1">Minimum</h3>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-green-900">
                  {stats.min.toFixed(1)}
                </p>
                <p className="ml-2 text-sm text-green-800">
                  {getDefaultUnit(selectedMetricType)}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-purple-800 mb-1">Maximum</h3>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-purple-900">
                  {stats.max.toFixed(1)}
                </p>
                <p className="ml-2 text-sm text-purple-800">
                  {getDefaultUnit(selectedMetricType)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-100">
            <Line
              data={getChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                      },
                      padding: 20,
                      usePointStyle: true,
                      boxWidth: 8,
                      pointStyle: 'circle'
                    }
                  },
                  title: {
                    display: true,
                    text: `${selectedMetricType.replace('_', ' ')} Trend`,
                    font: {
                      size: 16,
                      family: "'Inter', sans-serif",
                      weight: 'bold'
                    },
                    padding: {
                      bottom: 30
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1f2937',
                    bodyColor: '#1f2937',
                    bodyFont: {
                      size: 12,
                      family: "'Inter', sans-serif"
                    },
                    titleFont: {
                      size: 12,
                      family: "'Inter', sans-serif",
                      weight: 'bold'
                    },
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    callbacks: {
                      title: (context) => {
                        const index = context[0].dataIndex;
                        const chartData = getChartData();
                        const metric = chartData.sortedMetrics[index];
                        return formatTooltipDate(metric.recorded_at);
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    grid: {
                      color: '#f3f4f6'
                    },
                    ticks: {
                      font: {
                        size: 11,
                        family: "'Inter', sans-serif"
                      },
                      padding: 8
                    },
                    title: {
                      display: true,
                      text: getDefaultUnit(selectedMetricType),
                      font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                      },
                      padding: {
                        top: 20
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        size: 11,
                        family: "'Inter', sans-serif"
                      },
                      maxRotation: 45,
                      minRotation: 45,
                      padding: 8
                    }
                  }
                },
                elements: {
                  line: {
                    tension: 0.3
                  },
                  point: {
                    radius: 4,
                    hoverRadius: 6
                  }
                },
                interaction: {
                  intersect: false,
                  mode: 'index' as const
                }
              }}
              height={400}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 