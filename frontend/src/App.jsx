import { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Users,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react';
import CredentialForm from './components/CredentialForm';
import LeadsSection from './components/LeadsSection';
import AppointmentsSection from './components/AppointmentsSection';
import StatsCard from './components/StatsCard';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [crmCredentials, setCrmCredentials] = useState(() => {
    const saved = localStorage.getItem('crmCredentials');
    return saved ? JSON.parse(saved) : { baseUrl: '', username: '', accessKey: '' };
  });
  
  const [emrCredentials, setEmrCredentials] = useState(() => {
    const saved = localStorage.getItem('emrCredentials');
    return saved ? JSON.parse(saved) : { apiKey: '' };
  });
  
  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('leads');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [appointments, setAppointments] = useState([]);
  
  const [matchedLeads, setMatchedLeads] = useState(() => {
    const saved = localStorage.getItem('matchedLeads');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('stats');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [loading, setLoading] = useState({ crm: false, emr: false, matching: false });
  const [error, setError] = useState({ crm: null, emr: null, matching: null });
  const [rateLimit, setRateLimit] = useState({ perMinute: {}, perDay: {} });

  useEffect(() => {
    fetchRateLimitStatus();
    const interval = setInterval(fetchRateLimitStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-load data from server on mount
  useEffect(() => {
    const autoLoadData = async () => {
      try {
        // Fetch leads from server (local file)
        const leadsRes = await fetch(`${API_BASE}/fetch-crm-leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const leadsData = await leadsRes.json();
        
        if (leadsRes.ok && leadsData.leads && leadsData.leads.length > 0) {
          setLeads(leadsData.leads);
          
          // Fetch appointments from server (local file)
          const apptRes = await fetch(`${API_BASE}/fetch-emr-appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: '' })
          });
          const apptData = await apptRes.json();
          
          if (apptRes.ok && apptData.appointments && apptData.appointments.length > 0) {
            setAppointments(apptData.appointments);
            
            // Auto-match if not already matched
            if (matchedLeads.length === 0) {
              await performMatching(leadsData.leads, apptData.appointments);
            }
          }
        }
      } catch (err) {
        console.error('Auto-load data failed:', err);
      }
    };
    
    // Only auto-load if we don't have matched data already
    if (matchedLeads.length === 0) {
      autoLoadData();
    }
  }, []);

  // Persist credentials to localStorage
  useEffect(() => {
    localStorage.setItem('crmCredentials', JSON.stringify(crmCredentials));
  }, [crmCredentials]);

  useEffect(() => {
    localStorage.setItem('emrCredentials', JSON.stringify(emrCredentials));
  }, [emrCredentials]);

  // Persist data to localStorage (appointments excluded - too large, loaded from server file)
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('leads', JSON.stringify(leads));
    }
  }, [leads]);

  useEffect(() => {
    if (matchedLeads.length > 0) {
      localStorage.setItem('matchedLeads', JSON.stringify(matchedLeads));
    }
  }, [matchedLeads]);

  useEffect(() => {
    if (stats) {
      localStorage.setItem('stats', JSON.stringify(stats));
    }
  }, [stats]);

  const fetchRateLimitStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/rate-limit-status`);
      const data = await res.json();
      setRateLimit(data);
    } catch (err) {
      console.error('Failed to fetch rate limit status:', err);
    }
  };

  const handleFetchCRM = async () => {
    setLoading(prev => ({ ...prev, crm: true }));
    setError(prev => ({ ...prev, crm: null }));
    
    try {
      const res = await fetch(`${API_BASE}/fetch-crm-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmCredentials)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error);
      }
      
      setLeads(data.leads);
      await fetchRateLimitStatus();
      
      // Auto-match if appointments already loaded
      if (appointments.length > 0) {
        await performMatching(data.leads, appointments);
      }
    } catch (err) {
      setError(prev => ({ ...prev, crm: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, crm: false }));
    }
  };

  const handleFetchEMR = async () => {
    setLoading(prev => ({ ...prev, emr: true }));
    setError(prev => ({ ...prev, emr: null }));
    
    try {
      const res = await fetch(`${API_BASE}/fetch-emr-appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emrCredentials)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error);
      }
      
      setAppointments(data.appointments);
      await fetchRateLimitStatus();
      
      // Auto-match if leads already loaded
      if (leads.length > 0) {
        await performMatching(leads, data.appointments);
      }
    } catch (err) {
      setError(prev => ({ ...prev, emr: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, emr: false }));
    }
  };

  const performMatching = async (leadsData, appointmentsData) => {
    setLoading(prev => ({ ...prev, matching: true }));
    setError(prev => ({ ...prev, matching: null }));
    
    try {
      const res = await fetch(`${API_BASE}/match-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leads: leadsData, 
          appointments: appointmentsData 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error);
      }
      
      setMatchedLeads(data.matchedLeads);
      setStats(data.stats);
    } catch (err) {
      setError(prev => ({ ...prev, matching: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, matching: false }));
    }
  };

  const successfulLeads = matchedLeads.filter(lead => lead.hasMatch);
  const hasData = matchedLeads.length > 0;

  const handleFetchNow = async () => {
    setLoading({ crm: true, emr: true, matching: true });
    setError({ crm: null, emr: null, matching: null });
    
    try {
      // Fetch leads from CRM
      const leadsRes = await fetch(`${API_BASE}/fetch-crm-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmCredentials)
      });
      const leadsData = await leadsRes.json();
      
      if (!leadsRes.ok) {
        throw new Error(leadsData.message || leadsData.error || 'Failed to fetch leads');
      }
      
      setLeads(leadsData.leads);
      setLoading(prev => ({ ...prev, crm: false }));
      
      // Fetch appointments from EMR
      const apptRes = await fetch(`${API_BASE}/fetch-emr-appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emrCredentials)
      });
      const apptData = await apptRes.json();
      
      if (!apptRes.ok) {
        throw new Error(apptData.message || apptData.error || 'Failed to fetch appointments');
      }
      
      setAppointments(apptData.appointments);
      setLoading(prev => ({ ...prev, emr: false }));
      
      // Perform matching
      await performMatching(leadsData.leads, apptData.appointments);
      await fetchRateLimitStatus();
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError({ crm: err.message, emr: err.message, matching: null });
    } finally {
      setLoading({ crm: false, emr: false, matching: false });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg shadow-blue-500/30 transform transition-transform hover:scale-105">
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CRM & EMR Integration</h1>
                <p className="text-sm text-slate-600 mt-0.5">Lead matching and appointment tracking system</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Rate Limits</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-slate-800">
                      {rateLimit.perMinute.remaining || 3}/3
                    </span>
                    <span className="text-xs text-slate-500">min</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-bold text-slate-800">
                      {rateLimit.perDay.remaining || 30}/30
                    </span>
                    <span className="text-xs text-slate-500">day</span>
                  </div>
                </div>
              </div>
              
              {hasData && (
                <button
                  onClick={handleFetchNow}
                  disabled={loading.crm || loading.emr || loading.matching}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl
                           hover:from-blue-700 hover:to-indigo-700 
                           focus:outline-none focus:ring-4 focus:ring-blue-500/50
                           disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed
                           transition-all duration-200 flex items-center gap-2
                           shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                           transform hover:scale-105 active:scale-95"
                >
                  {(loading.crm || loading.emr || loading.matching) ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Fetching...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">Fetch Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-8">
        {/* Credentials Section - Only show if no data loaded */}
        {!hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CredentialForm
              title="CRM Credentials"
              subtitle="Vtiger CRM"
              icon={<Server className="w-5 h-5" />}
              credentials={crmCredentials}
              onCredentialsChange={setCrmCredentials}
              onFetch={handleFetchCRM}
              loading={loading.crm}
              error={error.crm}
              fields={[
                { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://your-crm.com/webservice.php' },
                { name: 'username', label: 'Username', type: 'text', placeholder: 'username' },
                { name: 'accessKey', label: 'Access Key', type: 'password', placeholder: 'Your access key' }
              ]}
            />
            
            <CredentialForm
              title="EMR Credentials"
              subtitle="IntakeQ Appointments"
              icon={<Calendar className="w-5 h-5" />}
              credentials={emrCredentials}
              onCredentialsChange={setEmrCredentials}
              onFetch={handleFetchEMR}
              loading={loading.emr}
              error={error.emr}
              fields={[
                { 
                  name: 'apiKey', 
                  label: 'API Key', 
                  type: 'password', 
                  placeholder: 'Enter IntakeQ API Key (Optional if using local data)',
                  optional: true 
                }
              ]}
            />
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              icon={<Users className="w-5 h-5" />}
              title="Total Leads"
              value={stats.totalLeads}
              color="blue"
            />
            <StatsCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              title="Matched Leads"
              value={stats.matchedLeads}
              color="green"
            />
            <StatsCard
              icon={<XCircle className="w-5 h-5" />}
              title="Unmatched"
              value={stats.unmatchedLeads}
              color="red"
            />
            <StatsCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Match Rate"
              value={`${stats.totalLeads > 0 ? Math.round((stats.matchedLeads / stats.totalLeads) * 100) : 0}%`}
              color="purple"
            />
          </div>
        )}

        {/* Loading State for Matching */}
        {loading.matching && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300/50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <div>
                <span className="text-blue-900 font-semibold text-lg">Matching leads with appointments...</span>
                <p className="text-blue-700 text-sm mt-0.5">Please wait while we process the data</p>
              </div>
            </div>
          </div>
        )}

        {/* Error State for Matching */}
        {error.matching && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300/50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <span className="text-red-900 font-semibold text-lg">Error occurred</span>
                <p className="text-red-700 text-sm mt-0.5">{error.matching}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leads Section */}
        {matchedLeads.length > 0 && (
          <div className="animate-fadeIn">
            <LeadsSection leads={matchedLeads} />
          </div>
        )}

        {/* Appointments Section (Success Leads Only) */}
        {successfulLeads.length > 0 && (
          <div className="animate-fadeIn">
            <AppointmentsSection leads={successfulLeads} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
