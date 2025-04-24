import { useState, useEffect } from 'react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  metrics: any[];
  onAddMetric: (type: string, value: number) => void;
  token: string;
}

interface MetricData {
  range: string;
  description: string;
  unit: string;
  aliases: string[];
}

interface MetricInfo {
  [key: string]: MetricData;
}

type MetricTypes = MetricInfo;

const metricInfo: MetricTypes = {
  weight: {
    range: 'Varies by height and build',
    description: 'Body weight measurement in kilograms.',
    unit: 'kg',
    aliases: ['weight', 'kg', 'kilos', 'kilograms', 'mass']
  },
  heart_rate: {
    range: '60-100 bpm',
    description: 'Number of heartbeats per minute. Normal resting heart rate range.',
    unit: 'bpm',
    aliases: ['heart rate', 'heart', 'pulse', 'bpm', 'heartbeat', 'beats']
  },
  blood_pressure: {
    range: '90/60 - 120/80 mmHg',
    description: 'Pressure of blood against artery walls. Systolic/Diastolic readings.',
    unit: 'mmHg',
    aliases: ['blood pressure', 'bp', 'pressure']
  },
  sleep: {
    range: '7-9 hours',
    description: 'Daily sleep duration. Important for overall health and recovery.',
    unit: 'hrs',
    aliases: ['sleep', 'slept', 'sleeping', 'hours of sleep', 'rest']
  },
  blood_sugar: {
    range: '70-140 mg/dL',
    description: 'Blood glucose level. Important for diabetes management.',
    unit: 'mg/dL',
    aliases: ['blood sugar', 'glucose', 'sugar level', 'sugar', 'diabetes']
  },
  body_temp: {
    range: '36.1-37.8°C',
    description: 'Core body temperature. Indicator of fever or hypothermia.',
    unit: '°C',
    aliases: ['body temperature', 'temperature', 'temp', 'fever']
  },
  oxygen: {
    range: '95-100%',
    description: 'Blood oxygen saturation. Important for respiratory health.',
    unit: '%',
    aliases: ['oxygen', 'o2', 'oxygen saturation', 'spo2', 'oxygen level', 'saturation']
  },
  steps: {
    range: '7,500-10,000 steps',
    description: 'Daily step count. Indicator of physical activity level.',
    unit: 'steps',
    aliases: ['steps', 'step count', 'walking', 'walked', 'step']
  },
};

