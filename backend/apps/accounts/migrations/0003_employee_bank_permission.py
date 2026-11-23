from django.db import migrations


def add_bank_permission(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    Role = apps.get_model('accounts', 'Role')
    RolePermission = apps.get_model('accounts', 'RolePermission')
    perm, _ = Permission.objects.get_or_create(code='employee.view_bank', defaults={
        'name': 'View employee bank details', 'module': 'employees',
    })
    for role in Role.objects.filter(is_system=True, code__in=['BUSINESS_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN']):
        RolePermission.objects.get_or_create(role=role, permission=perm)


class Migration(migrations.Migration):
    dependencies = [('accounts', '0002_initial')]
    operations = [migrations.RunPython(add_bank_permission, migrations.RunPython.noop)]
