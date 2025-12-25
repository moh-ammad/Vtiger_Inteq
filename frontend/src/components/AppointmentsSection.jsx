import { useState } from 'react';
import { Calendar, User, Clock, MapPin, DollarSign, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';

export default function AppointmentsSection({ leads }) {
  const [expandedLead, setExpandedLead] = useState(null);

  const toggleExpand = (leadId) => {
    setExpandedLead(expandedLead === leadId ? null : leadId);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Confirmed': 'bg-green-100 text-green-800 border-green-200',
      'Canceled': 'bg-red-100 text-red-800 border-red-200',
      'Completed': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200/60 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-700 px-7 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="text-white">
            <h2 className="text-2xl font-bold tracking-tight">Matched Appointments</h2>
            <p className="text-sm text-green-100 mt-1 font-medium">
              Showing {leads.length} leads with appointments
            </p>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="divide-y divide-slate-200 max-h-[700px] overflow-y-auto">
        {leads.map((lead) => (
          <div key={lead.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-green-50/30 transition-all duration-200">
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
                    
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
                      {lead.matchedAppointments?.length || 0} Appointment(s)
                    </span>

                    {lead.cf_941 && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        lead.cf_941 === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : lead.cf_941 === 'approved'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {lead.cf_941.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{lead.email}</span>
                    </div>
                    {(lead.phone || lead.mobile) && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{lead.phone || lead.mobile}</span>
                      </div>
                    )}
                  </div>
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

            {/* Expanded Appointments */}
            {expandedLead === lead.id && lead.matchedAppointments && (
              <div className="px-7 pb-7 border-t-2 border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                <div className="pt-6 space-y-5">
                  {lead.matchedAppointments.map((appointment, idx) => (
                    <div 
                      key={appointment.Id || idx} 
                      className="bg-white border-2 border-slate-200/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <h4 className="font-bold text-slate-900 text-lg mb-2">
                            {appointment.ServiceName || 'Appointment'}
                          </h4>
                          <span className={`inline-block px-4 py-1.5 text-xs font-bold rounded-full border-2 ${getStatusColor(appointment.Status)}`}>
                            {appointment.Status}
                          </span>
                        </div>
                        {appointment.Price && (
                          <div className="flex items-center gap-2 bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-2.5 rounded-xl border-2 border-green-200 shadow-sm">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-green-700 font-bold text-lg">{appointment.Price}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(appointment.StartDate)}</span>
                        </div>

                        {appointment.Duration && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{appointment.Duration} minutes</span>
                          </div>
                        )}

                        {appointment.LocationName && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{appointment.LocationName}</span>
                          </div>
                        )}

                        {appointment.PractitionerName && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{appointment.PractitionerName}</span>
                          </div>
                        )}
                      </div>

                      {appointment.ClientNote && (
                        <div className="mt-5 pt-5 border-t-2 border-slate-200">
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                            <p className="text-sm text-slate-700 leading-relaxed">
                              <span className="font-bold text-blue-700">Note: </span>
                              {appointment.ClientNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
