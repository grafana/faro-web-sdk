export interface DemoUser {
  id: string;
  email: string;
  username: string;
  attributes: {
    role: string;
    plan: string;
  };
}

const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-001',
    email: 'alice.smith@example.com',
    username: 'alice_smith',
    attributes: {
      role: 'admin',
      plan: 'enterprise',
    },
  },
  {
    id: 'user-002',
    email: 'bob.jones@example.com',
    username: 'bob_jones',
    attributes: {
      role: 'developer',
      plan: 'pro',
    },
  },
  {
    id: 'user-003',
    email: 'carol.white@example.com',
    username: 'carol_white',
    attributes: {
      role: 'user',
      plan: 'free',
    },
  },
  {
    id: 'user-004',
    email: 'david.brown@example.com',
    username: 'david_brown',
    attributes: {
      role: 'moderator',
      plan: 'pro',
    },
  },
  {
    id: 'user-005',
    email: 'emma.wilson@example.com',
    username: 'emma_wilson',
    attributes: {
      role: 'user',
      plan: 'enterprise',
    },
  },
];

/**
 * Get a random user from the demo users list
 */
export function getRandomUser(): DemoUser {
  const randomIndex = Math.floor(Math.random() * DEMO_USERS.length);
  return DEMO_USERS[randomIndex];
}
