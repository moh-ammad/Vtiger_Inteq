import { useState } from 'react';
import { Users, Mail, Phone, CheckCircle2, XCircle, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function LeadsSection({ leads }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedLead, setExpandedLead] = useState(null);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'matched' && lead.hasMatch) ||
      (filterStatus === 'unmatched' && !lead.hasMatch) ||
      (filterStatus === 'pending' && lead.cf_941 === 'pending') ||
      (filterStatus === 'approved' && lead.cf_941 === 'approved');
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      '': 'bg-slate-100 text-slate-600 border-slate-200'
    };
    
    return badges[status] || badges[''];
  };

  const toggleExpand = (leadId) => {
    setExpandedLead(expandedLead === leadId ? null : leadId);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200/60 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-br from-slate-800 via-slate-900 to-slate-950 px-7 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold tracking-tight">All Leads</h2>
              <p className="text-sm text-slate-300 mt-1 font-medium">{filteredLeads.length} leads found</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-7 border-b-2 border-slate-200 bg-linear-to-br from-slate-50 to-white">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl 
                         text-slate-900 placeholder-slate-400 font-medium
                         focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                         hover:border-slate-300 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                filterStatus === 'all'
                  ? 'bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('matched')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                filterStatus === 'matched'
                  ? 'bg-linear-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30 scale-105'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              Matched
            </button>
            <button
              onClick={() => setFilterStatus('unmatched')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                filterStatus === 'unmatched'
                  ? 'bg-linear-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 scale-105'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              Unmatched
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                filterStatus === 'pending'
                  ? 'bg-linear-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-500/30 scale-105'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Leads List */}
      <div className="divide-y divide-slate-200 max-h-175 overflow-y-auto">
        {filteredLeads.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <div className="bg-slate-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-700">No leads found</p>
            <p className="text-sm mt-2 text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="hover:bg-linear-to-r hover:from-slate-50 hover:to-blue-50/30 transition-all duration-200">
              <div 
                className="p-7 cursor-pointer"
                onClick={() => toggleExpand(lead.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {lead.firstname} {lead.lastname}
                      </h3>
                      
                      {/* Match Status */}
                      {lead.hasMatch ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full border border-red-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Unmatched
                        </span>
                      )}

                      {/* CF_941 Status Badge */}
                      {lead.cf_941 && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(lead.cf_941)}`}>
                          {lead.cf_941.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                      {(lead.phone || lead.mobile) && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{lead.phone || lead.mobile}</span>
                        </div>
                      )}
                    </div>

                    {lead.hasMatch && (
                      <div className="mt-2 text-sm text-blue-600 font-medium">
                        {lead.matchedAppointments?.length} appointment(s) matched via {lead.matchType}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {expandedLead === lead.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedLead === lead.id && (
                <div className="px-7 pb-7 border-t-2 border-slate-100 bg-linear-to-br from-slate-50 to-white">
                  <div className="pt-6">
                    <h4 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                      <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                      Lead Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wide">Lead No</span>
                        <span className="text-slate-900 font-bold text-base">{lead.lead_no || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wide">Company</span>
                        <span className="text-slate-900 font-bold text-base">{lead.company || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wide">Lead Status</span>
                        <span className="text-slate-900 font-bold text-base">{lead.leadstatus || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wide">Lead Source</span>
                        <span className="text-slate-900 font-bold text-base">{lead.leadsource || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wide">Created Time</span>
                        <span className="text-slate-900 font-bold text-base">{lead.createdtime || 'N/A'}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wide">CF_941 Status</span>
                        <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg border-2 ${getStatusBadge(lead.cf_941)}`}>
                          {lead.cf_941 || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {lead.description && (
                      <div className="mt-5 bg-white p-5 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wide">Description</span>
                        <p className="text-slate-900 text-sm leading-relaxed">{lead.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
