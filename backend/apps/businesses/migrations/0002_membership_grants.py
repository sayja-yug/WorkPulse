from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('businesses', '0001_initial')]
    operations = [
        migrations.AddField(
            model_name='businessmembership', name='granted_permissions',
            field=models.JSONField(null=True, blank=True, default=None),
        ),
    ]
