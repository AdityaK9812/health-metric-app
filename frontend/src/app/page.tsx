'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Chatbot from './components/Chatbot';
import ReportScanner from './components/ReportScanner';
import ReportUploadModal from './components/ReportUploadModal';
import { FiUpload } from 'react-icons/fi';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';

interface Metric {
  id: number;
  user_id: number;
  metric_type: string;
  value: string | number;
  unit: string;
  notes: string;
  created_at: string;
  recorded_at: string;
}

interface FormData {
  metric_type: string;
  value: string;
  notes: string;
}

export default function Home() {
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [formData, setFormData] = useState<FormData>({
    metric_type: 'weight',
    value: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      
      // Parse values as numbers and sort by recorded_at
      const processedData = data.map((metric: Metric) => ({
        ...metric,
        value: parseFloat(metric.value as string),
        recorded_at: new Date(metric.recorded_at).toISOString()
      })).sort((a: Metric, b: Metric) => {
        const dateA = new Date(a.recorded_at).getTime();
        const dateB = new Date(b.recorded_at).getTime();
        return dateB - dateA;
      });
      
      setMetrics(processedData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          metric_type: formData.metric_type,
          value: formData.value.toString(),
          unit: getDefaultUnit(formData.metric_type),
          notes: formData.notes,
          user_id: user?.id
        }),
      });

      if (!response.ok) throw new Error('Failed to add metric');
      
      setFormData({
        metric_type: 'weight',
        value: '',
        notes: '',
      });
      
      // Immediately fetch metrics after adding new one
      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add metric');
    }
  };

  const onAddMetric = async (type: string, value: number) => {
    try {
      const response = await fetch('http://localhost:5000/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          metric_type: type,
          value: value,
          unit: getDefaultUnit(type),
          user_id: user?.id,
          notes: 'Added from report scan'
        }),
      });

      if (!response.ok) throw new Error('Failed to add metric');
      fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add metric');
    }
  };

  const getLatestMetric = (type: string) => {
    // Filter metrics by type and convert dates for comparison
    const typeMetrics = metrics.filter(m => m.metric_type === type);
    if (!typeMetrics.length) return null;

    // Sort by recorded_at in descending order and parse values as numbers
    const sortedMetrics = typeMetrics.sort((a, b) => {
      const dateA = new Date(a.recorded_at).getTime();
      const dateB = new Date(b.recorded_at).getTime();
      return dateB - dateA;
    });

    // Parse the value as a number since it's stored as string in the backend
    const latestMetric = sortedMetrics[0];
    return {
      ...latestMetric,
      value: parseFloat(latestMetric.value as string)
    };
  };

  const getMetricStatus = (type: string, value: number): { color: string; text: string } => {
    switch (type) {
      case 'heart_rate':
        if (value < 60) return { color: 'yellow', text: 'Low' };
        if (value > 100) return { color: 'red', text: 'High' };
        return { color: 'green', text: 'Normal' };
      case 'blood_pressure':
        if (value > 180) return { color: 'red', text: 'Crisis' };
        if (value >= 140) return { color: 'red', text: 'High Stage 2' };
        if (value >= 130) return { color: 'yellow', text: 'High Stage 1' };
        if (value >= 120) return { color: 'yellow', text: 'Elevated' };
        if (value < 90) return { color: 'red', text: 'Low' };
        return { color: 'green', text: 'Normal' };
      case 'sleep':
        if (value < 6) return { color: 'red', text: 'Poor' };
        if (value < 7) return { color: 'yellow', text: 'Fair' };
        return { color: 'green', text: 'Good' };
      case 'blood_sugar':
        if (value < 70) return { color: 'red', text: 'Low' };
        if (value > 180) return { color: 'red', text: 'High' };
        if (value > 140) return { color: 'yellow', text: 'Elevated' };
        return { color: 'green', text: 'Normal' };
      case 'body_temp':
        if (value < 36.1) return { color: 'yellow', text: 'Low' };
        if (value > 37.8) return { color: 'red', text: 'High' };
        return { color: 'green', text: 'Normal' };
      case 'oxygen':
        if (value < 92) return { color: 'red', text: 'Critical' };
        if (value < 95) return { color: 'yellow', text: 'Low' };
        return { color: 'green', text: 'Normal' };
      case 'steps':
        if (value < 5000) return { color: 'red', text: 'Low' };
        if (value < 7500) return { color: 'yellow', text: 'Fair' };
        if (value >= 10000) return { color: 'green', text: 'Excellent' };
        return { color: 'green', text: 'Good' };
      default:
        return { color: 'blue', text: 'Recorded' };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  const handleDelete = async (metricId: number) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/metrics/${metricId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete metric');
      fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete metric');
    }
  };

  const handleScannedMetrics = (metrics: { type: string; value: number }[]) => {
    metrics.forEach(metric => {
      onAddMetric(metric.type, metric.value);
    });
    alert(`Successfully added ${metrics.length} metrics from your report!`);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Health Metrics Dashboard</h1>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <FiUpload className="h-5 w-5" />
          <span>Upload Report</span>
        </button>
      </div>
      
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Latest Weight Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Weight</h3>
              <span className="text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </span>
            </div>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {getLatestMetric('weight')?.value || '-'} kg
              </p>
              <p className="ml-2 text-sm text-gray-500">
                Last updated: {getLatestMetric('weight') ? formatDate(getLatestMetric('weight')!.recorded_at) : 'Never'}
              </p>
            </div>
          </div>

          {/* Latest Heart Rate Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Heart Rate</h3>
              <span className="text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </span>
            </div>
            {getLatestMetric('heart_rate') && (
              <>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {getLatestMetric('heart_rate')?.value || '-'} bpm
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    getMetricStatus('heart_rate', getLatestMetric('heart_rate')!.value).color === 'green' ? 'bg-green-100 text-green-800' :
                    getMetricStatus('heart_rate', getLatestMetric('heart_rate')!.value).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getMetricStatus('heart_rate', getLatestMetric('heart_rate')!.value).text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {formatDate(getLatestMetric('heart_rate')!.recorded_at)}
                </p>
              </>
            )}
          </div>

          {/* Latest Blood Pressure Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Blood Pressure</h3>
              <span className="text-purple-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
            </div>
            {getLatestMetric('blood_pressure') && (
              <>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {getLatestMetric('blood_pressure')!.value || '-'} mmHg
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    getMetricStatus('blood_pressure', getLatestMetric('blood_pressure')!.value as number).color === 'green' ? 'bg-green-100 text-green-800' :
                    getMetricStatus('blood_pressure', getLatestMetric('blood_pressure')!.value as number).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getMetricStatus('blood_pressure', getLatestMetric('blood_pressure')!.value as number).text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {getLatestMetric('blood_pressure')!.recorded_at ? formatDate(getLatestMetric('blood_pressure')!.recorded_at) : 'Never'}
                </p>
              </>
            )}
            {!getLatestMetric('blood_pressure') && (
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">- mmHg</p>
                <p className="ml-2 text-sm text-gray-500">Last updated: Never</p>
              </div>
            )}
          </div>

          {/* Latest Sleep Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sleep</h3>
              <span className="text-indigo-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </span>
            </div>
            {getLatestMetric('sleep') && (
              <>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {getLatestMetric('sleep')?.value || '-'} hrs
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    getMetricStatus('sleep', getLatestMetric('sleep')!.value).color === 'green' ? 'bg-green-100 text-green-800' :
                    getMetricStatus('sleep', getLatestMetric('sleep')!.value).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getMetricStatus('sleep', getLatestMetric('sleep')!.value).text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {formatDate(getLatestMetric('sleep')!.recorded_at)}
                </p>
              </>
            )}
          </div>

          {/* Blood Sugar Level Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Blood Sugar</h3>
              <span className="text-purple-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </span>
            </div>
            {getLatestMetric('blood_sugar') && (
              <>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {getLatestMetric('blood_sugar')?.value || '-'} mg/dL
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    getMetricStatus('blood_sugar', getLatestMetric('blood_sugar')!.value).color === 'green' ? 'bg-green-100 text-green-800' :
                    getMetricStatus('blood_sugar', getLatestMetric('blood_sugar')!.value).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getMetricStatus('blood_sugar', getLatestMetric('blood_sugar')!.value).text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {formatDate(getLatestMetric('blood_sugar')!.recorded_at)}
                </p>
              </>
            )}
          </div>

          {/* Body Temperature Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Body Temperature</h3>
              <span className="text-orange-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            {getLatestMetric('body_temp') && (
              <>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {getLatestMetric('body_temp')?.value || '-'} °C
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    getMetricStatus('body_temp', getLatestMetric('body_temp')!.value).color === 'green' ? 'bg-green-100 text-green-800' :
                    getMetricStatus('body_temp', getLatestMetric('body_temp')!.value).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getMetricStatus('body_temp', getLatestMetric('body_temp')!.value).text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {formatDate(getLatestMetric('body_temp')!.recorded_at)}
                </p>
              </>
            )}
          </div>

          {/* Oxygen Saturation Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Oxygen Saturation</h3>
              <span className="text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </span>
            </div>
            {getLatestMetric('oxygen') && (
              <>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {getLatestMetric('oxygen')?.value || '-'} %
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    getMetricStatus('oxygen', getLatestMetric('oxygen')!.value).color === 'green' ? 'bg-green-100 text-green-800' :
                    getMetricStatus('oxygen', getLatestMetric('oxygen')!.value).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getMetricStatus('oxygen', getLatestMetric('oxygen')!.value).text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {formatDate(getLatestMetric('oxygen')!.recorded_at)}
                </p>
              </>
            )}
          </div>

          {/* Step Count Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Step Count</h3>
              <span className="text-green-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </span>
            </div>
            {getLatestMetric('steps') && (
              <>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {getLatestMetric('steps')?.value || '-'} steps
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    getMetricStatus('steps', getLatestMetric('steps')!.value).color === 'green' ? 'bg-green-100 text-green-800' :
                    getMetricStatus('steps', getLatestMetric('steps')!.value).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getMetricStatus('steps', getLatestMetric('steps')!.value).text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {formatDate(getLatestMetric('steps')!.recorded_at)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Add New Metric Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Add New Metric</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="metric_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Metric Type
                </label>
                <select
                  id="metric_type"
                  name="metric_type"
                  value={formData.metric_type}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
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
              <div>
                <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  step="any"
                  required
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                  placeholder={`Enter value in ${getDefaultUnit(formData.metric_type)}`}
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                  placeholder="Add any notes about this metric"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Metric
              </button>
            </div>
          </form>
        </div>

        {/* Chatbot */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <Chatbot 
            metrics={metrics} 
            onAddMetric={onAddMetric}
            token={token}
          />
        </div>
      </div>

      {isUploadModalOpen && (
        <ReportUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onMetricsFound={handleScannedMetrics}
        />
      )}
    </main>
  );
}
