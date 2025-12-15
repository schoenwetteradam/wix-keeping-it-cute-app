'use client';

import { useState } from 'react';

interface InventoryItem {
  id: string;
  product_name: string;
  sku?: string;
  category?: string;
  current_quantity: number;
  minimum_quantity: number;
  unit_cost?: number;
  supplier?: string;
}

interface InventoryViewProps {
  inventory: InventoryItem[];
  onAudit: (itemId: string, newQuantity: number) => Promise<void>;
}

export default function InventoryView({ inventory, onAudit }: InventoryViewProps) {
  const [auditMode, setAuditMode] = useState(false);
  const [auditData, setAuditData] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuditChange = (itemId: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue)) {
      setAuditData({
        ...auditData,
        [itemId]: numValue
      });
    }
  };

  const handleAuditSubmit = async () => {
    setIsSubmitting(true);
    try {
      const updates = Object.entries(auditData)
        .filter(([_, quantity]) => quantity !== undefined && quantity !== null);
      
      for (const [id, quantity] of updates) {
        await onAudit(id, quantity);
      }
      
      setAuditMode(false);
      setAuditData({});
    } catch (error) {
      console.error('Error submitting audit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.current_quantity <= item.minimum_quantity;
  };

  const lowStockItems = inventory.filter(isLowStock);
  const normalStockItems = inventory.filter(item => !isLowStock(item));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          {lowStockItems.length > 0 && (
            <p className="text-sm text-red-600 mt-1">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} low on stock
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setAuditMode(!auditMode);
            setAuditData({});
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            auditMode
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {auditMode ? 'Cancel' : 'Start Audit'}
        </button>
      </div>

      {auditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Audit Mode:</strong> Enter the actual quantity for each item. Leave blank to skip.
          </p>
        </div>
      )}

      {/* Low Stock Items First */}
      {lowStockItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-red-600">⚠️ Low Stock Items</h3>
          {lowStockItems.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                  <div className="mt-1 space-y-1">
                    {item.category && (
                      <p className="text-sm text-gray-500">Category: {item.category}</p>
                    )}
                    {item.sku && (
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                    )}
                    {item.supplier && (
                      <p className="text-sm text-gray-500">Supplier: {item.supplier}</p>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  {auditMode ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Current: {item.current_quantity}</span>
                      <input
                        type="number"
                        className="w-24 p-2 border border-gray-300 rounded text-center"
                        placeholder={item.current_quantity.toString()}
                        value={auditData[item.id] ?? ''}
                        onChange={(e) => handleAuditChange(item.id, e.target.value)}
                        min="0"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-lg text-red-600">{item.current_quantity}</p>
                      <p className="text-xs text-red-500">Min: {item.minimum_quantity}</p>
                      {item.unit_cost && (
                        <p className="text-xs text-gray-500 mt-1">
                          ${(item.current_quantity * item.unit_cost).toFixed(2)} value
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Normal Stock Items */}
      <div className="space-y-3">
        {lowStockItems.length > 0 && (
          <h3 className="text-lg font-semibold text-gray-700 mt-4">All Items</h3>
        )}
        {normalStockItems.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                <div className="mt-1 space-y-1">
                  {item.category && (
                    <p className="text-sm text-gray-500">Category: {item.category}</p>
                  )}
                  {item.sku && (
                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                  )}
                  {item.supplier && (
                    <p className="text-sm text-gray-500">Supplier: {item.supplier}</p>
                  )}
                </div>
              </div>
              <div className="ml-4 text-right">
                {auditMode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Current: {item.current_quantity}</span>
                    <input
                      type="number"
                      className="w-24 p-2 border border-gray-300 rounded text-center"
                      placeholder={item.current_quantity.toString()}
                      value={auditData[item.id] ?? ''}
                      onChange={(e) => handleAuditChange(item.id, e.target.value)}
                      min="0"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-lg text-gray-900">{item.current_quantity}</p>
                    {item.unit_cost && (
                      <p className="text-xs text-gray-500 mt-1">
                        ${(item.current_quantity * item.unit_cost).toFixed(2)} value
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {inventory.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No inventory items found</p>
        </div>
      )}

      {auditMode && Object.keys(auditData).length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-white border-t border-gray-200 shadow-lg rounded-t-lg p-4">
          <button
            onClick={handleAuditSubmit}
            disabled={isSubmitting}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : `Complete Audit (${Object.keys(auditData).length} items)`}
          </button>
        </div>
      )}
    </div>
  );
}

