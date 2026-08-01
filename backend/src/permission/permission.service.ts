import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(dto: CreatePermissionGroupDto) {
    const normalizedName = dto.name.trim().toLowerCase().replace(/\s+/g, '_');
    
    const existing = await this.prisma.permissionGroup.findUnique({
      where: { name: normalizedName },
    });
    if (existing) {
      throw new ConflictException(`Permission group '${normalizedName}' already exists`);
    }

    // Create group with all associated permissions in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const group = await tx.permissionGroup.create({
        data: {
          name: normalizedName,
          description: dto.description,
        },
      });

      const permissions: any[] = [];
      for (const action of dto.actions) {
        const normalizedAction = action.trim().toLowerCase().replace(/\s+/g, '_');
        const permissionName = `${normalizedName}:${normalizedAction}`;

        const perm = await tx.permission.create({
          data: {
            name: permissionName,
            description: `${action} permission for ${dto.name}`,
            groupId: group.id,
          },
        });
        permissions.push(perm);
      }

      return { ...group, permissions };
    });

    return { message: 'Permission group created successfully', data: result };
  }

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? { name: { contains: search} }
      : {};

    const [groups, total] = await Promise.all([
      this.prisma.permissionGroup.findMany({
        where,
        include: { permissions: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.permissionGroup.count({ where }),
    ]);

    return {
      data: groups,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!group) throw new NotFoundException('Permission group not found');
    return group;
  }

  async update(id: string, dto: UpdatePermissionGroupDto) {
    const group = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.description !== undefined) {
        await tx.permissionGroup.update({
          where: { id },
          data: { description: dto.description },
        });
      }

      if (dto.addActions && dto.addActions.length > 0) {
        for (const action of dto.addActions) {
          const normalizedAction = action.trim().toLowerCase().replace(/\s+/g, '_');
          const permName = `${group.name}:${normalizedAction}`;
          const exists = await tx.permission.findUnique({ where: { name: permName } });
          if (!exists) {
            await tx.permission.create({
              data: {
                name: permName,
                description: `${action} permission for ${group.name}`,
                groupId: id,
              },
            });
          }
        }
      }

      if (dto.removeActions && dto.removeActions.length > 0) {
        for (const action of dto.removeActions) {
          const normalizedAction = action.trim().toLowerCase().replace(/\s+/g, '_');
          const permName = `${group.name}:${normalizedAction}`;
          
          const perm = await tx.permission.findUnique({
            where: { name: permName },
            include: { roles: true },
          });
          
          if (perm) {
            if (perm.roles.length > 0) {
              throw new BadRequestException(
                `Cannot remove action '${action}': it is assigned to ${perm.roles.length} role(s). Remove from roles first.`,
              );
            }
            await tx.permission.delete({ where: { id: perm.id } });
          }
        }
      }

      return tx.permissionGroup.findUnique({
        where: { id },
        include: { permissions: true },
      });
    });
  }

  async remove(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { roles: true },
        },
      },
    });
    if (!group) throw new NotFoundException('Permission group not found');

    const usedPermissions = group.permissions.filter((p) => p.roles.length > 0);
    if (usedPermissions.length > 0) {
      throw new ConflictException(
        `Cannot delete group: ${usedPermissions.length} permission(s) are assigned to roles. Remove them from roles first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.permission.deleteMany({ where: { groupId: id } });
      await tx.permissionGroup.delete({ where: { id } });
    });

    return { message: 'Permission group deleted successfully' };
  }

  async findAllFlat() {
    return this.prisma.permission.findMany({
      include: { group: true },
      orderBy: { name: 'asc' },
    });
  }
}
