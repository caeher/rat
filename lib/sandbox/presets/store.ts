import type { BundledPreset } from './types';
import { deepCloneRelations, relationFromTemplate } from './clone';

const relationsTemplate = [
  {
    name: 'Products',
    attributes: [
      { name: 'product_id', type: 'number' as const, nullable: false },
      { name: 'name', type: 'string' as const, nullable: false },
      { name: 'category', type: 'string' as const, nullable: false },
      { name: 'unit_price', type: 'number' as const, nullable: false },
    ],
    rows: [
      { product_id: 1, name: 'Notebook', category: 'Stationery', unit_price: 4.5 },
      { product_id: 2, name: 'Pen Set', category: 'Stationery', unit_price: 12.0 },
      { product_id: 3, name: 'Desk Lamp', category: 'Furniture', unit_price: 35.0 },
      { product_id: 4, name: 'Notebook', category: 'Stationery', unit_price: 5.0 },
      { product_id: 5, name: 'Monitor', category: 'Electronics', unit_price: 220.0 },
    ],
  },
  {
    name: 'Customers',
    attributes: [
      { name: 'customer_id', type: 'number' as const, nullable: false },
      { name: 'name', type: 'string' as const, nullable: false },
      { name: 'city', type: 'string' as const, nullable: false },
    ],
    rows: [
      { customer_id: 10, name: 'Acme Corp', city: 'Boston' },
      { customer_id: 20, name: 'Globex', city: 'Chicago' },
      { customer_id: 30, name: 'Initech', city: 'Austin' },
      { customer_id: 40, name: 'Umbrella Co', city: 'Raccoon City' },
    ],
  },
  {
    name: 'Orders',
    attributes: [
      { name: 'order_id', type: 'number' as const, nullable: false },
      { name: 'customer_id', type: 'number' as const, nullable: false },
      { name: 'order_date', type: 'date' as const, nullable: false },
    ],
    rows: [
      { order_id: 1001, customer_id: 10, order_date: '2024-03-01' },
      { order_id: 1002, customer_id: 20, order_date: '2024-03-05' },
      { order_id: 1003, customer_id: 10, order_date: '2024-04-12' },
      { order_id: 1004, customer_id: 30, order_date: '2024-05-20' },
    ],
  },
  {
    name: 'OrderLines',
    attributes: [
      { name: 'order_id', type: 'number' as const, nullable: false },
      { name: 'product_id', type: 'number' as const, nullable: false },
      { name: 'quantity', type: 'number' as const, nullable: false },
    ],
    rows: [
      { order_id: 1001, product_id: 1, quantity: 10 },
      { order_id: 1001, product_id: 2, quantity: 3 },
      { order_id: 1002, product_id: 3, quantity: 1 },
      { order_id: 1003, product_id: 5, quantity: 2 },
      { order_id: 1004, product_id: 4, quantity: 5 },
      { order_id: 1004, product_id: 1, quantity: 2 },
    ],
  },
  {
    name: 'Shipments',
    attributes: [
      { name: 'order_id', type: 'number' as const, nullable: false },
      { name: 'carrier', type: 'string' as const, nullable: false },
      { name: 'shipped_on', type: 'date' as const, nullable: true },
    ],
    rows: [
      { order_id: 1001, carrier: 'FastPost', shipped_on: '2024-03-02' },
      { order_id: 1002, carrier: 'FastPost', shipped_on: '2024-03-06' },
      { order_id: 1003, carrier: 'AirCargo', shipped_on: null },
      { order_id: 1004, carrier: 'GroundLine', shipped_on: '2024-05-22' },
    ],
  },
];

export const storePreset: BundledPreset = {
  id: 'store',
  displayName: 'Store',
  guide: {
    summary:
      'Retail schema with products, customers, orders, line items, and shipments. Includes duplicate product names and orders without extra shipment rows for join practice.',
    relationships: [
      'Orders.customer_id → Customers.customer_id.',
      'OrderLines links Orders and Products (order_id, product_id).',
      'Shipments.order_id → Orders.order_id (all current orders ship; extend data to test unmatched).',
      'Two products named "Notebook" — projection π name ( Products ) shows duplicate tuples.',
    ],
    starterQuestions: [
      {
        title: 'Boston customers who ordered monitors',
        expressionHint:
          'π name ( σ city = "Boston" ( Customers ) ⋈ Orders ⋈ σ product_id = 5 ( OrderLines ) )',
        concept: 'Multi-way join + selection',
      },
      {
        title: 'Product names (note duplicates)',
        expressionHint: 'π name ( Products )',
        concept: 'Duplicate projections',
      },
      {
        title: 'Customers who ordered but not from Austin',
        expressionHint: 'π customer_id ( Orders ) − π customer_id ( σ city = "Austin" ( Customers ) ⋈ Orders )',
        concept: 'Set difference',
      },
      {
        title: 'Union of stationery and furniture SKUs',
        expressionHint:
          'π product_id, name ( σ category = "Stationery" ( Products ) ) ∪ π product_id, name ( σ category = "Furniture" ( Products ) )',
        concept: 'Union',
      },
      {
        title: 'Orders with pending shipment date',
        expressionHint: 'π order_id ( σ shipped_on = NULL ( Shipments ) )',
        concept: 'Null handling',
      },
    ],
  },
  buildSchemaSet: () => ({
    name: 'Store',
    presetId: 'store',
    relations: deepCloneRelations(relationsTemplate.map(relationFromTemplate)),
  }),
};
