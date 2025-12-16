'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSharedBrowserSupabaseClient } from '../../utils/supabaseBrowserClientShared';
import ScheduleView from '../components/ScheduleView';
import InventoryView from '../components/InventoryView';
import OrdersView from '../components/OrdersView';
import CustomersView from '../components/CustomersView';

// Singleton Supabase client - shared across all components
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!supabaseClient) {
    try {
      supabaseClient = getSharedBrowserSupabaseClient();
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      return null;
    }
  }
  return supabaseClient;
}

export default function SalonApp() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(true);

  // Get Supabase client - use useMemo to ensure singleton
  const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;

  const fetchAppointments = useCallback(async () => {
    const client = typeof window !== 'undefined' ? getSupabaseClient() : null;
    if (!client) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await client
      .from('appointments')
      .select(`
        *,
        customers (name, phone, email)
      `)
      .gte('start_time', today)
      .order('start_time', { ascending: true });
    
    if (data) setAppointments(data);
    if (error) console.error('Error fetching appointments:', error);
  }, []);

  const fetchInventory = useCallback(async () => {
    const client = typeof window !== 'undefined' ? getSupabaseClient() : null;
    if (!client) return;
    const { data, error } = await client
      .from('inventory')
      .select('*')
      .order('product_name');
    
    if (data) setInventory(data);
    if (error) console.error('Error fetching inventory:', error);
  }, []);

  const fetchOrders = useCallback(async () => {
    const client = typeof window !== 'undefined' ? getSupabaseClient() : null;
    if (!client) return;
    const { data, error } = await client
      .from('orders')
      .select(`
        *,
        customers (name, email, phone)
      `)
      .order('order_date', { ascending: false })
      .limit(50);
    
    if (data) setOrders(data);
    if (error) console.error('Error fetching orders:', error);
  }, []);

  const fetchCustomers = useCallback(async () => {
    const client = typeof window !== 'undefined' ? getSupabaseClient() : null;
    if (!client) return;
    const { data, error } = await client
      .from('customers')
      .select('*')
      .order('name')
      .limit(100);
    
    if (data) setCustomers(data);
    if (error) console.error('Error fetching customers:', error);
  }, [supabase]);

  useEffect(() => {
    const client = typeof window !== 'undefined' ? getSupabaseClient() : null;
    if (!client) {
      setLoading(false);
      return;
    }
    // Initial data fetch
    fetchAppointments();
    fetchInventory();
    fetchOrders();
    fetchCustomers();
    
    // Set up real-time subscriptions
    const appointmentsChannel = client
      .channel('appointments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('Appointment change received!', payload);
          fetchAppointments();
        }
      )
      .subscribe();

    const inventoryChannel = client
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
      if (client) {
        client.removeChannel(appointmentsChannel);
        client.removeChannel(inventoryChannel);
      }
    };
  }, [fetchAppointments, fetchInventory, fetchOrders, fetchCustomers]);

  const performInventoryAudit = async (itemId: string, newQuantity: number) => {
    const client = typeof window !== 'undefined' ? getSupabaseClient() : null;
    if (!client) return;
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    try {
      // Create audit record
      const { error: auditError } = await client.from('inventory_audits').insert({
        inventory_id: itemId,
        previous_quantity: item.current_quantity,
        new_quantity: newQuantity,
        audited_by: 'Staff Name', // TODO: Get from auth context
        notes: 'Mobile app audit'
      });
      
      if (auditError) throw auditError;
      
      // Update inventory
      const { error: updateError } = await client
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

