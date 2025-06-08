// pages/staff.js - Add this file to your existing app
import React, { useState, useEffect } from 'react';
import { Plus, Minus, AlertTriangle, Package, Clock, CheckCircle, Search, User, Calendar } from 'lucide-react';

const StaffPortal = () => {
  const [currentStep, setCurrentStep] = useState('select'); // 'select', 'logging', 'complete'
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsByCategory, setProductsByCategory] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSession, setCurrentSession] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [staffMember] = useState({ id: 1, name: 'Staff Member' });
  const [sessionNotes, setSessionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch today's bookings on load
  useEffect(() => {
    fetchTodaysBookings();
    fetchProducts();
  }, []);

  const fetchTodaysBookings = async () => {
    try {
      setLoading(true);
      // For now, use sample data since we need real bookings from your webhook system
      const sampleBookings = [
        {
          id: 1,
          wix_booking_id: 'wix-booking-001',
          customer_name: 'Emily Johnson',
          customer_email: 'emily@example.com',
          customer_phone: '555-123-4567',
          service_name: 'Cut & Color with Davines',
          appointment_date: new Date().toISOString(),
          total_price: 150.00,
          staff_member: 'Sarah Johnson',
          status: 'scheduled',
          notes: 'Customer prefers Davines color. Allergic to ammonia-based products.',
          previous_notes: [
            { date: '2024-11-15', note: 'Loved the Davines balayage, wants to go lighter next time' },
            { date: '2024-10-12', note: 'Sensitive scalp, use gentle Farmhouse Fresh products' }
          ]
        },
        {
          id: 2,
          wix_booking_id: 'wix-booking-002', 
          customer_name: 'Maria Garcia',
          customer_email: 'maria@example.com',
          customer_phone: '555-987-6543',
          service_name: 'Manicure with Madam Glam',
          appointment_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          total_price: 65.00,
          staff_member: 'Jessica Wilson',
          status: 'scheduled',
          notes: 'Regular client, loves Rose Gold and Classic Red polishes.',
          previous_notes: [
            { date: '2024-12-01', note: 'Used Madam Glam Rose Gold - perfect match' }
          ]
        }
      ];
      
      setBookings(sampleBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/get-products');
      const data = await response.json();
      
      if (data.status === 'success') {
        setProducts(data.products);
        setProductsByCategory(data.products_by_category);
      } else {
        console.error('Failed to fetch products:', data.error);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const selectBooking = (booking) => {
    setSelectedBooking(booking);
    setSessionNotes(booking.notes || '');
    setCurrentStep('logging');
    
    // Start session
    setCurrentSession({
      id: Date.now(),
      booking_id: booking.id,
      staff_member_id: staffMember.id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      service_performed: booking.service_name,
      total_service_cost: booking.total_price,
      session_start_time: new Date().toISOString()
    });
  };

  const addProductToUsage = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(p => 
        p.id === product.id 
          ? { ...p, quantity_used: p.quantity_used + 1 }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        ...product,
        quantity_used: 1,
        usage_reason: '',
        notes: ''
      }]);
    }
  };

  const updateProductUsage = (productId, field, value) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const completeSession = async () => {
    if (selectedProducts.length === 0) {
      alert('Please log at least one product usage');
      return;
    }
    
    try {
      setLoading(true);
      
      const sessionData = {
        session: currentSession,
        products_used: selectedProducts,
        session_notes: sessionNotes
      };
      
      const response = await fetch('/api/complete-usage-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      const result = await response.json();
      
      if (result.status === 'Session completed successfully') {
        // Check for low stock alerts
        const newAlerts = selectedProducts.filter(p => 
          (p.current_stock - p.quantity_used) <= p.min_threshold
        );
        
        if (newAlerts.length > 0) {
          setAlerts(newAlerts);
        }
        
        setCurrentStep('complete');
      } else {
        alert('Error completing session: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Error completing session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('select');
    setSelectedBooking(null);
    setSelectedProducts([]);
    setCurrentSession(null);
    setAlerts([]);
    setSessionNotes('');
    fetchTodaysBookings(); // Refresh bookings
  };

  const getStockStatusColor = (product) => {
    if (product.current_stock <= 0) return 'text-red-600 bg-red-50';
    if (product.current_stock <= product.min_threshold) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCost = selectedProducts.reduce((sum, p) => sum + (p.quantity_used * p.cost_per_unit), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'}} className="text-white p-6 rounded-lg mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Portal</h1>
            <p className="text-pink-100">Keeping It Cute Salon - Product Usage Tracker</p>
          </div>
          <div className="text-right">
            <p className="text-pink-100">Welcome back,</p>
            <p className="text-xl font-semibold">{staffMember.name}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      {/* Step 1: Select Booking */}
      {currentStep === 'select' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-blue-600" />
                Today's Appointments
              </h2>
              <p className="text-gray-600 mt-1">Select an appointment to log product usage</p>
            </div>
            
            <div className="p-6">
              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookings.map(booking => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => selectBooking(booking)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <User className="w-5 h-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-gray-900">{booking.customer_name}</h3>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {booking.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Service:</strong> {booking.service_name}</p>
                              <p><strong>Time:</strong> {new Date(booking.appointment_date).toLocaleTimeString()}</p>
                            </div>
                            <div>
                              <p><strong>Price:</strong> ${booking.total_price}</p>
                              <p><strong>Phone:</strong> {booking.customer_phone}</p>
                            </div>
                          </div>
                          
                          {booking.notes && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-sm"><strong>Current Notes:</strong> {booking.notes}</p>
                            </div>
                          )}
                          
                          {booking.previous_notes && booking.previous_notes.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">Previous Visit Notes:</p>
                              <div className="space-y-1">
                                {booking.previous_notes.map((note, index) => (
                                  <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    <span className="font-medium">{new Date(note.date).toLocaleDateString()}:</span> {note.note}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                            Start Service
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Log Products - This will be added in next artifact */}
      {currentStep === 'logging' && (
        <div className="text-center py-8">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Product logging interface will be added next...</p>
          <button 
            onClick={() => setCurrentStep('select')}
            className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Back to Appointments
          </button>
        </div>
      )}

      {/* Step 3: Complete - This will be added in next artifact */}
      {currentStep === 'complete' && (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <p className="text-green-700 text-lg">Service completed successfully!</p>
          <button 
            onClick={resetForm}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Return to Appointments
          </button>
        </div>
      )}
    </div>
  );
};

export default StaffPortal;
