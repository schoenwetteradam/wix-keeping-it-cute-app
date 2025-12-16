'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import ScheduleView from '../components/ScheduleView';
import InventoryView from '../components/InventoryView';
import OrdersView from '../components/OrdersView';
import CustomersView from '../components/CustomersView';

export default function SalonApp() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(true);

  // Create Supabase client
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('Missing Supabase environment variables');
      return null;
    }
    
    return createClient(url, key);
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!supabase) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (name, phone, email)
      `)
      .gte('start_time', today)
      .order('start_time', { ascending: true });
    
    if (data) setAppointments(data);
    if (error) console.error('Error fetching appointments:', error);
  }, [supabase]);

  const fetchInventory = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('product_name');
    
    if (data) setInventory(data);
    if (error) console.error('Error fetching inventory:', error);
  }, [supabase]);

  const fetchOrders = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (name, email, phone)
      `)
      .order('order_date', { ascending: false })
      .limit(50);
    
    if (data) setOrders(data);
    if (error) console.error('Error fetching orders:', error);
  }, [supabase]);

  const fetchCustomers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')
      .limit(100);
    
    if (data) setCustomers(data);
    if (error) console.error('Error fetching customers:', error);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Initial data fetch
    fetchAppointments();
    fetchInventory();
    fetchOrders();
    fetchCustomers();
    
    // Set up real-time subscriptions
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('Appointment change received!', payload);
          fetchAppointments();
        }
      )
      .subscribe();

    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          console.log('Inventory change received!', payload);
          fetchInventory();
        }
      )
      .subscribe();

    setLoading(false);

    return () => {
      if (supabase) {
        supabase.removeChannel(appointmentsChannel);
        supabase.removeChannel(inventoryChannel);
      }
    };
  }, [supabase, fetchAppointments, fetchInventory, fetchOrders, fetchCustomers]);

  const performInventoryAudit = async (itemId: string, newQuantity: number) => {
    if (!supabase) return;
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    try {
      // Create audit record
      const { error: auditError } = await supabase.from('inventory_audits').insert({
        inventory_id: itemId,
        previous_quantity: item.current_quantity,
        new_quantity: newQuantity,
        audited_by: 'Staff Name', // TODO: Get from auth context
        notes: 'Mobile app audit'
      });
      
      if (auditError) throw auditError;
      
      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ current_quantity: newQuantity, last_updated: new Date().toISOString() })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      fetchInventory();
    } catch (error) {
      console.error('Error performing inventory audit:', error);
      alert('Failed to update inventory. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">Keeping It Cute Salon</h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        {[
          { id: 'schedule', label: 'Schedule' },
          { id: 'orders', label: 'Orders' },
          { id: 'customers', label: 'Customers' },
          { id: 'inventory', label: 'Inventory' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex-1 py-4 px-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-4 pb-20">
        {activeTab === 'schedule' && (
          <ScheduleView appointments={appointments} />
        )}
        {activeTab === 'orders' && (
          <OrdersView orders={orders} />
        )}
        {activeTab === 'customers' && (
          <CustomersView customers={customers} />
        )}
        {activeTab === 'inventory' && (
          <InventoryView 
            inventory={inventory} 
            onAudit={performInventoryAudit}
          />
        )}
      </div>
    </div>
  );
}

