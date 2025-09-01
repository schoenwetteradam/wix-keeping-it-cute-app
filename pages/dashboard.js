import { useState, useEffect } from 'react';
import { supabase } from '../lib/auth';
import useSWR, { mutate } from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const { data: clients, error: clientsError } = useSWR('/api/clients', fetcher);
  const { data: appointments, error: appointmentsError } = useSWR('/api/appointments', fetcher);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleSync = async () => {
    try {
      await fetch('/api/sync/clients', { method: 'POST' });
      await fetch('/api/sync/bookings', { method: 'POST' });
      mutate('/api/clients');
      mutate('/api/appointments');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Keeping It Cute - Staff Dashboard</h1>
            <button 
              onClick={handleSync}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sync with Wix
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clients Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Clients</h2>
            {clients?.map((client) => (
              <div key={client.id} className="border-b py-2">
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-500">{client.email}</div>
              </div>
            ))}
          </div>

          {/* Appointments Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Today's Appointments</h2>
            {appointments?.map((appointment) => (
              <div key={appointment.id} className="border-b py-2">
                <div className="font-medium">{appointment.client?.name}</div>
                <div className="text-sm text-gray-500">
                  {new Date(appointment.appointment_date).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
