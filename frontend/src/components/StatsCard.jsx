export default function StatsCard({ icon, title, value, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/30',
    green: 'from-green-500 to-green-600 shadow-green-500/30',
    red: 'from-red-500 to-red-600 shadow-red-500/30',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/30'
  };

  const bgColorClasses = {
    blue: 'from-blue-50 to-blue-100',
    green: 'from-green-50 to-green-100',
    red: 'from-red-50 to-red-100',
    purple: 'from-purple-50 to-purple-100'
  };

  const textColorClasses = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    purple: 'text-purple-700'
  };

  return (
    <div className="group relative bg-white rounded-2xl border-2 border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-300 p-7 transform hover:-translate-y-2 overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colorClasses[color]}`}></div>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 font-semibold uppercase tracking-wider mb-3">{title}</p>
          <p className={`text-4xl font-extrabold ${textColorClasses[color]} tracking-tight`}>{value}</p>
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${bgColorClasses[color]} shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
          <div className={`text-${color}-600`}>
            {icon}
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br ${bgColorClasses[color]} rounded-full blur-3xl opacity-20 -mb-16 -mr-16`}></div>
    </div>
  );
}
