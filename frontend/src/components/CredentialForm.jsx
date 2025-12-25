import { RefreshCw, AlertCircle } from 'lucide-react';

export default function CredentialForm({ 
  title, 
  subtitle, 
  icon, 
  credentials, 
  onCredentialsChange, 
  onFetch, 
  loading, 
  error, 
  fields 
}) {
  const handleInputChange = (name, value) => {
    onCredentialsChange(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = fields.every(field => field.optional || credentials[field.name]?.trim());

  return (
    <div className="group bg-white rounded-2xl border-2 border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-7 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg border border-white/30">
            {icon}
          </div>
          <div className="text-white">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-sm text-blue-100 mt-1 font-medium">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-7">
        <div className="space-y-5">
          {fields.map(field => (
            <div key={field.name} className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {field.label}
              </label>
              <input
                type={field.type}
                value={credentials[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-3.5 bg-slate-50/50 border-2 border-slate-200 rounded-xl 
                         text-slate-900 placeholder-slate-400 font-medium
                         focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                         hover:border-slate-300
                         transition-all duration-200 shadow-sm"
              />
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-5 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl shadow-sm animate-shake">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-900 mb-0.5">Error occurred</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fetch Button */}
        <button
          onClick={onFetch}
          disabled={!isFormValid || loading}
          className="mt-7 w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl
                   hover:from-blue-700 hover:to-indigo-700 
                   focus:outline-none focus:ring-4 focus:ring-blue-500/50
                   disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed disabled:transform-none
                   transition-all duration-200 flex items-center justify-center gap-3
                   shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                   transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-base">Fetching Data...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              <span className="text-base">Fetch Data</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
