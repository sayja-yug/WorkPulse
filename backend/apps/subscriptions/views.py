from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, permissions, views, status
from rest_framework.response import Response
from .models import SubscriptionPlan, Subscription, Invoice
from .serializers import SubscriptionPlanSerializer, SubscriptionSerializer, InvoiceSerializer


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)


class CurrentSubscriptionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        business = getattr(request, 'business', None)
        if not business:
            business_id = request.headers.get('X-Business-ID') or request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(request.user, 'active_business', None):
                business = request.user.active_business
            elif request.user.business_memberships.exists():
                business = request.user.business_memberships.first().business

        if not business:
            return Response({'success': False, 'error': {'message': 'No business context selected.'}}, status=status.HTTP_400_BAD_REQUEST)

        sub = Subscription.objects.filter(business=business).first()
        if not sub:
            plan = SubscriptionPlan.objects.filter(code='PRO').first() or SubscriptionPlan.objects.first()
            if plan:
                today = timezone.now().date()
                sub = Subscription.objects.create(
                    business=business,
                    plan=plan,
                    status=Subscription.Status.ACTIVE,
                    billing_cycle=Subscription.Cycle.ANNUAL,
                    current_period_start=today,
                    current_period_end=today + timezone.timedelta(days=365)
                )

        if sub:
            return Response({'success': True, 'data': SubscriptionSerializer(sub).data})
        return Response({'success': False, 'error': {'message': 'No subscription found.'}}, status=status.HTTP_404_NOT_FOUND)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        if not business:
            business_id = self.request.headers.get('X-Business-ID') or self.request.META.get('HTTP_X_BUSINESS_ID')
            if business_id:
                from apps.businesses.models import Business
                business = Business.objects.filter(id=business_id).first()
            elif getattr(self.request.user, 'active_business', None):
                business = self.request.user.active_business
            elif self.request.user.business_memberships.exists():
                business = self.request.user.business_memberships.first().business

        if not business:
            return Invoice.objects.none()

        qs = Invoice.objects.filter(business=business)
        if not qs.exists():
            sub = Subscription.objects.filter(business=business).first()
            if sub:
                biz_prefix = (business.slug or 'WP')[:4].upper()
                inv_num = f"INV-{biz_prefix}-{sub.current_period_start.strftime('%Y%m')}-001"
                amount = sub.plan.annual_price if (sub.billing_cycle == Subscription.Cycle.ANNUAL and sub.plan.annual_price > 0) else (sub.plan.monthly_price * 12)
                Invoice.objects.get_or_create(
                    invoice_number=inv_num,
                    defaults={
                        'business': business,
                        'subscription': sub,
                        'amount': amount,
                        'tax': (amount * Decimal('0.18')).quantize(Decimal('0.01')),
                        'total': (amount * Decimal('1.18')).quantize(Decimal('0.01')),
                        'status': Invoice.Status.PAID,
                        'due_date': sub.current_period_start,
                        'paid_at': timezone.now(),
                        'notes': f"WorkPulse {sub.plan.name} Enterprise Subscription License for {business.name}"
                    }
                )
                qs = Invoice.objects.filter(business=business)

        return qs


class PlatformSubscriptionOverview(views.APIView):
    """Platform-level subscription and company telemetry for Super Admin, Support, and Billing Admin."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (user.is_superuser or user.is_staff or user.user_roles.filter(role__code__in=['SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN']).exists()):
            return Response({'success': False, 'error': {'message': 'Restricted to Platform Administrators.'}}, status=status.HTTP_403_FORBIDDEN)

        from apps.businesses.models import Business
        from apps.employees.models import Employee

        total_companies = Business.objects.count()
        active_companies = Business.objects.filter(is_active=True).count()
        suspended_companies = total_companies - active_companies
        total_employees = Employee.objects.count()

        plans = SubscriptionPlan.objects.filter(is_active=True).order_by('display_order')
        plan_breakdown = []
        total_mrr = 0.0

        for plan in plans:
            active_subs = plan.subscriptions.filter(status='ACTIVE')
            sub_count = active_subs.count()

            mrr_contribution = 0.0
            for sub in active_subs:
                if sub.billing_cycle == 'MONTHLY':
                    mrr_contribution += float(plan.monthly_price)
                elif sub.billing_cycle == 'ANNUAL':
                    mrr_contribution += float(plan.annual_price or (plan.monthly_price * 12)) / 12.0

            total_mrr += mrr_contribution

            plan_breakdown.append({
                'id': str(plan.id),
                'code': plan.code,
                'name': plan.name,
                'monthly_price': str(plan.monthly_price),
                'annual_price': str(plan.annual_price),
                'active_subscriptions': sub_count,
                'mrr_contribution': round(mrr_contribution, 2),
                'companies': [
                    {
                        'id': str(s.business.id),
                        'name': s.business.name,
                        'slug': s.business.slug,
                        'status': s.status,
                        'billing_cycle': s.billing_cycle,
                        'period_end': str(s.current_period_end)
                    }
                    for s in active_subs.select_related('business')
                ]
            })

        return Response({
            'success': True,
            'data': {
                'metrics': {
                    'total_companies': total_companies,
                    'active_companies': active_companies,
                    'suspended_companies': suspended_companies,
                    'total_employees': total_employees,
                    'mrr': round(total_mrr, 2),
                    'arr': round(total_mrr * 12, 2)
                },
                'plans': plan_breakdown
            }
        })
