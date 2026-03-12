import { z } from 'zod';

export const schemas = {
  register: z.object({
    username: z.string().min(3).max(30),
    login: z.string().min(3).max(30),
    password: z.string().min(6),
    language: z.enum(['en', 'ru', 'uz']).default('en'),
    currency: z.enum(['USD', 'EUR', 'RUB', 'UZS']).default('USD')
  }),

  login: z.object({
    login: z.string(),
    password: z.string()
  }),

  createAccount: z.object({
    name: z.string().min(1).max(50),
    balance: z.number().default(0),
    color: z.string().default('#6366f1'),
    icon: z.string().default('💳')
  }),

  updateAccount: z.object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().optional(),
    icon: z.string().optional()
  }),

  createCategory: z.object({
    name: z.string().min(1).max(30),
    type: z.enum(['income', 'expense']),
    color: z.string().default('#6366f1'),
    icon: z.string().default('📁')
  }),

  createTransaction: z.object({
    accountId: z.string(),
    categoryId: z.string(),
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    note: z.string().max(200).optional(),
    date: z.string().optional()
  }),

  updateProfile: z.object({
    username: z.string().min(3).max(30).optional(),
    language: z.enum(['en', 'ru', 'uz']).optional(),
    currency: z.enum(['USD', 'EUR', 'RUB', 'UZS']).optional(),
    theme: z.enum(['light', 'dark']).optional(),
    role: z.enum(['admin', 'pro', 'user', 'standart']).optional()
  }),

  changePassword: z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6)
  })
};

export function validate(schema) {
  return (data) => {
    return schema.parse(data);
  };
}
