'use client';

interface Appointment {
  id: string;
  service_name: string;
  staff_member: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  customers?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

interface ScheduleViewProps {
  appointments: Appointment[];
}

export default function ScheduleView({ appointments }: ScheduleViewProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(apt => 
    apt.start_time?.startsWith(today)
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (todayAppointments.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Today's Schedule</h2>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No appointments scheduled for today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Today's Schedule</h2>
      <div className="space-y-3">
        {todayAppointments.map(apt => (
          <div key={apt.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{apt.service_name}</h3>
                <p className="text-gray-700 mt-1">{apt.customers?.name || 'No customer name'}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Time:</span> {formatTime(apt.start_time)}
                    {apt.end_time && ` - ${formatTime(apt.end_time)}`}
                  </p>
                  {apt.customers?.phone && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {apt.customers.phone}
                    </p>
                  )}
                  {apt.staff_member && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Staff:</span> {apt.staff_member}
                    </p>
                  )}
                </div>
                {apt.notes && (
                  <p className="text-sm text-gray-500 mt-2 italic">{apt.notes}</p>
                )}
              </div>
              <div className="ml-4 text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                  {apt.status || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

