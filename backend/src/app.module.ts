import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PermissionModule } from './permission/permission.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { MediaModule } from './media/media.module';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { AttributeModule } from './attribute/attribute.module';
import { ProductModule } from './product/product.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    PermissionModule,
    RoleModule,
    UserModule,
    MediaModule,
    CategoryModule,
    BrandModule,
    AttributeModule,
    ProductModule,
    DashboardModule,
  ],
})
export class AppModule {}
