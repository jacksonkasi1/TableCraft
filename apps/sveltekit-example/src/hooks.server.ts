import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createSvelteKitHandle } from '@tablecraft/adapter-sveltekit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { configs } from '$lib/server/tablecraft.config';

const authHandle: Handle = async ({ event, resolve }) => {
	// Simulate basic authentication
	// In a real app, you would verify a session token here
	const authHeader = event.request.headers.get('Authorization');
	
	if (authHeader === 'Bearer admin-token') {
		event.locals.user = { id: '1', roles: ['admin'] };
		delete event.locals.tenantId; // Admin sees all
	} else if (authHeader === 'Bearer member-token') {
		event.locals.user = { id: '2', roles: ['member'] };
		event.locals.tenantId = 1; // Locked to tenant 1
	} else {
		delete event.locals.user;
		delete event.locals.tenantId;
	}

	return resolve(event);
};

const tablecraftHandle = createSvelteKitHandle({
	db,
	schema,
	configs,
	prefix: '/api/data',
	enableDiscovery: true,
	getContext: async (event) => ({
		user: event.locals.user,
		tenantId: event.locals.tenantId
	})
});

export const handle: Handle = sequence(authHandle, tablecraftHandle);
