from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, Invoice, PaymentTransaction


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    companies_count = serializers.SerializerMethodField()
    active_companies_count = serializers.SerializerMethodField()
    companies = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

    def get_companies_count(self, obj):
        return obj.subscriptions.count()

    def get_active_companies_count(self, obj):
        return obj.subscriptions.filter(status='ACTIVE').count()

    def get_companies(self, obj):
        return [
            {
                'id': str(sub.business.id),
                'name': sub.business.name,
                'slug': sub.business.slug,
                'status': sub.status,
                'billing_cycle': sub.billing_cycle,
            }
            for sub in obj.subscriptions.select_related('business').all()
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_code = serializers.CharField(source='plan.code', read_only=True)
    plan_description = serializers.CharField(source='plan.description', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)
    business_slug = serializers.CharField(source='business.slug', read_only=True)
    business_email = serializers.CharField(source='business.email', read_only=True)
    business_city = serializers.CharField(source='business.city', read_only=True)
    max_employees = serializers.IntegerField(source='plan.max_employees', read_only=True)
    max_branches = serializers.IntegerField(source='plan.max_branches', read_only=True)
    monthly_price = serializers.DecimalField(source='plan.monthly_price', max_digits=10, decimal_places=2, read_only=True)
    annual_price = serializers.DecimalField(source='plan.annual_price', max_digits=10, decimal_places=2, read_only=True)
    features = serializers.JSONField(source='plan.features', read_only=True)

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    plan_name = serializers.CharField(source='subscription.plan.name', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
