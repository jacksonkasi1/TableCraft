import { Hono } from 'hono';
import productsApp from './products';
import ordersApp from './orders';
import usersApp from './users';
import tenantsApp from './tenants';

const app = new Hono();

app.route('/products', productsApp);
app.route('/orders', ordersApp);
app.route('/users', usersApp);
app.route('/tenants', tenantsApp);

export default app;
