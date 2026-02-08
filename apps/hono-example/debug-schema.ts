import { getTableColumns } from 'drizzle-orm';
import * as schema from './src/db/schema';

console.log('Schema keys:', Object.keys(schema));

const users = schema.users;
if (users) {
  console.log('Users table found.');
  const cols = getTableColumns(users);
  console.log('Users columns:', Object.keys(cols));
} else {
  console.error('Users table NOT found in schema.');
}

const orderItems = schema.orderItems;
if (orderItems) {
    console.log('OrderItems table found.');
} else {
    console.error('OrderItems table NOT found.');
}
