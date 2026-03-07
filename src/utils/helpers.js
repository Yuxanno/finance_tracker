import { ObjectId } from 'mongodb';

export function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    throw new Error('Invalid ID format');
  }
}

export function sanitizeUser(user) {
  const { password, ...sanitized } = user;
  return sanitized;
}

export function getDateRange(period) {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const day = now.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to start of week (Monday)
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case '6months':
      start.setMonth(now.getMonth() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}
