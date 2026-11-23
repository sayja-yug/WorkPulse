from rest_framework import serializers
from .models import Business, BusinessMembership


class BusinessSerializer(serializers.ModelSerializer):
    subscription = serializers.SerializerMethodField()
    total_employees = serializers.SerializerMethodField()
    active_employees = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            'id', 'name', 'slug', 'logo', 'address', 'city', 'state',
            'country', 'zip_code', 'phone', 'email', 'website',
            'timezone', 'currency', 'working_days', 'settings',
            'is_active', 'created_at', 'updated_at',
            'subscription', 'total_employees', 'active_employees',
            'owner_name', 'owner_email'
        ]
        read_only_fields = ['id', 'slug', 'is_active', 'created_at', 'updated_at']

    def get_subscription(self, obj):
        sub = getattr(obj, 'subscription', None)
        if not sub or not sub.plan:
            return {
                'plan_name': 'Starter Free',
                'plan_code': 'FREE',
                'status': 'ACTIVE',
                'billing_cycle': 'MONTHLY',
                'current_period_end': None,
                'monthly_price': 0.0,
            }
        return {
            'plan_name': sub.plan.name,
            'plan_code': sub.plan.code,
            'status': sub.status,
            'billing_cycle': sub.billing_cycle,
            'current_period_end': sub.current_period_end,
            'monthly_price': float(sub.plan.monthly_price),
        }

    def get_total_employees(self, obj):
        return obj.employees.count()

    def get_active_employees(self, obj):
        return obj.employees.filter(status='ACTIVE').count()

    def get_owner_name(self, obj):
        owner_membership = obj.memberships.filter(is_owner=True).first()
        return owner_membership.user.full_name if owner_membership and owner_membership.user else ''

    def get_owner_email(self, obj):
        owner_membership = obj.memberships.filter(is_owner=True).first()
        return owner_membership.user.email if owner_membership and owner_membership.user else ''


class BusinessListSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField()
    plan_code = serializers.SerializerMethodField()
    plan_price = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    billing_cycle = serializers.SerializerMethodField()
    current_period_end = serializers.SerializerMethodField()
    total_employees = serializers.SerializerMethodField()
    active_employees = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            'id', 'name', 'slug', 'logo', 'city', 'state', 'country', 'currency',
            'is_active', 'created_at', 'plan_name', 'plan_code', 'plan_price',
            'subscription_status', 'billing_cycle', 'current_period_end',
            'total_employees', 'active_employees', 'owner_name', 'owner_email'
        ]

    def get_plan_name(self, obj):
        sub = getattr(obj, 'subscription', None)
        return sub.plan.name if sub and sub.plan else 'Starter Free'

    def get_plan_code(self, obj):
        sub = getattr(obj, 'subscription', None)
        return sub.plan.code if sub and sub.plan else 'FREE'

    def get_plan_price(self, obj):
        sub = getattr(obj, 'subscription', None)
        return float(sub.plan.monthly_price) if sub and sub.plan else 0.0

    def get_subscription_status(self, obj):
        sub = getattr(obj, 'subscription', None)
        return sub.status if sub else 'ACTIVE'

    def get_billing_cycle(self, obj):
        sub = getattr(obj, 'subscription', None)
        return sub.billing_cycle if sub else 'MONTHLY'

    def get_current_period_end(self, obj):
        sub = getattr(obj, 'subscription', None)
        return sub.current_period_end if sub else None

    def get_total_employees(self, obj):
        return obj.employees.count()

    def get_active_employees(self, obj):
        return obj.employees.filter(status='ACTIVE').count()

    def get_owner_name(self, obj):
        owner_membership = obj.memberships.filter(is_owner=True).first()
        return owner_membership.user.full_name if owner_membership and owner_membership.user else ''

    def get_owner_email(self, obj):
        owner_membership = obj.memberships.filter(is_owner=True).first()
        return owner_membership.user.email if owner_membership and owner_membership.user else ''


class BusinessCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            'name', 'address', 'city', 'state', 'country', 'zip_code',
            'phone', 'email', 'website', 'timezone', 'currency', 'working_days'
        ]


class BusinessMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = BusinessMembership
        fields = ['id', 'user', 'user_email', 'user_name', 'business', 'is_owner', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']

