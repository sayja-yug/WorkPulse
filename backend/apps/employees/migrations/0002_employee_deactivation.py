from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('employees', '0001_initial')]

    operations = [
        migrations.AlterModelOptions(name='employee', options={'ordering': ['-created_at']}),
        migrations.AlterField(
            model_name='employee', name='business',
            field=models.ForeignKey(on_delete=models.PROTECT, related_name='employees', to='businesses.business'),
        ),
        migrations.AddField(
            model_name='employee', name='deactivated_on',
            field=models.DateField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='employee', name='deactivated_by_name',
            field=models.CharField(blank=True, default='', editable=False, max_length=301),
        ),
    ]
