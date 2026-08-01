import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing)
      throw new ConflictException(`Role '${dto.name}' already exists`);

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status ?? true,
        permissions: dto.permissionIds
          ? {
              create: dto.permissionIds.map((permissionId) => ({
                permission: { connect: { id: permissionId } },
              })),
            }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    return { message: 'Role created successfully', data: role };
  }

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = search ? { name: { contains: search } } : {};

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: roles,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);

    // Check if trying to remove role:update from the last role that has it
    if (dto.permissionIds) {
      const roleUpdatePermission = await this.prisma.permission.findUnique({
        where: { name: 'role:update' },
      });

      if (roleUpdatePermission) {
        const willKeepRoleUpdate = dto.permissionIds.includes(
          roleUpdatePermission.id,
        );
        if (!willKeepRoleUpdate) {
          // Check if this is the only role with role:update
          const rolesWithRoleUpdate = await this.prisma.rolePermission.count({
            where: {
              permissionId: roleUpdatePermission.id,
              roleId: { not: id },
            },
          });

          if (rolesWithRoleUpdate === 0) {
            throw new BadRequestException(
              'Cannot remove role:update permission. This is the last role with this permission.',
            );
          }
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.permissionIds) {
        // Remove existing and replace
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
      });
    });
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (role._count.users > 0) {
      throw new ConflictException(
        `Cannot delete role: ${role._count.users} user(s) are assigned to this role. Reassign them first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });

    return { message: 'Role deleted successfully' };
  }

  async grantAllPermissions(roleId: string) {
    await this.findOne(roleId);

    const allPermissions = await this.prisma.permission.findMany();

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.rolePermission.createMany({
        data: allPermissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    });

    return this.findOne(roleId);
  }
}
