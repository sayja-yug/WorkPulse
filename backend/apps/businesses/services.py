from django.db import transaction
from apps.accounts.models import Role, UserRole
from .models import Business, BusinessMembership


class BusinessService:
    @staticmethod
    @transaction.atomic
    def create_business_with_owner(user, validated_data):
        """Creates a business and establishes the creating user as owner with BUSINESS_OWNER role."""
        business = Business.objects.create(**validated_data)
        
        # 1. Create Owner Membership
        BusinessMembership.objects.create(
            user=user,
            business=business,
            is_owner=True,
            is_active=True
        )

        # 2. Assign BUSINESS_OWNER role
        owner_role = Role.objects.filter(code=Role.RoleCode.BUSINESS_OWNER, is_system=True).first()
        if not owner_role:
            owner_role = Role.objects.create(
                name='Business Owner',
                code=Role.RoleCode.BUSINESS_OWNER,
                description='Supreme owner with all permissions',
                is_system=True
            )
            
        UserRole.objects.get_or_create(
            user=user,
            role=owner_role,
            business=business
        )

        # 3. Create default Headquarters branch
        from apps.branches.models import Branch
        Branch.objects.get_or_create(
            business=business,
            code='BR-HQ',
            defaults={
                'name': 'Headquarters',
                'city': business.city or '',
                'state': business.state or '',
                'is_head_office': True,
                'geofence_radius': 500,
            }
        )

        # 4. Set active business context on user
        user.active_business = business
        user.save(update_fields=['active_business'])

        # 5. Attach default Starter Subscription
        from apps.subscriptions.models import Subscription, SubscriptionPlan
        from django.utils import timezone
        default_plan = SubscriptionPlan.objects.filter(code='FREE').first() or SubscriptionPlan.objects.first()
        if default_plan:
            today = timezone.now().date()
            Subscription.objects.get_or_create(
                business=business,
                defaults={
                    'plan': default_plan,
                    'status': Subscription.Status.ACTIVE,
                    'billing_cycle': Subscription.Cycle.MONTHLY,
                    'current_period_start': today,
                    'current_period_end': today + timezone.timedelta(days=365)
                }
            )

        return business

