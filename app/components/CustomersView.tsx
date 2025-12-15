'use client';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  wix_contact_id?: string;
}

interface CustomersViewProps {
  customers: Customer[];
}

export default function CustomersView({ customers }: CustomersViewProps) {
  if (customers.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No customers found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
      <div className="space-y-3">
        {customers.map(customer => (
          <div key={customer.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 text-lg">{customer.name}</h3>
            <div className="mt-2 space-y-1">
              {customer.email && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span>{' '}
                  <a href={`mailto:${customer.email}`} className="text-purple-600 hover:underline">
                    {customer.email}
                  </a>
                </p>
              )}
              {customer.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span>{' '}
                  <a href={`tel:${customer.phone}`} className="text-purple-600 hover:underline">
                    {customer.phone}
                  </a>
                </p>
              )}
              {customer.notes && (
                <p className="text-sm text-gray-500 mt-2 italic border-t border-gray-100 pt-2">
                  {customer.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

