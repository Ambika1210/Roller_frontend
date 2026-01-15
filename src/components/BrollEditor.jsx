import { useState } from 'react';
import axios from 'axios';
import { Upload, Film, Play, Loader2, CheckCircle, Clock, X, FileVideo, Sparkles, Download, Eye, LogOut, User, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../constants/api';
import { getErrorMessage, isServerError } from '../utils/errorHandler';

const BrollEditor = ({ onLogout }) => {
  const [aRoll, setARoll] = useState(null);
  const [bRolls, setBRolls] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const handlePreview = () => {
    if (!result?.plan) return;
    
    // Create a preview of the plan data
    const planData = JSON.stringify(result.plan, null, 2);
    const blob = new Blob([planData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
      <html>
        <head>
          <title>B-Roll Plan Preview</title>
          <style>
            body {
              font-family: monospace;
              background: #1e293b;
              color: #e2e8f0;
              padding: 20px;
              margin: 0;
            }
            pre {
              background: #0f172a;
              padding: 20px;
              border-radius: 8px;
              overflow-x: auto;
            }
            h1 {
              color: #60a5fa;
            }
            .insertion {
              background: #1e293b;
              border: 1px solid #334155;
              padding: 15px;
              margin: 10px 0;
              border-radius: 8px;
            }
            .label {
              color: #94a3b8;
              font-size: 12px;
            }
            .value {
              color: #e2e8f0;
              font-size: 14px;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <h1>B-Roll Insertion Plan</h1>
          <div>
            ${result.plan.insertions.map((ins, idx) => `
              <div class="insertion">
                <h3>Insertion ${idx + 1}</h3>
                <div class="label">Start Time</div>
                <div class="value">${ins.start_sec} seconds</div>
                <div class="label">Duration</div>
                <div class="value">${ins.duration_sec} seconds</div>
                <div class="label">B-Roll ID</div>
                <div class="value">${ins.broll_id}</div>
                <div class="label">Reason</div>
                <div class="value">${ins.reason}</div>
              </div>
            `).join('')}
          </div>
          <h2>Raw JSON</h2>
          <pre>${planData}</pre>
        </body>
      </html>
    `);
  };

  const handleDownload = () => {
    if (!result?.plan) return;
    
    // Create downloadable JSON file
    const planData = JSON.stringify(result.plan, null, 2);
    const blob = new Blob([planData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `broll-plan-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (type === 'aroll') {
        setARoll(e.dataTransfer.files[0]);
      } else {
        setBRolls(e.dataTransfer.files);
      }
    }
  };

  const removeFile = (type, index = null) => {
    if (type === 'aroll') {
      setARoll(null);
    } else {
      const newBRolls = Array.from(bRolls).filter((_, i) => i !== index);
      setBRolls(newBRolls);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!aRoll || bRolls.length === 0) return;

    setProcessing(true);
    setUploadProgress(0);
    setError('');
    setResult(null);
    
    const formData = new FormData();
    formData.append('a_roll', aRoll);
    Array.from(bRolls).forEach(file => {
      formData.append('b_rolls', file);
    });

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(API_ENDPOINTS.BROLL_PROCESS, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });
      
      console.log('API Response:', response.data);
      
      // Handle new response structure from response helper
      if (response.data.status === 'Success' || response.data.success) {
        const plan = response.data.data?.plan || response.data.plan;
        
        if (!plan) {
          throw new Error('Invalid response format from server');
        }
        
        setResult(response.data.data || response.data);
      } else {
        throw new Error(response.data.message || response.data.data || 'Failed to process video');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      // If it's a server error, suggest trying again
      if (isServerError(error)) {
        setError(`${errorMessage} Please try again in a moment.`);
      }
    } finally {
      setProcessing(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-6">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-center flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-100">
                Smart B-Roll Inserter
              </h1>
              <p className="text-base text-slate-400 max-w-2xl mx-auto">
                Transform your talking-head videos with AI-powered B-roll insertions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-400">
                <User className="w-4 h-4" />
                <span className="text-sm">
                  {(() => {
                    try {
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      return user.email || 'User';
                    } catch {
                      return 'User';
                    }
                  })()}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 pb-16 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-medium mb-1">Processing Failed</h3>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          
          {/* Upload Card */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                Upload Assets
              </h2>
              <div className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full">
                Step 1 of 2
              </div>
            </div>
            
            <form onSubmit={handleUpload} className="space-y-4">
              {/* A-Roll Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  A-Roll (Main Video) <span className="text-red-400">*</span>
                </label>
                
                {aRoll ? (
                  <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-600 rounded">
                          <FileVideo className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 truncate max-w-48">{aRoll.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(aRoll.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile('aroll')}
                        className="p-1 hover:bg-red-600 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                      dragActive 
                        ? 'border-blue-400 bg-blue-500/10' 
                        : 'border-slate-600 hover:border-blue-500 hover:bg-slate-700/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'aroll')}
                  >
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <div className="p-2 bg-slate-700 rounded-lg mb-2">
                        <Film className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-300 mb-1">
                        Drop your A-Roll here or click to browse
                      </p>
                      <p className="text-xs text-slate-500">
                        MP4, MOV, AVI up to 500MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="video/*"
                      onChange={(e) => setARoll(e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {/* B-Roll Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  B-Roll Videos <span className="text-red-400">*</span>
                  {bRolls.length > 0 && (
                    <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                      {bRolls.length} file{bRolls.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                
                {bRolls.length > 0 ? (
                  <div className="space-y-2">
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {Array.from(bRolls).map((file, index) => (
                        <div key={index} className="bg-slate-700 border border-slate-600 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-purple-600 rounded">
                                <FileVideo className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-200 truncate max-w-40">{file.name}</p>
                                <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile('broll', index)}
                              className="p-1 hover:bg-red-600 rounded transition-colors"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <label className="flex items-center justify-center w-full h-10 border border-dashed border-slate-600 rounded-lg hover:border-blue-500 hover:bg-slate-700/50 transition cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Add more B-Roll videos</span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="video/*"
                        multiple
                        onChange={(e) => setBRolls([...bRolls, ...e.target.files])}
                      />
                    </label>
                  </div>
                ) : (
                  <label 
                    className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                      dragActive 
                        ? 'border-purple-400 bg-purple-500/10' 
                        : 'border-slate-600 hover:border-purple-500 hover:bg-slate-700/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'broll')}
                  >
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <div className="p-2 bg-slate-700 rounded-lg mb-2">
                        <Upload className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-300 mb-1">
                        Drop B-Roll videos here or click to browse
                      </p>
                      <p className="text-xs text-slate-500">
                        Multiple files supported • MP4, MOV, AVI
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="video/*"
                      multiple
                      onChange={(e) => setBRolls(e.target.files)}
                    />
                  </label>
                )}
              </div>

              {/* Progress Bar */}
              {processing && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Uploading...</span>
                    <span className="text-blue-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!aRoll || bRolls.length === 0 || processing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate B-Roll Plan</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Card */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-green-600 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                B-Roll Plan
              </h2>
              <div className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full">
                Step 2 of 2
              </div>
            </div>
            
            {!result && !processing && (
              <div className="text-center py-12">
                <div className="p-3 bg-slate-700 rounded-xl inline-block mb-4">
                  <Clock className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">Ready to Generate</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Upload your A-Roll and B-Roll videos to create an intelligent insertion plan
                </p>
              </div>
            )}

            {processing && (
              <div className="text-center py-12">
                <div className="p-3 bg-blue-600/20 rounded-xl inline-block mb-4">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-blue-300 mb-2">AI Processing</h3>
                <p className="text-slate-400 max-w-sm mx-auto mb-4">
                  Analyzing your content and generating optimal B-roll insertions...
                </p>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Check if there's an error in the response */}
                {result.plan?._raw_response?.includes('error') || result.plan?.insertions?.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <span className="text-sm font-medium text-yellow-400">Processing Completed with Issues</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-sm font-medium text-green-400">Plan Generated Successfully</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handlePreview}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Preview Plan"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      <button 
                        onClick={handleDownload}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Download Plan"
                      >
                        <Download className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded ${result.plan?._raw_response?.includes('error') ? 'bg-yellow-600' : 'bg-green-600'}`}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-200">B-Roll Processing Result</h3>
                  </div>

                  {/* Show error message if present */}
                  {result.plan?._raw_response?.includes('error') && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">!</span>
                        </div>
                        <span className="text-yellow-400 font-medium text-sm">API Quota Exceeded</span>
                      </div>
                      <p className="text-yellow-300 text-sm">
                        OpenAI API quota has been exceeded. Please check your billing details or try again later.
                      </p>
                    </div>
                  )}

                  {/* Processing Stats */}
                  {result.meta && (
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Processing Time</div>
                        <div className="text-lg font-semibold text-slate-200">
                          {(result.meta.processing_time_ms / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Clips Processed</div>
                        <div className="text-lg font-semibold text-slate-200">
                          {result.meta.clip_count || 0}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insertions Count */}
                  {result.plan?.insertions && (
                    <div className="bg-slate-800 rounded-lg p-3 mb-3">
                      <div className="text-xs text-slate-400 mb-1">B-Roll Insertions</div>
                      <div className="text-lg font-semibold text-slate-200">
                        {result.plan.insertions.length} insertion{result.plan.insertions.length !== 1 ? 's' : ''} planned
                      </div>
                    </div>
                  )}
                  

                  
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {result.plan?._raw_response?.includes('error') 
                        ? 'Processing completed with errors' 
                        : 'Generated with AI • Ready for implementation'
                      }
                    </span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Action Buttons - Only show if successful */}
                {!result.plan?._raw_response?.includes('error') && result.plan?.insertions?.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handlePreview}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Preview
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                )}

                {/* Retry Button for Errors */}
                {result.plan?._raw_response?.includes('error') && (
                  <button 
                    onClick={() => {
                      setResult(null);
                      // Optionally trigger a retry
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BrollEditor;