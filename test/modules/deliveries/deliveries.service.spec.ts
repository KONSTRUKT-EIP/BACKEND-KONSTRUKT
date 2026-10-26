import { NotFoundException } from '@nestjs/common';
import { DeliveriesService } from '../../../src/modules/deliveries/deliveries.service';
import { PrismaService } from '../../../src/lib/prisma/prisma.service';

describe('DeliveriesService orders', () => {
  let service: DeliveriesService;
  let siteFindFirst: jest.Mock;
  let resourceFindFirst: jest.Mock;
  let deliveryCreate: jest.Mock;
  let deliveryFindMany: jest.Mock;

  type CreateArgs = { data: Record<string, unknown> };
  const createdData = () =>
    (deliveryCreate.mock.calls as [CreateArgs][])[0][0].data;

  const order = {
    siteId: 'site-1',
    productName: 'Treillis soudé',
    price: 12.5,
    totalOrder: 4,
    total: 50,
  };

  beforeEach(() => {
    siteFindFirst = jest.fn().mockResolvedValue({ id: 'site-1' });
    resourceFindFirst = jest.fn().mockResolvedValue(null);
    deliveryCreate = jest
      .fn()
      .mockImplementation(({ data }: CreateArgs) =>
        Promise.resolve({ id: 'delivery-1', ...data, resource: null }),
      );
    deliveryFindMany = jest.fn();

    service = new DeliveriesService({
      site: { findFirst: siteFindFirst },
      resource: { findFirst: resourceFindFirst },
      delivery: { create: deliveryCreate, findMany: deliveryFindMany },
    } as unknown as PrismaService);
  });

  it('creates an order for a product that is not a site resource', async () => {
    const result = await service.createOrder(order, 'org-a');

    expect(createdData()).toMatchObject({
      resourceId: null,
      productName: 'Treillis soudé',
      price: 12.5,
      quantity: 4,
    });
    expect(result.orders[0]).toMatchObject({
      productName: 'Treillis soudé',
      price: 12.5,
      totalOrder: 4,
      total: 50,
    });
  });

  it('links the order to the matching site resource when there is one', async () => {
    resourceFindFirst.mockResolvedValue({
      id: 'res-1',
      name: 'Treillis soudé',
      supplier: 'Acier Sud',
      unitPrice: 10,
    });

    await service.createOrder(order, 'org-a');

    expect(createdData()).toMatchObject({
      resourceId: 'res-1',
      supplier: 'Acier Sud',
    });
  });

  it('refuses a site from another organization', async () => {
    siteFindFirst.mockResolvedValue(null);

    await expect(service.createOrder(order, 'org-b')).rejects.toThrow(
      NotFoundException,
    );
    expect(deliveryCreate).not.toHaveBeenCalled();
  });

  it('lists orders without a resource instead of crashing', async () => {
    deliveryFindMany.mockResolvedValue([
      {
        id: 'delivery-1',
        productName: 'Treillis soudé',
        price: 12.5,
        quantity: 4,
        resource: null,
      },
    ]);

    const result = await service.getAllOrders('site-1', 'org-a');

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]).toMatchObject({
      productName: 'Treillis soudé',
      price: 12.5,
      total: 50,
    });
  });
});
