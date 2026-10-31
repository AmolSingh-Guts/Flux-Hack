import { withTransaction } from '../config/database.js';
import {
  archiveCustomer,
  createCustomer,
  customerDependencyCounts,
  deleteCustomer,
  findCustomerByEmail,
  findCustomerById,
  listCustomers,
  listCustomersForSelect,
  updateCustomer,
} from '../models/customer.model.js';
import {
  listCustomerInvoices,
  listCustomerPayments,
  listCustomerQuotations,
  listCustomerSubscriptions,
} from '../models/customer-history.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { todayString } from '../utils/date.utils.js';
import { writeAuditLog } from './audit.service.js';

export async function listCustomerRecords(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'name',
      'email',
      'company_name',
      'status',
      'registration_date',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listCustomers({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getCustomer(customerId) {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new ApiError(404, 'Customer not found.');
  }

  return customer;
}

export async function getCustomerDetails(customerId) {
  const customer = await getCustomer(customerId);
  const [subscriptions, invoices, payments, quotations] = await Promise.all([
    listCustomerSubscriptions(customerId),
    listCustomerInvoices(customerId),
    listCustomerPayments(customerId),
    listCustomerQuotations(customerId),
  ]);

  return { customer, subscriptions, invoices, payments, quotations };
}

export async function createCustomerRecord(payload, context = {}) {
  const existing = await findCustomerByEmail(payload.email);

  if (existing) {
    throw new ApiError(409, 'A customer with this email already exists.');
  }

  const customerId = await withTransaction(async (connection) => {
    const id = await createCustomer(connection, {
      ...payload,
      registrationDate: payload.registrationDate ?? todayString(),
    });

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { email: payload.email },
      ipAddress: context.ipAddress,
      connection,
    });

    return id;
  });

  return getCustomer(customerId);
}

export async function updateCustomerRecord(customerId, payload, context = {}) {
  const existing = await getCustomer(customerId);

  if (payload.email && payload.email !== existing.email) {
    const duplicate = await findCustomerByEmail(payload.email);

    if (duplicate) {
      throw new ApiError(409, 'A customer with this email already exists.');
    }
  }

  await withTransaction(async (connection) => {
    await updateCustomer(connection, customerId, payload);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'CUSTOMER',
      entityId: customerId,
      details: {
        changedFields: Object.keys(payload).filter(
          (field) => payload[field] !== undefined,
        ),
      },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getCustomer(customerId);
}

export async function removeCustomer(customerId, context = {}) {
  await getCustomer(customerId);
  const dependencies = await customerDependencyCounts(customerId);
  const hasDependencies = Object.values(dependencies).some(
    (count) => Number(count) > 0,
  );

  return withTransaction(async (connection) => {
    if (hasDependencies) {
      await archiveCustomer(connection, customerId);
      await connection.query(
        'UPDATE users SET is_active = 0 WHERE customer_id = ?',
        [customerId],
      );
      await writeAuditLog({
        userId: context.actor?.id,
        action: 'ARCHIVE',
        entityType: 'CUSTOMER',
        entityId: customerId,
        details: { dependencies },
        ipAddress: context.ipAddress,
        connection,
      });

      return {
        archived: true,
        message:
          'Customer has related records and was archived safely instead of deleted.',
      };
    }

    await deleteCustomer(connection, customerId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'CUSTOMER',
      entityId: customerId,
      ipAddress: context.ipAddress,
      connection,
    });

    return { archived: false, message: 'Customer deleted.' };
  });
}

export async function getCustomerOptions(search) {
  return listCustomersForSelect(search);
}
