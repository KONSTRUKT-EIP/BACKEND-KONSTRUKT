import { ApiProperty } from '@nestjs/swagger';

export class OrderDto {
  @ApiProperty({ example: 'order_123', description: 'Order unique identifier' })
  id: string;

  @ApiProperty({ example: 'Armature 12mm', description: 'Product name' })
  productName: string;

  @ApiProperty({
    example: 'https://cdn.konstrukt.com/icons/armature.png',
    description: 'Product icon URL',
  })
  productIcon: string;

  @ApiProperty({ example: 120, description: 'Unit price' })
  price: number;

  @ApiProperty({ example: 5, description: 'Total number of orders' })
  totalOrder: number;

  @ApiProperty({ example: 600, description: 'Total price for all orders' })
  total: number;
}

export class RecentOrdersResponseDto {
  @ApiProperty({ type: [OrderDto] })
  orders: OrderDto[];
}
