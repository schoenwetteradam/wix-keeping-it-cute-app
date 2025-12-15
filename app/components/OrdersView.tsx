'use client';

interface Order {
  id: string;
  wix_order_id?: string;
  order_date: string;
  total_amount: number;
  status: string;
  items?: any;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

interface OrdersViewProps {
  orders: Order[];
}

export default function OrdersView({ orders }: OrdersViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No orders found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {order.customers?.name || 'Unknown Customer'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(order.order_date)}
                </p>
                {order.wix_order_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Order ID: {order.wix_order_id}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-gray-900">
                  {formatCurrency(order.total_amount || 0)}
                </p>
                <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status || 'Pending'}
                </span>
              </div>
            </div>
            {order.customers?.email && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {order.customers.email}
              </p>
            )}
            {order.customers?.phone && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Phone:</span> {order.customers.phone}
              </p>
            )}
            {order.items && typeof order.items === 'object' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Items: {Array.isArray(order.items) ? order.items.length : 'N/A'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

