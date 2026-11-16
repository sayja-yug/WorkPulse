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
            return Response({'success': False, 'error': {'message': 'No business context selected.'}}, status=status.HTTP_400_BAD_REQUEST)

        sub = Subscription.objects.filter(business=business).first()
        if not sub:
            # Fallback default plan for unassigned business
            plan = SubscriptionPlan.objects.filter(code='PRO').first() or SubscriptionPlan.objects.first()
            if plan:
                from django.utils import timezone
                today = timezone.now().date()
                sub = Subscription.objects.create(
                    business=business,
                    plan=plan,
                    status=Subscription.Status.ACTIVE,
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
        return Invoice.objects.filter(business=business)


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

        for p in plans:
            subs = p.subscriptions.select_related('business').all()
            count = subs.count()
            active_count = subs.filter(status='ACTIVE', business__is_active=True).count()
            trial_count = subs.filter(status='TRIAL').count()
            # Calculate MRR contribution
            total_mrr += float(p.monthly_price) * active_count

            plan_breakdown.append({
                'id': str(p.id),
                'code': p.code,
                'name': p.name,
                'monthly_price': float(p.monthly_price),
                'annual_price': float(p.annual_price),
                'max_employees': p.max_employees,
                'max_branches': p.max_branches,
                'companies_count': count,
                'active_companies_count': active_count,
                'trial_companies_count': trial_count,
                'companies': [
                    {
                        'id': str(s.business.id),
                        'name': s.business.name,
                        'slug': s.business.slug,
                        'status': s.status,
                        'billing_cycle': s.billing_cycle,
                        'is_active': s.business.is_active,
                        'employees_count': s.business.employees.count()
                    }
                    for s in subs
                ]
            })

        return Response({
            'success': True,
            'data': {
                'total_companies': total_companies,
                'active_companies': active_companies,
                'suspended_companies': suspended_companies,
                'total_employees': total_employees,
                'total_mrr': total_mrr,
                'plans': plan_breakdown
            }
        })