export default function Chatbot({ metrics, onAddMetric, token }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello, I'm your health assistant. How may I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const getMetricInfo = (): MetricInfo => {
    return metricInfo;
  };

  const getLatestMetric = (type: string) => {
    return metrics.find(m => m.metric_type === type);
  };

  const getAppInfo = (topic: string): string => {
    const info: { [key: string]: string } = {
      about: "HealthMetrics is a personal health tracking application that helps you monitor and manage various health metrics like heart rate, blood pressure, weight, and more. It provides real-time insights and helps you maintain a healthy lifestyle.",
      features: "Key features include:\n- Track 8 different health metrics\n- Visual dashboard with real-time updates\n- Historical data analysis\n- Instant health insights\n- Easy metric recording\n- Trend analysis and charts",
      metrics: "We currently track these health metrics:\n- Weight (kg)\n- Heart Rate (bpm)\n- Blood Pressure (mmHg)\n- Sleep Duration (hours)\n- Blood Sugar (mg/dL)\n- Body Temperature (°C)\n- Oxygen Saturation (%)\n- Step Count (steps)",
      privacy: "Your health data is stored securely and is only accessible to you. We take data privacy seriously and implement industry-standard security measures.",
      usage: "To use the app:\n1. Add new metrics using the form or chat with me\n2. View your metrics on the dashboard\n3. Check detailed analysis in the Metrics section\n4. Review history in the History section",
      benefits: "Benefits of using HealthMetrics:\n- Easy health monitoring\n- Track your progress over time\n- Identify health trends\n- Make informed health decisions\n- Keep all health data in one place",
    };
    return info[topic] || "I don't have information about that topic.";
  };

  const getHealthTips = (metricType: string): string => {
    const tips: { [key: string]: string } = {
      weight: "Tips for healthy weight management:\n- Maintain a balanced diet\n- Exercise regularly\n- Stay hydrated\n- Get adequate sleep\n- Track your meals",
      heart_rate: "Tips for heart health:\n- Regular cardiovascular exercise\n- Manage stress levels\n- Limit caffeine intake\n- Get enough rest\n- Stay active throughout the day",
      blood_pressure: "Tips for maintaining healthy blood pressure:\n- Reduce sodium intake\n- Regular exercise\n- Limit alcohol consumption\n- Manage stress\n- Take medications as prescribed",
      sleep: "Tips for better sleep:\n- Maintain a regular sleep schedule\n- Create a relaxing bedtime routine\n- Avoid screens before bed\n- Keep your bedroom cool and dark\n- Limit caffeine after noon",
      blood_sugar: "Tips for managing blood sugar:\n- Eat regular meals\n- Monitor carbohydrate intake\n- Exercise regularly\n- Take medications as prescribed\n- Stay hydrated",
      body_temp: "Tips for managing body temperature:\n- Stay hydrated\n- Dress appropriately for the weather\n- Monitor for fever symptoms\n- Seek medical attention if temperature is too high/low",
      oxygen: "Tips for maintaining good oxygen levels:\n- Practice deep breathing exercises\n- Stay active\n- Maintain good posture\n- Get fresh air regularly\n- Quit smoking if applicable",
      steps: "Tips for increasing daily steps:\n- Take the stairs instead of elevator\n- Walk during phone calls\n- Park farther from destinations\n- Take short walks during breaks\n- Use a standing desk",
    };
    return tips[metricType] || "No specific tips available for this metric.";
  };

  const getHelpMessage = (): string => {
    return "Here's what I can help you with:\n\n" +
           "1️⃣ Add Health Measurements\n" +
           "   • Record weight (e.g., 'add 68 kg')\n" +
           "   • Log heart rate (e.g., 'heart rate is 75')\n" +
           "   • Track blood pressure (e.g., 'bp is 120/80')\n" +
           "   • Monitor sleep (e.g., 'slept 7 hours')\n" +
           "   • Record blood sugar (e.g., 'sugar is 95')\n" +
           "   • Log temperature (e.g., 'temp is 37')\n" +
           "   • Track oxygen levels (e.g., 'o2 is 98')\n" +
           "   • Count steps (e.g., 'walked 8000 steps')\n\n" +
           "2️⃣ View Your Metrics\n" +
           "   • See all metrics ('show my metrics')\n" +
           "   • Check specific readings ('what's my heart rate?')\n" +
           "   • View latest measurements ('latest blood pressure')\n\n" +
           "3️⃣ Get Health Information\n" +
           "   • Learn about metrics ('what is blood sugar?')\n" +
           "   • Check normal ranges ('normal heart rate range')\n" +
           "   • Get health tips ('tips for better sleep')\n\n" +
           "4️⃣ App Information\n" +
           "   • Learn about features ('what can this app do?')\n" +
           "   • Get usage help ('how do I use this?')\n" +
           "   • Privacy info ('how is my data protected?')\n\n" +
           "Just type your question naturally - I'll understand! 😊\n" +
           "Need more examples? Just ask 'show examples' for any category.";
  };

  const TypingIndicator = () => (
    <div className="flex space-x-2 p-4 bg-white rounded-2xl shadow-sm max-w-[85%]">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // First check if it's a metric-related command
    const metricResponse = processMetricCommand(input.toLowerCase());
    
    if (metricResponse) {
      // If it's a metric command, use the existing response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          text: metricResponse,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }, 500);
    } else {
      // If it's not a metric command, use Gemini
      try {
        console.log('Sending request to Gemini...');
        setIsTyping(true);

        const response = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: input })
        });

        const data = await response.json();
        console.log('Received response:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get response');
        }
        
        setMessages(prev => [...prev, {
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      } catch (error) {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, {
          text: error instanceof Error ? error.message : "I'm sorry, I'm having trouble connecting to the health assistant. Please try again later.",
          sender: 'bot',
          timestamp: new Date(),
        }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const normalizeText = (text: string): string => {
    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const fuzzyMatch = (text: string, pattern: string): boolean => {
    text = normalizeText(text);
    pattern = normalizeText(pattern);
    return text.includes(pattern) || pattern.includes(text);
  };

  const findMetricType = (text: string): string | null => {
    text = normalizeText(text);
    const metricTypes = getMetricInfo();
    
    // First try exact matches
    const exactMatch = Object.entries(metricTypes).find(([type, metricData]) => {
      const aliases = metricData.aliases;
      return aliases.some(alias => text.includes(normalizeText(alias))) || 
             text.includes(type.toLowerCase().replace('_', ' '));
    });
    if (exactMatch) return exactMatch[0];

    // Then try fuzzy matches
    const fuzzyMatches = Object.entries(metricTypes).filter(([type, metricData]) => {
      const aliases = metricData.aliases;
      return aliases.some(alias => fuzzyMatch(text, alias)) || 
             fuzzyMatch(text, type.replace('_', ' '));
    });

    // If we have exactly one fuzzy match, use it
    if (fuzzyMatches.length === 1) return fuzzyMatches[0][0];

    return null;
  };

  const extractNumber = (text: string): number | null => {
    const matches = text.match(/\d+\.?\d*/);
    return matches ? parseFloat(matches[0]) : null;
  };

  const processMetricCommand = (text: string): string | null => {
    text = normalizeText(text);

    // Define exact metric-related phrases for adding/recording metrics
    const metricPhrases = [
      // Add phrases
      'add weight', 'add heart rate', 'add blood pressure', 'add sleep',
      'add blood sugar', 'add temperature', 'add oxygen', 'add steps',
      'record weight', 'record heart rate', 'record blood pressure', 'record sleep',
      'record blood sugar', 'record temperature', 'record oxygen', 'record steps',
      'log weight', 'log heart rate', 'log blood pressure', 'log sleep',
      'log blood sugar', 'log temperature', 'log oxygen', 'log steps',
      // View phrases
      'show metrics', 'show my metrics', 'view metrics', 'view my metrics',
      'latest weight', 'latest heart rate', 'latest blood pressure', 'latest sleep',
      'latest blood sugar', 'latest temperature', 'latest oxygen', 'latest steps',
      'my weight', 'my heart rate', 'my blood pressure', 'my sleep',
      'my blood sugar', 'my temperature', 'my oxygen', 'my steps'
    ];

    // Check if the message matches any metric-related phrase exactly
    const isMetricCommand = metricPhrases.some(phrase => text === phrase);

    // If it's not an exact match, check if it's an analysis request
    if (!isMetricCommand) {
      const analysisKeywords = ['analyze', 'analysis', 'insights', 'patterns', 'trends', 'quality'];
      const isAnalysisRequest = analysisKeywords.some(keyword => text.includes(keyword));
      
      if (isAnalysisRequest) {
        console.log('Analysis request detected, using Gemini');
        return null; // Let Gemini handle analysis requests
      }
    }

    if (!isMetricCommand) {
      console.log('Not a metric command, using Gemini');
      return null; // Not a metric command, let Gemini handle it
    }

    console.log('Processing metric command');

    // Enhanced greetings with more variations
    const greetings = [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
      'howdy', 'whats up', 'sup', 'hiya', 'yo', 'greetings'
    ];
    if (greetings.some(greeting => fuzzyMatch(text, greeting))) {
      return getHelpMessage();
    }

    // Enhanced help detection
    const helpPhrases = [
      'help', 'what can you do', 'how does this work', 'what are my options',
      'guide me', 'assist me', 'show me how', 'what should i do', 'commands',
      'menu', 'options', 'features', 'capabilities', 'instructions', '?'
    ];
    if (helpPhrases.some(phrase => fuzzyMatch(text, phrase))) {
      return getHelpMessage();
    }

    // Enhanced metric addition detection
    const additionKeywords = [
      'add', 'record', 'set', 'update', 'log', 'input', 'enter',
      'put', 'save', 'store', 'track', 'new', 'create', 'register'
    ];
    if (additionKeywords.some(keyword => fuzzyMatch(text, keyword))) {
      const metricType = findMetricType(text);
      const value = extractNumber(text);

      if (metricType && value) {
        const info = getMetricInfo()[metricType];
        if (info) {
          try {
            onAddMetric(metricType, value);
            return `I've added ${value} ${info.unit} to your ${metricType.replace('_', ' ')} metrics.`;
          } catch (error) {
            return "Sorry, I couldn't add that measurement. Please try again or use the form above.";
          }
        }
      } else if (metricType) {
        return `What value would you like to add for ${metricType.replace('_', ' ')}?`;
      } else if (value) {
        return "I see the number ${value}, but which metric would you like to add it to? You can say things like:\n" +
               "- 'add weight 68 kg'\n" +
               "- 'record 75 heart rate'\n" +
               "- 'set blood pressure to 120/80'\n" +
               "- 'log 7 hours of sleep'";
      }
    }

    // Enhanced viewing metrics detection
    const viewingKeywords = [
      'show', 'view', 'latest', 'my', 'display', 'see', 'check',
      'what are', 'whats', "what's", 'tell me', 'get', 'fetch',
      'look up', 'find', 'read', 'list', 'give me'
    ];
    if (viewingKeywords.some(keyword => fuzzyMatch(text, keyword))) {
      const metricType = findMetricType(text);
      if (metricType) {
        const latest = getLatestMetric(metricType);
        const info = getMetricInfo()[metricType];
        if (latest && info) {
          return `Your latest ${metricType.replace('_', ' ')} reading is ${latest.value} ${info.unit} (recorded on ${new Date(latest.created_at).toLocaleDateString()})`;
        } else {
          return `You haven't recorded any ${metricType.replace('_', ' ')} measurements yet.`;
        }
      } else if (text.includes('metric') || text.includes('all') || viewingKeywords.some(keyword => text.match(new RegExp(`${keyword}\\s*$`)))) {
        const allMetrics = Object.entries(getMetricInfo())
          .map(([type, info]) => {
            const latest = getLatestMetric(type);
            if (latest) {
              return `${type.replace('_', ' ')}: ${latest.value} ${info.unit} (${new Date(latest.created_at).toLocaleDateString()})`;
            }
            return null;
          })
          .filter(Boolean);

        if (allMetrics.length > 0) {
          return "Here are your latest metrics:\n" + allMetrics.join('\n');
        } else {
          return "You haven't recorded any metrics yet. You can add metrics by saying things like:\n" +
                 "- 'add 68 kg weight'\n" +
                 "- 'record 75 heart rate'\n" +
                 "- 'log 7 hours of sleep'";
        }
      }
    }

    // If no specific metric command is matched, return null to use Gemini
    return null;
  };

  const resetConversation = () => {
    setMessages([{
      text: "Hello, I'm your health assistant. How may I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    }]);
    setInput('');
  };

  const handleClose = () => {
    setIsOpen(false);
    resetConversation();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          )}
        </svg>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col transform transition-all duration-300 animate-slideUp">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <h3 className="text-lg font-semibold tracking-wide">Health Assistant</h3>
            </div>
            <button 
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                {message.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold mr-2">
                    HA
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-line text-[15px] leading-relaxed font-inter">
                    {message.text}
                  </p>
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' 
                      ? 'text-blue-100' 
                      : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {message.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold ml-2">
                    You
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold mr-2">
                  HA
                </div>
                <TypingIndicator />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white rounded-b-2xl">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[15px] placeholder-gray-400"
              />
              <button
                onClick={handleSend}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!input.trim()}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}